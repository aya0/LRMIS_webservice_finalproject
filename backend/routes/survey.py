from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional
from datetime import datetime
from bson import ObjectId
import database as db
from models.survey_task import (
    MilestoneRequest, FieldNoteRequest, SurveyMilestoneType,
    MILESTONE_ORDER, Milestone, FieldNote
)
from models.survey_report import SurveyReportCreate, SurveyReportOut, RegistrarReviewRequest
from services.assignment import find_best_surveyor
from routes.staff import require_staff

router = APIRouter()


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


def _log_event(application_id: str, event_type: str, actor_type: str,
               actor_id: str, meta: dict = {}):
    """
    Append an event to performance_logs.
    This collection is shared — all modules write to it.
    """
    db.performance_logs.update_one(
        {"application_id": application_id},
        {
            "$push": {
                "event_stream": {
                    "type":      event_type,
                    "by":        {"actor_type": actor_type, "actor_id": actor_id},
                    "at":        {"$date": datetime.utcnow().isoformat() + "Z"},
                    "meta":      meta,
                }
            }
        },
        upsert=True,
    )


# ── POST /applications/{application_id}/auto-assign-surveyor ──────────────────
@router.post("/applications/{application_id}/auto-assign-surveyor", response_model=dict)
def auto_assign_surveyor(application_id: str):
    """
    Automatically assign the best available surveyor to this application.
    Policy: zone match + availability + workload balancing + skill match + priority + existing tasks.
    Application must have status 'survey_required'.
    """
    try:
        surveyor, application = find_best_surveyor(application_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    surveyor_id  = str(surveyor["_id"])
    parcel_id    = str((application.get("parcel_ref") or {}).get("parcel_id", ""))
    now          = datetime.utcnow()

    # Create survey task
    task_number = db.survey_tasks.count_documents({}) + 1
    task_id     = f"SURV-{now.year}-{str(task_number).zfill(4)}"

    task_doc = {
        "task_id":              task_id,
        "application_id":       application_id,
        "parcel_id":            parcel_id,
        "assigned_surveyor_id": surveyor_id,
        "status":               SurveyMilestoneType.assigned,
        "milestones": [
            {
                "type": SurveyMilestoneType.assigned,
                "at":   now,
                "by":   "system",
                "meta": {"reason": "auto-assigned via zone+workload+availability+skill policy"},
            }
        ],
        "field_notes":     [],
        "report_uploaded": False,
        "created_at":      now,
    }

    result = db.survey_tasks.insert_one(task_doc)

    # Update surveyor's active task count
    db.staff_members.update_one(
        {"_id": ObjectId(surveyor_id)},
        {"$inc": {"workload.active_tasks": 1}}
    )

    # Log the event to performance_logs
    _log_event(
        application_id=application_id,
        event_type="survey_assigned",
        actor_type="system",
        actor_id="assignment_engine",
        meta={"assigned_surveyor": surveyor.get("staff_code", surveyor_id), "task_id": task_id},
    )

    task_doc["id"] = str(result.inserted_id)
    task_doc.pop("_id", None)
    return task_doc


# ── PATCH /applications/{application_id}/survey-milestone ────────────────────
@router.patch("/applications/{application_id}/survey-milestone", response_model=dict)
def add_survey_milestone(application_id: str, body: MilestoneRequest):
    """
    Advance the survey task to the next milestone.
    Enforces the exact milestone order from the spec:
    assigned → visit_scheduled → arrived_on_site → survey_started
             → survey_completed → report_uploaded → registrar_reviewed
    """
    task = db.survey_tasks.find_one({"application_id": application_id})
    if not task:
        raise HTTPException(status_code=404, detail="No survey task found for this application.")

    current_status = task["status"]
    current_index  = MILESTONE_ORDER.index(SurveyMilestoneType(current_status))
    new_index      = MILESTONE_ORDER.index(body.milestone)

    if new_index != current_index + 1:
        expected_next = MILESTONE_ORDER[current_index + 1] if current_index + 1 < len(MILESTONE_ORDER) else "none"
        raise HTTPException(
            status_code=400,
            detail=f"Invalid milestone transition. Current: '{current_status}'. Expected next: '{expected_next}'."
        )

    milestone_doc = {
        "type": body.milestone,
        "at":   datetime.utcnow(),
        "by":   body.by,
        "meta": body.meta,
    }
    if body.scheduled_date:
        milestone_doc["meta"]["scheduled_date"] = body.scheduled_date

    update_fields = {
        "status":    body.milestone,
        "$push":     {"milestones": milestone_doc},
    }

    # Mark report_uploaded flag when milestone reached
    if body.milestone == SurveyMilestoneType.report_uploaded:
        db.survey_tasks.update_one(
            {"application_id": application_id},
            {"$set": {"status": body.milestone, "report_uploaded": True},
             "$push": {"milestones": milestone_doc}}
        )
    else:
        db.survey_tasks.update_one(
            {"application_id": application_id},
            {"$set": {"status": body.milestone},
             "$push": {"milestones": milestone_doc}}
        )

    _log_event(
        application_id=application_id,
        event_type=f"milestone_{body.milestone}",
        actor_type="surveyor",
        actor_id=body.by,
        meta=body.meta,
    )

    updated = db.survey_tasks.find_one({"application_id": application_id})
    return _serialize(updated)


# ── POST /applications/{application_id}/survey-report ────────────────────────
@router.post("/applications/{application_id}/survey-report", response_model=dict, status_code=201)
def upload_survey_report(application_id: str, body: SurveyReportCreate):
    """
    Upload or register survey report metadata for an application.
    Spec says metadata — not binary file upload.
    """
    task = db.survey_tasks.find_one({"application_id": application_id})
    if not task:
        raise HTTPException(status_code=404, detail="No survey task found for this application.")

    doc = body.model_dump()
    doc["application_id"] = application_id
    result = db.survey_reports.insert_one(doc)

    # Automatically advance milestone to report_uploaded if not already there
    current_status = task.get("status")
    if current_status == SurveyMilestoneType.survey_completed:
        db.survey_tasks.update_one(
            {"application_id": application_id},
            {
                "$set": {"status": SurveyMilestoneType.report_uploaded, "report_uploaded": True},
                "$push": {
                    "milestones": {
                        "type": SurveyMilestoneType.report_uploaded,
                        "at":   datetime.utcnow(),
                        "by":   body.surveyor_id,
                        "meta": {"report_title": body.report_title},
                    }
                }
            }
        )

    _log_event(
        application_id=application_id,
        event_type="survey_report_uploaded",
        actor_type="surveyor",
        actor_id=body.surveyor_id,
        meta={"report_title": body.report_title},
    )

    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


# ── PATCH /applications/{application_id}/registrar-review ────────────────────
@router.patch("/applications/{application_id}/registrar-review", response_model=dict)
def registrar_review(application_id: str, body: RegistrarReviewRequest,
                     _staff=Depends(require_staff)):
    """
    Registrar reviews the survey results and makes a decision.
    Valid decisions: approved, rejected, needs_revision.
    Advances survey task milestone to registrar_reviewed.
    NOTE: Updating the main application status (to legal_review or rejected)
          is PLACEHOLDER — Student 1 owns that transition.
    """
    valid_decisions = {"approved", "rejected", "needs_revision"}
    if body.decision not in valid_decisions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid decision '{body.decision}'. Must be one of: {valid_decisions}"
        )

    task = db.survey_tasks.find_one({"application_id": application_id})
    if not task:
        raise HTTPException(status_code=404, detail="No survey task found for this application.")

    # Advance milestone to registrar_reviewed
    milestone_doc = {
        "type": SurveyMilestoneType.registrar_reviewed,
        "at":   body.reviewed_at,
        "by":   body.registrar_id,
        "meta": {"decision": body.decision, "notes": body.decision_notes},
    }

    db.survey_tasks.update_one(
        {"application_id": application_id},
        {
            "$set":  {"status": SurveyMilestoneType.registrar_reviewed},
            "$push": {"milestones": milestone_doc},
        }
    )

    # Store registrar review in survey_reports
    review_doc = body.model_dump()
    review_doc["application_id"] = application_id
    db.survey_reports.update_one(
        {"application_id": application_id},
        {"$set": {"registrar_review": review_doc}},
        upsert=True,
    )

    _log_event(
        application_id=application_id,
        event_type="registrar_reviewed",
        actor_type="registrar",
        actor_id=body.registrar_id,
        meta={"decision": body.decision},
    )

    # PLACEHOLDER (Student 1): After registrar approves the survey review,
    # Student 1's workflow engine should transition application status from
    # "surveyed" → "legal_review". Coordinate with Student 1 on this handoff.

    return {
        "application_id": application_id,
        "registrar_id":   body.registrar_id,
        "decision":       body.decision,
        "decision_notes": body.decision_notes,
        "reviewed_at":    body.reviewed_at,
        "message":        (
            "Survey review recorded. "
            "PLACEHOLDER: Student 1 must update application status to 'legal_review' or 'rejected'."
        )
    }


