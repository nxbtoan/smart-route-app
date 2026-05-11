import httpx
import os

MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN")
BASE_URL = "https://api.mapbox.com/search/searchbox/v1/suggest"

async def get_address_suggestions(query: str, proximity: str = None):
    """
    query: Nội dung người dùng đang gõ
    proximity: Tọa độ "lng,lat" để ưu tiên vùng lân cận
    """
    params = {
        "q": query,
        "language": "vi",
        "country": "vn",
        "access_token": MAPBOX_TOKEN,
        "session_token": "một_chuỗi_ngẫu_nhiên_duy_nhất" # Dùng để gom nhóm các request tiết kiệm tiền
    }
    
    if proximity:
        params["proximity"] = proximity # Ví dụ: "105.8,21.0"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(BASE_URL, params=params)
            return response.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}