from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from api.auth.services import authenticate_user, generate_jwt_token
from api.auth.schemas import TokenResponse, LoginRequest

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login_for_access_token(
    form_data: LoginRequest,  # Use Pydantic schema for validation
    db: Session = Depends(get_db)
):
    """Authenticate user and return JWT token."""
    user = authenticate_user(db, form_data.username, form_data.password)
    access_token = generate_jwt_token(user)

    return TokenResponse(access_token=access_token, token_type="bearer", is_admin=user.is_admin)
