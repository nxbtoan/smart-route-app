import itertools
from ortools.constraint_solver import pywrapcp, routing_enums_pb2

def create_cost_matrix(distance_matrix: list, duration_matrix: list, mode: str) -> list:
    """ Chuẩn bị Ma trận Chi phí dựa trên chế độ người dùng chọn. """
    size = len(distance_matrix)
    cost_matrix = [[0] * size for _ in range(size)]

    if mode == "shortest":
        return [[int(val) for val in row] for row in distance_matrix]
    elif mode == "fastest":
        return [[int(val) for val in row] for row in duration_matrix]
    elif mode == "balanced":
        max_dist = max(max(row) for row in distance_matrix)
        max_dur  = max(max(row) for row in duration_matrix)

        if max_dist == 0: max_dist = 1
        if max_dur  == 0: max_dur  = 1

        for i in range(size):
            for j in range(size):
                norm_dist = distance_matrix[i][j] / max_dist
                norm_dur  = duration_matrix[i][j]  / max_dur
                cost = (0.5 * norm_dist) + (0.5 * norm_dur)
                cost_matrix[i][j] = int(cost * 10000)
        return cost_matrix
    else:
        return [[int(val) for val in row] for row in distance_matrix]


def solve_exact(distance_matrix: list, duration_matrix: list, mode: str = "balanced") -> dict:
    """ Thuật toán Vét cạn (Brute Force) cho N <= 10. (Không hỗ trợ Time Window) """
    num_locations = len(distance_matrix)
    nodes = list(range(1, num_locations))
    cost_matrix = create_cost_matrix(distance_matrix, duration_matrix, mode)

    best_route: list[int] | None = None
    best_cost = float("inf")

    for perm in itertools.permutations(nodes):
        current_cost = 0
        current_node = 0
        for next_node in perm:
            current_cost += cost_matrix[current_node][next_node]
            current_node = next_node
        current_cost += cost_matrix[current_node][0]

        if current_cost < best_cost:
            best_cost  = current_cost
            best_route = [0] + list(perm) + [0]

    if best_route is None:
        return {"status": "error", "message": "Không tìm được đường đi hợp lệ."}

    total_dist = 0
    total_time = 0
    for i in range(len(best_route) - 1):
        u = best_route[i]
        v = best_route[i + 1]
        total_dist += distance_matrix[u][v]
        total_time += duration_matrix[u][v]

    return {
        "status": "success",
        "route_indices": best_route,
        "total_distance_meters": total_dist,
        "total_duration_seconds": total_time,
        "algorithm_used": "Exact (Brute Force)",
    }


def solve_ortools(distance_matrix, duration_matrix, mode="balanced", time_windows=None):
    """ Giải bài toán bằng OR-Tools (Google) - Có hỗ trợ Time Window """
    manager = pywrapcp.RoutingIndexManager(len(distance_matrix), 1, 0)
    routing = pywrapcp.RoutingModel(manager)

    # 1. Khai báo Cost Matrix
    cost_matrix = create_cost_matrix(distance_matrix, duration_matrix, mode)
    def transit_callback_index(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return cost_matrix[from_node][to_node]
        
    transit_callback_id = routing.RegisterTransitCallback(transit_callback_index)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_id)

    # 2. Khai báo Time Dimension (Bắt buộc dùng thời gian thực bằng giây)
    def time_callback_index(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return int(duration_matrix[from_node][to_node])

    time_callback_id = routing.RegisterTransitCallback(time_callback_index)

    routing.AddDimension(
        time_callback_id,
        slack_max=3600, # Xe có thể tới sớm và đứng chờ tối đa 1 tiếng (3600s)
        capacity=86400, # Giới hạn toàn bộ chuyến đi trong 24 tiếng
        fix_start_cumul_to_zero=True,
        name='Time'
    )
    time_dimension = routing.GetDimensionOrDie('Time')

    # Ép khung giờ cho các điểm đến (nếu có)
    if time_windows:
        for location_idx, window in enumerate(time_windows):
            if location_idx == 0:
                continue # Kho xuất phát ở giây thứ 0
            if window and len(window) == 2:
                index = manager.NodeToIndex(location_idx)
                time_dimension.CumulVar(index).SetRange(window[0], window[1])

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search_parameters.time_limit.seconds = 5

    solution = routing.SolveWithParameters(search_parameters)

    # 3. Lỗi: Thuật toán không tìm được đường (VD: Rào cản khung giờ quá khắt khe)
    if not solution:
        return {
            "status": "error", 
            "message": "Không tìm được tuyến đường tối ưu! Có thể rào cản thời gian (Time Window) của một điểm bị vi phạm do kẹt xe hoặc khoảng cách quá xa."
        }

    # 4. Trích xuất thứ tự đường đi từ Solution
    route_indices = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        route_indices.append(manager.IndexToNode(index))
        index = solution.Value(routing.NextVar(index))
    route_indices.append(manager.IndexToNode(index))

    # Tính toán lại tổng quãng đường/thời gian
    total_distance = 0
    total_duration = 0
    for i in range(len(route_indices) - 1):
        from_node = route_indices[i]
        to_node = route_indices[i + 1]
        total_distance += distance_matrix[from_node][to_node]
        total_duration += duration_matrix[from_node][to_node]

    return {
        "status": "success",
        "route_indices": route_indices,
        "total_distance_meters": total_distance,
        "total_duration_seconds": total_duration,
        "algorithm_used": "OR-Tools (Time Window)" if time_windows else "OR-Tools",
    }


def solve_tsp(distance_matrix: list, duration_matrix: list, mode: str = "balanced", time_windows: list | None = None) -> dict:
    """ Phân luồng thông minh """
    # Kiểm tra xem mảng time_windows có khung giờ thực tế nào không
    has_strict_time_windows = False
    if time_windows:
        for tw in time_windows:
            if tw != [0, 86400]: # Khác với mặc định 24h
                has_strict_time_windows = True
                break

    N = len(distance_matrix)
    
    # Nếu ít điểm VÀ không có ràng buộc giờ giấc -> Vét cạn lấy kết quả 100% chuẩn
    if N <= 10 and not has_strict_time_windows:
        return solve_exact(distance_matrix, duration_matrix, mode)
        
    # Bắt buộc dùng Google OR-Tools nếu nhiều điểm hoặc có ràng buộc thời gian
    return solve_ortools(distance_matrix, duration_matrix, mode, time_windows)