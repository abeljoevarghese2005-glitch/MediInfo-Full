# backend/scheduler.py
# Add this to your main.py startup

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from datetime import datetime, date
from .database import SessionLocal
from .models import MedicationReminder
from .routers.push import PushSubscription, send_push_notification

scheduler = AsyncIOScheduler()

def check_and_send_reminders():
    db: Session = SessionLocal()
    try:
        now = datetime.now()
        current_time = now.strftime("%H:%M")
        today = date.today().isoformat()

        # Get all active reminders due right now
        reminders = db.query(MedicationReminder).filter(
            MedicationReminder.is_active == True,
            MedicationReminder.reminder_time == current_time,
            MedicationReminder.start_date <= date.today(),
        ).all()

        # Filter out expired ones
        due_reminders = [
            r for r in reminders
            if r.end_date is None or r.end_date >= date.today()
        ]

        for reminder in due_reminders:
            # Get user's push subscription
            sub = db.query(PushSubscription).filter(
                PushSubscription.user_id == reminder.user_id,
                PushSubscription.is_active == True
            ).first()

            if sub:
                body_parts = []
                if reminder.dosage:
                    body_parts.append(reminder.dosage)
                body_parts.append(reminder.frequency.capitalize())
                if reminder.notes:
                    body_parts.append(reminder.notes)

                send_push_notification(
                    subscription=sub,
                    title=f"💊 Time for {reminder.medicine_name}",
                    body=" · ".join(body_parts),
                    reminder_id=str(reminder.id)
                )
                print(f"[Scheduler] Sent reminder: {reminder.medicine_name} to user {reminder.user_id}")

    except Exception as e:
        print(f"[Scheduler] Error: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler.add_job(
        check_and_send_reminders,
        CronTrigger(minute="*"),  # every minute
        id="reminder_check",
        replace_existing=True
    )
    scheduler.start()
    print("[Scheduler] Started — checking reminders every minute")