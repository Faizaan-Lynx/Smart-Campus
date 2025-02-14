from jose import jwt
from datetime import datetime, timedelta
from config import settings

def create_access_token(data: dict):
    """Generate JWT token using config settings."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
