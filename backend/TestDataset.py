from bson import ObjectId
from datetime import datetime, timedelta

from passlib.hash import pbkdf2_sha256

from database import (
    applicants,
    application_documents,
    applicant_comments,
    certificates,
    create_indexes,
    land_applications,
    objections,
    parcels,
    performance_logs,
    staff_members,
    survey_reports,
    survey_tasks,
)


APP_TYPES = [
    "first_registration",
    "ownership_transfer",
    "parcel_subdivision",
    "parcel_merge",
    "boundary_correction",
    "certificate_request",
]

APP_STATUSES = [
    "submitted",
    "pre_checked",
    "survey_required",
    "surveyed",
    "legal_review",
    "approved",
    "certificate_issued",
    "closed",
    "rejected",
    "on_hold",
    "missing_documents",
    "under_objection",
]

PRIORITIES = ["urgent", "high", "normal", "low"]
ZONES = ["ZONE-RM-01", "ZONE-RM-02", "ZONE-RM-03", "ZONE-RM-04", "ZONE-NB-01"]
LAND_USES = ["residential", "agricultural", "commercial", "industrial", "mixed_use"]
DOCUMENT_TYPES = [
    "identity_card",
    "title_deed",
    "survey_plan",
    "power_of_attorney",
    "tax_clearance",
]
SURVEY_STATUS_TO_MILESTONES = {
    "survey_required": ["assigned"],
    "surveyed": ["assigned", "visit_scheduled", "arrived_on_site", "survey_started", "survey_completed"],
    "legal_review": ["assigned", "visit_scheduled", "arrived_on_site", "survey_started", "survey_completed", "report_uploaded"],
    "approved": ["assigned", "visit_scheduled", "arrived_on_site", "survey_started", "survey_completed", "report_uploaded", "registrar_reviewed"],
    "certificate_issued": ["assigned", "visit_scheduled", "arrived_on_site", "survey_started", "survey_completed", "report_uploaded", "registrar_reviewed"],
    "closed": ["assigned", "visit_scheduled", "arrived_on_site", "survey_started", "survey_completed", "report_uploaded", "registrar_reviewed"],
}


def object_id_for(prefix: str, index: int) -> ObjectId:
    return ObjectId(f"6751{prefix}{index:020x}"[-24:])


