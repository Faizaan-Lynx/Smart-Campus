import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import text
from config import settings

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

# use DATABASE_URL for local development and DATABASE_DOCKER_URL for if postgres is running in a docker container
# DATABASE_URL = settings.DATABASE_URL
try:
    DATABASE_URL = settings.DATABASE_DOCKER_URL
    engine = create_engine(DATABASE_URL)
except Exception as e:
    DATABASE_URL = settings.DATABASE_URL
    engine = create_engine(DATABASE_URL)

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
        return False


# Import models to ensure tables are created
from models import Base

logger.info(f"Tables detected by SQLAlchemy: {Base.metadata.tables.keys()}")
Base.metadata.create_all(bind=engine)
logger.info("✅ Database tables are ready.")


def ensure_new_columns():
    """
    Idempotently add columns that were introduced after the tables were first created.
    `create_all` only creates missing tables, never modified columns, so these ALTER
    statements keep an existing database in sync without requiring a manual migration.
    Uses `ADD COLUMN IF NOT EXISTS` so this is a no-op once the columns exist.
    """
    statements = [
        "ALTER TABLE cameras ADD COLUMN IF NOT EXISTS detect_fire_smoke BOOLEAN DEFAULT FALSE",
        "ALTER TABLE alerts ADD COLUMN IF NOT EXISTS alert_type VARCHAR DEFAULT 'intrusion'",
    ]
    try:
        with engine.connect() as connection:
            for stmt in statements:
                connection.execute(text(stmt))
            connection.commit()
        logger.info("✅ Database columns are up to date.")
    except Exception as e:
        logger.warning(f"Could not sync new columns (will be handled by migration): {e}")


ensure_new_columns()


# on startup, test conn
test_db_connection()

def get_db():
    """Dependency to get the database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
