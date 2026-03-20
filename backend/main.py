from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import crops, farmers

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="GraamAI API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For v1 prototype, allowing all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(crops.router)
app.include_router(farmers.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to GraamAI API"}
