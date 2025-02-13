from sqlalchemy.orm import Session
from fastapi import HTTPException
from api.users import models, schemas
from api.users.security import hash_password

def create_user(db: Session, user_data: schemas.UserCreate):
    try:
        hashed_pw = hash_password(user_data.password)
        new_user = models.User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_pw
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

def get_user_by_id(db: Session, user_id: int):
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")

def update_user(db: Session, user_id: int, update_data: schemas.UserCreate):
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.username = update_data.username
        user.email = update_data.email
        user.hashed_password = hash_password(update_data.password)
        
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")

def delete_user(db: Session, user_id: int):
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        db.delete(user)
        db.commit()
        return {"message": "User deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")
