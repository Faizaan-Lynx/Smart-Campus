from typing import List
from core.database import get_db
from sqlalchemy.orm import Session
from models.users import Users as UserModel
from api.auth.schemas import UserResponseSchema
from api.auth.security import is_admin, get_current_user
from fastapi import APIRouter, Depends, HTTPException, status
from api.users.schemas import UserCreate, UserUpdate, UserBase

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=UserBase, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # Jugaad: Store password as plain text (NOT recommended for production)
    hashed_password = user.password

    new_user = UserModel(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,  # Store plain password
        is_admin=user.is_admin,
        ip_address=user.ip_address,
        license_plate=user.license_plate,
        entered_at_timestamp=user.entered_at_timestamp,
        exit_at_timestamp=user.exit_at_timestamp
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserBase.from_orm(new_user)


@router.get("/", response_model=List[UserBase])
def get_users(db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(is_admin)):
    users = db.query(UserModel).all()
    return [UserBase.from_orm(user) for user in users]


@router.get("/{user_id}", response_model=UserBase)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(get_current_user)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserBase.from_orm(user)


@router.put("/{user_id}", response_model=UserBase)
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(get_current_user)):
    db_user = db.get(UserModel, user_id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = user.model_dump(exclude_unset=True)

    # Jugaad: Store password as plain text if updated
    if "password" in update_data:
        db_user.hashed_password = update_data.pop("password")

    # Bulk update other fields
    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)

    return UserBase.from_orm(db_user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: UserResponseSchema = Depends(is_admin)):
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(db_user)
    db.commit()
    return None