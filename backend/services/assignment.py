"""
Auto-assignment engine for Module 3.

Policy: assign the application to the surveyor with the fewest current
active applications. If multiple surveyors have the same load, pick the
earliest created one to keep tie-breaking deterministic.
"""
from datetime import datetime, timezone
from typing import Optional
import database as db


ACTIVE_SURVEY_STATUSES = ["survey_completed", "report_uploaded", "registrar_reviewed"]


def _get_application(application_id: str) -> Optional[dict]:
    """
    Read application from land_applications (Student 1's collection).
    PLACEHOLDER: This reads from the shared DB collection.
    Student 1 must ensure the following fields exist on the document:
      - parcel_ref.zone_id
      - application_type
      - priority  ("urgent" | "high" | "normal" | "low")
      - status    (must be "survey_required" to be assigned)
    """
    from bson import ObjectId
    try:
        return db.land_applications.find_one({"application_id": application_id}) or \
               db.land_applications.find_one({"_id": ObjectId(application_id)})
    except Exception:
        return None


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _get_active_task_counts() -> dict:
    pipeline = [
        {"$match": {"assigned_surveyor_id": {"$ne": None}, "status": {"$nin": ACTIVE_SURVEY_STATUSES}}},
        {"$group": {"_id": "$assigned_surveyor_id", "active_tasks": {"$sum": 1}}},
    ]
    counts = {}
    for row in db.survey_tasks.aggregate(pipeline):
        counts[str(row["_id"])] = int(row.get("active_tasks", 0))
    return counts


def _candidate_sort_key(surveyor: dict, active_tasks: int):
    created_at = surveyor.get("created_at")
    if isinstance(created_at, datetime):
        created_ts = _as_utc(created_at).timestamp()
    else:
        created_ts = float("inf")
    return (
        active_tasks,
        created_ts,
        str(surveyor.get("staff_code", "")),
        str(surveyor.get("_id", "")),
    )


def _score_surveyor(surveyor: dict, zone_id: str, required_skills: list,
                    priority: str, now: datetime) -> int:
    """
    Legacy helper retained for compatibility with existing tests.
    """
    return int(surveyor.get("workload", {}).get("active_tasks", 0))


def find_best_surveyor(application_id: str) -> dict:
    """
    Return the surveyor with the lowest active workload.
    Raises ValueError with a descriptive message if no surveyor can be assigned.
    """
    # ── Step 1: Load the application ─────────────────────────────────────────
    application = _get_application(application_id)
    if not application:
        raise ValueError(f"Application '{application_id}' not found. "
                         "PLACEHOLDER: Student 1 must have created this application first.")

    status = application.get("status") or application.get("workflow", {}).get("current_state")
    if status != "survey_required":
        raise ValueError(
            f"Application status is '{status}'. Auto-assignment only allowed when status is 'survey_required'."
        )

    # ── Step 2: Get all active surveyors ──────────────────────────────────────
    candidates = list(db.staff_members.find({"role": "surveyor", "active": True}))
    if not candidates:
        raise ValueError("No active surveyors found in the system.")

    # ── Step 3: Rank candidates by workload ──────────────────────────────────
    task_counts = _get_active_task_counts()
    eligible = []
    for surveyor in candidates:
        surveyor_id = str(surveyor.get("_id"))
        active_tasks = task_counts.get(surveyor_id, int(surveyor.get("workload", {}).get("active_tasks", 0)))
        max_tasks = int(surveyor.get("workload", {}).get("max_tasks", 10))
        if active_tasks >= max_tasks:
            continue
        eligible.append((active_tasks, surveyor))

    if not eligible:
        raise ValueError(
            "No available surveyor found with remaining capacity. "
            "Check workload limits and active assignments."
        )

    eligible.sort(key=lambda item: _candidate_sort_key(item[1], item[0]))
    _, best_surveyor = eligible[0]

    return best_surveyor, application