# ── GET /survey-tasks/{task_id} (by MongoDB ObjectId) ────────────────────────
@router.get("/survey-tasks/{task_id}", response_model=dict)
def get_survey_task_by_id(task_id: str):
    """
    Retrieve a single survey task by its MongoDB ObjectId.
    Used by TaskExecution.jsx which navigates to /tasks/{task.id}.
    """
    try:
        oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task_id format.")

    task = db.survey_tasks.find_one({"_id": oid})
    if not task:
        raise HTTPException(status_code=404, detail="Survey task not found.")
    return _serialize(task)


# ── GET /applications/{application_id}/survey-task ───────────────────────────
@router.get("/applications/{application_id}/survey-task", response_model=dict)
def get_survey_task(application_id: str):
    """Retrieve the survey task for an application."""
    task = db.survey_tasks.find_one({"application_id": application_id})
    if not task:
        raise HTTPException(status_code=404, detail="No survey task found.")
    return _serialize(task)


# ── GET /survey-tasks/ (surveyor's own tasks) ─────────────────────────────────
@router.get("/survey-tasks/", response_model=list)
def list_surveyor_tasks(surveyor_id: str, status: Optional[str] = None):
    """
    List all survey tasks assigned to a surveyor.
    Used by the Surveyor UI — My Survey Tasks screen.
    """
    query: dict = {"assigned_surveyor_id": surveyor_id}
    if status:
        query["status"] = status

    tasks = list(db.survey_tasks.find(query))
    return [_serialize(t) for t in tasks]


