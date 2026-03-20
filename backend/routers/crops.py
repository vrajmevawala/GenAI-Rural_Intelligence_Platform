from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Crop
from schemas import CropResponse

router = APIRouter(prefix="/crops", tags=["crops"])

@router.get("/", response_model=List[CropResponse])
def get_crops(db: Session = Depends(get_db)):
    try:
        return db.query(Crop).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch crops")
