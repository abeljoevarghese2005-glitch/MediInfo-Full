from sqlalchemy import Column, String, Boolean, Text, Date, TIMESTAMP, ARRAY, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from .database import Base
import uuid


class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medicine_name = Column(String(255), nullable=False)
    brand_name = Column(String(255), nullable=False)
    generic_name = Column(String(255), nullable=False)
    manufacturer = Column(String(255))
    drug_class = Column(String(255))
    composition = Column(Text)
    available_forms = Column(Text)
    available_strengths = Column(Text)
    prescription_required = Column(Boolean, default=True)
    is_otc = Column(Boolean, default=False)
    schedule = Column(String(10))
    storage_instructions = Column(Text)
    cdsco_approved = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(String(15), unique=True, nullable=False)
    email = Column(String(255), unique=True)
    password_hash = Column(Text, nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(20), default="patient")
    specialization = Column(String(255))
    consultation_fee = Column(Numeric(10, 2), default=500)
    preferred_language = Column(String(5), default="en")
    is_active = Column(Boolean, default=True)
    is_phone_verified = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now())

    # ── Doctor-specific fields ───────────────────────────────
    clinic_name = Column(String(255))
    license_number = Column(String(100))
    experience_years = Column(Integer, default=0)
    availability = Column(Text)        # JSON string of weekly schedule
    time_per_patient = Column(Integer, default=15)


class MedicationReminder(Base):
    __tablename__ = "medication_reminders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    medicine_id = Column(UUID(as_uuid=True))
    medicine_name = Column(String(255))
    dosage = Column(String(100))
    frequency = Column(String(20), default="daily")
    reminder_time = Column(String(10))
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())


class MedicineLeaflet(Base):
    __tablename__ = "medicine_leaflets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medicine_id = Column(UUID(as_uuid=True), nullable=False)
    indications = Column(Text)
    contraindications = Column(Text)
    dosage_adult = Column(Text)
    dosage_child = Column(Text)
    dosage_elderly = Column(Text)
    side_effects_common = Column(ARRAY(Text))
    side_effects_serious = Column(ARRAY(Text))
    drug_interactions = Column(Text)
    food_interactions = Column(Text)
    warnings = Column(Text)
    overdose_info = Column(Text)
    pregnancy_category = Column(String(5))
    breastfeeding_safe = Column(Boolean)
    mechanism_of_action = Column(Text)
    onset_of_action = Column(String(100))
    duration_of_action = Column(String(100))
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now())


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), nullable=False)
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(String(10), nullable=False)
    status = Column(String(20), default="pending")
    issue = Column(Text)
    payment_status = Column(String(20), default="pending")
    payment_id = Column(String(255))
    amount_paid = Column(Numeric(10, 2))
    created_at = Column(TIMESTAMP, server_default=func.now())


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id = Column(UUID(as_uuid=True), nullable=False)
    patient_id = Column(UUID(as_uuid=True), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), nullable=False)
    razorpay_order_id = Column(String(255), nullable=False)
    razorpay_payment_id = Column(String(255))
    razorpay_signature = Column(String(500))
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(String(20), default="created")
    created_at = Column(TIMESTAMP, server_default=func.now())