from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

# Database setup
engine = create_engine(settings.DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Move model imports inside function to avoid circular imports
def create_tables():
    from api.users.models import User 
    from api.cameras.models import Camera  
    from api.user_cameras.models import user_cameras  # Import association table
    print("Creating tables...")
    Base.metadata.create_all(engine)
    print("✅ Tables created successfully!")

create_tables()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
