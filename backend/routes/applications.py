from fastapi import APIRouter, HTTPException, Query, Header
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from bson.errors import InvalidId

import database as db
from database import land_applications, certificates, parcels
from models.schemas import (
    ApplicationCreate, ApplicationTransition,
    HoldRequest, RejectRequest, NoteRequest,
    ApplicationUpdate,
)
from services.workflow import (
    validate_transition, build_workflow_field,
    get_timestamp_field_for_state, can_transition,
)
from services.logger import log_event, update_kpi
from services.id_gen import generate_application_id, generate_certificate_id

router = APIRouter(prefix="/applications", tags=["Applications"])


def serialize(doc: dict) -> dict:
    """Convert MongoDB ObjectIds and dates to JSON-safe types."""
    if doc is None:
        return None
    out = {}
    for k, v in doc.items():
        if k == "_id":
            out["id"] = str(v)
        elif isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, dict):
            out[k] = serialize(v)
        elif isinstance(v, list):
            out[k] = [serialize(i) if isinstance(i, dict) else
                      (str(i) if isinstance(i, ObjectId) else i) for i in v]
        else:
            out[k] = v
    return out


def get_app_or_404(application_id: str) -> dict:
    """Fetch application by string application_id or 24-hex _id."""
    doc = land_applications.find_one({"application_id": application_id})
    if not doc:
        try:
            doc = land_applications.find_one({"_id": ObjectId(application_id)})
        except (InvalidId, Exception):
            pass
    if not doc:
        raise HTTPException(status_code=404, detail=f"Application '{application_id}' not found.")
    return doc


#  POST /applications

