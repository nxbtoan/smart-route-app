import httpx

async def get_coordinates_from_address(address: str):
    """
    Sử dụng Nominatim API để lấy tọa độ từ địa chỉ.
    """
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": address,
        "format": "json",
        "limit": 1,
        "addressdetails": 1
    }
    headers = { "User-Agent": "SmartRouteApp/1.0" }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, headers=headers)
            data = response.json()
            if data:
                return {
                    "lat": float(data[0]["lat"]),
                    "lng": float(data[0]["lon"]),
                    "display_name": data[0]["display_name"]
                }
            return None
        except Exception:
            return None