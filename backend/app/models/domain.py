from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base, engine

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    routes = relationship("RouteHistory", back_populates="owner")

class RouteHistory(Base):
    __tablename__ = "route_histories"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    total_distance_km = Column(Float)
    total_duration_minutes = Column(Float)
    mode_used = Column(String)
    optimized_route = Column(JSON) 
    route_geometry = Column(JSON)

    owner = relationship("User", back_populates="routes")

# Tự động tạo bảng nếu chưa có
Base.metadata.create_all(bind=engine)