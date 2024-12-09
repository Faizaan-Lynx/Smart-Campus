import os
from dotenv import load_dotenv

from pathlib import Path
env_path = Path('.env')
load_dotenv(dotenv_path=env_path)

destination = "./hosts"
os.makedirs(destination, exist_ok=True)

class Settings:
    PROJECT_NAME:str = "Pulsse"
    PROJECT_VERSION: str = "1.0.0"
    DB_SERVER = os.getenv("DB_SERVER", "localhost")
    DB_NAME = os.getenv("DB_NAME")
    DB_PORT = os.getenv("DB_PORT", 5432)
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_SQLITE = os.getenv("DB_SQLITE")
    DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_SERVER}:{DB_PORT}/{DB_NAME}"
    DB_SQLITE = f"sqlite:///{DB_SQLITE}"
    SECRET_KEY = os.getenv("SECRET_KEY")
    ALGORITHM = os.getenv("ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
    SU_NAME = os.getenv("SU_NAME")
    SU_PASSWORD = os.getenv("SU_PASSWORD")
    EZV_KEY = os.getenv("EZV_KEY")
    EZV_SECRET = os.getenv("EZV_SECRET")
    MAXIMUM_RECONNECT_ATTEMPTS = int(os.getenv("MAXIMUM_RECONNECT_ATTEMPTS"))
    STREAM_FRAME_QUALITY=int(os.getenv("STREAM_FRAME_QUALITY"))
    HOST_DIRECTORY = destination

# INSERT INTO user (username, full_name, email, password, disabled) VALUES ('johndoe', 'John Doe', 'johndoe@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', False)

settings = Settings()