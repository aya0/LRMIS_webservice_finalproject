from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_indexes
from routes import (
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/", tags=["Health"])
def health():
    return {"status": "ok", "module": "Module 3 — Surveyors, Registrar & Assignment"}
