# LRMIS - Land Registration Management Information System

COMP4382 Final Project - 2025/2026

## Team & Module Ownership

| Module | Student | ID | Responsibility |
|--------|---------|-----|----------------|
| Module 1 — Land Application Management | Aya Nasser | 1220020 | Applications, workflow state machine, parcels, certificates |
| Module 2 — Applicant Portal | Julia Duaibes | 1222428 | Applicant profiles, document upload, objections, status tracking |
| **Module 3 — Surveyors, Registrar & Assignment** | **Tala** | **1220536** | Staff management, auto-assignment engine, survey milestones, registrar review |
| Module 4 — Analytics & Map | All three students | — | Dashboards, live map, geospatial queries, aggregation pipelines |

---


## Overview

LRMIS is a land registration workflow system with a FastAPI backend, a React frontend, and MongoDB storage.

The repository contains:

- `backend/` - API, workflow logic, and MongoDB collections
- `frontend/` - Vite + React user interface
- `presentation/` - presentation notes and supporting material

## Features

- Land application submission and workflow transitions
- Applicant profiles, comments, objections, and document tracking
- Surveyor assignment, survey milestones, survey reports, and registrar review
- Analytics dashboard endpoints and live parcel map geofeeds

## Requirements

- Python 3.11 recommended
- Node.js 18 or newer
- MongoDB 6 or newer, local or Atlas

## Setup Instructions

### Backend

1. Open a terminal in the `backend/` folder.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Create `backend/.env` with your environment variables.

3. Start the API.

```bash
uvicorn main:app --reload
```

The backend runs at `http://localhost:8000`.
Swagger docs are available at `http://localhost:8000/docs`.

### Frontend

1. Open a second terminal in the `frontend/` folder.

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

## Run Instructions

Recommended local run order:

1. Start MongoDB.
2. Start the backend API from `backend/`.
3. Seed the demo data from `backend/`.
4. Start the frontend from `frontend/`.
5. Open `http://localhost:5173` in your browser.

Seed the demo database with:

```bash
cd backend
python TestDataset.py
```

## Environment Variables

Create `backend/.env` with these values:

| Variable | Description | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `DATABASE_NAME` | Database name | `lrmis_db` |
| `SECRET_KEY` | Secret used for token generation | any strong random string |

## Packages

### Backend

From `backend/requirements.txt`:

- `fastapi` - API framework
- `uvicorn[standard]` - ASGI server
- `pymongo` - MongoDB driver
- `pydantic` - validation models
- `python-dotenv` - environment variable loading
- `passlib[bcrypt]` - password hashing
- `python-multipart` - form and file upload support

### Frontend

From `frontend/package.json`:

- `react` and `react-dom` - UI framework
- `react-router-dom` - routing
- `axios` - HTTP client
- `leaflet` and `react-leaflet` - map rendering
- `leaflet.markercluster` - clustered map markers
- `recharts` - charts and dashboard visualizations
- `vite` - frontend dev server and build tool
- `tailwindcss`, `postcss`, and `autoprefixer` - styling pipeline

## MongoDB Indexes

Indexes are created automatically by `backend/database.py` when the app starts.

### Land applications

- `application_id` unique
- `status`
- `application_type`
- `parcel_ref.parcel_number`
- `parcel_ref.zone_id`
- `timestamps.submitted_at`
- `idempotency_key` sparse

### Parcels

- `parcel_code` unique
- `geometry` geospatial index
- `zone_id`
- `parcel_number`

### Certificates

- `certificate_id` unique
- `application_id`

### Staff and survey tasks

- `staff_code` unique
- `survey_tasks.application_id`
- `survey_tasks.assigned_surveyor_id`
- `survey_tasks.status`
- `staff_members.role`
- `staff_members.coverage.zone_ids`

### Applicant portal

- `applicants.identity.national_id` unique sparse
- `applicants.identity.registration_number` unique sparse
- `application_documents.application_id`
- `application_documents.applicant_id`
- `applicant_comments.application_id`
- `applicant_comments.applicant_id`
- `objections.application_id`
- `objections.applicant_id`

