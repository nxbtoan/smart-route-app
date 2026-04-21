import { create } from 'zustand';
import { optimizeRoute } from '../api/client';
import axios from 'axios';

// ============================================================
// HẰNG SỐ
// ============================================================

/** Kho mặc định đặt tại trung tâm Hải Châu, Đà Nẵng */
const DEFAULT_DEPOT = {
  id: "Kho mặc định (Hải Châu)",
  lat: 16.0544,
  lng: 108.2022,
};

// ============================================================
// HELPER
// ============================================================

/**
 * Kiểm tra chuỗi input có phải định dạng tọa độ "lat,lng" không.
 * Ví dụ hợp lệ: "16.05,108.20" hoặc "-1.5, 109.3"
 */
const isCoordinate = (input) => /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(input);

/**
 * Geocode một địa chỉ văn bản bằng API nội bộ.
 * @returns {{ lat, lng, display_name }} hoặc throw Error nếu thất bại
 */
const geocodeAddress = async (address) => {
  const response = await axios.get(
    `http://localhost:8000/api/geocode?address=${encodeURIComponent(address)}`
  );
  if (response.data.status !== 'success') {
    throw new Error("Không tìm thấy địa chỉ!");
  }
  return response.data.data; // { lat, lng, display_name }
};

// ============================================================
// STORE
// ============================================================

