from bson import ObjectId
from datetime import datetime
from database import (
    create_indexes,
    applicants,
    parcels,
    land_applications,
    staff_members,
    survey_tasks,
    performance_logs,
    certificates
)


def seed():

    create_indexes()

    # ─────────────────────────────────────
    # Fixed IDs so references stay connected
    # ─────────────────────────────────────

    applicant_id = ObjectId("675100000000000000000101")
    parcel_id = ObjectId("675100000000000000000201")
    application_id = ObjectId("675100000000000000000001")
    staff_id = ObjectId("675100000000000000000301")
    survey_task_id = ObjectId("675100000000000000000401")
    performance_id = ObjectId("675100000000000000000501")
    certificate_id = ObjectId("675100000000000000000601")

    # clear old data
    applicants.delete_many({})
    parcels.delete_many({})
    land_applications.delete_many({})
    staff_members.delete_many({})
    survey_tasks.delete_many({})
    performance_logs.delete_many({})
    certificates.delete_many({})

    # ─────────────────────────────────────
    # Applicants
    # ─────────────────────────────────────

    applicants.insert_one({
        "_id": applicant_id,
        "full_name": "Nour Ahmad",
        "applicant_type": "citizen",

        "identity": {
            "national_id": "400000000",
            "verified": True,
            "verification_method": "otp_stub",
            "verified_at": datetime.fromisoformat("2026-01-20T08:20:00")
        },

        "contacts": {
            "email": "nour@example.com",
            "phone": "+970599000000"
        },

        "address": {
            "city": "Ramallah",
            "neighborhood": "Al Tireh",
            "zone_id": "ZONE-RM-01"
        },

        "preferences": {
            "preferred_contact": "email",
            "language": "ar",
            "notifications": {
                "on_status_change": True,
                "on_missing_documents": True,
                "on_certificate_ready": True
            }
        },

        "stats": {
            "total_applications": 3,
            "approved_applications": 1,
            "pending_applications": 2
        },

        "created_at": datetime.fromisoformat("2026-01-20T08:10:00")
    })

    # ─────────────────────────────────────
    # Parcels
    # ─────────────────────────────────────

    parcels.insert_one({
        "_id": parcel_id,

        "parcel_code": "RM-Z01-B12-P145",
        "parcel_number": "145",
        "block_number": "12",
        "basin_number": "3",
        "zone_id": "ZONE-RM-01",

        "current_owner_refs": [
            {
                "applicant_id": applicant_id,
                "share": "1/1"
            }
        ],

        "area_sqm": 850.5,
        "land_use": "residential",
        "registration_status": "registered",

        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [35.2001, 31.9021],
                [35.2015, 31.9021],
                [35.2015, 31.9030],
                [35.2001, 31.9030],
                [35.2001, 31.9021]
            ]]
        },

        "address_hint": "Ramallah - Al Tireh",
        "dispute_state": "none",

        "created_at": datetime.fromisoformat("2026-01-10T08:00:00"),
        "updated_at": datetime.fromisoformat("2026-02-01T10:00:00")
    })

    # ─────────────────────────────────────
    # Land Application
    # ─────────────────────────────────────

    land_applications.insert_one({
        "_id": application_id,

        "application_id": "LRMIS-2026-0001",
        "application_type": "ownership_transfer",
        "status": "pre_checked",
        "priority": "normal",

        "applicant_ref": {
            "applicant_id": applicant_id,
            "applicant_type": "citizen",
            "submitted_by_representative": False
        },

        "parcel_ref": {
            "parcel_id": parcel_id,
            "parcel_number": "145",
            "block_number": "12",
            "basin_number": "3",
            "zone_id": "ZONE-RM-01"
        },

        "description": "Ownership transfer application",

        "workflow": {
            "current_state": "pre_checked",
            "allowed_next": [
                "survey_required",
                "legal_review",
                "missing_documents"
            ]
        },

        "timestamps": {
            "submitted_at": datetime.fromisoformat("2026-02-01T09:00:00"),
            "pre_checked_at": datetime.fromisoformat("2026-02-01T10:00:00")
        },

        "assignment": {
            "assigned_surveyor_id": None,
            "assigned_registrar_id": "staff_14"
        }
    })

    # ─────────────────────────────────────
    # Staff
    # ─────────────────────────────────────

    staff_members.insert_one({
        "_id": staff_id,

        "staff_code": "SURV-RM-04",
        "name": "Survey Team A",
        "role": "surveyor",

        "coverage": {
            "zone_ids": [
                "ZONE-RM-01",
                "ZONE-RM-02"
            ]
        },

        "workload": {
            "active_tasks": 4,
            "max_tasks": 10
        },

        "active": True
    })

    # ─────────────────────────────────────
    # Survey Task
    # ─────────────────────────────────────

    survey_tasks.insert_one({
        "_id": survey_task_id,

        "task_id": "SURV-2026-0001",

        "application_id": application_id,
        "parcel_id": parcel_id,
        "assigned_surveyor_id": staff_id,

        "status": "visit_scheduled",

        "milestones": [
            {
                "type": "assigned",
                "by": "system"
            }
        ],

        "created_at": datetime.utcnow()
    })

    # ─────────────────────────────────────
    # Performance Logs
    # ─────────────────────────────────────

    performance_logs.insert_one({
        "_id": performance_id,

        "application_id": application_id,

        "event_stream": [
            {
                "type": "submitted",
                "by": {
                    "actor_type": "applicant"
                }
            }
        ],

        "computed_kpis": {
            "precheck_minutes": 60
        }
    })

    # ─────────────────────────────────────
    # Certificates
    # ─────────────────────────────────────

    certificates.insert_one({
        "_id": certificate_id,

        "certificate_id": "CERT-2026-0001",

        "application_id": application_id,
        "parcel_id": parcel_id,

        "status": "issued",

        "issued_to": {
            "applicant_id": applicant_id,
            "full_name": "Nour Ahmad"
        }
    })

    print("Sample dataset inserted successfully")


if __name__ == "__main__":
    seed()