## Sample Users / Seed Data

The repository includes a deterministic seed script at `backend/TestDataset.py`.

Run it from `backend/`:

```bash
python TestDataset.py
```

What it seeds:

- 100 applicants
- 100 parcels
- 100 land applications
- 12 staff accounts
- survey tasks, survey reports, documents, comments, objections, performance logs, and certificates

Demo staff accounts:

- Surveyors: `SURV-001` through `SURV-008`
- Registrars: `REG-001` through `REG-004`
- Password for all seeded staff: `demo-pass`

Useful demo records:

- Application IDs: `LRMIS-2026-0001` through `LRMIS-2026-0100`
- Surveyor login for demos: `SURV-001`
- Registrar login for demos: `REG-001`

## API Endpoints

### Core application workflow

- `POST /applications/`
- `GET /applications/{application_id}`
- `PATCH /applications/{application_id}`
- `PUT /applications/{application_id}`
- `DELETE /applications/{application_id}`
- `PATCH /applications/{application_id}/transition`
- `POST /applications/{application_id}/hold`
- `POST /applications/{application_id}/reject`
- `POST /applications/{application_id}/certificate`
- `GET /applications/{application_id}/certificate`

### Staff and survey workflow

- `POST /staff/`
- `GET /staff/`
- `GET /staff/{staff_id}`
- `POST /applications/{application_id}/auto-assign-surveyor`
- `PATCH /applications/{application_id}/survey-milestone`
- `POST /applications/{application_id}/survey-report`
- `PATCH /applications/{application_id}/registrar-review`
- `GET /applications/{application_id}/survey-task`
- `GET /survey-tasks/`
- `POST /survey-tasks/{id}/field-notes`

### Applicant portal

- `POST /applicants/`
- `POST /applicants/register`
- `POST /applicants/login`
- `GET /applicants/{applicant_id}`
- `GET /applicants/{applicant_id}/applications`
- `POST /applications/{application_id}/comments`
- `POST /applications/{application_id}/objections`

### Analytics and geofeeds

- `GET /analytics/kpis`
- `GET /analytics/by-status` and `GET /analytics/applications-by-status`
- `GET /analytics/by-zone` and `GET /analytics/applications-by-zone`
- `GET /analytics/processing-time`
- `GET /analytics/surveyors`
- `GET /analytics/registrars`
- `GET /analytics/certs-per-month` and `GET /analytics/certificates-per-month`
- `GET /analytics/objections` and `GET /analytics/objection-stats`
- `GET /analytics/parcel-geo-feed` and `GET /analytics/geofeeds/parcels`
- `GET /analytics/pending-heatmap` and `GET /analytics/geofeeds/pending-heatmap`

## Workflow Notes

- Applications start at `submitted`.
- Staff can move them through `pre_checked`, `survey_required`, `surveyed`, `legal_review`, `approved`, `certificate_issued`, and `closed`.
- Objections can move an application to `under_objection`.
- The survey task milestone order is:

```text
assigned -> visit_scheduled -> arrived_on_site -> survey_started -> survey_completed -> report_uploaded -> registrar_reviewed
```

## Quick Start

1. Start MongoDB.
2. Start the backend:

```bash
cd backend
source .env/bin/activate
uvicorn main:app --reload
```

3. Seed data:

```bash
cd backend
python TestDataset.py
```

4. Start the frontend:

```bash
cd frontend
npm run dev
```

5. Open `http://localhost:5173`.

## Notes

- The frontend reads analytics and geofeeds from the backend API.
- The seed script clears and reloads the demo collections, so rerunning it gives a consistent test dataset.
- If you change any database indexes, restart the backend so `create_indexes()` runs again.# LRMIS — Land Registration Management Information System

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

Module 1 coverage is also complete for the land administration core:
- Application CRUD: create, read, list, update, delete
- Workflow state machine: strict transitions, hold, reject, certificate issuance
- Parcel management: create, read, list, update, delete with reference checks
- Certificate issuance and verification: create certificate, view certificate, verify QR-style link

