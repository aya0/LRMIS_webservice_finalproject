# LRMIS Module 3 — Requirements Checklist
> Sourced directly from COMP4382 project spec. Tick off as implemented.

---

## Module 3 Backend Responsibilities

- [ ] Create and manage surveyors
- [ ] Create and manage registrar staff
- [ ] Define coverage zones for surveyors
- [ ] Define skills and specialization per surveyor
- [ ] Define schedules and availability per surveyor
- [ ] Implement automatic survey assignment
- [ ] Support manual reassignment
- [ ] Track field survey milestones
- [ ] Upload survey report metadata
- [ ] Allow registrar staff to review survey results
- [ ] Add internal decision notes (registrar)
- [ ] Implement basic access control for staff-only endpoints

## Assignment Policy (all criteria must be implemented)

- [ ] Zone match
- [ ] Surveyor availability
- [ ] Workload balancing
- [ ] Skill match
- [ ] Priority
- [ ] Existing assigned tasks considered

## Survey Milestones (must follow this exact order)

- [ ] assigned
- [ ] visit_scheduled
- [ ] arrived_on_site
- [ ] survey_started
- [ ] survey_completed
- [ ] report_uploaded
- [ ] registrar_reviewed

## API Endpoints (Module 3)

- [ ] POST /staff/ — Create surveyor or registrar staff account
- [ ] GET /staff/{staff_id} — Retrieve staff profile, workload, and performance summary
- [ ] POST /applications/{application_id}/auto-assign-surveyor — Auto-assign based on policy
- [ ] PATCH /applications/{application_id}/survey-milestone — Add survey milestone
- [ ] POST /applications/{application_id}/survey-report — Upload or register survey report metadata
- [ ] PATCH /applications/{application_id}/registrar-review — Registrar review decision

## MongoDB Collections (Module 3 owns)

- [ ] staff_members
- [ ] survey_tasks
- [ ] survey_reports
- [ ] performance_logs (shared with other modules — write events only)

## MongoDB Indexes (required by spec)

- [ ] db.staff_members.create_index("staff_code", unique=True)
- [ ] db.survey_tasks.create_index("application_id")

---

## Student 3 UI — Surveyor, Map, and Analytics

### My Survey Tasks screen
- [ ] Assigned tasks list
- [ ] Parcel number shown per task
- [ ] Zone shown per task
- [ ] Priority shown per task
- [ ] Scheduled visit date shown per task
- [ ] Current milestone shown per task

### Survey Task Execution screen
- [ ] Mark visit scheduled
- [ ] Mark arrived on site
- [ ] Mark survey started
- [ ] Mark survey completed
- [ ] Upload survey report metadata
- [ ] Add field notes

### Live Parcel Map screen
- [ ] Show parcel boundaries
- [ ] Show pending applications
- [ ] Show survey-required applications
- [ ] Show disputed parcels
- [ ] Use marker clustering
- [ ] Filter by zone
- [ ] Filter by type
- [ ] Filter by status

### Analytics Dashboard screen
- [ ] Applications over time chart
- [ ] Pending applications by zone chart
- [ ] Average processing time
- [ ] Surveyor workload chart
- [ ] Applications under objection
- [ ] Certificates issued per month chart

---

## Cross-Cutting Requirements (apply to all modules)

### Tech stack
- [ ] FastAPI (Python) backend
- [ ] PyMongo for MongoDB integration
- [ ] Pydantic validation on all models
- [ ] Uvicorn as server
- [ ] React frontend
- [ ] OpenStreetMap + Leaflet for maps
- [ ] python-dotenv for env vars

### Deliverables
- [ ] Working FastAPI backend
- [ ] MongoDB integration using PyMongo
- [ ] Workflow transitions and validation rules
- [ ] Automatic surveyor assignment
- [ ] Staff console
- [ ] Surveyor interface
- [ ] Analytics dashboard
- [ ] Interactive map using OpenStreetMap + Leaflet
- [ ] GitHub repository
- [ ] README (setup, packages, env vars, indexes, sample users, run instructions)
- [ ] OpenAPI/Postman documentation
- [ ] Example API requests
- [ ] Final presentation (demo, code walkthrough, DB design, workflow, design decisions, challenges)

### Evaluation criteria (must satisfy)
- [ ] Full coverage of required functionality
- [ ] Correct FastAPI and MongoDB implementation
- [ ] Proper Pydantic validation
- [ ] Correct workflow/state machine
- [ ] Correct MongoDB collections and indexes
- [ ] Proper GeoJSON and geospatial queries
- [ ] Quality API design
- [ ] Quality frontend UI
- [ ] Quality analytics and dashboards
- [ ] Code organization and readability
- [ ] GitHub repository quality

### Submission
- Due: 23-6-2026
- Submit GitHub repository link
- Submit .zip copy

---

## Placeholders (waiting on teammates)

These items from other modules are referenced by Module 3 — marked with PLACEHOLDER in code:

- `land_applications` collection (Student 1) — needed to read application zone/status for auto-assignment
- `parcels` collection (Student 1) — needed for map parcel boundaries GeoJSON
- `applicants` collection (Student 2) — referenced in survey context
- Analytics endpoints GET /analytics/* (Group module) — some overlap with dashboard
