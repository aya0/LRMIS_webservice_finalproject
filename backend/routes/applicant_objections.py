from datetime import datetime

from fastapi import APIRouter, HTTPException, Path

import database as db
from models.objection import ObjectionCreate, ObjectionOut
from routes.module2_helpers import find_applicant_by_id, serialize_doc_id, validate_application_access
from routes.module2_validation import Module2ValidationRoute

router = APIRouter(route_class=Module2ValidationRoute)


# MODULE 2: Applicant objection endpoints
def _set_application_under_objection(application: dict, application_id: str):
    if not application:
        return
    query = {"_id": application["_id"]} if application.get("_id") else {"application_id": application_id}
    db.land_applications.update_one(
        query,
        {
            "$set": {
                "status": "under_objection",
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )


def _log_objection_submitted(application_id: str, applicant_id: str, objection_id: str, objection: dict):
    db.performance_logs.update_one(
        {"application_id": application_id},
        {
            "$push": {
                "event_stream": {
                    "type": "objection_submitted",
                    "by": {"actor_type": "applicant", "actor_id": applicant_id},
                    "at": datetime.now(timezone.utc),
                    "meta": {
                        "objection_id": objection_id,
                        "status": objection.get("status"),
                        "reason_preview": objection.get("reason", "")[:80],
                    },
                }
            }
        },
        upsert=True,
    )


@router.post(
    "/applications/{application_id}/objections",
    response_model=ObjectionOut,
    status_code=201,
)
def submit_objection(body: ObjectionCreate, application_id: str = Path(..., pattern=r"^[A-Za-z0-9\-]+$")):
    """Submit an objection for an application."""
    applicant = find_applicant_by_id(body.applicant_id, "Submit objection")
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found.")
    application = validate_application_access(application_id, body.applicant_id, applicant, "Submit objection")

    doc = body.model_dump()
    doc["application_id"] = application_id
    doc["created_at"] = datetime.now(timezone.utc)

    result = db.objections.insert_one(doc)
    objection_id = str(result.inserted_id)
    _set_application_under_objection(application, application_id)
    _log_objection_submitted(application_id, body.applicant_id, objection_id, doc)

    created = db.objections.find_one({"_id": result.inserted_id})
    return serialize_doc_id(created)