# ── PATCH /applications/{application_id}/reassign-surveyor ───────────────────
@router.patch("/applications/{application_id}/reassign-surveyor", response_model=dict)
def reassign_surveyor(application_id: str, new_surveyor_id: str, reason: str = "manual reassignment",
                      _staff=Depends(require_staff)):
    """
    Manually reassign a survey task to a different surveyor.
    Spec: "Support manual reassignment".
    Decrements old surveyor's workload, increments new surveyor's workload.
    """
    task = db.survey_tasks.find_one({"application_id": application_id})
    if not task:
        raise HTTPException(status_code=404, detail="No survey task found for this application.")

    if task["status"] == SurveyMilestoneType.registrar_reviewed:
        raise HTTPException(status_code=400, detail="Cannot reassign — task is already fully reviewed.")

    try:
        new_oid = ObjectId(new_surveyor_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid new_surveyor_id format.")

    new_surveyor = db.staff_members.find_one({"_id": new_oid, "role": "surveyor", "active": True})
    if not new_surveyor:
        raise HTTPException(status_code=404, detail="New surveyor not found or not an active surveyor.")

    old_surveyor_id = task.get("assigned_surveyor_id")

    # Adjust workload counters
    if old_surveyor_id and old_surveyor_id != new_surveyor_id:
        try:
            db.staff_members.update_one(
                {"_id": ObjectId(old_surveyor_id)},
                {"$inc": {"workload.active_tasks": -1}}
            )
        except Exception:
            pass  # Old surveyor may have been deleted

    db.staff_members.update_one(
        {"_id": new_oid},
        {"$inc": {"workload.active_tasks": 1}}
    )

    # Record a milestone note about reassignment
    reassignment_note = {
        "type": task["status"],  # Stay on same milestone — just change who's responsible
        "at": datetime.utcnow(),
        "by": "admin",
        "meta": {
            "event": "manual_reassignment",
            "from_surveyor": old_surveyor_id,
            "to_surveyor": new_surveyor_id,
            "reason": reason,
        },
    }

    db.survey_tasks.update_one(
        {"application_id": application_id},
        {
            "$set":  {"assigned_surveyor_id": new_surveyor_id},
            "$push": {"field_notes": {
                "note":     f"Reassigned to {new_surveyor.get('name', new_surveyor_id)}. Reason: {reason}",
                "added_by": "system",
                "added_at": datetime.utcnow(),
            }},
        }
    )

    _log_event(
        application_id=application_id,
        event_type="survey_reassigned",
        actor_type="admin",
        actor_id="manual",
        meta={"from": old_surveyor_id, "to": new_surveyor_id, "reason": reason},
    )

    updated = db.survey_tasks.find_one({"application_id": application_id})
    return _serialize(updated)


# ── POST /survey-tasks/{task_id}/field-notes ─────────────────────────────────
@router.post("/survey-tasks/{task_id}/field-notes", response_model=dict)
def add_field_note(task_id: str, body: FieldNoteRequest):
    """Add a field note to a survey task."""
    try:
        oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task_id.")

    note_doc = {
        "note":     body.note,
        "added_by": body.added_by,
        "added_at": datetime.utcnow(),
    }

    result = db.survey_tasks.update_one(
        {"_id": oid},
        {"$push": {"field_notes": note_doc}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Survey task not found.")

    return {"message": "Field note added.", "note": note_doc}