const useRouteStore = create((set, get) => ({

  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  /** Danh sách điểm; index 0 luôn là Kho */
  locations: [DEFAULT_DEPOT],

  /** Có đang dùng kho mặc định không */
  isDefaultDepot: true,

  /** Chế độ tối ưu: 'shortest' | 'fastest' | 'balanced' */
  optimizationMode: 'balanced',

  /** Đang gọi API hay không */
  isLoading: false,

  /** Thông báo lỗi, null nếu không có lỗi */
  error: null,

  /** Kết quả tối ưu trả về từ backend */
  optimizedResult: null,

  /** Cấu hình bản đồ */
  mapConfig: {
    style: 'mapbox://styles/mapbox/streets-v12',
    is3D: false,
    pitch: 0,
    bearing: 0,
  },

  setMapStyle: (style) => set((state) => ({
    mapConfig: { ...state.mapConfig, style }
  })),

  toggle3D: (enable) => set((state) => ({
    mapConfig: { 
      ...state.mapConfig, 
      is3D: enable, 
      pitch: enable ? 45 : 0
    }
  })),

  // ----------------------------------------------------------
  // ACTIONS — Cài đặt
  // ----------------------------------------------------------

  /** Thay đổi chế độ tối ưu hóa */
  setOptimizationMode: (mode) => set({ optimizationMode: mode }),

  /**
   * Bật/tắt kho mặc định.
   * Khi bật lại: ghi đè locations[0] bằng DEFAULT_DEPOT.
   * Khi tắt: giữ nguyên locations[0] để người dùng tự nhập.
   */
  toggleDefaultDepot: (useDefault) => {
    set((state) => {
      const locations = [...state.locations];
      if (useDefault) locations[0] = DEFAULT_DEPOT;
      return { isDefaultDepot: useDefault, locations };
    });
  },

  // ----------------------------------------------------------
  // ACTIONS — Quản lý danh sách điểm
  // ----------------------------------------------------------

  /**
   * Thêm điểm bằng cách click trực tiếp lên bản đồ.
   * Tọa độ được làm tròn 6 chữ số thập phân.
   */
  addLocationFromMap: (lat, lng) => {
    const newLocation = {
      id: `Điểm từ bản đồ ${get().locations.length}`,
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
    };
    set((state) => ({ locations: [...state.locations, newLocation] }));
  },

  /** Thêm một điểm đã được tạo sẵn vào danh sách */
  addLocation: (loc) =>
    set((state) => ({ locations: [...state.locations, loc] })),

  /** Xóa một điểm khỏi danh sách theo id */
  removeLocation: (id) =>
    set((state) => ({
      locations: state.locations.filter((loc) => loc.id !== id),
    })),

  /**
   * Thêm điểm thông minh từ ô nhập liệu.
   * - Nếu input là tọa độ "lat,lng" → dùng trực tiếp.
   * - Nếu là địa chỉ văn bản → geocode qua API rồi thêm vào.
   */
  addLocationSmart: async (input) => {
    set({ isLoading: true, error: null });

    try {
      let newLocation;

      if (isCoordinate(input)) {
        // Trường hợp 1: Input là tọa độ
        const [lat, lng] = input.split(',').map((s) => parseFloat(s.trim()));
        newLocation = { id: `Điểm ${get().locations.length}`, lat, lng };
      } else {
        // Trường hợp 2: Input là địa chỉ văn bản → geocode
        const { lat, lng, display_name } = await geocodeAddress(input);
        newLocation = { id: input, lat, lng, full_address: display_name };
      }

      set((state) => ({
        locations: [...state.locations, newLocation],
        isLoading: false,
      }));
    } catch (err) {
      set({ error: err.message || "Lỗi kết nối Geocoding!", isLoading: false });
    }
  },

  /**
   * Đặt lại Kho (locations[0]) thông minh từ ô nhập liệu.
   * Logic giống addLocationSmart nhưng ghi đè index 0 thay vì append.
   */
  setDepotSmart: async (input) => {
    set({ isLoading: true, error: null });

    try {
      let newDepot;

      if (isCoordinate(input)) {
        const [lat, lng] = input.split(',').map((s) => parseFloat(s.trim()));
        newDepot = { id: `Kho (${lat}, ${lng})`, lat, lng };
      } else {
        const { lat, lng, display_name } = await geocodeAddress(input);
        newDepot = { id: input, lat, lng, full_address: display_name };
      }

      set((state) => {
        const locations = [...state.locations];
        locations[0] = newDepot; // Ghi đè vị trí Kho
        return { locations, isDefaultDepot: false, isLoading: false };
      });
    } catch (err) {
      set({ error: err.message || "Lỗi kết nối Geocoding!", isLoading: false });
    }
  },

  // ----------------------------------------------------------
  // ACTIONS — Tối ưu hóa
  // ----------------------------------------------------------

  /**
   * Gọi API backend để tối ưu lộ trình.
   * Yêu cầu tối thiểu: 1 Kho + 2 điểm giao = 3 điểm.
   */
  fetchOptimization: async () => {
    const { locations, optimizationMode } = get();

    if (locations.length < 3) {
      set({ error: "Vui lòng nhập ít nhất 1 Kho và 2 Điểm giao!" });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const data = await optimizeRoute(locations, optimizationMode);
      if (data.status === 'success') {
        set({ optimizedResult: data, isLoading: false });
      } else {
        set({ error: data.message || "Có lỗi xảy ra từ server", isLoading: false });
      }
    } catch (err) {
      set({ error: "Không kết nối được với Server", isLoading: false });
    }
  },

  // ----------------------------------------------------------
  // ACTIONS — Quản lý trạng thái giao hàng
  // ----------------------------------------------------------
  toggleDeliveryStatus: (id) => set((state) => {
    if (!state.optimizedResult) return state;
    
    const updatedRoute = state.optimizedResult.optimized_route.map(loc => 
      loc.id === id ? { ...loc, isDelivered: !loc.isDelivered } : loc
    );
    
    return {
      optimizedResult: {
        ...state.optimizedResult,
        optimized_route: updatedRoute
      }
    };
  }),

  // ----------------------------------------------------------
  // ACTIONS — Quản lý Khung giờ
  // ----------------------------------------------------------
  updateTimeWindow: (id, minMinutes, maxMinutes) => set((state) => {
    const newLocations = state.locations.map(loc => {
      if (loc.id === id) {
        // Chuyển từ Phút sang Giây
        const minSec = minMinutes ? parseInt(minMinutes) * 60 : 0;
        const maxSec = maxMinutes ? parseInt(maxMinutes) * 60 : 86400; // Mặc định 24h

        // Nếu người dùng xóa trắng cả 2 ô, gỡ bỏ ràng buộc
        if (minMinutes === '' && maxMinutes === '') {
          const { time_window, ...rest } = loc;
          return rest;
        }
        return { ...loc, time_window: [minSec, maxSec] };
      }
      return loc;
    });
    return { locations: newLocations };
  }),

  // ----------------------------------------------------------
  // ACTIONS — Tối ưu lại lộ trình dựa trên vị trí GPS hiện tại và trạng thái giao hàng
  // ----------------------------------------------------------
  reOptimize: async () => {
    const { optimizedResult, optimizationMode } = get();
    if (!optimizedResult) return;

    set({ isLoading: true, error: null });

    // 1. Kiểm tra quyền truy cập GPS
    if (!navigator.geolocation) {
        set({ error: "Trình duyệt của bạn không hỗ trợ định vị GPS.", isLoading: false });
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const currentPoint = {
                id: "Vị trí hiện tại (GPS)",
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            // 2. Lọc các điểm CHƯA GIAO (isDelivered !== true)
            const undeliveredPoints = optimizedResult.optimized_route.filter(
                loc => !loc.isDelivered && loc.id !== "Vị trí hiện tại (GPS)"
            );

            // 3. Tạo danh sách điểm mới: [Vị trí hiện tại, ...các điểm chưa giao]
            const newLocations = [currentPoint, ...undeliveredPoints];

            if (newLocations.length < 3) {
                set({ 
                    error: "Cần ít nhất 2 điểm giao chưa hoàn thành để tối ưu lại lộ trình.", 
                    isLoading: false 
                });
                return;
            }

            // 4. Gọi Backend tính toán lại
            try {
                const response = await axios.post("http://localhost:8000/api/optimize", {
                    locations: newLocations,
                    mode: optimizationMode
                });
                set({ optimizedResult: response.data, isLoading: false });
            } catch (err) {
                set({ error: "Không thể tối ưu lại lộ trình. Vui lòng thử lại.", isLoading: false });
            }
        },
        (err) => {
            set({ error: "Lỗi định vị: " + err.message, isLoading: false });
        },
        { enableHighAccuracy: true } // Yêu cầu độ chính xác cao nhất
    );
  },


  // ----------------------------------------------------------
  // ACTIONS — Quản lý người dùng và modal xác thực
  // ----------------------------------------------------------
  user: localStorage.getItem('smart_route_user') || null,
  isAuthModalOpen: false,

  setUser: (username) => {
    if (username) {
      localStorage.setItem('smart_route_user', username);
    } else {
      localStorage.removeItem('smart_route_user');
    }
    set({ user: username, isAuthModalOpen: false });
  },

  toggleAuthModal: (isOpen) => set({ isAuthModalOpen: isOpen }),

}));

export default useRouteStore;