from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.domain import User, RouteHistory
from app.schemas.schemas import MatrixRequest, OptimizationRequest, RouteSaveRequest
from app.services.mapbox_client import get_distance_matrix
from app.services.geocode import get_coordinates_from_address
from app.services.route_service import process_route_optimization

router = APIRouter()


# --- ROUTE OPTIMIZATION ENDPOINTS ---
@router.post("/matrix")
async def calculate_matrix(payload: MatrixRequest):
    return await get_distance_matrix(payload)

# --- ROUTE OPTIMIZATION ENDPOINTS ---
@router.post("/optimize")
async def optimize_route(payload: OptimizationRequest):
    return await process_route_optimization(payload)

# --- GEOCODING ENDPOINT ---
@router.get("/geocode")
async def geocode(address: str):
    result = await get_coordinates_from_address(address)
    if result:
        return {"status": "success", "data": result}
    return {"status": "error", "message": "Không tìm thấy địa chỉ này!"}

# --- ROUTE HISTORY ENDPOINTS ---
@router.post("/routes/save")
def save_route(payload: RouteSaveRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy User")

    new_history = RouteHistory(
        user_id=user.id,
        total_distance_km=payload.total_distance_km,
        total_duration_minutes=payload.total_duration_minutes,
        mode_used=payload.mode_used,
        optimized_route=payload.optimized_route,
        route_geometry=payload.route_geometry
    )
    db.add(new_history)
    db.commit()
    return {"status": "success", "message": "Đã lưu lộ trình vào lịch sử!"}

@router.get("/routes/history/{username}")
def get_history(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy User")
    
    histories = db.query(RouteHistory).filter(RouteHistory.user_id == user.id).order_by(RouteHistory.created_at.desc()).all()
    return {"status": "success", "data": histories}