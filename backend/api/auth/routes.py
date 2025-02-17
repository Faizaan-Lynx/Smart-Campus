from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.database import get_db
from models.users import Users
from api.auth.security import create_access_token
from api.auth.schemas import UserLoginSchema, TokenSchema, UserCreateSchema
import bcrypt

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=TokenSchema)
def login(user_credentials: UserLoginSchema, db: Session = Depends(get_db)):
    """
    Authenticate user and return a JWT token.
    - Checks if the user exists.
    - Verifies the password using bcrypt.
    - Returns a role-based JWT token.
    """
    user = db.query(Users).filter(Users.username == user_credentials.username).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    if not bcrypt.checkpw(user_credentials.password.encode("utf-8"), user.hashed_password.encode("utf-8")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    # Generate a token with role-based expiry
    token = create_access_token(user.id, user.username, user.is_admin)

    return {"access_token": token, "token_type": "bearer"}


@router.post("/register")
def register(user_data: UserCreateSchema, db: Session = Depends(get_db)):
    """
    Register a new user.
    - Checks for duplicate username or email.
    - Hashes the password securely.
    - Saves the new user in the database.
    """
    existing_user = db.query(Users).filter(
        (Users.username == user_data.username) | (Users.email == user_data.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )

    hashed_password = bcrypt.hashpw(user_data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    new_user = Users(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        is_admin=False  # Default users are not admins
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully", "user_id": new_user.id}
