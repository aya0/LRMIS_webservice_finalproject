from fastapi import APIRouter, Path

import database as db
from routes.module2_helpers import serialize_value

router = APIRouter()


# MODULE 2: Applicant-facing application timeline
@router.get("/applications/{application_id}/timeline", response_model=list)
def get_application_timeline(application_id: str = Path(..., pattern=r"^[A-Za-z0-9\-]+$")):
    """Return performance log timeline for an application."""
    logs = list(db.performance_logs.find({"application_id": application_id}))
    events = []

    for log in logs:
        stream = log.get("event_stream")
        if isinstance(stream, list):
            events.extend(stream)
        else:
            item = {key: value for key, value in log.items() if key != "_id"}
            if item:
                events.append(item)

    return [serialize_value(event) for event in events]
