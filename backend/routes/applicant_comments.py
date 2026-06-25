from datetime import datetime

from fastapi import APIRouter, HTTPException, Path

import database as db
from models.applicant_comment import ApplicantCommentCreate, ApplicantCommentOut
from routes.module2_helpers import find_applicant_by_id, serialize_doc_id, validate_application_access
from routes.module2_validation import Module2ValidationRoute

router = APIRouter(route_class=Module2ValidationRoute)


# MODULE 2: Applicant comments and responses
def _log_comment_submitted(application_id: str, applicant_id: str, comment_id: str, comment: str):
    db.performance_logs.update_one(
        {"application_id": application_id},
        {
            "$push": {
                "event_stream": {
                    "type": "comment_submitted",
                    "by": {"actor_type": "applicant", "actor_id": applicant_id},
                    "at": datetime.now(timezone.utc),
                    "meta": {
                        "comment_id": comment_id,
                        "comment_preview": comment[:80],
                    },
                }
            }
        },
        upsert=True,
    )


@router.post(
    "/applications/{application_id}/comments",
    response_model=ApplicantCommentOut,
    status_code=201,
)
def add_applicant_comment(body: ApplicantCommentCreate, application_id: str = Path(..., pattern=r"^[A-Za-z0-9\-]+$")):
    """Add an applicant comment or response to an application."""
    applicant = find_applicant_by_id(body.applicant_id, "Add comment")
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found.")
    validate_application_access(application_id, body.applicant_id, applicant, "Add comment")

    doc = body.model_dump()
    doc["application_id"] = application_id
    doc["created_at"] = datetime.now(timezone.utc)

    result = db.applicant_comments.insert_one(doc)
    comment_id = str(result.inserted_id)
    _log_comment_submitted(application_id, body.applicant_id, comment_id, body.comment)
    created = db.applicant_comments.find_one({"_id": result.inserted_id})
    return serialize_doc_id(created)
