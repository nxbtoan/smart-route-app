from pydantic import BaseModel, Field, field_validator
from typing import List, Annotated, Optional, Dict, Any

# --- VRP / ROUTING SCHEMAS ---
class Location(BaseModel):
    id: str = Field(..., description="ID của điểm (VD: 'depot', 'diem_A')")
    lat: float = Field(..., description="Vĩ độ (Latitude)")
    lng: float = Field(..., description="Kinh độ (Longitude)")
    time_window: Optional[List[int]] = None

class MatrixRequest(BaseModel):
    locations: Annotated[List[Location], Field(min_length=2, description="Danh sách các điểm")]

class OptimizationRequest(BaseModel):
    locations: Annotated[List[Location], Field(min_length=3, description="Danh sách điểm (điểm đầu tiên là Kho)")]
    mode: str = Field("balanced", description="Chế độ: shortest, fastest, balanced")

class RouteSaveRequest(BaseModel):
    username: str
    total_distance_km: float
    total_duration_minutes: float
    mode_used: str
    optimized_route: List[Dict[str, Any]]
    route_geometry: List[List[float]]

# --- USER / AUTH SCHEMAS ---
class UserCreate(BaseModel):
    username: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Mật khẩu không được vượt quá 72 ký tự")
        return v

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str