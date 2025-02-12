from datetime import datetime
from fastapi import Depends, APIRouter, HTTPException, Query
from models import Site, SiteCreate, SitePublic, SiteUpdate, SitePublicWith
from sqlmodel import Session, select
from core import crud, utils

router = APIRouter(
    prefix="/sites", 
    tags=["sites"],
    dependencies=[Depends(crud.get_current_super_user)]
    )

@router.post("/", response_model=SitePublic)
def create_site(*, 
                session: Session = Depends(utils.get_session), 
                site: SiteCreate
                ):
    crud.camera_exists(session, site, True)
    extra_data = {"created_at": datetime.now(),
                  "updated_at": datetime.now()}
    db_site = Site.model_validate(site, update=extra_data)   
    return crud.push_site(session, db_site)


@router.get("/", response_model=list[SitePublicWith])
def read_sites(*,
                session: Session = Depends(utils.get_session),
                offset: int = 0,
                limit: int = Query(default=100, le=100),
                ):
    sites = session.exec(select(Site).offset(offset).limit(limit)).all()
    return sites


@router.get("/{site_id}", response_model=SitePublicWith)
def read_site(*, 
              session: Session = Depends(utils.get_session), 
              site_id: int
              ):
    db_site = session.get(Site, site_id)
    if not db_site:
        raise HTTPException(status_code=404, detail="Site not found")
    return db_site


@router.patch("/{site_id}", response_model=SitePublic)
def update_site(*, 
                session: Session = Depends(utils.get_session), 
                site_id: int, 
                site: SiteUpdate
                ):
    db_site = session.get(Site, site_id)
    if not db_site:
        raise HTTPException(status_code=404, detail="Site not found")
    crud.camera_exists(session, site, False)
    site_data = site.model_dump(exclude_unset=True)
    extra_data = {"updated_at": datetime.now()}
    db_site.sqlmodel_update(site_data, update=extra_data)
    return crud.push_site(session, db_site)



@router.delete("/{site_id}")
def delete_site(*, 
                session: Session = Depends(utils.get_session), 
                site_id: int
                ):
    db_site = session.get(Site, site_id)
    if not db_site:
        raise HTTPException(status_code=404, detail="Site not found")
    session.delete(db_site)
    session.commit()
    return {"ok": True}