"""
Seed script — populate survey tasks for a surveyor.
Run from the backend/ directory:
    python seed_surveyor_tasks.py --staff-code SURV-01

What it does:
  1. Looks up the surveyor by staff_code.
  2. Finds existing applications (prefers survey_required, falls back to others).
  3. Creates realistic survey tasks with varied milestones + field notes.
  4. Updates the surveyor's workload counter.
"""

import argparse
import sys
import os
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from pymongo import MongoClient
from dotenv import load_dotenv
import random

load_dotenv()

MONGODB_URI   = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", os.getenv("DB_NAME", "lrmis_db"))

client = MongoClient(MONGODB_URI)
db     = client[DATABASE_NAME]

# ── Milestone progression templates ──────────────────────────────────────────
def _days_ago(n):
    return datetime.now(timezone.utc) - timedelta(days=n)

MILESTONE_SETS = [
    # just assigned
    [{"type": "assigned", "at": _days_ago(3), "by": "system",
      "meta": {"reason": "zone + workload match"}}],

    # scheduled visit
    [{"type": "assigned",        "at": _days_ago(7),  "by": "system",   "meta": {"reason": "zone match"}},
     {"type": "visit_scheduled", "at": _days_ago(5),  "by": "surveyor", "meta": {"scheduled_date": (_days_ago(3)).strftime("%Y-%m-%d")}}],

    # arrived on site
    [{"type": "assigned",        "at": _days_ago(10), "by": "system",   "meta": {}},
     {"type": "visit_scheduled", "at": _days_ago(8),  "by": "surveyor", "meta": {"scheduled_date": (_days_ago(6)).strftime("%Y-%m-%d")}},
     {"type": "arrived_on_site", "at": _days_ago(6),  "by": "surveyor", "meta": {"gps_check": "ok"}}],

    # survey started
    [{"type": "assigned",        "at": _days_ago(12), "by": "system",   "meta": {}},
     {"type": "visit_scheduled", "at": _days_ago(10), "by": "surveyor", "meta": {"scheduled_date": (_days_ago(8)).strftime("%Y-%m-%d")}},
     {"type": "arrived_on_site", "at": _days_ago(8),  "by": "surveyor", "meta": {}},
     {"type": "survey_started",  "at": _days_ago(8),  "by": "surveyor", "meta": {"equipment": "GPS + total station"}}],

    # survey completed
    [{"type": "assigned",          "at": _days_ago(15), "by": "system",   "meta": {}},
     {"type": "visit_scheduled",   "at": _days_ago(13), "by": "surveyor", "meta": {"scheduled_date": (_days_ago(11)).strftime("%Y-%m-%d")}},
     {"type": "arrived_on_site",   "at": _days_ago(11), "by": "surveyor", "meta": {}},
     {"type": "survey_started",    "at": _days_ago(11), "by": "surveyor", "meta": {}},
     {"type": "survey_completed",  "at": _days_ago(10), "by": "surveyor", "meta": {"findings": "boundary confirmed"}}],

    # report uploaded
    [{"type": "assigned",          "at": _days_ago(20), "by": "system",   "meta": {}},
     {"type": "visit_scheduled",   "at": _days_ago(18), "by": "surveyor", "meta": {"scheduled_date": (_days_ago(16)).strftime("%Y-%m-%d")}},
     {"type": "arrived_on_site",   "at": _days_ago(16), "by": "surveyor", "meta": {}},
     {"type": "survey_started",    "at": _days_ago(16), "by": "surveyor", "meta": {}},
     {"type": "survey_completed",  "at": _days_ago(15), "by": "surveyor", "meta": {}},
     {"type": "report_uploaded",   "at": _days_ago(14), "by": "surveyor", "meta": {"report_ref": "RPT-AUTO-001"}}],
]

FIELD_NOTES_POOL = [
    "Parcel boundary markers found intact. Coordinates recorded.",
    "Adjacent parcel owner present during survey — no objections raised.",
    "Minor encroachment detected on east side — documented with photos.",
    "GPS signal weak near northern corner. Used total station as backup.",
    "Survey completed in full. All corners staked and recorded.",
    "Road widening project nearby may affect eastern boundary — flagged.",
    "Irrigation channel crosses parcel — noted in report.",
    "Historical marker stone found at SW corner. Preserved.",
    "Neighboring property has informal fence 0.3m inside parcel boundary.",
    "Survey deferred due to weather. Rescheduled for following day.",
]

STATUS_FROM_MILESTONES = {
    "assigned":          "assigned",
    "visit_scheduled":   "visit_scheduled",
    "arrived_on_site":   "arrived_on_site",
    "survey_started":    "survey_started",
    "survey_completed":  "survey_completed",
    "report_uploaded":   "report_uploaded",
    "registrar_reviewed":"registrar_reviewed",
}


