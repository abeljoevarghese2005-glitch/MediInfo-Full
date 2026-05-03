from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal

# ── Medicine schemas ───────────────────────────────────────
class MedicineBase(BaseModel):
    medicine_name: str
    brand_name: str
    generic_name: str
    manufacturer: Optional[str] = None
    drug_class: Optional[str] = None

class MedicineResponse(MedicineBase):
    id: UUID
    available_forms: Optional[List[str]] = None
    available_strengths: Optional[List[str]] = None
    prescription_required: bool
    is_otc: bool
    storage_instructions: Optional[str] = None

    @field_validator('available_forms', 'available_strengths', mode='before')
    @classmethod
    def parse_array(cls, v: Any) -> Optional[List[str]]:
        if v is None:
            return None
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v = v.strip('{}')
            if not v:
                return []
            return [item.strip().strip('"') for item in v.split(',')]
        return v

    class Config:
        from_attributes = True

# ── Auth schemas ───────────────────────────────────────────
class UserRegister(BaseModel):
    phone: str
    password: str
    full_name: str
    role: Optional[str] = "patient"
    email: Optional[str] = None
    specialization: Optional[str] = None
    consultation_fee: Optional[float] = 500.0
    # Doctor registration fields — frontend sends these names
    years_of_experience: Optional[int] = None
    clinic_name: Optional[str] = None
    medical_license: Optional[str] = None

class UserLogin(BaseModel):
    phone: str
    password: str

class UserResponse(BaseModel):
    id: UUID
    phone: str
    full_name: str
    role: str
    specialization: Optional[str] = None
    consultation_fee: Optional[float] = None
    preferred_language: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# ── Reminder schemas ───────────────────────────────────────
class ReminderCreate(BaseModel):
    medicine_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = "daily"
    reminder_time: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    notes: Optional[str] = None

class ReminderResponse(ReminderCreate):
    id: UUID
    user_id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ── Appointment schemas ────────────────────────────────────
class AppointmentCreate(BaseModel):
    doctor_id: UUID
    appointment_date: date
    appointment_time: str
    issue: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    appointment_date: date
    appointment_time: str
    status: str
    payment_status: Optional[str] = "pending"
    amount_paid: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ── Payment schemas ────────────────────────────────────────
class CreateOrderRequest(BaseModel):
    doctor_id: UUID
    appointment_date: date
    appointment_time: str
    issue: Optional[str] = None

class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int          # in paise
    currency: str
    doctor_name: str
    fee: float
    key_id: str

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    doctor_id: UUID
    appointment_date: date
    appointment_time: str
    issue: Optional[str] = None

class PaymentResponse(BaseModel):
    id: UUID
    appointment_id: UUID
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = None
    amount: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True