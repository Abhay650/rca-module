from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Investigation
from ..schemas import InvestigationIn, InvestigationOut, InvestigationSummary

router = APIRouter(prefix="/api/investigations", tags=["investigations"])


def _apply(row: Investigation, p: InvestigationIn):
    f = p.form
    row.deviation_id, row.title, row.product_name = f.deviation_id, f.title, f.product_name
    row.batch_number, row.severity = f.batch_number, f.severity
    row.status, row.confirmed_by, row.source_text = p.status, p.confirmed_by, p.source_text
    row.form = f.model_dump()
    row.analysis = p.analysis.model_dump()
    row.capas = [c.model_dump() for c in p.capas]


@router.get("", response_model=List[InvestigationSummary])
def list_investigations(db: Session = Depends(get_db)):
    return db.scalars(select(Investigation).order_by(Investigation.updated_at.desc())).all()


@router.get("/{inv_id}", response_model=InvestigationOut)
def get_investigation(inv_id: int, db: Session = Depends(get_db)):
    row = db.get(Investigation, inv_id)
    if not row:
        raise HTTPException(404, "Investigation not found")
    return InvestigationOut(
        id=row.id, status=row.status, confirmed_by=row.confirmed_by, source_text=row.source_text,
        form=row.form, analysis=row.analysis, capas=row.capas,
        created_at=row.created_at, updated_at=row.updated_at,
    )


@router.post("", response_model=InvestigationSummary)
def save_investigation(payload: InvestigationIn, db: Session = Depends(get_db)):
    """Create or update (when payload.id is set) after the user has reviewed/edited the AI output."""
    unconfirmed = [rc for rc in payload.analysis.root_causes if not rc.confirmed]
    if payload.status == "Confirmed" and (unconfirmed or not payload.confirmed_by.strip()):
        raise HTTPException(422, "Every root cause must be confirmed and a qualified reviewer named before status 'Confirmed'.")
    row = db.get(Investigation, payload.id) if payload.id else Investigation()
    if payload.id and not row:
        raise HTTPException(404, "Investigation not found")
    _apply(row, payload)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{inv_id}")
def delete_investigation(inv_id: int, db: Session = Depends(get_db)):
    row = db.get(Investigation, inv_id)
    if not row:
        raise HTTPException(404, "Investigation not found")
    db.delete(row)
    db.commit()
    return {"deleted": inv_id}