def make_task(surveyor_id: str, surveyor_code: str, application, parcel, task_index: int):
    milestone_set = MILESTONE_SETS[task_index % len(MILESTONE_SETS)]
    last_milestone = milestone_set[-1]["type"]
    status = STATUS_FROM_MILESTONES[last_milestone]

    field_notes = []
    if status in ("survey_started", "survey_completed", "report_uploaded", "registrar_reviewed"):
        notes = random.sample(FIELD_NOTES_POOL, k=random.randint(1, 3))
        field_notes = [
            {
                "note": n,
                "by": surveyor_code,
                "at": _days_ago(random.randint(5, 14)),
            }
            for n in notes
        ]

    app_id = application.get("_id")
    parcel_id = parcel.get("_id") if parcel else None

    task_num = str(task_index + 1).zfill(4)
    year = datetime.now().year

    return {
        "task_id":              f"SURV-{year}-{task_num}",
        "application_id":       app_id,
        "parcel_id":            parcel_id,
        "assigned_surveyor_id": surveyor_id,
        "status":               status,
        "milestones":           milestone_set,
        "field_notes":          field_notes,
        "report_uploaded":      status in ("report_uploaded", "registrar_reviewed"),
        "priority":             application.get("priority", "normal"),
        "created_at":           milestone_set[0]["at"],
    }


def seed(staff_code: str, count: int):
    # 1. Find the surveyor
    surveyor = db.staff_members.find_one({"staff_code": staff_code, "role": "surveyor"})
    if not surveyor:
        print(f"ERROR: No active surveyor found with staff_code='{staff_code}'")
        print("Available surveyors:")
        for s in db.staff_members.find({"role": "surveyor"}, {"staff_code": 1, "name": 1}):
            print(f"  {s['staff_code']}  —  {s['name']}")
        sys.exit(1)

    surveyor_id   = str(surveyor["_id"])
    surveyor_name = surveyor["name"]
    print(f"Surveyor: {surveyor_name} ({staff_code})  id={surveyor_id}")

    # 2. Find applications to attach tasks to
    #    Prefer survey_required; fall back to pre_checked, submitted, others
    preferred_statuses = ["survey_required", "pre_checked", "submitted",
                          "legal_review", "surveyed", "approved", "on_hold"]
    applications = []
    for status in preferred_statuses:
        apps = list(db.land_applications.find({"status": status}, limit=count))
        applications.extend(apps)
        if len(applications) >= count:
            break

    if not applications:
        print("ERROR: No applications found in the database. Seed some applications first.")
        sys.exit(1)

    # Repeat list if we don't have enough distinct applications
    while len(applications) < count:
        applications += applications
    applications = applications[:count]

    # 3. Remove existing tasks for this surveyor to avoid duplicates
    deleted = db.survey_tasks.delete_many({"assigned_surveyor_id": surveyor_id})
    if deleted.deleted_count:
        print(f"Removed {deleted.deleted_count} existing task(s) for this surveyor.")

    # 4. Create tasks
    inserted = 0
    for i, app in enumerate(applications):
        # Resolve parcel
        parcel_id = app.get("parcel_ref", {}).get("parcel_id")
        parcel = None
        if parcel_id:
            try:
                parcel = db.parcels.find_one({"_id": ObjectId(str(parcel_id))})
            except Exception:
                pass

        task_doc = make_task(surveyor_id, staff_code, app, parcel, i)

        # Skip if task_id already exists (from a previous partial run)
        if db.survey_tasks.find_one({"task_id": task_doc["task_id"]}):
            task_doc["task_id"] = task_doc["task_id"] + f"-{surveyor_id[:4]}"

        db.survey_tasks.insert_one(task_doc)
        inserted += 1
        status_label = task_doc["status"].replace("_", " ")
        app_id_label = app.get("application_id", str(app["_id"]))
        print(f"  [{i+1}/{count}] {task_doc['task_id']}  app={app_id_label}  status={status_label}")

    # 5. Update surveyor workload
    active_count = db.survey_tasks.count_documents({
        "assigned_surveyor_id": surveyor_id,
        "status": {"$nin": ["survey_completed", "report_uploaded", "registrar_reviewed"]},
    })
    db.staff_members.update_one(
        {"_id": surveyor["_id"]},
        {"$set": {"workload.active_tasks": active_count}},
    )

    print(f"\nDone. {inserted} task(s) created for {surveyor_name}.")
    print(f"Active workload set to {active_count}.")
    print("Refresh the My Tasks page in the browser.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed survey tasks for a surveyor.")
    parser.add_argument("--staff-code", required=True, help="Surveyor staff_code, e.g. SURV-01")
    parser.add_argument("--count", type=int, default=8, help="Number of tasks to create (default: 8)")
    args = parser.parse_args()
    seed(args.staff_code.strip(), args.count)
