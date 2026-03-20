import uuid
from sqlalchemy import Column, String, ForeignKey, Integer, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Crop(Base):
    __tablename__ = "crops"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True, nullable=False)
    water_requirement = Column(String, nullable=False) # low/medium/high
    season = Column(String, nullable=False) # kharif/rabi/all
    risk_level = Column(String, nullable=False) # low/medium/high
    heat_tolerance = Column(String, nullable=False, default="medium") # low/medium/high

    farmers = relationship("Farmer", back_populates="crop")

class Farmer(Base):
    __tablename__ = "farmers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False) # Plain for v1 as requested
    language = Column(String, nullable=False)
    district = Column(String, nullable=False)
    village = Column(String, nullable=False)
    crop_id = Column(UUID(as_uuid=True), ForeignKey("crops.id"), nullable=False)
    soil_type = Column(String, nullable=False) # sandy/clay/loamy
    land_size = Column(Float, nullable=False)
    annual_income = Column(Float, nullable=False)
    profile_photo = Column(String, nullable=True) # Base64 for v1
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    crop = relationship("Crop", back_populates="farmers")
