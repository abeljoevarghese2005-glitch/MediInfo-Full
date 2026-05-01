# backend/routers/push.py

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, Text, Boolean, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional
from uuid import UUID as PyUUID
import uuid
import json
from pywebpush import webpush, WebPushException
from ..database import get_db, Base

router = APIRouter()

# ── Model ──────────────────────────────────────────────────
class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, unique=True)
    endpoint = Column(Text, nullable=False)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

# ── Schemas ────────────────────────────────────────────────
class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str

class SubscriptionCreate(BaseModel):
    endpoint: str
    keys: SubscriptionKeys
    expirationTime: Optional[str] = None

# ── VAPID config ───────────────────────────────────────────
VAPID_PRIVATE_KEY = """-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIKq+NobQ0CYnu77l6MKfl/yVXiRGv0sUYgogpxaIBUnwoAoGCCqGSM49
AwEHoUQDQgAESsBDAQFK0FgTPfTUKKZ96frVGJiroUDDiWI0BpRp3sDhytfZbrcg
ovY/WXammUBlXQrAZqdKoSsPJdbC+VxNfA==
-----END EC PRIVATE KEY-----"""

VAPID_CLAIMS = {"sub": "mailto:admin@mediinfo.app"}

# ── Routes ─────────────────────────────────────────────────
@router.post("/subscribe")
def subscribe(sub: SubscriptionCreate, user_id: PyUUID, db: Session = Depends(get_db)):
    existing = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).first()
    if existing:
        existing.endpoint = sub.endpoint
        existing.p256dh = sub.keys.p256dh
        existing.auth = sub.keys.auth
        existing.is_active = True
    else:
        new_sub = PushSubscription(
            user_id=user_id,
            endpoint=sub.endpoint,
            p256dh=sub.keys.p256dh,
            auth=sub.keys.auth
        )
        db.add(new_sub)
    db.commit()
    return {"message": "Subscribed successfully"}

@router.delete("/unsubscribe")
def unsubscribe(user_id: PyUUID, db: Session = Depends(get_db)):
    sub = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).first()
    if sub:
        sub.is_active = False
        db.commit()
    return {"message": "Unsubscribed"}

def send_push_notification(subscription: PushSubscription, title: str, body: str, reminder_id: str = None):
    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth
                }
            },
            data=json.dumps({
                "title": title,
                "body": body,
                "reminder_id": reminder_id,
                "tag": f"reminder-{reminder_id}"
            }),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )
    except WebPushException as e:
        print(f"Push failed: {e}")