"""
Auto-assignment engine for Module 3.

Policy (per spec): zone match + surveyor availability + workload balancing
                   + skill match + priority + existing assigned tasks.

Scoring tuple (lower = better):
  (no_zone_match, active_tasks, no_skill_match, created_ts, staff_code)

Zone match  -- surveyor coverage.zone_ids contains the application zone.
Skill match -- surveyor skills overlap with the application type keywords.
Workload    -- fewest current active survey tasks.
Creation ts -- earlier account = tiebreaker (deterministic).
"""
from datetime import datetime, timezone
from typing import Optional
import database as db


ACTIVE_SURVEY_STATUSES = ["survey_completed", "report_uploaded", "registrar_reviewed"]

_SKILL_KEYWORDS = {
    "first_registration":  ["boundary_survey", "first_registration", "gps_mapping"],
    "ownership_transfer":  ["ownership", "legal_survey"],
    "parcel_subdivision":  ["parcel_subdivision", "boundary_survey"],
    "parcel_merge":        ["parcel_subdivision", "boundary_survey"],
    "boundary_correction": ["boundary_survey", "gps_mapping"],
    "certificate_request": ["boundary_survey"],
}


def _get_application(application_id: str) -> Optional[dict]:
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


def _zone_match(surveyor: dict, zone_id: Optional[str]) -> bool:
    if not zone_id:
        return True
    coverage_zones = surveyor.get("coverage", {}).get("zone_ids", [])
    return zone_id in coverage_zones


def _skill_match(surveyor: dict, application_type: str) -> bool:
    surveyor_skills = [s.lower() for s in surveyor.get("skills", [])]
    if not surveyor_skills:
        return False
    required = _SKILL_KEYWORDS.get(application_type, [])
    return any(kw in surveyor_skills for kw in required)


def _sort_key(surveyor: dict, active_tasks: int, zone_id: Optional[str],
              application_type: str) -> tuple:
    no_zone = 0 if _zone_match(surveyor, zone_id) else 1
    no_skill = 0 if _skill_match(surveyor, application_type) else 1
    created_at = surveyor.get("created_at")
    created_ts = _as_utc(created_at).timestamp() if isinstance(created_at, datetime) else float("inf")
    return (no_zone, active_tasks, no_skill, created_ts, str(surveyor.get("staff_code", "")))


def _candidate_sort_key(surveyor: dict, active_tasks: int):
    created_at = surveyor.get("created_at")
    created_ts = _as_utc(created_at).timestamp() if isinstance(created_at, datetime) else float("inf")
    return (active_tasks, created_ts, str(surveyor.get("staff_code", "")), str(surveyor.get("_id", "")))


def _score_surveyor(surveyor: dict, zone_id: str, required_skills: list,
                    priority: str, now: datetime) -> int:
    return int(surveyor.get("workload", {}).get("active_tasks", 0))


def find_best_surveyor(application_id: str) -> tuple:
    """
    Return (best_surveyor, application).
    Policy: zone match > workload > skill match > creation order.
    """
    application = _get_application(application_id)
    if not application:
        raise ValueError(f"Application '{application_id}' not found.")

    status = application.get("status") or application.get("workflow", {}).get("current_state")
    if status != "survey_required":
        raise ValueError(
            f"Application status is '{status}'. "
            "Auto-assignment only allowed when status is 'survey_required'."
        )

    zone_id = (application.get("parcel_ref") or {}).get("zone_id")
    application_type = application.get("application_type", "")

    candidates = list(db.staff_members.find({"role": "surveyor", "active": True}))
    if not candidates:
        raise ValueError("No active surveyors found in the system.")

    task_counts = _get_active_task_counts()
    eligible = []
    for surveyor in candidates:
        surveyor_id = str(surveyor.get("_id"))
        active_tasks = task_counts.get(surveyor_id,
                       int(surveyor.get("workload", {}).get("active_tasks", 0)))
        max_tasks = int(surveyor.get("workload", {}).get("max_tasks", 10))
        if active_tasks >= max_tasks:
            continue
        eligible.append((active_tasks, surveyor))

    if not eligible:
        raise ValueError(
            "No available surveyor found with remaining capacity. "
            "Check workload limits and active assignments."
        )

    eligible.sort(key=lambda item: _sort_key(item[1], item[0], zone_id, application_type))
    _, best_surveyor = eligible[0]

    return best_surveyor, application