def make_geometry(index: int):
    lng = 35.2000 + (index % 20) * 0.002
    lat = 31.9000 + (index // 20) * 0.002
    return {
        "type": "Polygon",
        "coordinates": [[
            [round(lng, 6), round(lat, 6)],
            [round(lng + 0.0012, 6), round(lat, 6)],
            [round(lng + 0.0012, 6), round(lat + 0.0011, 6)],
            [round(lng, 6), round(lat + 0.0011, 6)],
            [round(lng, 6), round(lat, 6)],
        ]],
    }


def allowed_next_states(status: str):
    transitions = {
        "submitted": ["pre_checked", "missing_documents", "rejected"],
        "pre_checked": ["survey_required", "legal_review", "missing_documents"],
        "survey_required": ["surveyed", "on_hold"],
        "surveyed": ["legal_review", "under_objection"],
        "legal_review": ["approved", "rejected", "on_hold"],
        "approved": ["certificate_issued", "closed"],
        "certificate_issued": ["closed"],
        "closed": [],
        "rejected": [],
        "on_hold": ["pre_checked", "survey_required", "legal_review"],
        "missing_documents": ["submitted", "pre_checked"],
        "under_objection": ["legal_review", "rejected"],
    }
    return transitions.get(status, [])


def applicant_type_for(index: int):
    cycle = ["citizen", "lawyer", "company", "authorized_representative"]
    return cycle[index % len(cycle)]


def identity_for(index: int, applicant_type: str):
    if applicant_type == "citizen":
        return {"national_id": f"40{index:07d}"}
    return {"registration_number": f"REG-{2026 + (index % 3)}-{index:03d}"}


def document_status_for(index: int):
    cycle = ["pending_review", "verified", "rejected", "missing"]
    return cycle[index % len(cycle)]


def staff_seed_docs():
    staff = []
    zone_groups = [
        ["ZONE-RM-01"],
        ["ZONE-RM-02"],
        ["ZONE-RM-03"],
        ["ZONE-RM-04"],
        ["ZONE-NB-01"],
    ]

    surveyor_names = [
        "Demo Surveyor One",
        "Demo Surveyor Two",
        "Demo Surveyor Three",
        "Demo Surveyor Four",
        "Demo Surveyor Five",
        "Demo Surveyor Six",
        "Demo Surveyor Seven",
        "Demo Surveyor Eight",
    ]
    registrar_names = [
        "Demo Registrar One",
        "Demo Registrar Two",
        "Demo Registrar Three",
        "Demo Registrar Four",
    ]

    for index, name in enumerate(surveyor_names, start=1):
        staff.append({
            "_id": object_id_for("01", index),
            "staff_code": f"SURV-{index:03d}",
            "name": name,
            "role": "surveyor",
            "department": "Field Survey",
            "skills": ["boundary_survey", "gps_mapping", "parcel_verification"],
            "coverage": {
                "zone_ids": zone_groups[(index - 1) % len(zone_groups)],
                "geo_fence": None,
            },
            "schedule": {
                "timezone": "Asia/Jerusalem",
                "shifts": [
                    {"day": "Mon", "start": "08:00", "end": "16:00"},
                    {"day": "Tue", "start": "08:00", "end": "16:00"},
                ],
                "on_call": index % 3 == 0,
            },
            "workload": {
                "active_tasks": index - 1,
                "max_tasks": 8 + (index % 4),
            },
            "contacts": {
                "phone": f"+970599100{index:03d}",
                "email": f"surveyor{index:02d}@example.com",
            },
            "password_hash": pbkdf2_sha256.hash("demo-pass"),
            "active": True,
            "created_at": datetime(2026, 1, 5, 8, 0) + timedelta(days=index),
        })

    for index, name in enumerate(registrar_names, start=1):
        staff.append({
            "_id": object_id_for("02", index),
            "staff_code": f"REG-{index:03d}",
            "name": name,
            "role": "registrar",
            "department": "Registry Office",
            "skills": ["legal_review", "certificate_issuance", "objection_handling"],
            "coverage": {
                "zone_ids": ZONES,
                "geo_fence": None,
            },
            "schedule": {
                "timezone": "Asia/Jerusalem",
                "shifts": [
                    {"day": "Sun", "start": "08:00", "end": "15:00"},
                    {"day": "Mon", "start": "08:00", "end": "15:00"},
                ],
                "on_call": index % 2 == 0,
            },
            "workload": {
                "active_tasks": index - 1,
                "max_tasks": 10,
            },
            "contacts": {
                "phone": f"+970599200{index:03d}",
                "email": f"registrar{index:02d}@example.com",
            },
            "password_hash": pbkdf2_sha256.hash("demo-pass"),
            "active": True,
            "created_at": datetime(2026, 1, 8, 9, 0) + timedelta(days=index),
        })

    return staff


def seed():
    create_indexes()

    applicants.delete_many({})
    parcels.delete_many({})
    land_applications.delete_many({})
    staff_members.delete_many({})
    survey_tasks.delete_many({})
    performance_logs.delete_many({})
    certificates.delete_many({})
    application_documents.delete_many({})
    applicant_comments.delete_many({})
    objections.delete_many({})
    survey_reports.delete_many({})

    staff_docs = staff_seed_docs()
    staff_members.insert_many(staff_docs)

    primary_surveyor_id = staff_docs[0]["_id"]
    primary_registrar_id = staff_docs[-1]["_id"]
    surveyor_codes = [doc["staff_code"] for doc in staff_docs if doc["role"] == "surveyor"]
    registrar_codes = [doc["staff_code"] for doc in staff_docs if doc["role"] == "registrar"]

    now = datetime(2026, 2, 1, 9, 0)

    for index in range(1, 101):
        applicant_id = object_id_for("10", index)
        parcel_id = object_id_for("20", index)
        application_id = object_id_for("30", index)
        survey_task_id = object_id_for("40", index)
        performance_id = object_id_for("50", index)
        certificate_id = object_id_for("60", index)

        applicant_type = applicant_type_for(index)
        identity = identity_for(index, applicant_type)
        zone_id = ZONES[(index - 1) % len(ZONES)]
        status = APP_STATUSES[(index - 1) % len(APP_STATUSES)]
        application_type = APP_TYPES[(index - 1) % len(APP_TYPES)]
        priority = PRIORITIES[(index - 1) % len(PRIORITIES)]
        surveyor_code = surveyor_codes[(index - 1) % len(surveyor_codes)]
        registrar_code = registrar_codes[(index - 1) % len(registrar_codes)]
        submitted_at = now - timedelta(days=index * 2)
        created_at = submitted_at - timedelta(hours=1)
        updated_at = submitted_at + timedelta(hours=min(index % 72, 24))

        identity = identity_for(index, applicant_type)
        identity_payload = {
            "verified": index % 2 == 0,
            "verification_method": "otp_stub" if index % 2 == 0 else "manual_review",
            "verified_at": submitted_at - timedelta(days=1) if index % 2 == 0 else None,
        }
        identity_payload.update(identity)

        applicants.insert_one({
            "_id": applicant_id,
            "full_name": f"Test Applicant {index:03d}",
            "applicant_type": applicant_type,
            "identity": identity_payload,
            "contacts": {
                "email": f"applicant{index:03d}@example.com",
                "phone": f"+970599300{index:03d}",
            },
            "address": {
                "city": "Ramallah" if index % 2 else "Nablus",
                "neighborhood": f"District {((index - 1) % 10) + 1}",
                "zone_id": zone_id,
            },
            "preferences": {
                "preferred_contact": "email" if index % 2 else "phone",
                "language": "ar" if index % 3 else "en",
                "notifications": {
                    "on_status_change": True,
                    "on_missing_documents": index % 4 != 0,
                    "on_certificate_ready": index % 5 != 0,
                },
            },
            "stats": {
                "total_applications": 1 + (index % 4),
                "approved_applications": 1 if status in {"approved", "certificate_issued", "closed"} else 0,
                "pending_applications": 1 if status in {"submitted", "pre_checked", "survey_required", "legal_review", "on_hold", "missing_documents"} else 0,
            },
            "created_at": created_at,
        })

        parcel_code = f"{zone_id.replace('-', '')}-B{((index - 1) % 15) + 1:02d}-P{100 + index}"
        parcels.insert_one({
            "_id": parcel_id,
            "parcel_code": parcel_code,
            "parcel_number": str(100 + index),
            "block_number": str(((index - 1) % 15) + 1),
            "basin_number": str(((index - 1) % 5) + 1),
            "zone_id": zone_id,
            "current_owner_refs": [
                {
                    "applicant_id": applicant_id,
                    "share": "1/1",
                }
            ],
            "area_sqm": round(420 + (index * 13.5), 1),
            "land_use": LAND_USES[(index - 1) % len(LAND_USES)],
            "registration_status": "registered" if index % 3 else "pending",
            "geometry": make_geometry(index),
            "address_hint": f"{zone_id} sector {((index - 1) % 10) + 1}",
            "dispute_state": "under_dispute" if status == "under_objection" else "none",
            "created_at": created_at,
            "updated_at": updated_at,
        })

        applicant_ref = {
            "applicant_id": applicant_id,
            "applicant_type": applicant_type,
            "submitted_by_representative": applicant_type != "citizen" and index % 2 == 1,
        }
        parcel_ref = {
            "parcel_id": parcel_id,
            "parcel_number": str(100 + index),
            "block_number": str(((index - 1) % 15) + 1),
            "basin_number": str(((index - 1) % 5) + 1),
            "zone_id": zone_id,
        }

        land_applications.insert_one({
            "_id": application_id,
            "application_id": f"LRMIS-2026-{index:04d}",
            "application_type": application_type,
            "status": status,
            "priority": priority,
            "applicant_ref": applicant_ref,
            "parcel_ref": parcel_ref,
            "description": f"{application_type.replace('_', ' ').title()} case {index:03d}",
            "tags": [application_type, status, priority, zone_id.lower()],
            "required_documents": [
                {
                    "document_type": doc_type,
                    "required": True,
                    "status": document_status_for(index + offset),
                }
                for offset, doc_type in enumerate(DOCUMENT_TYPES[: 2 + (index % 3)])
            ],
            "workflow": {
                "current_state": status,
                "allowed_next": allowed_next_states(status),
                "transition_rules_version": "v1.0",
            },
            "timestamps": {
                "submitted_at": submitted_at,
                "pre_checked_at": submitted_at + timedelta(hours=3) if status in {"pre_checked", "survey_required", "surveyed", "legal_review", "approved", "certificate_issued", "closed", "rejected", "on_hold", "missing_documents", "under_objection"} else None,
                "survey_required_at": submitted_at + timedelta(days=1) if status in {"survey_required", "surveyed", "legal_review", "approved", "certificate_issued", "closed"} else None,
                "surveyed_at": submitted_at + timedelta(days=2) if status in {"surveyed", "legal_review", "approved", "certificate_issued", "closed"} else None,
                "legal_review_at": submitted_at + timedelta(days=4) if status in {"legal_review", "approved", "certificate_issued", "closed", "rejected", "under_objection"} else None,
                "approved_at": submitted_at + timedelta(days=5) if status in {"approved", "certificate_issued", "closed"} else None,
                "certificate_issued_at": submitted_at + timedelta(days=6) if status in {"certificate_issued", "closed"} else None,
                "closed_at": submitted_at + timedelta(days=7) if status == "closed" else None,
                "updated_at": updated_at,
            },
            "assignment": {
                "assigned_surveyor_id": primary_surveyor_id if status in {"survey_required", "surveyed", "legal_review", "approved", "certificate_issued", "closed", "under_objection"} else None,
                "assigned_registrar_id": primary_registrar_id if status in {"legal_review", "approved", "certificate_issued", "closed", "rejected", "under_objection"} else None,
                "assignment_policy": "least-workload-first",
            },
            "objection": {
                "has_objection": status == "under_objection",
                "objection_ids": [f"OBJ-{index:04d}"] if status == "under_objection" else [],
            },
            "internal": {
                "notes": [
                    f"Seeded for {status} testing",
                    f"Zone {zone_id}",
                ] + (["Requires registrar follow-up"] if status in {"legal_review", "under_objection"} else []),
                "visibility": "staff_only",
            },
            "certificate": {
                "certificate_id": f"CERT-2026-{index:04d}",
                "status": "issued" if status in {"certificate_issued", "closed"} else "pending",
            } if status in {"approved", "certificate_issued", "closed"} else None,
        })

        if status in {"survey_required", "surveyed", "legal_review", "approved", "certificate_issued", "closed", "under_objection"}:
            milestone_key = "legal_review" if status == "under_objection" else "approved" if status in {"approved", "certificate_issued", "closed"} else status
            milestone_names = SURVEY_STATUS_TO_MILESTONES[milestone_key]
            survey_tasks.insert_one({
                "_id": survey_task_id,
                "task_id": f"SURV-2026-{index:04d}",
                "application_id": application_id,
                "parcel_id": parcel_id,
                "assigned_surveyor_id": primary_surveyor_id,
                "status": milestone_names[-1],
                "milestones": [
                    {
                        "type": milestone,
                        "at": submitted_at + timedelta(days=step + 1),
                        "by": surveyor_codes[step % len(surveyor_codes)] if milestone != "assigned" else "system",
                        "meta": {"sequence": step + 1},
                    }
                    for step, milestone in enumerate(milestone_names)
                ],
                "field_notes": [
                    {
                        "note": f"Field note for application {index:03d}",
                        "added_by": surveyor_codes[index % len(surveyor_codes)],
                        "added_at": submitted_at + timedelta(days=3),
                    }
                ],
                "report_uploaded": status in {"legal_review", "approved", "certificate_issued", "closed"},
                "created_at": submitted_at + timedelta(hours=2),
            })

        if status in {"surveyed", "legal_review", "approved", "certificate_issued", "closed"}:
            survey_reports.insert_one({
                "report_id": f"SR-2026-{index:04d}",
                "application_id": application_id,
                "title": f"Survey report {index:03d}",
                "file_url": f"https://example.com/reports/survey-report-{index:03d}.pdf",
                "file_name": f"survey-report-{index:03d}.pdf",
                "observations": "Boundary verified and no major encroachment found.",
                "area_sqm": round(420 + (index * 13.5), 1),
                "boundary_confirmed": status != "legal_review",
                "uploaded_by": surveyor_codes[(index - 1) % len(surveyor_codes)],
                "uploaded_at": submitted_at + timedelta(days=3),
            })

        document_count = 1 + (index % 3)
        for doc_index in range(document_count):
            doc_type = DOCUMENT_TYPES[(index + doc_index) % len(DOCUMENT_TYPES)]
            application_documents.insert_one({
                "document_id": f"DOC-{index:03d}-{doc_index + 1}",
                "application_id": application_id,
                "applicant_id": applicant_id,
                "document_type": doc_type,
                "file_name": f"{doc_type}-{index:03d}.pdf",
                "file_url": f"https://example.com/documents/{index:03d}/{doc_index + 1}.pdf",
                "file_size": 150000 + (index * 200) + (doc_index * 500),
                "file_extension": "pdf",
                "status": document_status_for(index + doc_index),
                "uploaded_at": submitted_at + timedelta(hours=doc_index + 1),
            })

        if index % 2 == 0:
            applicant_comments.insert_one({
                "comment_id": f"CMT-{index:04d}",
                "application_id": application_id,
                "applicant_id": applicant_id,
                "author": "applicant",
                "text": f"Comment for application {index:03d}",
                "created_at": submitted_at + timedelta(hours=6),
            })

        if status in {"under_objection", "rejected"} or index % 7 == 0:
            objections.insert_one({
                "objection_id": f"OBJ-{index:04d}",
                "application_id": application_id,
                "applicant_id": applicant_id,
                "reason": "Boundary dispute or document mismatch",
                "status": "open" if status == "under_objection" else "closed",
                "filed_at": submitted_at + timedelta(days=1),
            })

        performance_logs.insert_one({
            "_id": performance_id,
            "application_id": application_id,
            "event_stream": [
                {"type": "submitted", "by": {"actor_type": "applicant"}},
                {"type": status, "by": {"actor_type": "system"}},
            ],
            "computed_kpis": {
                "precheck_minutes": 30 + (index % 90),
                "survey_days": 1 + (index % 5),
            },
        })

        if status in {"approved", "certificate_issued", "closed"}:
            certificates.insert_one({
                "_id": certificate_id,
                "certificate_id": f"CERT-2026-{index:04d}",
                "application_id": application_id,
                "parcel_id": parcel_id,
                "status": "issued" if status in {"certificate_issued", "closed"} else "draft",
                "issued_to": {
                    "applicant_id": applicant_id,
                    "full_name": f"Test Applicant {index:03d}",
                },
            })

    print("Seeded 100 connected applications plus supporting staff, parcels, and module 2/3 records.")
    print("Staff demo credentials: demo-pass for all SURV-*** and REG-*** accounts.")


if __name__ == "__main__":
    seed()