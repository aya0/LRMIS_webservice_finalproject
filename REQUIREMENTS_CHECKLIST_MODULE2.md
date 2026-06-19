# REQUIREMENTS CHECKLIST - MODULE 2

Module 2 - Applicant Portal and Profiles was added without modifying Module 3 route/model behavior.

## Backend Files Added

- `backend/models/applicant.py`
- `backend/models/application_document.py`
- `backend/models/applicant_comment.py`
- `backend/models/objection.py`
- `backend/routes/applicants.py`
- `backend/routes/applicant_documents.py`
- `backend/routes/applicant_comments.py`
- `backend/routes/applicant_objections.py`
- `backend/routes/applicant_timeline.py`

## Minimal Integration Changes

- `backend/database.py`
  - Added Module 2 collection handles.
  - Added safe startup indexes for applicants, application documents, comments, objections, and shared performance logs.
- `backend/main.py`
  - Registered Module 2 routers with separate Swagger tags.

## Required Endpoints

- `POST /applicants/`
  - Creates applicant profile.
  - Validates applicant type through enum.
  - Defaults verification state to `unverified`.
  - Defaults preferred language to `ar`.
  - Enforces duplicate `national_id` / `registration_number` as HTTP 409.
- `GET /applicants/{applicant_id}`
  - Returns a restricted public profile.
  - Does not expose `identity` or `privacy_settings`.
- `GET /applicants/{applicant_id}/applications`
  - Reads from shared `land_applications`.
  - Uses `applicant_ref.applicant_id`, `applicant_id`, and `linked_applications`.
- `POST /applications/{application_id}/documents`
  - Stores metadata only in `application_documents`.
  - Defaults status to `pending_review`.
- `POST /applications/{application_id}/comments`
  - Stores applicant comments in `applicant_comments`.
- `POST /applications/{application_id}/objections`
  - Stores objections in `objections`.
  - Adds shared `performance_logs` event with type `objection_submitted`.
  - Includes Student 1 workflow placeholder for `under_objection`.
- `GET /applications/{application_id}/timeline`
  - Returns events from `performance_logs`.
  - Returns `[]` when no logs exist.

## Required Collections

- `applicants`
- `application_documents`
- `objections`
- `performance_logs` shared
- `land_applications` shared/read-only from Student 1

## Notes

- Student 1 workflow/application state changes are intentionally left as `# PLACEHOLDER` comments.
- No frontend routes were changed.
- Existing Module 3 checklist was not overwritten.
