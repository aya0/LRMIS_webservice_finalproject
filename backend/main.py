from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_indexes
from routes import (
   # Module 1: Land Application Management
   applications, parcels, certificates, 


    staff,
    survey,
    analytics,
    applicants,
    applicant_documents,
    applicant_comments,
    applicant_objections,
    applicant_timeline,
)
from routes import staff, survey, analytics

app = FastAPI(
    title="LRMIS — Module 3: Surveyors, Registrar & Assignment",
    description="Land Registration Management Information System — Student 3 module.",
    version="1.0.0",
)

app = FastAPI(
    title="LRMIS — Module 1: Land Application Management",
    description=(
        "Handles land registration applications, workflow state machine, "
        "parcel management, certificates, and audit logs."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Allow frontend dev server (React/Vue on 5173) and Module 2/3 backends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(applications.router)
app.include_router(parcels.router)
app.include_router(certificates.router)

app.include_router(staff.router,     tags=["Staff & Auth"])
app.include_router(survey.router,    tags=["Survey & Assignment"])
app.include_router(analytics.router, tags=["Analytics & Geofeeds"])

# MODULE 2: Applicant Portal and Profiles
app.include_router(applicants.router, tags=["Module 2 - Applicants"])
app.include_router(applicant_documents.router, tags=["Module 2 - Documents"])
app.include_router(applicant_comments.router, tags=["Module 2 - Comments"])
app.include_router(applicant_objections.router, tags=["Module 2 - Objections"])
app.include_router(applicant_timeline.router, tags=["Module 2 - Timeline"])


@app.on_event("startup")
def startup():
    create_indexes()

@app.on_event("startup")
def startup():
    create_indexes()
    print("🚀 Module 1 backend started.")


@app.get("/", tags=["Health"])
def health():
    return {"status": "ok", "module": "Module 3 — Surveyors, Registrar & Assignment"}


@app.get("/")
def root():
    return {
        "module": "Module 1 — Land Application Management",
        "docs": "/docs",
        "redoc": "/redoc",
    }