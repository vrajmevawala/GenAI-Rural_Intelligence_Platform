from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from database import get_db
from models import Farmer, Crop
from schemas import FarmerCreate, FarmerResponse, FarmerLogin, FVIResponse, AlertResponse
from services.fvi_service import calculate_fvi
from services.alert_service import get_rural_advice

router = APIRouter(prefix="/farmers", tags=["farmers"])

@router.post("/register", response_model=UUID)
def register_farmer(farmer_data: FarmerCreate, db: Session = Depends(get_db)):
    try:
        # Check if phone already exists
        existing = db.query(Farmer).filter(Farmer.phone == farmer_data.phone).first()
        if existing:
            raise HTTPException(status_code=400, detail="Phone number already registered")
        
        new_farmer = Farmer(**farmer_data.dict())
        db.add(new_farmer)
        db.commit()
        db.refresh(new_farmer)
        return new_farmer.id
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/login", response_model=UUID)
def login_farmer(login_data: FarmerLogin, db: Session = Depends(get_db)):
    try:
        farmer = db.query(Farmer).filter(
            Farmer.phone == login_data.phone, 
            Farmer.password == login_data.password
        ).first()
        
        if not farmer:
            raise HTTPException(status_code=401, detail="Invalid phone or password")
        
        return farmer.id
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")

@router.get("/{farmer_id}", response_model=FarmerResponse)
def get_farmer(farmer_id: UUID, db: Session = Depends(get_db)):
    # Use outerjoin to ensure farmer is returned even if crop is missing
    result = db.query(Farmer, Crop.name.label("crop_name")).outerjoin(Crop, Farmer.crop_id == Crop.id).filter(Farmer.id == farmer_id).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    farmer, crop_name = result
    farmer_response = FarmerResponse.from_orm(farmer)
    farmer_response.crop_name = crop_name
    return farmer_response

@router.get("/{farmer_id}/fvi", response_model=FVIResponse)
def get_fvi(farmer_id: UUID, db: Session = Depends(get_db)):
    try:
        farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
        if not farmer:
            raise HTTPException(status_code=404, detail="Farmer not found")
        
        crop = db.query(Crop).filter(Crop.id == farmer.crop_id).first()
        if not crop:
            raise HTTPException(status_code=404, detail="Crop not found for this farmer")
        
        return calculate_fvi(farmer, crop)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="FVI calculation failed")

@router.get("/{farmer_id}/alert", response_model=AlertResponse)
def get_alert(farmer_id: UUID, db: Session = Depends(get_db)):
    farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    crop = db.query(Crop).filter(Crop.id == farmer.crop_id).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found for this farmer")
    
    fvi_data = calculate_fvi(farmer, crop)
    advice = get_rural_advice(fvi_data["risk_level"], language=farmer.language)
    
    return {"advice": advice}

@router.put("/{farmer_id}/language")
def update_language(farmer_id: UUID, language: str, db: Session = Depends(get_db)):
    farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    farmer.language = language
    db.commit()
    return {"message": "Language updated successfully"}
