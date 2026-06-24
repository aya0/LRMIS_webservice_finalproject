from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from enum import Enum
from datetime import datetime, timezone


class SurveyMilestoneType(str, Enum):
    """Exact milestone names from the spec — order is enforced in service layer."""
    assigned           = "assigned"
    visit_scheduled    = "visit_scheduled"
    arrived_on_site    = "arrived_on_site"
    survey_started     = "survey_started"
    survey_completed   = "survey_completed"
    report_uploaded    = "report_uploaded"
    registrar_reviewed = "registrar_reviewed"


# Allowed next milestone for each state (enforces order)
MILESTONE_ORDER = [
    SurveyMilestoneType.assigned,
    SurveyMilestoneType.visit_scheduled,
    SurveyMilestoneType.arrived_on_site,
    SurveyMilestoneType.survey_started,
    SurveyMilestoneType.survey_completed,
    SurveyMilestoneType.report_uploaded,
    SurveyMilestoneType.registrar_reviewed,
]


class Milestone(BaseModel):
    type: SurveyMilestoneType
    at:   datetime
    by:   str                         # actor: "system", surveyor id, registrar id
    meta: Dict[str, Any] = {}


class FieldNote(BaseModel):
    note:       str
    added_by:   str
    added_at:   datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── Request: add a milestone ──────────────────────────────────────────────────
class MilestoneRequest(BaseModel):
    milestone:        SurveyMilestoneType
    by:               str
    meta:             Dict[str, Any] = {}
    scheduled_date:   Optional[str]  = None   # used for visit_scheduled


# ── Request: add a field note ─────────────────────────────────────────────────
class FieldNoteRequest(BaseModel):
    note:     str
    added_by: str


# ── Full survey task document ─────────────────────────────────────────────────
class SurveyTaskOut(BaseModel):
    id:                   str
    task_id:              str
    application_id:       str
    parcel_id:            str
    assigned_surveyor_id: str
    status:               SurveyMilestoneType
    milestones:           List[Milestone]
    field_notes:          List[FieldNote]
    report_uploaded:      bool
    created_at:           datetime
