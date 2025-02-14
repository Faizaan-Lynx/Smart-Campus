from datetime import datetime
from fastapi import Depends, APIRouter, HTTPException, Query
from models import Guest, GuestCreate, GuestPublic, GuestUpdate, GuestPublicWith
from sqlmodel import Session, select
from core import crud, utils

router = APIRouter(
    prefix="/guests", 
    tags=["guests"],
    dependencies=[Depends(crud.get_current_super_user)]
    )

@router.post("/", response_model=GuestPublic)
def create_guest(*, 
                 session: Session = Depends(utils.get_session), 
                 guest: GuestCreate
                 ):
    # crud.vector_exists(session, guest)
    db_guest = Guest.model_validate(guest)
    session.add(db_guest)
    session.commit()
    session.refresh(db_guest)
    return db_guest
    

@router.get("/", response_model=list[GuestPublic])
def read_guests(*,
                session: Session = Depends(utils.get_session),
                offset: int = 0,
                limit: int = Query(default=100, le=100),
                ):
    guests = session.exec(select(Guest).offset(offset).limit(limit)).all()
    return guests



@router.get("/{guest_id}", response_model=GuestPublicWith)
def read_guest(*, 
               session: Session = Depends(utils.get_session), 
               guest_id: int
               ):
    guest = session.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    return guest



@router.patch("/{guest_id}", response_model=GuestPublic)
def update_guest(*, 
                session: Session = Depends(utils.get_session), 
                guest_id: int, 
                guest: GuestUpdate
                ):
    db_guest = session.get(Guest, guest_id)
    if not db_guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    # if guest.vector is not None:
    #     crud.vector_exists(session, guest)
    guest_data = guest.model_dump(exclude_unset=True)
    extra_data = {"updated_at": datetime.now()}
    db_guest.sqlmodel_update(guest_data, update=extra_data)
    session.add(db_guest)
    session.commit()
    session.refresh(db_guest)
    return db_guest


@router.delete("/{guest_id}")
def delete_guest(*, 
                 session: Session = Depends(utils.get_session), 
                 guest_id: int
                 ):
    db_guest = session.get(Guest, guest_id)
    if not db_guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    session.delete(db_guest)
    session.commit()
    return {"ok": True}