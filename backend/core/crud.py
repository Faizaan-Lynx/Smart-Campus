from datetime import datetime
from typing import Annotated
from sqlmodel import Session, select
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import core.utils as utils
from models import User, UserCreate, Site, SiteCreate, Guest
from models import TokenData
from config import settings


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def authenticate_user(username: str, password: str):
    with Session(utils.engine) as session:
        statement = select(User).where(User.username == username)
        user = session.exec(statement).first()
        if not user:
            return False
        if not utils.verify_password(password, user.password):
            return False
        if user.disabled:
            raise HTTPException(status_code=400, detail="Inactive user")
        return user



def get_user(username: str):
    with Session(utils.engine) as session:
        statement = select(User).where(User.username == username)
        user = session.exec(statement).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user



def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user



def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user



def get_current_super_user(
    current_user: Annotated[User, Depends(get_current_user)],
):
    if not current_user.is_su:
        raise HTTPException(status_code=403, detail="Action only allowed for admin")
    return current_user



def add_user(session: Session, user: UserCreate):
    statement = select(User).where(User.username == user.email)
    db_user = session.exec(statement).first()
    if not db_user:
        hashed_password = utils.get_password_hash(user.password)
        extra_data = {"password": hashed_password,
                    "username": user.email,
                    "created_at": datetime.now(),
                    "updated_at": datetime.now()}
        db_user = User.model_validate(user, update=extra_data)
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
        return db_user
    raise HTTPException(status_code=400, detail="Email already registered")



def edit_user(session: Session, db_user: User, user):
    user_data = user.model_dump(exclude_unset=True)
    if "password" in user_data:
        hashed_password = utils.get_password_hash(user_data["password"])
        user_data["password"] = hashed_password
    extra_data = {"updated_at": datetime.now()}
    db_user.sqlmodel_update(user_data, update=extra_data)
    try:
        session.add(db_user)
        session.commit()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Update failed -> Hint: check for unique username")
    else:
        session.refresh(db_user)
        return db_user



# --------------------
# ------ Sites -------
# --------------------



def camera_exists(session: Session, site, create, site_id=None):
    exists_in = False
    exists_out = False
    if create:
        query = select(Site.in_camera, Site.out_camera).filter(Site.in_camera != None, Site.out_camera != None)
    else:
        query = select(Site.in_camera, Site.out_camera).filter(Site.id != site_id, Site.in_camera != None, Site.out_camera != None)
    cameras = session.exec(query).all()
    camera_list = [item for inner_tuple in cameras for item in inner_tuple if item is not None]
    print(camera_list)
    if site.in_camera is not None:
        if site.in_camera in camera_list:
            exists_in = True
    if site.out_camera is not None:
        if site.out_camera in camera_list:
            exists_out = True
    if exists_in:
        raise HTTPException(status_code=400, detail=f"Camera (Device ID) already exists in in_camers")
    if exists_out:
        raise HTTPException(status_code=400, detail=f"Camera (Device ID) already exists in in_camers")
    



def push_site(session: Session, site: SiteCreate):
    try:
        session.add(site)
        session.commit()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Action failed -> Hint: Check for unique site name")
    else:
        session.refresh(site)
        return site



def get_current_site(session: Session, current_user: User, site_id: int):
    session.add(current_user)
    user_site_ids = [site.id for site in current_user.sites]
    if site_id not in user_site_ids:
        raise HTTPException(status_code=403, detail="Access only allowed for own sites")
    site = session.get(Site, site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site
    



# --------------------
# ------ Hosts -------
# --------------------

def vector_exists(session: Session, guest, site_id):
    statement = select(Guest).where(Guest.vector == guest.vector, Guest.site_id == site_id)
    db_guest = session.exec(statement).first()
    if db_guest:
        raise HTTPException(status_code=400, detail=f"Guest/Host vector already exists at id {db_guest.id}")



def get_host_of_site(session: Session, current_site: Site, host_id:int):
    site_host_ids = [host.id for host in current_site.hosts]
    if host_id not in site_host_ids:
        raise HTTPException(status_code=403, detail="Access only allowed for own hosts")
    host = session.get(Guest, host_id)
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    return host





# --------------------
# ------ Admin -------
# --------------------



def create_su():
    with Session(utils.engine) as session:
        statement = select(User).where(User.username == settings.SU_NAME)
        su = session.exec(statement).first()
        if not su:
           su = User(
               username = settings.SU_NAME,
               password = utils.get_password_hash(settings.SU_PASSWORD),
               is_su=True,
               disabled=False
               )
           session.add(su)
           session.commit()