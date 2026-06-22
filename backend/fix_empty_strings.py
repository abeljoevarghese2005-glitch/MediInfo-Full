from app.database import engine
from sqlalchemy import text

COLUMNS = ["email", "specialization", "clinic_name", "license_number"]

def run():
    with engine.connect() as conn:
        for col in COLUMNS:
            result = conn.execute(text(f"""
                UPDATE users
                SET {col} = NULL
                WHERE {col} = ''
            """))
            conn.commit()
            print(f"  {col}: {result.rowcount} row(s) updated")

    print("\nDone. All empty strings converted to NULL.")

if __name__ == "__main__":
    print("Fixing empty string fields in users table...")
    run()