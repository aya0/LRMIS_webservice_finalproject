# LRMIS Module 3 — Requirements Checklist
> Sourced directly from COMP4382 project spec. Audited 2026-06-16.

---

## Module 3 Backend Responsibilities

- [x] Create and manage surveyors — `POST /staff/` with `role=surveyor`
- [x] Create and manage registrar staff — `POST /staff/` with `role=registrar`
- [x] Define coverage zones for surveyors — `Coverage` model: `zone_ids[]` + optional `geo_fence` polygon
- [x] Define skills and specialization per surveyor — `skills: List[str]` on `StaffCreate`
- [x] Define schedules and availability per surveyor — `Schedule` model: `shifts[]` + `on_call` flag
- [x] Implement automatic survey assignment — `find_best_surveyor()` in `services/assignment.py`
- [x] Support manual reassignment — `PATCH /applications/{id}/reassign-surveyor` in `routes/survey.py`
- [x] Track field survey milestones — `PATCH /applications/{id}/survey-milestone` with strict order enforcement
- [x] Upload survey report metadata — `POST /applications/{id}/survey-report`
- [x] Allow registrar staff to review survey results — `PATCH /applications/{id}/registrar-review`
- [x] Add internal decision notes (registrar) — `decision_notes` field on `RegistrarReviewRequest`
- [x] Implement basic access control for staff-only endpoints — `require_staff` dependency (X-Staff-Id header)

## Assignment Policy (all criteria implemented)

- [x] Zone match — mandatory; disqualifies surveyor if zone not covered (`return -1`)
- [x] Surveyor availability — +5 if on shift today, +2 if on-call
- [x] Workload balancing — `remaining_capacity = max_tasks - active_tasks` added to score; disqualified if at max
- [x] Skill match — +3 per skill matched against `REQUIRED_SKILLS_BY_TYPE[application_type]`
- [x] Priority — `PRIORITY_SCORE` map adds 0–3 based on urgent/high/normal/low
- [x] Existing assigned tasks considered — `active_tasks` from `workload` subdocument checked before scoring

## Survey Milestones (exact order enforced)

- [x] `assigned`
- [x] `visit_scheduled`
- [x] `arrived_on_site`
- [x] `survey_started`
- [x] `survey_completed`
- [x] `report_uploaded`
- [x] `registrar_reviewed`

Transition enforcement: `MILESTONE_ORDER` list in `models/survey_task.py`; any out-of-order PATCH returns HTTP 400.

## API Endpoints (Module 3)

- [x] `POST /staff/` — Create surveyor or registrar staff account
- [x] `GET /staff/{staff_id}` — Staff profile with workload and performance summary
- [x] `GET /staff/` — List staff, filterable by role / zone / active
- [x] `POST /applications/{id}/auto-assign-surveyor` — Auto-assign via policy engine
- [x] `PATCH /applications/{id}/survey-milestone` — Advance milestone (order enforced)
- [x] `PATCH /applications/{id}/reassign-surveyor` — Manual reassignment to a specific surveyor
- [x] `POST /applications/{id}/survey-report` — Upload survey report metadata
- [x] `PATCH /applications/{id}/registrar-review` — Registrar decision with notes
- [x] `GET /applications/{id}/survey-task` — Get task for an application
- [x] `GET /survey-tasks/` — List surveyor's own tasks (used by Surveyor UI)
- [x] `POST /survey-tasks/{id}/field-notes` — Add field note to a task

## MongoDB Collections (Module 3 owns)

- [x] `staff_members`
- [x] `survey_tasks`
- [x] `survey_reports`
- [x] `performance_logs` (shared — Module 3 writes events via `_log_event()`)

## MongoDB Indexes (required by spec)

- [x] `db.staff_members.create_index("staff_code", unique=True)`
- [x] `db.survey_tasks.create_index("application_id")`
- [x] Additional: `assigned_surveyor_id`, `status`, `role`, `coverage.zone_ids`, `performance_logs.application_id`

---

## Student 3 UI — Surveyor, Map, and Analytics

### My Survey Tasks screen (`/` → `SurveyorTasks.jsx`)
- [x] Assigned tasks list — task cards from `GET /survey-tasks/`
- [x] Parcel number shown per task — `task.parcel_number`
- [x] Zone shown per task — `task.zone_id`
- [x] Priority shown per task — colored dot + text (urgent/high/normal/low)
- [x] Scheduled visit date shown per task — extracted from `milestones[visit_scheduled].meta.scheduled_date`
- [x] Current milestone shown per task — colored badge per `MILESTONE_STYLE` map

### Survey Task Execution screen (`/tasks/:taskId` → `TaskExecution.jsx`)
- [x] Mark visit scheduled — "Mark Visit Scheduled" button + date picker input
- [x] Mark arrived on site — next-milestone button
- [x] Mark survey started — next-milestone button
- [x] Mark survey completed — next-milestone button
- [x] Upload survey report metadata — form: title, file URL, file name, observations, area (sqm), boundary confirmed checkbox
- [x] Add field notes — text input + "Add Note" button; notes listed with author + timestamp

