import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import text
from config import settings

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

# Database setup
DATABASE_URL = settings.DATABASE_URL

# Create the SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Define session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_db_connection():
    """Tests the database connection."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        logger.info("Database connected successfully.")
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False  # Explicit failure return


# Import models to ensure tables are created
from models.base import Base

logger.info(f"Tables detected by SQLAlchemy: {Base.metadata.tables.keys()}")
Base.metadata.create_all(bind=engine)
logger.info("✅ Database tables are ready.")


# Test database connection on startup
test_db_connection()

def get_db():
    """Dependency to get the database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
