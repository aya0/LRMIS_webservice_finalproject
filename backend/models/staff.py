from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from enum import Enum
from datetime import datetime


class StaffRole(str, Enum):
    surveyor  = "surveyor"
    registrar = "registrar"


class Shift(BaseModel):
    day:   str = Field(..., examples=["Mon"])
    start: str = Field(..., examples=["08:00"])
    end:   str = Field(..., examples=["16:00"])


class Schedule(BaseModel):
    timezone: str          = Field(default="Asia/Jerusalem")
    shifts:   List[Shift]  = []
    on_call:  bool         = False


class GeoPolygon(BaseModel):
    type:        str             = Field(default="Polygon")
    coordinates: List[List[List[float]]]  # [[[lng, lat], ...]]


class Coverage(BaseModel):
    zone_ids:  List[str]             = []
    geo_fence: Optional[GeoPolygon]  = None


class Workload(BaseModel):
    active_tasks: int = Field(default=0, ge=0)
    max_tasks:    int = Field(default=10, ge=1)


class StaffContacts(BaseModel):
    phone: Optional[str]  = None
    email: Optional[str]  = None


# ── Request body for creating a staff member ──────────────────────────────────
class StaffCreate(BaseModel):
    staff_code:  str                   = Field(..., examples=["SURV-RM-04"])
    name:        str
    role:        StaffRole
    department:  str
    skills:      List[str]             = []
    coverage:    Coverage              = Coverage()
    schedule:    Schedule              = Schedule(shifts=[])
    workload:    Workload              = Workload()
    contacts:    StaffContacts         = StaffContacts()
    active:      bool                  = True


# ── Full staff document returned from DB ─────────────────────────────────────
class StaffOut(StaffCreate):
    id:         str
    created_at: datetime

    class Config:
        populate_by_name = True