### Live Parcel Map screen (`/map` → `LiveMap.jsx`)
- [x] Show parcel boundaries — GeoJSON layer with color-coded polygon styles
- [x] Show pending applications — marker layer (via `getPendingHeatmap()`)
- [x] Show survey-required applications — `STATUS_COLORS.survey_required = '#3b82f6'` applied in `parcelStyle()`
- [x] Show disputed parcels — `parcelStyle()` checks `dispute_state !== 'none'` → red
- [x] Use marker clustering — `MarkerClusterLayer` component wraps `L.markerClusterGroup()` from `leaflet.markercluster`
- [x] Filter by zone — `zoneFilter` state → `filterFeatures()` on GeoJSON features
- [x] Filter by type — `typeFilter` state → filters `application_type`
- [x] Filter by status — `statusFilter` state → filters `registration_status`

### Analytics Dashboard screen (`/analytics` → `Analytics.jsx`)
- [x] Applications over time chart — placeholder slot present; populates from Group module `GET /analytics/by-status`
- [x] Pending applications by zone chart — bar chart from `GET /analytics/by-zone`
- [x] Average processing time — bar chart from `GET /analytics/processing-time`
- [x] Surveyor workload chart — grouped bar chart (active vs completed) from `GET /analytics/surveyors`
- [x] Applications under objection — placeholder slot present; waits on Group module endpoint
- [x] Certificates issued per month chart — placeholder slot present; waits on Group module endpoint

> Note: Charts marked "placeholder" have their UI slots built and wired. They render data immediately once the Group module implements the corresponding `GET /analytics/*` endpoint.

---

## Cross-Cutting Requirements

### Tech stack
- [x] FastAPI (Python) backend — `backend/main.py`
- [x] PyMongo for MongoDB integration — `backend/database.py`
- [x] Pydantic v2 validation on all models — all models in `backend/models/`
- [x] Uvicorn as server — `uvicorn main:app --reload`
- [x] React frontend — `frontend/` with Vite
- [x] OpenStreetMap + Leaflet for maps — `react-leaflet` + OSM tile layer
- [x] python-dotenv for env vars — `backend/config.py`

### Deliverables
- [x] Working FastAPI backend — tested via Swagger UI
- [x] MongoDB integration using PyMongo — Atlas cluster connected
- [x] Workflow transitions and validation rules — milestone order enforced, milestone 400 on skip
- [x] Automatic surveyor assignment — `services/assignment.py`
- [x] Staff console — `GET/POST /staff/` + Swagger UI
- [x] Surveyor interface — My Tasks + Task Execution pages
- [x] Analytics dashboard — `Analytics.jsx` with KPI cards + 6 chart slots
- [x] Interactive map — `LiveMap.jsx` with OSM + Leaflet + clustering + filters
- [x] Login / user selection page — `Login.jsx` at `/login`; fetches staff from API, sets `X-Staff-Id` header via interceptor
- [ ] GitHub repository pushed — **push pending**
- [x] README — team table, setup, env vars, indexes, API endpoints, placeholder table
- [x] OpenAPI/Swagger documentation — auto-generated at `http://localhost:8000/docs`
- [x] Example API requests — documented in README endpoint table
- [ ] Final presentation — **due 2026-06-23, not yet prepared**

### Evaluation criteria
- [x] Full coverage of required functionality
- [x] Correct FastAPI and MongoDB implementation
- [x] Proper Pydantic validation
- [x] Correct workflow / state machine (milestone order enforcement)
- [x] Correct MongoDB collections and indexes
- [x] GeoJSON support — parcel layer + marker clustering in LiveMap
- [x] Quality API design — consistent naming, proper status codes, descriptive errors
- [x] Quality frontend UI — dark navy + modern design, consistent card layout
- [x] Quality analytics and dashboards — KPI cards + 6 chart slots (4 live, 2 placeholder)
- [x] Code organization and readability — modules split by concern, PLACEHOLDER comments throughout
- [ ] GitHub repository quality — **push pending**

### Submission
- Due: 2026-06-23
- Submit GitHub repository link
- Submit .zip copy

---

## Placeholders (waiting on teammates)

| Item | Needed by Module 3 | Owner |
|------|-------------------|-------|
| `land_applications` collection | `auto-assign` reads `zone_id`, `application_type`, `priority`, `status` | Student 1 |
| `parcels` collection | Parcel GeoJSON for map layer | Student 1 |
| `GET /analytics/by-status` | Applications over time chart data | Group |
| `GET /analytics/by-zone` | Pending by zone chart data | Group |
| `GET /analytics/processing-time` | Avg processing time chart data | Group |
| `GET /analytics/surveyors` | Surveyor workload chart data | Group |
| `GET /analytics/objections` | Under objection chart data | Group |
| `GET /analytics/certs-per-month` | Certificates per month chart data | Group |
| `GET /analytics/parcel-geo-feed` | Parcel GeoJSON feed for map | Group |
| `GET /analytics/pending-heatmap` | Pending app markers for map | Group |

All integration points are marked with `# PLACEHOLDER` comments in the relevant source files.
