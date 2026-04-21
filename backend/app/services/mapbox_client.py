import httpx
import os
from typing import List
from dotenv import load_dotenv
from app.models.schemas import MatrixRequest, Location

# Load biến môi trường từ file .env
load_dotenv()

MAPBOX_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN")
BASE_URL = "https://api.mapbox.com"

async def get_distance_matrix(request: MatrixRequest):
    """
    Gọi Mapbox Matrix API để lấy ma trận khoảng cách và thời gian (Có kẹt xe)
    """
    locations = request.locations
    
    # ⚠️ Chốt an toàn: Gói miễn phí của Mapbox chỉ cho phép tối đa 25 điểm
    if len(locations) > 25:
        return {"status": "error", "message": "Mapbox Matrix API chỉ hỗ trợ tối đa 25 điểm!"}
        
    # Chuẩn bị tọa độ: lng,lat;lng,lat
    coords_string = ";".join([f"{loc.lng},{loc.lat}" for loc in locations])
    
    url = f"{BASE_URL}/directions-matrix/v1/mapbox/driving-traffic/{coords_string}"
    params = {
        "annotations": "distance,duration",
        "access_token": MAPBOX_TOKEN
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") != "Ok":
                return {"status": "error", "message": f"Lỗi Mapbox: {data.get('code')}"}
                
            return {
                "status": "success",
                "distances": data.get("distances"),  # Mét
                "durations": data.get("durations")   # Giây
            }
            
        except httpx.HTTPStatusError as e:
            return {"status": "error", "message": f"Lỗi HTTP: {e.response.status_code}"}
        except Exception as e:
            return {"status": "error", "message": f"Lỗi kết nối Mapbox: {str(e)}"}


async def get_route_geometry(locations: List[Location]):
    """
    Gọi Mapbox Directions API để lấy tọa độ vẽ đường bám mặt đường chi tiết
    """
    coords_string = ";".join([f"{loc.lng},{loc.lat}" for loc in locations])
    
    url = f"{BASE_URL}/directions/v5/mapbox/driving-traffic/{coords_string}"
    params = {
        "geometries": "geojson",
        "overview": "full",
        "access_token": MAPBOX_TOKEN
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") != "Ok" or not data.get("routes"):
                return {"status": "error", "message": "Không tìm thấy đường đi thực tế"}
                
            # Mapbox GeoJSON trả về [lng, lat]. Lật lại thành [lat, lng] cho chuẩn chung.
            geojson_coords = data["routes"][0]["geometry"]["coordinates"]
            lat_lng_coords = [[coord[1], coord[0]] for coord in geojson_coords]
            
            return {"status": "success", "geometry": lat_lng_coords}
            
        except Exception as e:
            return {"status": "error", "message": str(e)}