from jose import jwt
from datetime import datetime, timedelta
from config import settings

def create_access_token(user_id: int, username: str, is_admin: bool):
    """
    Generate a JWT token for users and admins with different expiration times.
    """
    expire_minutes = settings.ADMIN_TOKEN_EXPIRE_MINUTES if is_admin else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    expire = datetime.utcnow() + timedelta(minutes=expire_minutes)

    payload = {
        "sub": username,
        "id": user_id,
        "role": "admin" if is_admin else "user",
        "exp": expire
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
