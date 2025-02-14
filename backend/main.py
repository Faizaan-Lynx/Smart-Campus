from datetime import datetime, timedelta
from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from config import settings
import numpy as np

from models import Token, Site, Guest, Visit, User, UserPublicMe, UserCreate, VisitOut, VisitPublic, VisitPublicWithGuest, VisitIn, VisitUpdate
from routers import stream, users, sites, visits, guests, profile, notify, hangaround, intrusion
from core import utils, crud

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router)
app.include_router(users.router)
app.include_router(sites.router)
app.include_router(visits.router)
app.include_router(guests.router)
app.include_router(stream.router)
app.include_router(notify.router)
app.include_router(hangaround.router)
app.include_router(intrusion.router)

@app.on_event("startup")
def on_startup():
    utils.create_db_and_tables()
    crud.create_su()
    notify.listen_to_notifications()

@app.get("/")
async def root():
    return {"message": "Pulsse spalsh screen!"}

@app.post("/login")
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    user = crud.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = utils.create_access_token(
        data={"sub": user.username, "is_superuser": user.is_su}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")



@app.post("/register", response_model=UserPublicMe)
def register_user(*, session: Session = Depends(utils.get_session), user: UserCreate):
    return crud.add_user(session, user)



@app.post("/in", response_model=VisitPublicWithGuest)
def visit_in(*,
            session: Session = Depends(utils.get_session),
            user: Annotated[User, Depends(crud.get_current_super_user)],
            visit: VisitIn
            ):
    db_visit = Visit.model_validate(visit)
    session.add(db_visit)
    session.commit()
    
    visit_vector = visit.vector

    if(visit_vector):       
        v0 = np.array(visit_vector)

        db_data = session.exec(select(Guest.id, Guest.vector)).all()

        if db_data:
            dists = (0, 2)
            for db_id, db_vector in db_data:
                v = [float(x) for x in db_vector.split(",")]
                v1 = np.array(v)

                if len(v0) == len(v1):
                    a = np.matmul(np.transpose(v0), v1)
                    b = np.sum(np.multiply(v0, v0))
                    c = np.sum(np.multiply(v1, v1))
                    dist = 1 - (a / (np.sqrt(b) * np.sqrt(c)))
                    print("="*50)
                    print(f"dist with {db_id}: {dist}")
                    
                    if dist < dists[1]:
                        dists = (db_id, dist)

            if dists[1] <= 0.593:
                match = dists[0]
                print("="*50)
                print(f"match found at id {match}")
                extra_data = {"guest_id": match,
                            "is_new": False}
                db_visit.sqlmodel_update(db_visit, update=extra_data)
                session.add(db_visit)
                session.commit()
                session.refresh(db_visit)
                return db_visit
            
        print("="*50)
        print(f"adding new guest entry: {visit.track_id}")                     
        guest = {}
        guest["name"] = visit.track_id
        guest["vector"] = ",".join(str(x) for x in visit_vector)
        guest["site_id"] = visit.site_id   #will not be using till we have is_host field
        db_guest = Guest(**guest)
        session.add(db_guest)
        session.commit()

    session.refresh(db_visit)
    return db_visit

@app.post("/out", response_model=VisitPublic)
def visit_out(*,
             session: Session = Depends(utils.get_session),
             user: Annotated[User, Depends(crud.get_current_super_user)],
             visit: VisitOut
             ):
    query = select(Visit).filter(Visit.site_id == visit.site_id , Visit.time_out == None).order_by(Visit.date_in, Visit.time_in)
    fifo_visit = session.exec(query).first()
    if not fifo_visit:
        raise HTTPException(status_code=404, detail="Entry list shorter than exit")
    print(fifo_visit)
    visit_data = visit.model_dump(exclude_unset=True)
    fifo_visit.sqlmodel_update(visit_data)
    session.add(fifo_visit)
    session.commit()
    session.refresh(fifo_visit)
    return fifo_visit


@app.get("/seed")
def seed_db(*,
    session: Session = Depends(utils.get_session), 
    user: Annotated[User, Depends(crud.get_current_super_user)],
    ):
    u1 = User(username="cs_admin", password=utils.get_password_hash("csa"), disabled=False)
    u2 = User(username="is_admin", password=utils.get_password_hash("isa"), disabled=False)
    u3 = User(username="cs_is_admin", password=utils.get_password_hash("csisa"), disabled=False)
    u4 = User(username="ee_admin", password=utils.get_password_hash("eea"), disabled=False)
    s1 = Site(name="CS Dept", location="MCS", in_camera="2a")
    s2 = Site(name="IS Dept", location="NRB", in_camera="AA4823505", out_camera="AB9438217")
    s3 = Site(name="EE Dept", location="MCS", in_camera="1a")
    u1.sites.append(s1)
    u2.sites.append(s2)
    u3.sites.extend([s1, s2])
    u4.sites.append(s3)
    session.add(u1)
    session.add(u2)
    session.add(u3)
    session.add(u4)
    session.add(s1)
    session.add(s2)
    session.add(s3)
    session.add(Guest(name="Arsalan", vector="9874676132", is_female=False,site_id=1))
    session.add(Guest(name="Zubeela", vector="8564245686", is_female=True, site_id=1))
    session.add(Guest(name="Zarnaab", vector="5458615856", is_female=False,site_id=2))
    session.add(Guest(name="Sarmaad", vector="1265645865", is_female=False,site_id=3))
    session.add(Guest(name="g1", vector="11111"))
    session.add(Guest(name="g2", vector="11112"))
    session.add(Guest(name="g3", vector="11113"))
    session.add(Guest(name="g4", vector="11114"))
    session.add(Guest(name="g5", vector="11115"))
    session.add(Guest(name="g6", vector="11116"))
    session.add(Guest(name="g7", vector="11117"))
    session.add(Guest(name="g8", vector="11118"))
    session.add(Guest(name="g9", vector="11119"))
    session.add(Guest(name="gA", vector="11120"))
    session.add(Guest(name="gB", vector="11121"))
    session.add(Visit(time_in=utils.diff_time_stamp(1).time(), time_out=utils.diff_time_stamp(5).time(), is_group=False, is_female=False, is_new=False, site_id=1, guest_id=1))
    session.add(Visit(time_in=utils.diff_time_stamp(3).time(), time_out=utils.diff_time_stamp(15).time(), is_group=True, is_female=False, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(4).time(), time_out=utils.diff_time_stamp(10).time(), is_group=True, is_female=False, site_id=1))
    session.add(Visit(time_in=utils.diff_time_stamp(5).time(), time_out=utils.diff_time_stamp(8).time(), is_group=False, is_female=True, is_new=False, site_id=1, guest_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(8).time(), time_out=utils.diff_time_stamp(6).time(), is_group=True, is_female=False, is_new=False, site_id=2, guest_id=1))
    session.add(Visit(time_in=utils.diff_time_stamp(10).time(), time_out=utils.diff_time_stamp(4).time(), is_group=True, is_female=False, is_new=False, site_id=2, guest_id=3))
    session.add(Visit(time_in=utils.diff_time_stamp(12).time(), time_out=utils.diff_time_stamp(15).time(), is_group=False, is_female=False, is_new=False, site_id=2, guest_id=4))
    session.add(Visit(time_in=utils.diff_time_stamp(18).time(), time_out=utils.diff_time_stamp(2).time(), is_group=False, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(20).time(), time_out=utils.diff_time_stamp(6).time(), is_group=False, is_female=True, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(25).time(), time_out=utils.diff_time_stamp(4).time(), is_group=False, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(29).time(), time_out=utils.diff_time_stamp(11).time(), is_group=False, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(33).time(), time_out=utils.diff_time_stamp(13).time(), is_group=False, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(40).time(), time_out=utils.diff_time_stamp(18).time(), is_group=False, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(42).time(), time_out=utils.diff_time_stamp(4).time(), is_group=False, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(43).time(), time_out=utils.diff_time_stamp(5).time(), is_group=False, is_female=True, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(43).time(), time_out=utils.diff_time_stamp(8).time(), is_group=False, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(44).time(), time_out=utils.diff_time_stamp(7).time(), is_group=True, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(44).time(), time_out=utils.diff_time_stamp(7).time(), is_group=True, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(46).time(), time_out=utils.diff_time_stamp(9).time(), is_group=False, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(49).time(), time_out=utils.diff_time_stamp(9).time(), is_group=False, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(50).time(), time_out=utils.diff_time_stamp(8).time(), is_group=False, is_female=True, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(55).time(), time_out=utils.diff_time_stamp(6).time(), is_group=False, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(59).time(), time_out=utils.diff_time_stamp(9).time(), is_group=False, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(62).time(), time_out=utils.diff_time_stamp(11).time(), is_group=False, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(63).time(), time_out=utils.diff_time_stamp(9).time(), is_group=False, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(65).time(), time_out=utils.diff_time_stamp(10).time(), is_group=True, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(65).time(), time_out=utils.diff_time_stamp(10).time(), is_group=True, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(68).time(), time_out=utils.diff_time_stamp(9).time(), is_group=False, is_female=False, is_new=True, site_id=2))
    session.add(Visit(time_in=utils.diff_time_stamp(70).time(), time_out=utils.diff_time_stamp(7).time(), is_group=False, is_female=True, is_new=True, site_id=2))
    session.commit()
    return {"message": "DB seeded!"}



# @app.get("/feed_url/")
# def get_feed(*,
#     session: Session = Depends(utils.get_session), 
#     user: Annotated[User, Depends(crud.get_current_super_user)],
#     ):