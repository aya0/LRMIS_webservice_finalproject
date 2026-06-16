from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_indexes
from routes import staff, survey

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

app.include_router(staff.router, tags=["Staff"])
app.include_router(survey.router, tags=["Survey & Assignment"])


@app.on_event("startup")
def startup():
    create_indexes()


@app.get("/", tags=["Health"])
def health():
    return {"status": "ok", "module": "Module 3 — Surveyors, Registrar & Assignment"}
