from sqlalchemy.orm import Session
from api.auth.models import User
from api.auth.security import get_password_hash

def get_user_by_username(db: Session, username: str) -> User:
    """Retrieve a user by their username."""
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, username: str, email: str, password: str) -> User:
    """Create a new user with hashed password."""
    hashed_password = get_password_hash(password)
    new_user = User(username=username, email=email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
