from sqlalchemy import create_engine
from app.models import Base

DATABASE_URL = "postgresql://postgres:tuEifPQTTYoKsTfXppVFddqliLaVoaTN@mainline.proxy.rlwy.net:41984/railway"

engine = create_engine(DATABASE_URL)
Base.metadata.create_all(bind=engine)
print("Tables created successfully!")