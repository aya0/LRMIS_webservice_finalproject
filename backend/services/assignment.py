"""
Auto-assignment engine for Module 3.

Policy (from spec): zone match + surveyor availability + workload balancing
                    + skill match + priority + existing assigned tasks.

Each criterion contributes a score. The surveyor with the highest score is selected.
"""
from datetime import datetime, timezone
from typing import Optional
import database as db


PRIORITY_SCORE = {
    "urgent": 3,
    "high":   2,
    "normal": 1,
    "low":    0,
}

REQUIRED_SKILLS_BY_TYPE = {
    "first_registration":   ["boundary_survey", "gps_mapping"],
    "ownership_transfer":   [],
    "parcel_subdivision":   ["parcel_subdivision", "gps_mapping"],
    "parcel_merge":         ["parcel_subdivision"],
    "boundary_correction":  ["boundary_survey"],
    "certificate_request":  [],
}


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


def _score_surveyor(surveyor: dict, zone_id: str, required_skills: list,
                    priority: str, now: datetime) -> int:
    """
    Score a candidate surveyor on all policy criteria.
    Higher is better.
    """
    score = 0

    # 1. Zone match (spec: zone match)
    covered_zones = surveyor.get("coverage", {}).get("zone_ids", [])
    if zone_id in covered_zones:
        score += 10
    else:
        return -1  # Zone match is mandatory — disqualify

    # 2. Availability (spec: surveyor availability)
    schedule    = surveyor.get("schedule", {})
    shifts      = schedule.get("shifts", [])
    day_abbrev  = now.strftime("%a")  # "Mon", "Tue", etc.
    today_shift = next((s for s in shifts if s.get("day") == day_abbrev), None)
    if today_shift:
        score += 5
    elif schedule.get("on_call"):
        score += 2
    else:
        score += 0  # Available but not on shift — still considered

    # 3. Workload balancing (spec: workload balancing + existing assigned tasks)
    workload     = surveyor.get("workload", {})
    active_tasks = workload.get("active_tasks", 0)
    max_tasks    = workload.get("max_tasks", 10)

    if active_tasks >= max_tasks:
        return -1  # At capacity — disqualify

    # Prefer surveyors with lower current load
    remaining_capacity = max_tasks - active_tasks
    score += remaining_capacity  # More capacity = higher score

    # 4. Skill match (spec: skill match)
    surveyor_skills = set(surveyor.get("skills", []))
    matched_skills  = len(surveyor_skills.intersection(set(required_skills)))
    score += matched_skills * 3

    # 5. Priority boost (spec: priority)
    score += PRIORITY_SCORE.get(priority, 1)

    return score


def find_best_surveyor(application_id: str) -> dict:
    """
    Run the full assignment policy and return the selected surveyor document.
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

    zone_id          = (application.get("parcel_ref") or {}).get("zone_id", "")
    application_type = application.get("application_type", "")
    priority         = application.get("priority", "normal")
    required_skills  = REQUIRED_SKILLS_BY_TYPE.get(application_type, [])

    if not zone_id:
        raise ValueError(
            "Application has no parcel_ref.zone_id. "
            "PLACEHOLDER: Student 1 must set zone_id when creating the application."
        )

    # ── Step 2: Get all active surveyors ──────────────────────────────────────
    candidates = list(db.staff_members.find({"role": "surveyor", "active": True}))
    if not candidates:
        raise ValueError("No active surveyors found in the system.")

    # ── Step 3: Score each candidate ─────────────────────────────────────────
    now = datetime.now(timezone.utc)
    scored = []
    for s in candidates:
        score = _score_surveyor(s, zone_id, required_skills, priority, now)
        if score >= 0:
            scored.append((score, s))

    if not scored:
        raise ValueError(
            f"No available surveyor found matching zone '{zone_id}' with capacity. "
            "Check zone coverage and workload limits."
        )

    # ── Step 4: Pick highest score ────────────────────────────────────────────
    scored.sort(key=lambda x: x[0], reverse=True)
    best_score, best_surveyor = scored[0]

    return best_surveyor, application
