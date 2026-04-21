from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any
from passlib.context import CryptContext

from app.db import get_db, User, RouteHistory

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- SCHEMAS ---
class UserCreate(BaseModel):
    username: str
    password: str

class RouteSaveRequest(BaseModel):
    username: str
    total_distance_km: float
    total_duration_minutes: float
    mode_used: str
    optimized_route: List[Dict[str, Any]]
    route_geometry: List[List[float]]

# --- API ĐĂNG KÝ ---
@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Tài khoản đã tồn tại!")
    
    hashed_pw = pwd_context.hash(user.password)
    new_user = User(username=user.username, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    return {"status": "success", "message": "Đăng ký thành công!"}

# --- API ĐĂNG NHẬP ---
@router.post("/login")
def login(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not pwd_context.verify(user.password, str(db_user.hashed_password)):
        raise HTTPException(status_code=400, detail="Sai tài khoản hoặc mật khẩu!")
    
    # Trả về Username (hoặc Token) để Frontend lưu vào LocalStorage
    return {"status": "success", "token": db_user.username, "username": db_user.username}

# --- API LƯU LỊCH SỬ LỘ TRÌNH ---
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

# --- API LẤY LỊCH SỬ ---
@router.get("/routes/history/{username}")
def get_history(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy User")
    
    # Lấy danh sách lịch sử, sắp xếp mới nhất lên đầu
    histories = db.query(RouteHistory).filter(RouteHistory.user_id == user.id).order_by(RouteHistory.created_at.desc()).all()
    return {"status": "success", "data": histories}