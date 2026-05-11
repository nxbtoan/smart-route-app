import asyncio
from app.schemas.schemas import OptimizationRequest, MatrixRequest, Location
from app.services.mapbox_client import get_distance_matrix, get_route_geometry
from app.algorithms.vrp_solver import solve_tsp
from app.services.weather_client import get_current_weather

async def process_route_optimization(payload: OptimizationRequest):
    # 1. Gọi Mapbox API lấy Ma trận (I/O Bound)
    matrix_req = MatrixRequest(locations=payload.locations)
    matrix_res = await get_distance_matrix(matrix_req)

    if matrix_res.get("status") != "success":
        return matrix_res

    distance_matrix = list(matrix_res["distances"])
    duration_matrix = list(matrix_res["durations"])

    # Lấy thời tiết hiện tại tại vị trí depot để điều chỉnh thuật toán
    depot = payload.locations[0]
    weather = await get_current_weather(depot.lat, depot.lng)

    # Đặt hệ số ảnh hưởng thời gian (Multiplier)
    weather_multiplier = 1.0
    if weather in ["Rain", "Drizzle"]:
        weather_multiplier = 1.2  # Mưa: Đi chậm lại 20%
    elif weather in ["Thunderstorm", "Snow", "Extreme"]:
        weather_multiplier = 1.5  # Bão/Tuyết: Đi chậm lại 50%

    # Nhân hệ số phạt vào toàn bộ ma trận thời gian
    if weather_multiplier > 1.0:
        duration_matrix = [
            [int(time * weather_multiplier) for time in row] 
            for row in duration_matrix
        ]

    # 2. Xử lý Time Windows
    time_windows = []
    for loc in payload.locations:
        tw = loc.time_window
        if tw and len(tw) == 2:
            time_windows.append(tw)
        else:
            time_windows.append([0, 86400])

    # 3. CHẠY THUẬT TOÁN OR-TOOLS (Soft Time Windows)
    solution = await asyncio.to_thread(
        solve_tsp, 
        distance_matrix, 
        duration_matrix, 
        payload.mode, 
        time_windows
    )
    
    if solution.get("status") != "success":
        return solution

    # 4. Gắn dữ liệu và CẢNH BÁO TRỄ GIỜ (Lateness)
    route_indices = solution["route_indices"]
    schedules = solution.get("route_schedules", [])
    optimized_route = []

    for node_idx in route_indices:
        original_loc = payload.locations[node_idx]
        
        # Tìm thông tin lịch trình dự kiến từ AI
        schedule_info = next((s for s in schedules if s['node_index'] == node_idx), {})
        
        loc_dict = original_loc.dict() # Chuyển schema Pydantic thành dict
        loc_dict["lateness_minutes"] = schedule_info.get("lateness_minutes", 0) # Gắn số phút trễ
        
        optimized_route.append(loc_dict)

    # 5. Lấy hình học đường đi (Geometry) từ Mapbox
    optimized_route_objs = [Location(**loc) for loc in optimized_route]
    route_geom_res = await get_route_geometry(optimized_route_objs)
    if route_geom_res.get("status") == "success":
        route_geometry = route_geom_res["geometry"]
    else:
        route_geometry = [[loc["lat"], loc["lng"]] for loc in optimized_route]

    return {
        "status": "success",
        "mode_used": payload.mode,
        "algorithm_used": solution.get("algorithm_used", "Unknown"),
        "metrics": {
            "total_distance_km": round(solution["total_distance_meters"] / 1000, 2),
            "total_duration_minutes": round(solution["total_duration_seconds"] / 60, 2),
        },
        "optimized_route": optimized_route,
        "route_geometry": route_geometry,
    }