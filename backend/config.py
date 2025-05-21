import os
from dotenv import load_dotenv

load_dotenv(override=True)

class Settings:
    PROJECT_NAME = "Lynx-Cam"

    # Feed settings
    FEED_FPS = int(os.getenv("FEED_FPS", 10))
    FEED_DIMS = os.getenv("FEED_DIMS", "(854,480)")
    INTRUSION_FLAG_DURATION = int(os.getenv("INTRUSION_FLAG_DURATION", 30))
    # stored as "True" in env, convert to bool
    SHOW_INTRUSION_LINES = os.getenv("SHOW_INTRUSION_LINES", "True")
    SHOW_INTRUSION_FLAG = os.getenv("SHOW_INTRUSION_FLAG", "True")

    # Database settings
    DATABASE_NAME = os.getenv("DATABASE_NAME", "SmartCampus")
    DATABASE_USER = os.getenv("DATABASE_USER", "postgres")
    DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD", "yourpassword")
    DATABASE_HOST = os.getenv("DATABASE_HOST", "localhost")
    DATABASE_PORT = int(os.getenv("DATABASE_PORT", 5432)) 
    DATABASE_DOCKER_NAME = os.getenv("DATABASE_DOCKER_NAME", "postgres-db")
    DATABASE_URL = f"postgresql://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"
    DATABASE_DOCKER_URL = f"postgresql://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_DOCKER_NAME}/{DATABASE_NAME}"

    # Celery settings
    REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
    CELERY_MODULE = os.getenv("CELERY_MODULE", "core.celery")
    CELERY_WORKERS = int(os.getenv("CELERY_WORKERS", 1))
    FEED_WORKERS = int(os.getenv("FEED_WORKERS", 2))
    MODEL_WORKERS = int(os.getenv("MODEL_WORKERS", 1))

    # JWT settings
    SECRET_KEY = os.getenv("SECRET_KEY", "use_random_secret_key") 
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 3000))  
    ADMIN_TOKEN_EXPIRE_MINUTES  = int(os.getenv("ADMIN_TOKEN_EXPIRE_MINUTES", 2000))  
    
    # SMTP settings for email notifications
    SMTP_SERVER = os.getenv("SMTP_SERVER")
    SMTP_PORT = int(os.getenv("SMTP_PORT") or 465)
    SMTP_EMAIL = os.getenv("SMTP_EMAIL")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    
    # Receiver emails list
    RECEIVER_EMAILS = os.getenv("RECEIVER_EMAILS", "")

settings = Settings()