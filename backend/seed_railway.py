from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Medicine, MedicineLeaflet

DATABASE_URL = "postgresql://postgres:tuEifPQTTYoKsTfXppVFddqliLaVoaTN@mainline.proxy.rlwy.net:41984/railway"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Check if already seeded
existing = db.query(Medicine).count()
if existing > 0:
    print(f"Already seeded! {existing} medicines found.")
    db.close()
    exit()

medicines_data = [
    {"medicine_name": "Paracetamol", "brand_name": "Dolo 650", "generic_name": "Acetaminophen", "drug_class": "Analgesic/Antipyretic", "manufacturer": "Micro Labs", "prescription_required": False, "is_otc": True},
    {"medicine_name": "Ibuprofen", "brand_name": "Brufen", "generic_name": "Ibuprofen", "drug_class": "NSAID", "manufacturer": "Abbott", "prescription_required": False, "is_otc": True},
    {"medicine_name": "Amoxicillin", "brand_name": "Mox", "generic_name": "Amoxicillin", "drug_class": "Antibiotic", "manufacturer": "Cipla", "prescription_required": True, "is_otc": False},
    {"medicine_name": "Metformin", "brand_name": "Glycomet", "generic_name": "Metformin HCl", "drug_class": "Antidiabetic", "manufacturer": "USV", "prescription_required": True, "is_otc": False},
    {"medicine_name": "Aspirin", "brand_name": "Disprin", "generic_name": "Acetylsalicylic Acid", "drug_class": "NSAID/Antiplatelet", "manufacturer": "Reckitt", "prescription_required": False, "is_otc": True},
    {"medicine_name": "Atorvastatin", "brand_name": "Lipitor", "generic_name": "Atorvastatin Calcium", "drug_class": "Statin", "manufacturer": "Pfizer", "prescription_required": True, "is_otc": False},
    {"medicine_name": "Omeprazole", "brand_name": "Omez", "generic_name": "Omeprazole", "drug_class": "Proton Pump Inhibitor", "manufacturer": "Dr Reddys", "prescription_required": False, "is_otc": True},
    {"medicine_name": "Azithromycin", "brand_name": "Zithromax", "generic_name": "Azithromycin", "drug_class": "Antibiotic", "manufacturer": "Pfizer", "prescription_required": True, "is_otc": False},
    {"medicine_name": "Cetirizine", "brand_name": "Zyrtec", "generic_name": "Cetirizine HCl", "drug_class": "Antihistamine", "manufacturer": "UCB", "prescription_required": False, "is_otc": True},
    {"medicine_name": "Pantoprazole", "brand_name": "Pantocid", "generic_name": "Pantoprazole Sodium", "drug_class": "Proton Pump Inhibitor", "manufacturer": "Sun Pharma", "prescription_required": True, "is_otc": False},
]

try:
    for i, med_data in enumerate(medicines_data):
        medicine = Medicine(**med_data)
        db.add(medicine)
        db.flush()

        leaflet_data = leaflets_data[i]
        leaflet_data["medicine_id"] = medicine.id
        leaflet = MedicineLeaflet(**leaflet_data)
        db.add(leaflet)

    db.commit()
    print(f"Successfully seeded {len(medicines_data)} medicines!")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()