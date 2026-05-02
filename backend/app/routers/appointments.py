from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from ..database import get_db
from ..models import Appointment, User
from ..schemas import AppointmentCreate, AppointmentResponse

router = APIRouter()

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
            "specialization": d.specialization or "General Physician"
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
        raise HTTPException(status_code=400, detail="This slot is already booked")

    appointment = Appointment(
        patient_id=patient_id,
        doctor_id=data.doctor_id,
        appointment_date=data.appointment_date,
        appointment_time=data.appointment_time,
        status="pending",  # Always start as pending — doctor must manually confirm
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment

@router.get("/my/{patient_id}")
def get_my_appointments(patient_id: str, db: Session = Depends(get_db)):
    appointments = db.query(Appointment).filter(
        Appointment.patient_id == patient_id
    ).order_by(Appointment.appointment_date).all()

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

# ── Doctor Dashboard Endpoints ─────────────────────────────

@router.get("/doctor-dashboard/{doctor_id}")
def get_doctor_appointments(doctor_id: str, db: Session = Depends(get_db)):
    doctor = db.query(User).filter(User.id == doctor_id, User.role == "doctor").first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    appointments = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id
    ).order_by(Appointment.appointment_date, Appointment.appointment_time).all()

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