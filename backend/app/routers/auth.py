from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from jose import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional
import bcrypt
import os

from ..database import get_db
from ..models import User
from ..schemas import UserRegister, UserLogin, UserResponse, Token

load_dotenv()

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class DoctorProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    specialization: Optional[str] = None
    clinic_name: Optional[str] = None
    license_number: Optional[str] = None
    experience_years: Optional[int] = None
    consultation_fee: Optional[int] = None
    availability: Optional[str] = None
    time_per_patient: Optional[int] = None


def hash_password(password: str) -> str:
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    plain_bytes = plain.encode('utf-8')[:72]
    return bcrypt.checkpw(plain_bytes, hashed.encode('utf-8'))


def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/register", response_model=UserResponse)
def register(user: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.phone == user.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    new_user = User(
        phone=user.phone,
        password_hash=hash_password(user.password),
        full_name=user.full_name,
        role=user.role,
        email=user.email,
        specialization=user.specialization,
        consultation_fee=user.consultation_fee,
        experience_years=user.years_of_experience,
        clinic_name=user.clinic_name,
        license_number=user.medical_license,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.phone == user.phone).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    token = create_token({"sub": str(db_user.id), "role": db_user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(db_user.id),
            "phone": db_user.phone,
            "full_name": db_user.full_name,
            "role": db_user.role,
            "specialization": db_user.specialization,
            "email": db_user.email,
            "clinic_name": db_user.clinic_name,
            "license_number": db_user.license_number,
            "experience_years": db_user.experience_years,
            "consultation_fee": db_user.consultation_fee,
        }
    }


@router.put("/update/{user_id}")
def update_user(user_id: str, update: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if update.full_name:
        db_user.full_name = update.full_name
    if update.phone:
        existing = db.query(User).filter(User.phone == update.phone).first()
        if existing and str(existing.id) != user_id:
            raise HTTPException(status_code=400, detail="Phone number already in use")
        db_user.phone = update.phone
    db.commit()
    db.refresh(db_user)
    return {
        "id": str(db_user.id),
        "phone": db_user.phone,
        "full_name": db_user.full_name,
        "role": db_user.role,
    }


# ── Doctor profile endpoints ─────────────────────────────────────────────────

@router.get("/doctor-profile/{doctor_id}")
def get_doctor_profile(doctor_id: str, db: Session = Depends(get_db)):
    doctor = db.query(User).filter(User.id == doctor_id, User.role == "doctor").first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    def clean(v):
        """Return None for empty/whitespace strings so the frontend renders correctly."""
        if isinstance(v, str) and v.strip() == '':
            return None
        return v

    return {
        "id": str(doctor.id),
        "full_name": doctor.full_name,
        "phone": doctor.phone,
        "email": clean(doctor.email),
        "specialization": clean(doctor.specialization),
        "clinic_name": clean(doctor.clinic_name),
        "license_number": clean(doctor.license_number),
        "experience_years": doctor.experience_years or 0,
        "consultation_fee": doctor.consultation_fee or 500,
        "availability": doctor.availability,
        "time_per_patient": doctor.time_per_patient or 15,
    }


@router.patch("/update-location")
async def update_location(request: Request, lat: float, lng: float, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token_str = auth_header[7:]
    try:
        payload = jwt.decode(token_str, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.latitude = lat
    user.longitude = lng
    user.location_updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Location updated"}


@router.put("/doctor-profile/{doctor_id}")
def update_doctor_profile(doctor_id: str, update: DoctorProfileUpdate, db: Session = Depends(get_db)):
    doctor = db.query(User).filter(User.id == doctor_id, User.role == "doctor").first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    for field, value in update.dict(exclude_none=True).items():
        if isinstance(value, str) and value.strip() == '':
            continue
        if field == "phone" and value:
            existing = db.query(User).filter(User.phone == value).first()
            if existing and str(existing.id) != doctor_id:
                raise HTTPException(status_code=400, detail="Phone number already in use")
        setattr(doctor, field, value)

    db.commit()
    db.refresh(doctor)
    return {
        "id": str(doctor.id),
        "full_name": doctor.full_name,
        "phone": doctor.phone,
        "email": doctor.email,
        "specialization": doctor.specialization,
        "clinic_name": doctor.clinic_name,
        "license_number": doctor.license_number,
        "experience_years": doctor.experience_years or 0,
        "consultation_fee": doctor.consultation_fee or 500,
        "availability": doctor.availability,
        "time_per_patient": doctor.time_per_patient or 15,
    }