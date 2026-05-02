from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
import razorpay
import hmac
import hashlib
import os

from ..database import get_db
from ..models import Appointment, User, Payment
from ..schemas import (
    AppointmentCreate, AppointmentResponse,
    CreateOrderRequest, CreateOrderResponse,
    VerifyPaymentRequest
)

router = APIRouter()

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_SkPRLFHUnj35l8")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "g1gPnl3Fwht4bVzEDOyHXJt3")

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


# ── Get Doctors ────────────────────────────────────────────
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
            "consultation_fee": float(d.consultation_fee) if d.consultation_fee else 500.0,
        }
        for d in doctors
    ]


# ── Create Razorpay Order ──────────────────────────────────
@router.post("/create-order", response_model=CreateOrderResponse)
def create_order(data: CreateOrderRequest, patient_id: str, db: Session = Depends(get_db)):
    # Check doctor exists
    doctor = db.query(User).filter(User.id == data.doctor_id, User.role == "doctor").first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Check slot not already taken
    existing = db.query(Appointment).filter(
        Appointment.doctor_id == data.doctor_id,
        Appointment.appointment_date == data.appointment_date,
        Appointment.appointment_time == data.appointment_time,
        Appointment.status != "cancelled",
        Appointment.payment_status == "paid"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This slot is already booked")

    fee = float(doctor.consultation_fee) if doctor.consultation_fee else 500.0
    amount_paise = int(fee * 100)  # Razorpay needs paise

    # Create Razorpay order
    try:
        order = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "notes": {
                "doctor_id": str(data.doctor_id),
                "patient_id": patient_id,
                "date": str(data.appointment_date),
                "time": data.appointment_time,
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Razorpay error: {str(e)}")

    return {
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "doctor_name": doctor.full_name,
        "fee": fee,
        "key_id": RAZORPAY_KEY_ID,
    }


# ── Verify Payment & Book Appointment ─────────────────────
@router.post("/verify-payment")
def verify_payment(data: VerifyPaymentRequest, patient_id: str, db: Session = Depends(get_db)):
    # Verify signature
    body = f"{data.razorpay_order_id}|{data.razorpay_payment_id}"
    expected_sig = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()

    if expected_sig != data.razorpay_signature:
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    doctor = db.query(User).filter(User.id == data.doctor_id).first()
    fee = float(doctor.consultation_fee) if doctor else 500.0

    # Create appointment
    appointment = Appointment(
        patient_id=patient_id,
        doctor_id=data.doctor_id,
        appointment_date=data.appointment_date,
        appointment_time=data.appointment_time,
        issue=data.issue,
        status="confirmed",
        payment_status="paid",
        payment_id=data.razorpay_payment_id,
        amount_paid=fee,
    )
    db.add(appointment)
    db.flush()

    # Save payment record
    payment = Payment(
        appointment_id=appointment.id,
        patient_id=patient_id,
        doctor_id=data.doctor_id,
        razorpay_order_id=data.razorpay_order_id,
        razorpay_payment_id=data.razorpay_payment_id,
        razorpay_signature=data.razorpay_signature,
        amount=fee,
        status="paid",
    )
    db.add(payment)
    db.commit()

    return {
        "message": "Payment verified and appointment confirmed!",
        "appointment_id": str(appointment.id),
        "amount_paid": fee,
    }


# ── My Appointments ────────────────────────────────────────
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
            "status": a.status,
            "payment_status": a.payment_status,
            "amount_paid": float(a.amount_paid) if a.amount_paid else None,
            "issue": a.issue,
        })
    return result


# ── Cancel ─────────────────────────────────────────────────
@router.patch("/cancel/{appointment_id}")
def cancel_appointment(appointment_id: str, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appointment.status = "cancelled"
    db.commit()
    return {"message": "Appointment cancelled"}


# ── Doctor Dashboard ───────────────────────────────────────
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
            "status": a.status,
            "payment_status": a.payment_status,
            "amount_paid": float(a.amount_paid) if a.amount_paid else None,
            "issue": a.issue,
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