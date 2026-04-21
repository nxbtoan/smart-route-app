from pydantic import BaseModel, Field
from typing import List, Annotated, Optional

# Định nghĩa mô hình dữ liệu cho điểm và yêu cầu ma trận
class Location(BaseModel):
    id: str = Field(..., description="ID của điểm (VD: 'depot', 'diem_A')")
    lat: float = Field(..., description="Vĩ độ (Latitude)")
    lng: float = Field(..., description="Kinh độ (Longitude)")
    time_window: Optional[List[int]] = None

# Mô hình dữ liệu cho yêu cầu tính ma trận
class MatrixRequest(BaseModel):
    locations: Annotated[List[Location], Field(min_length=2, description="Danh sách các điểm cần tính ma trận (Ít nhất 2 điểm)")]