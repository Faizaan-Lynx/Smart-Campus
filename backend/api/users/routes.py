from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from models.users import Users as UserModel
from api.users.schemas import UserCreate, UserUpdate, User
from core.database import get_db

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # Hash password before storing
    user.hash_password()

    new_user = UserModel(
        username=user.username,
        email=user.email,
        hashed_password=user.password,  # Store hashed password
        is_admin=user.is_admin,
        ip_address=user.ip_address
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return User.from_orm(new_user)


@router.get("/", response_model=List[User])
def get_users(db: Session = Depends(get_db)):
    users = db.query(UserModel).all()
    return [User.from_orm(user) for user in users]


@router.get("/{user_id}", response_model=User)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return User.from_orm(user)


@router.put("/{user_id}", response_model=User)
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Rehash password if provided
    user.process_password()

    for key, value in user.dict(exclude_unset=True).items():
        if key == "password":
            db_user.hashed_password = value  # Store hashed password
        else:
            setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    return User.from_orm(db_user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(db_user)
    db.commit()
    return None