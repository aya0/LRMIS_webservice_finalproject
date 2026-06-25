from datetime import datetime

from fastapi import APIRouter, HTTPException, Path

import database as db
from models.application_document import ApplicationDocumentCreate, ApplicationDocumentOut
from routes.module2_helpers import find_applicant_by_id, serialize_doc_id, validate_application_access
from routes.module2_validation import Module2ValidationRoute

router = APIRouter(route_class=Module2ValidationRoute)


# MODULE 2: Applicant document metadata endpoints
def _log_document_uploaded(application_id: str, applicant_id: str, document_id: str, document: dict):
    db.performance_logs.update_one(
        {"application_id": application_id},
        {
            "$push": {
                "event_stream": {
                    "type": "document_uploaded",
                    "by": {"actor_type": "applicant", "actor_id": applicant_id},
                    "at": datetime.now(timezone.utc),
                    "meta": {
                        "document_id": document_id,
                        "document_type": document.get("document_type"),
                        "file_name": document.get("file_name"),
                        "status": document.get("status"),
                    },
                }
            }
        },
        upsert=True,
    )


@router.post(
    "/applications/{application_id}/documents",
    response_model=ApplicationDocumentOut,
    status_code=201,
)
def add_application_document(body: ApplicationDocumentCreate, application_id: str = Path(..., pattern=r"^[A-Za-z0-9\-]+$")):
    """Register supporting document metadata for an application."""
    applicant = find_applicant_by_id(body.applicant_id, "Upload document")
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found.")
    validate_application_access(application_id, body.applicant_id, applicant, "Upload document")

    doc = body.model_dump()
    doc["application_id"] = application_id
    doc["uploaded_at"] = datetime.now(timezone.utc)

    result = db.application_documents.insert_one(doc)
    document_id = str(result.inserted_id)
    _log_document_uploaded(application_id, body.applicant_id, document_id, doc)
    created = db.application_documents.find_one({"_id": result.inserted_id})
    return serialize_doc_id(created)
