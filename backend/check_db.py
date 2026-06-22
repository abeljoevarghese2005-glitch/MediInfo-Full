from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    rows = conn.execute(text(
        "SELECT id, email, specialization, clinic_name, license_number FROM users WHERE role = 'doctor'"
    )).fetchall()
    for r in rows:
        print(dict(r._mapping))