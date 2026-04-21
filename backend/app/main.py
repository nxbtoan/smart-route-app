from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Annotated, Optional

from app.models.schemas import MatrixRequest, Location
from app.services.geocode import get_coordinates_from_address
from app.services.mapbox_client import get_distance_matrix, get_route_geometry
from app.routers.auth_route import router as auth_router

from app.algorithms.vrp_solver import solve_tsp

app = FastAPI(title="Smart Route Optimization API")
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OptimizationRequest(BaseModel):
    locations: Annotated[List[Location], Field(min_length=3, description="Danh sách điểm (điểm đầu tiên là Kho)")]
    mode: str = Field("balanced", description="Chế độ: shortest, fastest, balanced")

@app.get("/")
def read_root():
    return {"status": "success", "message": "Backend FastAPI (Tích hợp Mapbox & Time Windows) đang chạy!"}

@app.post("/api/matrix")
async def calculate_matrix(payload: MatrixRequest):
    return await get_distance_matrix(payload)

@app.post("/api/optimize")
async def optimize_route(payload: OptimizationRequest):
    matrix_req = MatrixRequest(locations=payload.locations)
    matrix_res = await get_distance_matrix(matrix_req)

    if matrix_res["status"] != "success":
        return matrix_res

    distance_matrix = list(matrix_res["distances"])
    duration_matrix = list(matrix_res["durations"])

    # ---------------------------------------------------------
    # TRÍCH XUẤT TIME WINDOWS TỪ REQUEST
    # Nếu không điền, gán mặc định là [0, 86400] (24 tiếng)
    # ---------------------------------------------------------
    time_windows = []
    for loc in payload.locations:
        # Giả định getattr để an toàn nếu schema chưa update
        tw = getattr(loc, 'time_window', None) 
        if tw and len(tw) == 2:
            time_windows.append(tw)
        else:
            time_windows.append([0, 86400])

    # Giải bài toán (Bơm cả time_windows vào thuật toán)
    solution = solve_tsp(distance_matrix, duration_matrix, payload.mode, time_windows)
    
    if solution["status"] != "success":
        return solution

    ordered_locations = [payload.locations[int(i)] for i in solution["route_indices"]]

    route_geom_res = await get_route_geometry(ordered_locations)

    if route_geom_res["status"] == "success":
        route_geometry = route_geom_res["geometry"]
    else:
        route_geometry = [[loc.lat, loc.lng] for loc in ordered_locations]

    total_distance_meters = int(solution["total_distance_meters"])
    total_duration_seconds = int(solution["total_duration_seconds"])

    return {
        "status": "success",
        "mode_used": payload.mode,
        "algorithm_used": solution.get("algorithm_used", "Unknown"),
        "metrics": {
            "total_distance_km": round(total_distance_meters / 1000, 2),
            "total_duration_minutes": round(total_duration_seconds / 60, 2),
        },
        "optimized_route": ordered_locations,
        "route_geometry": route_geometry,
    }

@app.get("/api/geocode")
async def geocode(address: str):
    result = await get_coordinates_from_address(address)
    if result:
        return {"status": "success", "data": result}
    return {"status": "error", "message": "Không tìm thấy địa chỉ này!"}