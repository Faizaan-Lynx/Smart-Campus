from datetime import datetime, timedelta
import os
from typing import Annotated
from fastapi import Depends, APIRouter, HTTPException, File, UploadFile
from sqlmodel import Session, select, or_
from models import User, UserPublicMe, UserPublicMeWith, UserUpdateMe, Visit
from models import Site, SiteCreate, SitePublicMe, SitePublicMeWith, SiteUpdate
from models import Guest, GuestCreate, GuestPublicMe, GuestPublicWith, GuestUpdateMe, SitePublicMeWithHosts
from core import crud, utils
from config import settings

from deepface import DeepFace
from PIL import Image
from io import BytesIO
import numpy as np

router = APIRouter(
    prefix="/dashboard", 
    tags=["dashboard"],
    )


# @router.get("/", response_model=UserPublicMeWith)
# def read_me(current_user: Annotated[User, Depends(crud.get_current_active_user)]):
#     return current_user


@router.get("/", response_model=UserPublicMeWith)
def read_dashboard(*,
            session: Session = Depends(utils.get_session), 
            current_user: Annotated[User, Depends(crud.get_current_active_user)]
            ):
    session.add(current_user)
    return current_user


@router.patch("/", response_model=UserPublicMe)
def update_dashboard(*,
              session: Session = Depends(utils.get_session), 
              current_user: Annotated[User, Depends(crud.get_current_active_user)], 
              user: UserUpdateMe
              ):
    return crud.edit_user(session, current_user, user)



@router.delete("/")
def delete_dashboard(*,
              session: Session = Depends(utils.get_session),
              current_user: Annotated[User, Depends(crud.get_current_active_user)], 
              ):
    session.delete(current_user)
    session.commit()
    return {"ok": True}


# --------------------
# ------ Sites -------
# --------------------

@router.post("/sites", response_model=SitePublicMe)
def create_site(*, 
                session: Session = Depends(utils.get_session),
                current_user: Annotated[User, Depends(crud.get_current_active_user)], 
                site: SiteCreate
                ):
    crud.camera_exists(session, site, create=True)
    extra_data = {"created_at": datetime.now(),
                  "updated_at": datetime.now()}
    db_site = Site.model_validate(site, update=extra_data)   
    db_site  = crud.push_site(session, db_site)
    session.add(current_user)
    current_user.sites.append(db_site)
    session.commit()
    return db_site



@router.get("/sites/{site_id}", response_model=SitePublicMeWith)
def read_site(*, 
              session: Session = Depends(utils.get_session),
              current_user: Annotated[User, Depends(crud.get_current_active_user)], 
              site_id: int
              ):
    current_site = crud.get_current_site(session, current_user, site_id)
    # access_token = utils.get_key()
    # in_url= utils.get_feed_url(access_token, current_site.in_camera)
    # out_url= utils.get_feed_url(access_token, current_site.out_camera)
    # current_site.in_url = in_url
    # current_site.out_url = out_url
    # session.add(current_site)
    # session.commit()
    return current_site


@router.get("/site_visits_short/{site_id}")
def read_site_visits_short(*, 
              session: Session = Depends(utils.get_session),
              current_user: Annotated[User, Depends(crud.get_current_active_user)], 
              site_id: int
              ):
    session.add(current_user)
    user_site_ids = [site.id for site in current_user.sites]
    if site_id not in user_site_ids:
        raise HTTPException(status_code=403, detail="Access only allowed for own sites")
    now = datetime.now()
    yester = now - timedelta(days=1)
    today = now.strftime("%Y-%m-%d")
    yesterday = yester.strftime("%Y-%m-%d")

    query = select(Visit).filter(or_(Visit.date_in==today, Visit.date_in == yesterday))
    visits = session.exec(query).all()
    if not visits:
        raise HTTPException(status_code=404, detail="No visits for this site")
    print(visits)
    return visits


@router.get("/sites/{site_id}/urlin", response_model=SitePublicMeWith)
def refresh_site_in_url(*, 
            session: Session = Depends(utils.get_session),
            current_user: Annotated[User, Depends(crud.get_current_active_user)], 
            site_id: int,
            ):
    current_site = crud.get_current_site(session, current_user, site_id)
    if current_site.in_camera is None:
        raise HTTPException(status_code=403, detail="In camera field for the site is not set")
    
    access_token = utils.get_key()
    if not access_token:
        raise HTTPException(status_code=403, detail="Could not get token")
    
    in_url= utils.get_feed_url(access_token, current_site.in_camera)
    if not in_url:
        raise HTTPException(status_code=403, detail="Could not get feed url")
    
    current_site.in_url = in_url
    session.add(current_site)
    session.commit()
    return current_site


@router.get("/sites/{site_id}/urlout", response_model=SitePublicMeWith)
def refresh_site_out_url(*, 
            session: Session = Depends(utils.get_session),
            current_user: Annotated[User, Depends(crud.get_current_active_user)], 
            site_id: int,
            ):
    current_site = crud.get_current_site(session, current_user, site_id)
    if current_site.out_camera is None:
        raise HTTPException(status_code=403, detail="Out camera field for the site is not set")
    
    access_token = utils.get_key()
    if not access_token:
        raise HTTPException(status_code=403, detail="Could not get token")
    
    out_url= utils.get_feed_url(access_token, current_site.out_camera)
    if not out_url:
        raise HTTPException(status_code=403, detail="Could not get feed url")
    
    current_site.out_url = out_url
    session.add(current_site)
    session.commit()
    return current_site


@router.patch("/sites/{site_id}", response_model=SitePublicMe)
def update_site(*, 
                session: Session = Depends(utils.get_session),
                current_user: Annotated[User, Depends(crud.get_current_active_user)], 
                site_id: int, 
                site: SiteUpdate
                ):
    db_site = crud.get_current_site(session, current_user, site_id)
    crud.camera_exists(session, db_site, create=False, site_id=site_id)
    site_data = site.model_dump(exclude_unset=True)
    extra_data = {"updated_at": datetime.now()}
    db_site.sqlmodel_update(site_data, update=extra_data)
    return crud.push_site(session, db_site)



@router.delete("/sites/{site_id}")
def delete_site(*, 
                session: Session = Depends(utils.get_session),
                current_user: Annotated[User, Depends(crud.get_current_active_user)], 
                site_id: int):
    db_site = crud.get_current_site(session, current_user, site_id)
    session.delete(db_site)
    session.commit()
    return {"ok": True}


# --------------------
# ------ Hosts -------
# --------------------


@router.post("/sites/{site_id}/hosts", response_model=GuestPublicMe)
def create_host(*, 
                session: Session = Depends(utils.get_session),
                current_user: Annotated[User, Depends(crud.get_current_active_user)], 
                site_id: int,
                host: GuestCreate
                ):
    _ = crud.get_current_site(session, current_user, site_id)
    if host.vector is not None:
        crud.vector_exists(session, host, site_id)
    extra_data = {"site_id": site_id,
                  "is_host": True}
    db_host = Guest.model_validate(host, update=extra_data)
    session.add(db_host)
    session.commit()
    session.refresh(db_host)
    return db_host



@router.get("/sites/{site_id}/hosts", response_model=SitePublicMeWithHosts)
def read_hosts(*, 
              session: Session = Depends(utils.get_session),
              current_user: Annotated[User, Depends(crud.get_current_active_user)], 
              site_id: int,
              ):
    current_site = crud.get_current_site(session, current_user, site_id)
    return current_site



@router.get("/sites/{site_id}/hosts/{host_id}", response_model=GuestPublicWith)
def read_host(*, 
              session: Session = Depends(utils.get_session),
              current_user: Annotated[User, Depends(crud.get_current_active_user)], 
              site_id: int,
              host_id: int,
              ):
    current_site = crud.get_current_site(session, current_user, site_id)
    return crud.get_host_of_site(session, current_site, host_id)



@router.patch("/sites/{site_id}/hosts/{host_id}", response_model=GuestPublicMe)
def update_host(*, 
                session: Session = Depends(utils.get_session), 
                current_user: Annotated[User, Depends(crud.get_current_active_user)], 
                site_id: int,
                host_id: int,
                host: GuestUpdateMe
                ):
    current_site = crud.get_current_site(session, current_user, site_id)
    db_host = crud.get_host_of_site(session, current_site, host_id)
    if host.vector is not None:
        crud.vector_exists(session, host, site_id)
    host_data = host.model_dump(exclude_unset=True)
    extra_data = {"site_id": site_id,
                  "updated_at": datetime.now()}
    db_host.sqlmodel_update(host_data, update=extra_data)
    session.add(db_host)
    session.commit()
    session.refresh(db_host)
    return db_host


@router.delete("/sites/{site_id}/hosts/{host_id}")
def delete_host(*, 
                session: Session = Depends(utils.get_session),
                current_user: Annotated[User, Depends(crud.get_current_active_user)], 
                site_id: int, 
                host_id: int
                ):
    current_site = crud.get_current_site(session, current_user, site_id)
    db_host = crud.get_host_of_site(session, current_site, host_id)
    session.delete(db_host)
    session.commit()
    return {"ok": True}


@router.post("/get_vector")
async def get_vector(*, 
                current_user: Annotated[User, Depends(crud.get_current_active_user)],
                # file: Annotated[Union[bytes, None], File()] = None
                image: UploadFile = File(...)
                ):
   
    try:
        file_path = os.path.join(settings.HOST_DIRECTORY, image.filename)
        with open(file_path, "wb") as file_object:
            file_object.write(await image.read())

        pers_vs = DeepFace.represent(
            file_path,
            model_name='SFace',
            enforce_detection=False,
            detector_backend='yolov8',
        )

        return pers_vs

    except Exception as e:
        return {"error": str(e)}