from datetime import datetime
from fastapi import Depends, APIRouter, HTTPException, Query
from sqlmodel import Session, select
from models import User, UserCreate, UserPublic, UserUpdate, UserPublicWith, Site
from core import crud, utils

router = APIRouter(
    prefix="/users", 
    tags=["users"],
    dependencies=[Depends(crud.get_current_super_user)]
    )


@router.post("/", response_model=UserPublic)
def create_user(*, session: Session = Depends(utils.get_session), user: UserCreate):
    return crud.add_user(session, user)


@router.get("/", response_model=list[UserPublic])
def read_users(*,
                session: Session = Depends(utils.get_session),
                offset: int = 0,
                limit: int = Query(default=100, le=100),
                ):
    users = session.exec(select(User).offset(offset).limit(limit)).all()
    return users


@router.get("/{user_id}", response_model=UserPublicWith)
def read_user(*, session: Session = Depends(utils.get_session), user_id: int):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserPublic)
def update_user(*, 
                session: Session = Depends(utils.get_session), 
                user_id: int, 
                user: UserUpdate
                ):
    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.edit_user(session, db_user, user)



@router.delete("/{user_id}")
def delete_user(*, session: Session = Depends(utils.get_session), user_id: int):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.username == 'khawir' or user.id == 1:
        raise HTTPException(status_code=404, detail="This user cannot be deleted")
    session.delete(user)
    session.commit()

@router.patch("/{user_id}/site/{site_id}", response_model=UserPublicWith)
def add_user_site(*, 
                session: Session = Depends(utils.get_session), 
                user_id: int, 
                site_id: int,
                ):
    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    user_site_list = [site.id for site in db_user.sites]
    if site_id in user_site_list:
        raise HTTPException(status_code=404, detail=f"Site '{site_id}' already associated with the user")
    db_site = session.get(Site, site_id)
    if not db_site:
        raise HTTPException(status_code=404, detail="Site not found")
    db_user.sites.append(db_site)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


@router.patch("/{user_id}/notsite/{site_id}", response_model=UserPublicWith)
def delete_user_site(*, 
                session: Session = Depends(utils.get_session), 
                user_id: int, 
                site_id: int,
                ):
    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    user_site_list = [site.id for site in db_user.sites]
    if site_id not in user_site_list:
        raise HTTPException(status_code=404, detail=f"Site '{site_id}' not associated with the user")
    db_site = session.get(Site, site_id)
    if not db_site:
        raise HTTPException(status_code=404, detail="Site not found")
    db_user.sites.remove(db_site)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user