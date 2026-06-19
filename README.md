# LRMIS — Land Registration Management Information System

COMP4382 Final Project — 2025/2026

---

## Team & Module Ownership

| Module | Student | ID | Responsibility |
|--------|---------|-----|----------------|
| Module 1 — Land Application Management | Aya Nasser | 1220020 | Applications, workflow state machine, parcels, certificates |
| Module 2 — Applicant Portal | [STUDENT 2 NAME] | [ID] | Applicant profiles, document upload, objections, status tracking |
| **Module 3 — Surveyors, Registrar & Assignment** | **Tala** | **1220536** | Staff management, auto-assignment engine, survey milestones, registrar review |
| Module 4 — Analytics & Map | All three students | — | Dashboards, live map, geospatial queries, aggregation pipelines |

---

## This Repository — Module 3

This module is responsible for everything between `survey_required` and `legal_review` in the application workflow:

- Creating and managing surveyor and registrar staff accounts
- Automatically assigning surveyors based on zone, availability, workload, skills, and priority
- Tracking field survey milestones step by step
- Uploading survey report metadata
- Registrar review and decision recording

All integration points with other modules are marked `# PLACEHOLDER` in the code.

---

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB (local or Atlas)

---

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # then edit .env with your MongoDB URI
uvicorn main:app --reload
```

API runs at: http://localhost:8000  
Swagger docs: http://localhost:8000/docs

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

---

## Environment Variables

| Variable       | Description                        | Default                         |
|----------------|------------------------------------|---------------------------------|
| MONGODB_URI    | MongoDB connection string          | mongodb://localhost:27017       |
| DATABASE_NAME  | Database name                      | lrmis_db                        |
| SECRET_KEY     | Secret key for auth tokens         | (set a random string)           |

---

## Packages

### Backend (`backend/requirements.txt`)
- `fastapi` — API framework
- `uvicorn[standard]` — ASGI server
- `pymongo` — MongoDB driver
- `pydantic` — data validation
- `python-dotenv` — environment variables
- `passlib[bcrypt]` — password hashing
- `python-jose[cryptography]` — JWT tokens
- `python-multipart` — file upload support

### Frontend (`frontend/package.json`)
- `react`, `react-dom` — UI framework
- `react-router-dom` — client-side routing
- `axios` — HTTP client
- `leaflet`, `react-leaflet` — interactive map (OpenStreetMap)
- `leaflet.markercluster` — map marker clustering
- `recharts` — charts and dashboards
- `tailwindcss` — styling

---

## MongoDB Indexes

These indexes are created automatically on startup (`database.py: create_indexes()`).

```python
# Required by spec
db.staff_members.create_index("staff_code", unique=True)
db.survey_tasks.create_index("application_id")

# Additional for performance
db.survey_tasks.create_index("assigned_surveyor_id")
db.survey_tasks.create_index("status")
db.staff_members.create_index("role")
db.staff_members.create_index("coverage.zone_ids")
db.performance_logs.create_index("application_id")
```

---

## Sample Users / Seed Data

To insert sample data, run:

```bash
cd backend
python seed.py    # (create this file with sample staff if needed)
```

**Sample surveyor:**
```json
{
  "staff_code": "SURV-RM-04",
  "name": "Survey Team A",
  "role": "surveyor",
  "department": "Cadastral Survey",
  "skills": ["boundary_survey", "parcel_subdivision", "gps_mapping"],
  "coverage": {
    "zone_ids": ["ZONE-RM-01", "ZONE-RM-02"]
  },
  "schedule": {
    "timezone": "Asia/Jerusalem",
    "shifts": [
      {"day": "Mon", "start": "08:00", "end": "16:00"},
      {"day": "Tue", "start": "08:00", "end": "16:00"},
      {"day": "Wed", "start": "08:00", "end": "16:00"}
    ],
    "on_call": false
  },
  "workload": {"active_tasks": 0, "max_tasks": 10},
  "contacts": {"phone": "+970599111111", "email": "survey_a@example.com"},
  "active": true
}
```

---

## API Endpoints (Module 3)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/staff/` | Create surveyor or registrar staff account |
| GET    | `/staff/` | List staff (filter by role, zone, active) |
| GET    | `/staff/{staff_id}` | Staff profile + workload + performance summary |
| POST   | `/applications/{id}/auto-assign-surveyor` | Auto-assign surveyor (zone+workload+skill policy) |
| PATCH  | `/applications/{id}/survey-milestone` | Advance survey milestone |
| POST   | `/applications/{id}/survey-report` | Upload survey report metadata |
| PATCH  | `/applications/{id}/registrar-review` | Registrar review decision |
| GET    | `/applications/{id}/survey-task` | Get survey task for an application |
| GET    | `/survey-tasks/` | List tasks for a surveyor |
| POST   | `/survey-tasks/{id}/field-notes` | Add a field note |

Full docs: http://localhost:8000/docs

---

## Workflow

Application status must be `survey_required` before auto-assignment.

Survey milestones (in order):
```
assigned → visit_scheduled → arrived_on_site → survey_started
         → survey_completed → report_uploaded → registrar_reviewed
```

---

## Placeholders (integration points with other modules)

| Placeholder | Owner | Notes |
|------------|-------|-------|
| `land_applications` collection | Student 1 | Read-only from Module 3. Must have `parcel_ref.zone_id`, `application_type`, `priority`, `status` fields |
| `parcels` collection | Student 1 | Map loads parcel GeoJSON from `GET /analytics/geofeeds/parcels` |
| Auth / user identity | TBD (team) | Replace `PLACEHOLDER_SURVEYOR_ID` in frontend with real auth |
| Analytics endpoints | Group module | `GET /analytics/*` endpoints feed the dashboard and map |
| Application status transitions | Student 1 | After registrar review, Student 1's engine must move app to `legal_review` or `rejected` |

---

## Run Instructions (full stack)

```bash
# Terminal 1 — backend
cd backend && uvicorn main:app --reload

# Terminal 2 — frontend
cd frontend && npm run dev
```

Then open http://localhost:5173
