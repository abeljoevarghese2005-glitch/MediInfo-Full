from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import date, datetime
from uuid import UUID

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

class UserLogin(BaseModel):
    phone: str
    password: str

class UserResponse(BaseModel):
    id: UUID
    phone: str
    full_name: str
    role: str
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