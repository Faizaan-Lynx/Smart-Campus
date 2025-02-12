from datetime import datetime, timedelta, timezone
from sqlmodel import Session, SQLModel, create_engine
from passlib.context import CryptContext
from jose import jwt
from config import settings
import requests
from ultralytics import YOLO

db_url = settings.DB_URL


engine = create_engine(db_url, echo=True, 
                    #    connect_args={"check_same_thread": False}
                    )
connection = engine.raw_connection()


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


trackers = {}
reinitialize_tracker_attempts = {}


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    print(to_encode)
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt



def diff_time_stamp(mins: int):
    return datetime.now()+timedelta(minutes=mins)



def get_key():
    response = requests.post('https://open.ezvizlife.com/api/lapp/token/get', 
                            headers={"Content-Type": "application/x-www-form-urlencoded"},
                            data={"appKey": settings.EZV_KEY,
                                "appSecret": settings.EZV_SECRET}
                            )
    if response.status_code == 200:
        return response.json()["data"]["accessToken"]
    else:
        return ""
    
def get_feed_url(accessToken, deviceSerial, code=654321, expireTime=90000, channelNo=1, protocol=2):
    response = requests.post('https://isgpopen.ezvizlife.com/api/lapp/live/address/get', 
                            headers={"Content-Type": "application/x-www-form-urlencoded"},
                            data={"accessToken": accessToken,
                                "deviceSerial": deviceSerial,
                                "code": code,
                                "expireTime": expireTime,
                                "channelNo": channelNo,
                                "protocol": protocol,
                                }
                            )
    if response.status_code == 200:
        return response.json()["data"]["url"]
    else:
        return ""