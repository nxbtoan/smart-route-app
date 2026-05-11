import axios from 'axios';

// Khi chạy qua Docker/Nginx, ta có thể dùng biến môi trường hoặc proxy.
// Hiện tại chạy local, Backend đang ở cổng 8000.
const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api`;

export const optimizeRoute = async (locations, mode = 'balanced') => {
  try {
    const response = await axios.post(`${API_BASE_URL}/optimize`, {
      locations,
      mode,
    });
    return response.data;
  } catch (error) {
    console.error("Lỗi khi gọi API tối ưu:", error);
    throw error;
  }
};