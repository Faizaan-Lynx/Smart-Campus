from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

# Database setup
engine = create_engine(settings.DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# 🚀 Automatically create tables on startup
from api.users.models import User
from api.cameras.models import Camera
from api.user_cameras.models import user_cameras

Base.metadata.create_all(engine)  # ✅ Auto-create tables if they don’t exist


def get_db():
    """Dependency to get the database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
