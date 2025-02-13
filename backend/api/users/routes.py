from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from api.users import schemas, services

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return services.create_user(db, user)

@router.get("/{user_id}", response_model=schemas.UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    return services.get_user_by_id(db, user_id)

@router.put("/{user_id}", response_model=schemas.UserResponse)
def update_user(user_id: int, user: schemas.UserCreate, db: Session = Depends(get_db)):
    return services.update_user(db, user_id, user)

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    return services.delete_user(db, user_id)
