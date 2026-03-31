from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import medicines, auth, reminders, ai

app = FastAPI(
    title="MediInfo API",
    description="Backend API for the MediInfo healthcare app",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(medicines.router, prefix="/medicines", tags=["Medicines"])
app.include_router(reminders.router, prefix="/reminders", tags=["Reminders"])
app.include_router(ai.router, prefix="/ai", tags=["AI"])

@app.get("/")
def root():
    return {
        "message": "Welcome to MediInfo API",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}