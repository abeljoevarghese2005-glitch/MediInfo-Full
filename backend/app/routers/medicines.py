from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Medicine, MedicineLeaflet
from ..schemas import MedicineResponse

router = APIRouter()

@router.get("/", response_model=List[MedicineResponse])
def get_all_medicines(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    return db.query(Medicine).offset(skip).limit(limit).all()

@router.get("/search", response_model=List[MedicineResponse])
def search_medicines(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    results = db.query(Medicine).filter(
        Medicine.medicine_name.ilike(f"%{q}%") |
        Medicine.brand_name.ilike(f"%{q}%") |
        Medicine.generic_name.ilike(f"%{q}%")
    ).limit(20).all()
    if not results:
        raise HTTPException(status_code=404, detail="No medicines found")
    return results

@router.get("/{medicine_id}/leaflet")
def get_medicine_leaflet(medicine_id: str, db: Session = Depends(get_db)):
    leaflet = db.query(MedicineLeaflet).filter(
        MedicineLeaflet.medicine_id == medicine_id
    ).first()
    if not leaflet:
        raise HTTPException(status_code=404, detail="Leaflet not found")
    return leaflet

@router.get("/{medicine_id}", response_model=MedicineResponse)
def get_medicine(medicine_id: str, db: Session = Depends(get_db)):
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine