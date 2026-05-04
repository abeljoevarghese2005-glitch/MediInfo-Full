from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from uuid import UUID
from ..database import get_db
from ..models import Appointment, User
from ..schemas import AppointmentCreate, AppointmentResponse
import os
from jose import jwt

router = APIRouter()

def _haversine(tbl):
    return f"""(
        6371 * acos(
            LEAST(1.0,
                cos(radians(:lat)) * cos(radians({tbl}.latitude))
                * cos(radians({tbl}.longitude) - radians(:lng))
                + sin(radians(:lat)) * sin(radians({tbl}.latitude))
            )
        )
    )"""

def _user_from_request(request: Request, db: Session):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        payload = jwt.decode(auth[7:], os.getenv("SECRET_KEY"), algorithms=[os.getenv("ALGORITHM", "HS256")])
        return db.query(User).filter(User.id == payload.get("sub")).first()
    except Exception:
        return None


@router.get("/nearby-doctors")
def get_nearby_doctors(
    request: Request,
    lat: float = Query(...),
    lng: float = Query(...),
    radius: float = Query(15.0),
    specialization: str = Query(None),
    db: Session = Depends(get_db),
):
    dist = _haversine("u")
    spec_clause = "AND u.specialization ILIKE :spec" if specialization else ""
    params = {"lat": lat, "lng": lng, "radius": radius}
    if specialization:
        params["spec"] = f"%{specialization}%"

    sql = text(f"""
        SELECT u.id::text, u.full_name, u.specialization,
               u.consultation_fee, u.latitude, u.longitude,
               {dist} AS distance_km
        FROM users u
        WHERE u.role = 'doctor'
          AND u.is_active = true
          AND u.latitude IS NOT NULL
          AND u.longitude IS NOT NULL
          {spec_clause}
        HAVING {dist} <= :radius
        ORDER BY distance_km ASC
        LIMIT 30
    """)
    return [dict(r) for r in db.execute(sql, params).mappings().all()]


@router.get("/nearby-patients")
def get_nearby_patients(
    request: Request,
    lat: float = Query(...),
    lng: float = Query(...),
    radius: float = Query(20.0),
    db: Session = Depends(get_db),
):
    current_user = _user_from_request(request, db)
    if not current_user or current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Doctors only")

    dist = _haversine("u")
    params = {"lat": lat, "lng": lng, "radius": radius, "doctor_id": str(current_user.id)}

    sql = text(f"""
        SELECT DISTINCT ON (u.id)
            u.id::text, u.full_name, u.latitude, u.longitude,
            a.appointment_date::text AS date,
            a.appointment_time AS time, a.status,
            {dist} AS distance_km
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        WHERE a.doctor_id = :doctor_id::uuid
          AND u.latitude IS NOT NULL
          AND u.longitude IS NOT NULL
        HAVING {dist} <= :radius
        ORDER BY u.id, distance_km ASC
        LIMIT 20
    """)
    rows = [dict(r) for r in db.execute(sql, params).mappings().all()]
    return sorted(rows, key=lambda x: x["distance_km"])


@router.get("/doctors")
def get_doctors(specialization: str = None, db: Session = Depends(get_db)):
    query = db.query(User).filter(User.role == "doctor", User.is_active == True)
    if specialization:
        query = query.filter(User.specialization.ilike(f"%{specialization}%"))
    doctors = query.all()
    return [
        {
            "id": str(d.id),
            "full_name": d.full_name,
            "phone": d.phone,
            "specialization": d.specialization or "General Physician",
            "consultation_fee": float(d.consultation_fee) if d.consultation_fee is not None else 500.0,
        }
        for d in doctors
    ]


@router.post("/book", response_model=AppointmentResponse)
def book_appointment(data: AppointmentCreate, patient_id: str, db: Session = Depends(get_db)):
    doctor = db.query(User).filter(User.id == data.doctor_id, User.role == "doctor").first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    existing = db.query(Appointment).filter(
        Appointment.doctor_id == data.doctor_id,
        Appointment.appointment_date == data.appointment_date,
        Appointment.appointment_time == data.appointment_time,
        Appointment.status != "cancelled"
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"This slot was just booked by someone else. Please choose a different time."
        )

    appointment = Appointment(
        patient_id=patient_id,
        doctor_id=data.doctor_id,
        appointment_date=data.appointment_date,
        appointment_time=data.appointment_time,
        status="pending",
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.get("/my/{patient_id}")
def get_my_appointments(patient_id: str, db: Session = Depends(get_db)):
    appointments = db.query(Appointment).filter(
        Appointment.patient_id == patient_id
    ).order_by(Appointment.created_at.desc()).all()

    result = []
    for a in appointments:
        doctor = db.query(User).filter(User.id == a.doctor_id).first()
        result.append({
            "id": str(a.id),
            "doctor_name": doctor.full_name if doctor else "Unknown",
            "specialization": doctor.specialization if doctor else "General Physician",
            "appointment_date": str(a.appointment_date),
            "appointment_time": a.appointment_time,
            "status": a.status
        })
    return result


@router.patch("/cancel/{appointment_id}")
def cancel_appointment(appointment_id: str, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appointment.status = "cancelled"
    db.commit()
    return {"message": "Appointment cancelled"}


@router.get("/doctor-dashboard/{doctor_id}")
def get_doctor_appointments(doctor_id: str, db: Session = Depends(get_db)):
    doctor = db.query(User).filter(User.id == doctor_id, User.role == "doctor").first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    appointments = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id
    ).order_by(Appointment.created_at.desc()).all()

    result = []
    for a in appointments:
        patient = db.query(User).filter(User.id == a.patient_id).first()
        result.append({
            "id": str(a.id),
            "patient_name": patient.full_name if patient else "Unknown",
            "patient_phone": patient.phone if patient else "N/A",
            "appointment_date": str(a.appointment_date),
            "appointment_time": a.appointment_time,
            "status": a.status
        })
    return result


@router.patch("/confirm/{appointment_id}")
def confirm_appointment(appointment_id: str, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appointment.status = "confirmed"
    db.commit()
    return {"message": "Appointment confirmed"}


@router.patch("/reject/{appointment_id}")
def reject_appointment(appointment_id: str, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appointment.status = "cancelled"
    db.commit()
    return {"message": "Appointment rejected"}