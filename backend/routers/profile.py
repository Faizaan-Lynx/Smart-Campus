from datetime import datetime, timedelta
from typing import Annotated
from fastapi import Depends, APIRouter, HTTPException, File, UploadFile
from sqlmodel import Session, select, or_
from models import User, UserPublicMe, UserPublicMeWith, UserUpdateMe, Visit
from models import Site, SiteCreate, SitePublicMe, SitePublicMeWith, SiteUpdate
from core import crud, utils


router = APIRouter(
    prefix="/dashboard", 
    tags=["dashboard"],
    )


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