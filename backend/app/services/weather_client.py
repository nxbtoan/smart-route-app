import httpx
import os
from datetime import datetime, timedelta

WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")
WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"

# BIẾN TOÀN CỤC LƯU CACHE (Lưu trong RAM của server)
_weather_cache = {
    "condition": "Clear", # Mặc định trời đẹp
    "last_fetched": None  # Lần cuối gọi API là bao giờ?
}

CACHE_TTL_HOURS = 3 # Thời gian sống của Cache: 3 tiếng

async def get_current_weather(lat: float, lng: float) -> str:
    """
    Lấy thời tiết hiện tại. Có sử dụng Cache để tiết kiệm API Request.
    """
    global _weather_cache
    now = datetime.now()

    # 1. KIỂM TRA CACHE
    if _weather_cache["last_fetched"]:
        time_diff = now - _weather_cache["last_fetched"]
        # Nếu chưa quá 3 tiếng, dùng luôn data cũ
        if time_diff < timedelta(hours=CACHE_TTL_HOURS):
            print("🌤️ Dùng data thời tiết từ Cache (Không tốn API request!)")
            return _weather_cache["condition"]

    # 2. GỌI API NẾU CACHE TRỐNG HOẶC ĐÃ HẾT HẠN
    print("☁️ Cache hết hạn. Đang gọi API OpenWeatherMap lấy thời tiết mới...")
    params = {
        "lat": lat,
        "lon": lng,
        "appid": WEATHER_API_KEY,
        "units": "metric" # Lấy độ C cho chuẩn
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(WEATHER_URL, params=params, timeout=5.0)
            response.raise_for_status()
            data = response.json()
            
            # Trích xuất trạng thái thời tiết chính (VD: Rain, Clear, Clouds, Snow)
            main_condition = data["weather"][0]["main"]

            # 3. CẬP NHẬT LẠI CACHE
            _weather_cache["condition"] = main_condition
            _weather_cache["last_fetched"] = now

            return main_condition

        except Exception as e:
            print(f"❌ Lỗi lấy thời tiết: {e}")
            return _weather_cache["condition"] if _weather_cache["last_fetched"] else "Clear"