All integration points with other modules are marked `# PLACEHOLDER` in the code.

---

## Setup Instructions

### Prerequisites
- Python 3.11 (recommended) — do NOT use Python 3.14; some binary dependencies (pydantic-core) require <= 3.12
- Node.js 18+
- MongoDB (local or Atlas)
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

Use the built-in test dataset runner at `backend/TestDataset.py` to populate demo collections for local testing and demos.

Run from the `backend/` folder:

```bash
cd backend
python TestDataset.py
```

The script creates indexes and inserts a set of demo documents covering core collections:
- `applicants`, `parcels`, `land_applications`, `staff_members`, `survey_tasks`, `survey_reports`, `application_documents`, `applicant_comments`, `objections`, `certificates`, `performance_logs`.
- Demo staff: `SURV-001` (surveyor) and `REG-001` (registrar), both with password `demo-pass`.

You can now use `APP-001` and `SURV-001` for end-to-end testing of assignment, milestones, and map rendering. The seeded demo users have password `demo-pass`.

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

## Quick Start — local demo

1. Ensure MongoDB is running locally or set `MONGODB_URI` in `backend/.env`.

2. Install backend dependencies and start the API (Terminal 1):

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

3. Seed demo data (from repo root):

```bash
python3 scripts/seed_demo_data.py
```

4. Start the frontend (Terminal 2):

```bash
cd frontend
npm install
npm run dev
```

5. Open the frontend at http://localhost:5173 and use the Login page to select a staff member (for demo use `SURV-001`). Use application id `APP-001` to view the seeded task.

## Home Pages

- `/` — System landing page with project overview and portal entry buttons.
- `/home` — Staff home page with quick actions for tasks, map, analytics, and admin pages.
- `/applicant` and `/applicant/home` — Applicant home page with links to profile, applications, uploads, comments, objections, and timeline.

## Architecture & Documentation (summary)

- **Backend**: FastAPI app in the `backend/` folder. Key modules:
    - `routes/` — API endpoints: `staff`, `survey`, `applications`, `analytics`.
    - `services/` — business logic (assignment engine, workflow helpers).
    - `models/` — Pydantic models for request/response validation.
    - `database.py` — PyMongo client, collection references, `create_indexes()`.

- **Frontend**: React + Vite in `frontend/`.
    - `src/pages/SurveyorTasks.jsx`, `TaskExecution.jsx`, `LiveMap.jsx`, `Analytics.jsx` implement the UI.
    - `src/api/api.js` contains axios wrappers for backend endpoints.

- **Integration points / Placeholders**:
    - `land_applications` and `parcels` collections are owned by Module 1 (Student 1). Module 3 reads them for assignment and map feeds. The seed script provides demo copies for local testing.
    - Analytics endpoints are implemented under `backend/routes/analytics.py`. If the Group module is a separate service, ensure it exposes the same `GET /analytics/*` endpoints or update `frontend/src/api/api.js` accordingly.

If you want, I can:
- Add unit tests for the assignment engine and milestone transitions.
- Replace the placeholder staff login with a minimal JWT demo flow for presentations.
- Prepare a short slide deck outline and a `presentation/` folder with screenshots and talking points.

## Group Module (Analytics & Geofeeds)

The Group module is implemented in [backend/routes/analytics.py](backend/routes/analytics.py) and exposes read-only aggregation endpoints used by the dashboard and map.

Current endpoints:
- `GET /analytics/kpis`
- `GET /analytics/by-status` and `GET /analytics/applications-by-status`
- `GET /analytics/by-zone` and `GET /analytics/applications-by-zone`
- `GET /analytics/processing-time`
- `GET /analytics/surveyors`
- `GET /analytics/objections` and `GET /analytics/objection-stats`
- `GET /analytics/certs-per-month` and `GET /analytics/certificates-per-month`
- `GET /analytics/parcel-geo-feed` and `GET /analytics/geofeeds/parcels`
- `GET /analytics/pending-heatmap` and `GET /analytics/geofeeds/pending-heatmap`
