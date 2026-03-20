from database import SessionLocal, engine, Base
from models import Crop
import uuid

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    crops_data = [
        {"name": "Cotton", "water_requirement": "medium", "season": "kharif", "risk_level": "medium"},
        {"name": "Rice", "water_requirement": "high", "season": "kharif", "risk_level": "high"},
        {"name": "Wheat", "water_requirement": "low", "season": "rabi", "risk_level": "low"},
        {"name": "Groundnut", "water_requirement": "medium", "season": "kharif", "risk_level": "medium"},
    ]
    
    for crop_info in crops_data:
        existing = db.query(Crop).filter(Crop.name == crop_info["name"]).first()
        if not existing:
            new_crop = Crop(**crop_info)
            db.add(new_crop)
            print(f"Adding seed crop: {crop_info['name']}")
    
    db.commit()
    db.close()

if __name__ == "__main__":
    seed()
