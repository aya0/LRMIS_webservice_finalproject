"""
Immutable audit/performance log writer for Module 1.
Every important action is appended to performance_logs collection.
"""
from datetime import datetime, timezone
from database import performance_logs


def log_event(application_id: str, event_type: str, actor_type: str,
              actor_id: str, meta: dict = None):
    """Append one event to the event_stream of this application's log document."""
    event = {
        "type": event_type,
        "by": {
            "actor_type": actor_type,
            "actor_id": str(actor_id),
        },
        "at": datetime.now(timezone.utc),
        "meta": meta or {},
    }

    # upsert: create the doc if it doesn't exist, else push to event_stream
    performance_logs.update_one(
        {"application_id": application_id},
        {
            "$push": {"event_stream": event},
            "$setOnInsert": {
                "application_id": application_id,
                "computed_kpis": {
                    "processing_days": None,
                    "precheck_minutes": None,
                    "survey_delay_days": None,
                    "certificate_issued": False,
                },
            },
        },
        upsert=True,
    )


def update_kpi(application_id: str, kpi_field: str, value):
    """Update a computed_kpis field in the performance log."""
    performance_logs.update_one(
        {"application_id": application_id},
        {"$set": {f"computed_kpis.{kpi_field}": value}},
    )
