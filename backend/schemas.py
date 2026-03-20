from pydantic import BaseModel, Field, validator
import re
from uuid import UUID
from datetime import datetime
from typing import Optional, List

# Crop Schemas
class CropBase(BaseModel):
    name: str
    water_requirement: str
    season: str
    risk_level: str
    heat_tolerance: str

class CropCreate(CropBase):
    pass

class CropResponse(CropBase):
    id: UUID

    class Config:
        from_attributes = True

# Farmer Schemas
class FarmerBase(BaseModel):
    name: str = Field(..., min_length=2)
    phone: str = Field(..., pattern=r"^\d{10}$")
    language: str
    district: str
    village: str
    crop_id: UUID
    soil_type: str
    land_size: float = Field(..., gt=0)
    annual_income: float = Field(..., gt=0)
    profile_photo: Optional[str] = None

class FarmerCreate(FarmerBase):
    password: str

class FarmerLogin(BaseModel):
    phone: str
    password: str

class FarmerResponse(FarmerBase):
    id: UUID
    created_at: datetime
    crop_name: Optional[str] = None

    class Config:
        from_attributes = True

# FVI Response
class FVIResponse(BaseModel):
    fvi_score: float
    risk_level: str
    breakdown: dict
    weather: dict
    weather_message: Optional[str] = None

# Alert Response
class AlertResponse(BaseModel):
    advice: str
