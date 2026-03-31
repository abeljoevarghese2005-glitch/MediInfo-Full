from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from ..database import get_db
from ..models import MedicationReminder
from ..schemas import ReminderCreate, ReminderResponse

router = APIRouter()

@router.post("/", response_model=ReminderResponse)
def create_reminder(reminder: ReminderCreate, user_id: UUID, db: Session = Depends(get_db)):
    new_reminder = MedicationReminder(user_id=user_id, **reminder.dict())
    db.add(new_reminder)
    db.commit()
    db.refresh(new_reminder)
    return new_reminder

@router.get("/user/{user_id}", response_model=List[ReminderResponse])
def get_user_reminders(user_id: UUID, db: Session = Depends(get_db)):
    return db.query(MedicationReminder).filter(
        MedicationReminder.user_id == user_id,
        MedicationReminder.is_active == True
    ).all()

@router.delete("/{reminder_id}")
def delete_reminder(reminder_id: UUID, db: Session = Depends(get_db)):
    reminder = db.query(MedicationReminder).filter(MedicationReminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    reminder.is_active = False
    db.commit()
    return {"message": "Reminder deleted successfully"}