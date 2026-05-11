from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
from app.models.domain import User
from app.schemas.schemas import UserCreate, Token
from app.core.security import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()

# Đăng ký tài khoản mới
@router.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        # Kiểm tra user tồn tại
        db_user = db.query(User).filter(User.username == user.username).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Tài khoản đã tồn tại!")

        # Băm mật khẩu và lưu DB
        hashed_pw = get_password_hash(user.password)
        new_user = User(username=user.username, hashed_password=hashed_pw)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Tạo JWT Token luôn sau khi đăng ký thành công
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": new_user.username}, expires_delta=access_token_expires
        )

        return {"access_token": access_token, "token_type": "bearer", "username": new_user.username}
        
    except HTTPException:
        raise # Ném lại lỗi 400 ra ngoài
    except Exception as e:
        db.rollback() # QUAN TRỌNG: Lùi giao dịch nếu DB lỗi để tránh treo hệ thống
        print(f"Lỗi Server (Register): {e}") # In ra terminal để debug
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")

# Đăng nhập
@router.post("/login", response_model=Token)
def login(user: UserCreate, db: Session = Depends(get_db)):
    # Tìm user
    db_user = db.query(User).filter(User.username == user.username).first()
    
    # Xác thực mật khẩu
    if not db_user or not verify_password(user.password, str(db_user.hashed_password)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sai tài khoản hoặc mật khẩu",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Tạo JWT Token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.username}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer", "username": db_user.username}