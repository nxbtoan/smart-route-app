from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import các Routers đã tách
from app.api.auth_routes import router as auth_router
from app.api.vrp_routes import router as vrp_router

app = FastAPI(title="Smart Route Optimization API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost",
        "https://smart-route-app-frontend-7lgp74fss-baotoans-projects-b0990336.vercel.app/",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gắn Routers vào app chính
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(vrp_router, prefix="/api", tags=["Routing & Matrix"])

@app.get("/")
def read_root():
    return {"status": "success", "message": "Backend FastAPI (Clean Architecture) đang chạy mượt mà!"}