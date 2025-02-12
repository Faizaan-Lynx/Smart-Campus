from datetime import datetime
from fastapi import Depends, APIRouter, HTTPException, Query
from models import Visit, VisitCreate, VisitPublic, VisitUpdate, VisitPublicWith
from sqlmodel import Session, select
from core import crud, utils

router = APIRouter(
    prefix="/visits", 
    tags=["visits"],
    dependencies=[Depends(crud.get_current_super_user)]
    )

@router.post("/", response_model=VisitPublic)
def create_visit(*, session: Session = Depends(utils.get_session), visit: VisitCreate):
    now = datetime.now()
    # extra_data = {"date_in": now.date(),
    #               "time_in": now.time()}
    db_visit = Visit.model_validate(visit, 
                                    # update=extra_data
                                    )
    session.add(db_visit)
    session.commit()
    session.refresh(db_visit)
    return db_visit

@router.get("/", response_model=list[VisitPublic])
def read_visits(*,
                session: Session = Depends(utils.get_session),
                offset: int = 0,
                limit: int = Query(default=100, le=100),
                ):
    visits = session.exec(select(Visit).offset(offset).limit(limit)).all()
    return visits

@router.get("/{visit_id}", response_model=VisitPublicWith)
def read_visit(*, session: Session = Depends(utils.get_session), visit_id: int):
    visit = session.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    return visit

@router.patch("/{visit_id}", response_model=VisitPublic)
def update_visit(*, 
                session: Session = Depends(utils.get_session), 
                visit_id: int, 
                visit: VisitUpdate
                ):
    db_visit = session.get(Visit, visit_id)
    if not db_visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    visit_data = visit.model_dump(exclude_unset=True)
    db_visit.sqlmodel_update(visit_data)
    session.add(db_visit)
    session.commit()
    session.refresh(db_visit)
    return db_visit


@router.delete("/{visit_id}")
def delete_visit(*, session: Session = Depends(utils.get_session), visit_id: int):
    visit = session.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    session.delete(visit)
    session.commit()
    return {"ok": True}