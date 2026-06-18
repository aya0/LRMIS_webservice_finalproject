# LRMIS Integration Contract

This file documents the exact field names, collection schemas, and values that
Student 3's code depends on from Student 1 and Student 2.
**Do not rename any field listed here without coordinating with Student 3.**

---

## What Student 3 reads from Student 1

Student 3's assignment engine, analytics endpoints, and map feed all read from
Student 1's collections. These fields must exist with these exact names.

### Collection: `land_applications`

| Field | Type | Required | Notes |
|---|---|---|---|
| `application_id` | string | ✅ | e.g. `"LRMIS-2026-0001"` — must be unique |
| `status` | string | ✅ | See workflow states below |
| `application_type` | string | ✅ | See application types below |
| `priority` | string | ✅ | `"urgent"`, `"high"`, `"normal"`, or `"low"` |
| `parcel_ref.zone_id` | string | ✅ | e.g. `"ZONE-RM-01"` — used for auto-assignment |
| `parcel_ref.parcel_id` | ObjectId | ✅ | Reference to `parcels` collection |
| `parcel_ref.parcel_number` | string | ✅ | e.g. `"145"` |
| `timestamps.submitted_at` | datetime | ✅ | Used for processing time analytics |
| `timestamps.approved_at` | datetime | ✅ (when approved) | Used for processing time analytics |

**Valid `status` values** (Student 3 queries these exactly):
```
submitted
pre_checked
survey_required      ← auto-assign only runs when status is this
surveyed
legal_review
approved
certificate_issued
closed
rejected
on_hold
missing_documents
under_objection
```

**Valid `application_type` values** (used for skill matching in auto-assign):
```
first_registration
ownership_transfer
parcel_subdivision
parcel_merge
boundary_correction
certificate_request
```

---

### Collection: `parcels`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | ✅ | Referenced by `land_applications.parcel_ref.parcel_id` |
| `parcel_number` | string | ✅ | e.g. `"145"` |
| `block_number` | string | ✅ | e.g. `"12"` |
| `basin_number` | string | ✅ | e.g. `"3"` |
| `zone_id` | string | ✅ | e.g. `"ZONE-RM-01"` |
| `registration_status` | string | ✅ | `"registered"`, `"pending"`, etc. |
| `dispute_state` | string | ✅ | `"none"`, or a dispute reason string |
| `area_sqm` | float | optional | Used in map popup |
| `parcel_code` | string | optional | e.g. `"RM-Z01-B12-P145"` |
| `geometry` | GeoJSON Polygon | ✅ | **Must be a valid GeoJSON Polygon** — used by the live map and heatmap |

**GeoJSON geometry format** (must follow this exactly):
```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [35.2001, 31.9021],
      [35.2015, 31.9021],
      [35.2015, 31.9030],
      [35.2001, 31.9030],
      [35.2001, 31.9021]
    ]
  ]
}
```
Coordinates are `[longitude, latitude]` (GeoJSON standard — longitude first).

---

### Collection: `certificates`

| Field | Type | Required | Notes |
|---|---|---|---|
| `status` | string | ✅ | Must be `"issued"` for the KPI counter to count it |
| `issued_at` | datetime | ✅ | Used for certificates-per-month chart |
| `certificate_id` | string | ✅ | Unique, e.g. `"CERT-2026-0001"` |
| `application_id` | ObjectId | ✅ | Reference to `land_applications` |
| `parcel_id` | ObjectId | ✅ | Reference to `parcels` |

---

## What Student 3 reads from Student 2

Student 3's module does not directly query Student 2's collections.
However, Student 2 must write objections in a way that Student 1's
`land_applications` status becomes `"under_objection"` — Student 3's
analytics query relies on that status value being set correctly.

---

## What Student 1 must do after registrar review

When Student 3's `PATCH /applications/{id}/registrar-review` is called
and the decision is `"approved"`, Student 1's workflow engine must
transition the application status from `"surveyed"` → `"legal_review"`.

Student 3's endpoint only records the review on the survey task.
**Student 1 is responsible for the application status transition.**

Student 3 logs the event to `performance_logs` with:
```json
{ "type": "registrar_reviewed", "actor_type": "registrar", ... }
```
Student 1 can listen for this or expose a separate transition endpoint.
Coordinate directly on how this handoff is triggered.

---

## Shared collection: `performance_logs`

All three students write to this collection. The schema Student 3 uses:

```json
{
  "application_id": "<string>",
  "event_stream": [
    {
      "type": "<event_type_string>",
      "by": {
        "actor_type": "system | applicant | surveyor | registrar",
        "actor_id": "<string>"
      },
      "at": { "$date": "<ISO datetime>" },
      "meta": {}
    }
  ]
}
```

Student 3 writes these `type` values to the event stream:
- `survey_assigned`
- `milestone_<milestone_name>` (e.g. `milestone_visit_scheduled`)
- `survey_report_uploaded`
- `registrar_reviewed`
- `survey_reassigned`

Do not use the same type strings for different events.

---

## Staff authentication — X-Staff-Id header

Student 3's protected endpoints (`registrar-review`, `reassign-surveyor`)
require an `X-Staff-Id` header with a valid MongoDB ObjectId from the
`staff_members` collection.

**Student 1 and Student 2**: if your frontend calls these endpoints,
you must include this header. The value is the `_id` of the logged-in
staff member returned from `POST /auth/login`.

```
X-Staff-Id: 675100000000000000000301
```

---

## Summary checklist for Student 1

- [ ] `land_applications` has `parcel_ref.zone_id` on every document
- [ ] `land_applications` has `priority` field (`urgent`/`high`/`normal`/`low`)
- [ ] `land_applications` status is set to `"survey_required"` before calling auto-assign
- [ ] `parcels` has a valid `geometry` GeoJSON Polygon field
- [ ] `parcels` has `dispute_state` field (at minimum `"none"`)
- [ ] `certificates` has `status: "issued"` and `issued_at` datetime
- [ ] After `registrar-review` decision `"approved"`, transition application to `"legal_review"`

## Summary checklist for Student 2

- [ ] When an objection is submitted, ensure `land_applications.status` becomes `"under_objection"` (coordinate with Student 1 on who triggers this transition)
