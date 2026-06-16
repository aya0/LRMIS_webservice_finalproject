from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class SurveyReportCreate(BaseModel):
    """Metadata for an uploaded survey report — spec says 'metadata', not binary upload."""
    application_id:  str
    task_id:         str
    surveyor_id:     str
    report_title:    str
    file_url:        Optional[str]  = None   # URL/path to the actual file
    file_name:       Optional[str]  = None
    observations:    Optional[str]  = None
    boundary_confirmed: bool        = False
    area_sqm:        Optional[float] = None
    uploaded_at:     datetime       = Field(default_factory=datetime.utcnow)


class SurveyReportOut(SurveyReportCreate):
    id: str


# ── Registrar review decision ─────────────────────────────────────────────────
class RegistrarReviewRequest(BaseModel):
    registrar_id:     str
    decision:         str   # "approved" | "rejected" | "needs_revision"
    decision_notes:   str
    reviewed_at:      datetime = Field(default_factory=datetime.utcnow)


class RegistrarReviewOut(BaseModel):
    application_id:  str
    registrar_id:    str
    decision:        str
    decision_notes:  str
    reviewed_at:     datetime
