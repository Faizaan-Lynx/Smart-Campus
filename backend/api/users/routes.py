from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.database import get_db
from models.users import Users
from api.users.security import create_access_token
from config import settings
from api.users.schemas import UserLoginSchema, TokenSchema, UserCreateSchema
import bcrypt

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/auth/login", response_model=TokenSchema)
def login(user_credentials: UserLoginSchema, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = db.query(Users).filter(Users.username == user_credentials.username).first()
    
    if not user or not bcrypt.checkpw(user_credentials.password.encode("utf-8"), user.hashed_password.encode("utf-8")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    # Generate JWT token
    token = create_access_token({"sub": user.username, "id": user.id})
    
    return {"access_token": token, "token_type": "bearer"}


@router.post("/register")
def register(user_data: UserCreateSchema, db: Session = Depends(get_db)):
    """Register a new user."""
    hashed_password = bcrypt.hashpw(user_data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    new_user = Users(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully", "user_id": new_user.id}
