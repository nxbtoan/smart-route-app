from ortools.constraint_solver import pywrapcp, routing_enums_pb2

def solve_tsp(distance_matrix: list, duration_matrix: list, mode: str = "balanced", time_windows: list | None = None) -> dict:
    """ Giải bài toán bằng OR-Tools với Soft Time Windows (Ràng buộc mềm / Phạt trễ giờ) """
    
    manager = pywrapcp.RoutingIndexManager(len(distance_matrix), 1, 0)
    routing = pywrapcp.RoutingModel(manager)

    # =====================================================================
    # 1. KHAI BÁO HÀM CHI PHÍ & HỆ SỐ PHẠT (PENALTY WEIGHT)
    # =====================================================================
    if mode == 'shortest':
        w_dist, w_time = 1.0, 0.0  
        # Chế độ ngắn nhất: 1 giây trễ = phạt tương đương đi vòng 5 mét
        late_penalty = 5  
    elif mode == 'fastest':
        w_dist, w_time = 0.0, 1.0  
        # Chế độ nhanh nhất: 1 giây trễ = phạt gấp 10 lần 1 giây di chuyển
        late_penalty = 10 
    else: # 'balanced'
        w_dist, w_time = 1.0, 15.0 
        # Chế độ cân bằng: Do 1s di chuyển đã tính 15 điểm, nên trễ giờ phải phạt cực nặng (50 điểm/giây)
        late_penalty = 50 

    def cost_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        dist = distance_matrix[from_node][to_node]
        time = duration_matrix[from_node][to_node]
        return int((w_dist * dist) + (w_time * time))

    transit_callback_index = routing.RegisterTransitCallback(cost_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # =====================================================================
    # 2. KHAI BÁO RÀO CẢN THỜI GIAN & SOFT TIME WINDOWS
    # =====================================================================
    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return int(duration_matrix[from_node][to_node])

    time_callback_index = routing.RegisterTransitCallback(time_callback)

    routing.AddDimension(
        time_callback_index,
        slack_max=999999,
        capacity=999999,
        fix_start_cumul_to_zero=False,
        name='Time'
    )
    time_dimension = routing.GetDimensionOrDie('Time')

    # ÁP DỤNG SOFT TIME WINDOWS
    if time_windows:
        for location_idx, window in enumerate(time_windows):
            if location_idx == 0:
                continue # Bỏ qua Kho xuất phát
            
            if window and len(window) == 2:
                index = manager.NodeToIndex(location_idx)
                
                # 1. Ràng buộc dưới (Min): Nếu đến sớm hơn window[0], BẮT BUỘC phải đứng chờ.
                time_dimension.CumulVar(index).SetMin(window[0])
                
                # 2. Ràng buộc trên MỀM (Soft Upper Bound): 
                time_dimension.SetCumulVarSoftUpperBound(index, window[1], late_penalty)

        # Chốt thời gian xuất phát và kết thúc khả thi
        routing.AddVariableMinimizedByFinalizer(time_dimension.CumulVar(routing.Start(0)))
        routing.AddVariableMinimizedByFinalizer(time_dimension.CumulVar(routing.End(0)))

    # =====================================================================
    # 3. THÔNG SỐ TÌM KIẾM
    # =====================================================================
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search_parameters.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search_parameters.time_limit.seconds = 24

    solution = routing.SolveWithParameters(search_parameters)

    # =====================================================================
    # 4. TRẢ VỀ KẾT QUẢ
    # =====================================================================
    if not solution:
        return {
            "status": "error", 
            "message": "Không tìm được đường! Vui lòng kiểm tra lại tọa độ các điểm."
        }

    route_indices = []
    route_schedules = []
    total_distance = 0
    total_duration = 0
    
    index = routing.Start(0)
    while not routing.IsEnd(index):
        node_idx = manager.IndexToNode(index)
        route_indices.append(node_idx)
        
        time_var = time_dimension.CumulVar(index)
        arrival_sec = solution.Min(time_var)
        
        # Lấy deadline (Khung giờ giới hạn trên) của điểm hiện tại
        deadline_sec = 86400 # Mặc định là 24h
        if time_windows and node_idx < len(time_windows) and time_windows[node_idx]:
            deadline_sec = time_windows[node_idx][1]
            
        # Tính số phút trễ (Chỉ lấy số dương, nếu đến sớm thì = 0)
        lateness_sec = max(0, arrival_sec - deadline_sec)
        lateness_min = int(lateness_sec / 60)
        
        route_schedules.append({
            "node_index": node_idx,
            "lateness_minutes": lateness_min
        })

        previous_index = index
        index = solution.Value(routing.NextVar(index))
        
        total_distance += distance_matrix[node_idx][manager.IndexToNode(index)]
        total_duration += duration_matrix[node_idx][manager.IndexToNode(index)]
        
    # Thêm điểm kết thúc (Trở về kho)
    end_node_idx = manager.IndexToNode(index)
    route_indices.append(end_node_idx)
    route_schedules.append({"node_index": end_node_idx, "lateness_minutes": 0})

    return {
        "status": "success",
        "route_indices": route_indices,
        "route_schedules": route_schedules,
        "total_distance_meters": total_distance,
        "total_duration_seconds": total_duration,
        "algorithm_used": "Google OR-Tools (Soft Time Windows)",
    }