@router.post("/", status_code=201)
def create_application(
    body: ApplicationCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    """
    Create a new land registration application.
    Supports idempotency via Idempotency-Key header OR body.idempotency_key.
    """
    idem_key = idempotency_key or body.idempotency_key

    # Idempotency check
    if idem_key:
        existing = land_applications.find_one({"idempotency_key": idem_key})
        if existing:
            return {"message": "Duplicate request – returning existing application.",
                    "application": serialize(existing)}

    now = datetime.now(timezone.utc)
    app_id = generate_application_id()

    doc = {
        "application_id": app_id,
        "application_type": body.application_type.value,
        "status": "submitted",
        "priority": body.priority.value,
        "applicant_ref": body.applicant_ref.model_dump(),
        "parcel_ref": body.parcel_ref.model_dump(),
        "description": body.description,
        "tags": body.tags,
        "workflow": build_workflow_field("submitted"),
        "required_documents": [d.model_dump() for d in body.required_documents],
        "timestamps": {
            "submitted_at": now,
            "pre_checked_at": None,
            "survey_required_at": None,
            "surveyed_at": None,
            "legal_review_at": None,
            "approved_at": None,
            "certificate_issued_at": None,
            "closed_at": None,
            "updated_at": now,
        },
        "assignment": {
            "assigned_surveyor_id": None,
            "assigned_registrar_id": None,
            "assignment_policy": "least-workload-first",
        },
        "objection": {"has_objection": False, "objection_ids": []},
        "internal": {"notes": [], "visibility": "staff_only"},
        "certificate": None,
        "idempotency_key": idem_key,
        "rejection_reason": None,
        "hold_reason": None,
    }

    result = land_applications.insert_one(doc)
    doc["_id"] = result.inserted_id

    log_event(app_id, "submitted", "applicant",
              body.applicant_ref.applicant_id, {"channel": "web"})

    return {"message": "Application created successfully.", "application": serialize(doc)}


#  GET /applications/{application_id} 

@router.get("/{application_id}")
def get_application(application_id: str):
    doc = get_app_or_404(application_id)
    return serialize(doc)


#  PATCH /applications/{application_id}

@router.patch("/{application_id}")
def update_application(application_id: str, body: ApplicationUpdate):
    """Update editable application fields before the record is finalized."""
    doc = get_app_or_404(application_id)
    app_id = doc["application_id"]

    if doc["status"] in ("approved", "certificate_issued", "closed"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit application in '{doc['status']}' state.",
        )

    payload = body.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields provided for update.")

    update_fields = {}
    if payload.get("priority") is not None:
        update_fields["priority"] = payload["priority"].value
    if payload.get("description") is not None:
        update_fields["description"] = payload["description"]
    if payload.get("tags") is not None:
        update_fields["tags"] = payload["tags"]
    if payload.get("required_documents") is not None:
        update_fields["required_documents"] = [d.model_dump() for d in payload["required_documents"]]

    update_fields["timestamps.updated_at"] = datetime.now(timezone.utc)

    land_applications.update_one(
        {"application_id": app_id},
        {"$set": update_fields},
    )

    updated = land_applications.find_one({"application_id": app_id})
    log_event(app_id, "application_updated", "staff", "system", update_fields)
    return {"message": "Application updated successfully.", "application": serialize(updated)}


#  PUT /applications/{application_id}

@router.put("/{application_id}")
def replace_application(application_id: str, body: ApplicationCreate):
    """Fully replace the editable application content before final approval."""
    doc = get_app_or_404(application_id)
    app_id = doc["application_id"]

    if doc["status"] in ("approved", "certificate_issued", "closed"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot replace application in '{doc['status']}' state.",
        )

    now = datetime.now(timezone.utc)
    replacement = {
        "application_type": body.application_type.value,
        "priority": body.priority.value,
        "applicant_ref": body.applicant_ref.model_dump(),
        "parcel_ref": body.parcel_ref.model_dump(),
        "description": body.description,
        "tags": body.tags,
        "required_documents": [d.model_dump() for d in body.required_documents],
        "timestamps.updated_at": now,
        "idempotency_key": body.idempotency_key,
    }

    land_applications.update_one(
        {"application_id": app_id},
        {"$set": replacement},
    )

    updated = land_applications.find_one({"application_id": app_id})
    log_event(app_id, "application_replaced", "staff", "system", replacement)
    return {"message": "Application replaced successfully.", "application": serialize(updated)}


#  DELETE /applications/{application_id}

@router.delete("/{application_id}")
def delete_application(application_id: str):
    """Delete an application before it enters the later workflow stages."""
    doc = get_app_or_404(application_id)
    app_id = doc["application_id"]

    if doc["status"] not in ("submitted", "pre_checked", "missing_documents", "on_hold", "rejected"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete application in '{doc['status']}' state.",
        )

    land_applications.delete_one({"application_id": app_id})
    log_event(app_id, "application_deleted", "staff", "system", {})
    return {"message": "Application deleted successfully.", "application_id": app_id}


#  GET /applications/ 

@router.get("/")
def list_applications(
    status: Optional[str] = None,
    application_type: Optional[str] = None,
    zone_id: Optional[str] = None,
    priority: Optional[str] = None,
    applicant_id: Optional[str] = None,
    assigned_staff_id: Optional[str] = None,
    assigned_staff_role: Optional[str] = None,
    sort_by: str = Query("timestamps.submitted_at", description="Field to sort by"),
    sort_order: int = Query(-1, description="1=asc, -1=desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List applications with filters, pagination, and sorting."""
    query = {}
    if status:
        query["status"] = status
    if application_type:
        query["application_type"] = application_type
    if zone_id:
        query["parcel_ref.zone_id"] = zone_id
    if priority:
        query["priority"] = priority
    if applicant_id:
        query["applicant_ref.applicant_id"] = applicant_id
    if assigned_staff_id:
        staff_ids = [assigned_staff_id]
        try:
            staff_ids.append(ObjectId(assigned_staff_id))
        except Exception:
            pass

        if assigned_staff_role == "surveyor":
            query["assignment.assigned_surveyor_id"] = {"$in": staff_ids}
        elif assigned_staff_role == "registrar":
            query["assignment.assigned_registrar_id"] = {"$in": staff_ids}
        else:
            query["$or"] = [
                {"assignment.assigned_surveyor_id": {"$in": staff_ids}},
                {"assignment.assigned_registrar_id": {"$in": staff_ids}},
            ]

    total = land_applications.count_documents(query)
    skip = (page - 1) * page_size
    cursor = land_applications.find(query).sort(sort_by, sort_order).skip(skip).limit(page_size)

    items = [serialize(doc) for doc in cursor]
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "items": items,
    }


#  PATCH /applications/{application_id}/transition 

@router.patch("/{application_id}/transition")
def transition_application(application_id: str, body: ApplicationTransition):
    """Move application to the next workflow state (with full validation)."""
    doc = get_app_or_404(application_id)
    app_id = doc["application_id"]

    error = validate_transition(doc, body.target_state.value)
    if error:
        raise HTTPException(status_code=400, detail=error)

    now = datetime.now(timezone.utc)
    new_state = body.target_state.value

    update = {
        "$set": {
            "status": new_state,
            "workflow": build_workflow_field(new_state),
            "timestamps.updated_at": now,
        }
    }

    # Set the state-specific timestamp
    ts_field = get_timestamp_field_for_state(new_state)
    if ts_field:
        update["$set"][f"timestamps.{ts_field}"] = now

    # Append optional note
    if body.note:
        update["$push"] = {"internal.notes": f"[{new_state}] {body.note}"}

    land_applications.update_one({"application_id": app_id}, update)
    log_event(app_id, new_state, body.actor_type, body.actor_id,
              {"note": body.note} if body.note else {})

    # If moving to legal_review, compute survey delay KPI
    if new_state == "legal_review" and doc["timestamps"].get("survey_required_at"):
        delta = (now - doc["timestamps"]["survey_required_at"]).days
        update_kpi(app_id, "survey_delay_days", delta)

    # Automatically create the survey task once the application reaches survey_required.
    if new_state == "survey_required" and not db.survey_tasks.find_one({"application_id": app_id}):
        from routes.survey import auto_assign_surveyor

        try:
            auto_assign_surveyor(app_id)
        except HTTPException:
            # Keep the workflow transition successful even if assignment is temporarily unavailable.
            pass

    updated = land_applications.find_one({"application_id": app_id})
    return {"message": f"Application transitioned to '{new_state}'.",
            "application": serialize(updated)}


#  POST /applications/{application_id}/hold 
@router.post("/{application_id}/hold")
def hold_application(application_id: str, body: HoldRequest):
    doc = get_app_or_404(application_id)
    app_id = doc["application_id"]

    if doc["status"] in ("closed", "rejected", "certificate_issued"):
        raise HTTPException(status_code=400,
                            detail=f"Cannot hold application in '{doc['status']}' state.")

    now = datetime.now(timezone.utc)
    land_applications.update_one(
        {"application_id": app_id},
        {
            "$set": {
                "status": "on_hold",
                "hold_reason": body.reason,
                "workflow": build_workflow_field("on_hold"),
                "timestamps.updated_at": now,
            },
            "$push": {"internal.notes": f"[on_hold] {body.reason}"},
        },
    )
    log_event(app_id, "on_hold", "staff", body.actor_id, {"reason": body.reason})
    return {"message": "Application placed on hold.", "reason": body.reason}


#  POST /applications/{application_id}/reject 

@router.post("/{application_id}/reject")
def reject_application(application_id: str, body: RejectRequest):
    doc = get_app_or_404(application_id)
    app_id = doc["application_id"]

    if doc["status"] in ("closed", "rejected", "certificate_issued"):
        raise HTTPException(status_code=400,
                            detail=f"Cannot reject application in '{doc['status']}' state.")

    if not body.reason:
        raise HTTPException(status_code=400,
                            detail="Rejected applications must include a rejection reason.")

    now = datetime.now(timezone.utc)
    land_applications.update_one(
        {"application_id": app_id},
        {
            "$set": {
                "status": "rejected",
                "rejection_reason": body.reason,
                "workflow": build_workflow_field("rejected"),
                "timestamps.updated_at": now,
            },
            "$push": {"internal.notes": f"[rejected] {body.reason}"},
        },
    )
    log_event(app_id, "rejected", "staff", body.actor_id,
              {"reason": body.reason, "legal_basis": body.legal_basis})
    return {"message": "Application rejected.", "reason": body.reason}


# POST /applications/{application_id}/certificate 

@router.post("/{application_id}/certificate", status_code=201)
def issue_certificate(application_id: str, issued_by: str = "registrar"):
    doc = get_app_or_404(application_id)
    app_id = doc["application_id"]

    if doc["status"] != "approved":
        raise HTTPException(status_code=400,
                            detail="A certificate can only be issued for an approved application.")

    # Check if already issued
    existing_cert = certificates.find_one({"application_id": app_id})
    if existing_cert:
        return {"message": "Certificate already exists.", "certificate": serialize(existing_cert)}

    now = datetime.now(timezone.utc)
    cert_id = generate_certificate_id()

    cert = {
        "certificate_id": cert_id,
        "application_id": app_id,
        "parcel_id": doc.get("parcel_ref", {}).get("parcel_id"),
        "certificate_type": "ownership_certificate",
        "status": "issued",
        "issued_to": {
            "applicant_id": doc["applicant_ref"]["applicant_id"],
        },
        "issued_at": now,
        "issued_by": issued_by,
        "verification": {
            "qr_code_url": f"/certificates/{cert_id}/verify",
            "digital_signature_stub": f"signed_hash_{cert_id}",
        },
    }
    certificates.insert_one(cert)

    # Transition application to certificate_issued
    land_applications.update_one(
        {"application_id": app_id},
        {
            "$set": {
                "status": "certificate_issued",
                "workflow": build_workflow_field("certificate_issued"),
                "timestamps.certificate_issued_at": now,
                "timestamps.updated_at": now,
                "certificate": {"certificate_id": cert_id, "status": "issued"},
            }
        },
    )

    log_event(app_id, "certificate_issued", "registrar", issued_by,
              {"certificate_id": cert_id})
    update_kpi(app_id, "certificate_issued", True)

    return {"message": "Certificate issued successfully.", "certificate": serialize(cert)}


# GET /applications/{application_id}/certificate

@router.get("/{application_id}/certificate")
def get_application_certificate(application_id: str):
    """Convenience endpoint to fetch the certificate linked to an application."""
    doc = get_app_or_404(application_id)
    cert_ref = doc.get("certificate", {}) or {}
    cert_id = cert_ref.get("certificate_id")

    cert = None
    if cert_id:
        cert = certificates.find_one({"certificate_id": cert_id})
    if not cert:
        cert = certificates.find_one({"application_id": doc["application_id"]})

    if not cert:
        raise HTTPException(status_code=404, detail="No certificate found for this application.")

    return serialize(cert)


# POST /applications/{application_id}/notes 

@router.post("/{application_id}/notes")
def add_note(application_id: str, body: NoteRequest):
    doc = get_app_or_404(application_id)
    app_id = doc["application_id"]

    land_applications.update_one(
        {"application_id": app_id},
        {
            "$push": {"internal.notes": f"[{body.actor_id}] {body.note}"},
            "$set": {"timestamps.updated_at": datetime.now(timezone.utc)},
        },
    )
    log_event(app_id, "note_added", "staff", body.actor_id, {"note": body.note})
    return {"message": "Note added successfully."}
