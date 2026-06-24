from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_indexes
from routes import (
    # Module 1: Land Application Management
    applications, parcels, certificates,
    # Module 2: Applicant Portal
    applicants, applicant_documents, applicant_comments,
    applicant_objections, applicant_timeline,
    # Module 3: Surveyors, Registrar & Assignment
    staff, survey,
    # Group: Analytics & Geofeeds
    analytics,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_indexes()
    yield

app = FastAPI(
    title="LRMIS",
    description="Land Registration Management Information System .",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers.  -- Module 1: Land Application Management
app.include_router(applications.router)
app.include_router(parcels.router)
app.include_router(certificates.router)

# Module 3 : Surveyors, Registrar & Assignment
app.include_router(staff.router,     tags=["Staff & Auth"])
app.include_router(survey.router,    tags=["Survey & Assignment"])
app.include_router(analytics.router, tags=["Analytics & Geofeeds"])

# MODULE 2: Applicant Portal and Profiles
app.include_router(applicants.router, tags=["Module 2 - Applicants"])
app.include_router(applicant_documents.router, tags=["Module 2 - Documents"])
app.include_router(applicant_comments.router, tags=["Module 2 - Comments"])
app.include_router(applicant_objections.router, tags=["Module 2 - Objections"])
app.include_router(applicant_timeline.router, tags=["Module 2 - Timeline"])


@app.get("/", tags=["Health"])
def health():
    return {"status": "ok", "message": "ALL Modules Backend Running successfully."}
