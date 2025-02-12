from datetime import timedelta
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.auth.security import generate_jwt_token, verify_password
from api.auth import crud
from core.database import get_db
from config import settings

def authenticate_user(db: Session, username: str, password: str):
    """Verify user credentials and return the user object if valid."""
    user = crud.get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    return user

def generate_jwt_token(user):
    """Generate a JWT access token for the authenticated user."""
    return create_access_token(
        data={"sub": str(user.id), "is_admin": user.is_admin},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check if the provided password matches the hashed password."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password before storing it."""
    return pwd_context.hash(password)
