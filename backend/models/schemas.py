from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


class ApplicationStatus(str, Enum):
    submitted = "submitted"
    pre_checked = "pre_checked"
    survey_required = "survey_required"
    surveyed = "surveyed"
    legal_review = "legal_review"
    approved = "approved"
    certificate_issued = "certificate_issued"
    closed = "closed"
    rejected = "rejected"
    on_hold = "on_hold"
    missing_documents = "missing_documents"
    under_objection = "under_objection"


class ApplicationType(str, Enum):
    first_registration = "first_registration"
    ownership_transfer = "ownership_transfer"
    parcel_subdivision = "parcel_subdivision"
    parcel_merge = "parcel_merge"
    boundary_correction = "boundary_correction"
    certificate_request = "certificate_request"


class Priority(str, Enum):
    urgent = "urgent"
    high = "high"
    normal = "normal"
    low = "low"


class DocumentStatus(str, Enum):
    pending_review = "pending_review"
    verified = "verified"
    rejected = "rejected"
    missing = "missing"



class GeoJSONPolygon(BaseModel):
    type: Literal["Polygon"] = "Polygon"
    coordinates: List[List[List[float]]]


class ApplicantRef(BaseModel):
    applicant_id: str
    applicant_type: str = "citizen"
    submitted_by_representative: bool = False


class ParcelRef(BaseModel):
    parcel_id: Optional[str] = None
    parcel_number: str
    block_number: str
    basin_number: str
    zone_id: str


class RequiredDocument(BaseModel):
    document_type: str
    required: bool = True
    status: DocumentStatus = DocumentStatus.pending_review


class WorkflowInfo(BaseModel):
    current_state: str
    allowed_next: List[str] = []
    transition_rules_version: str = "v1.0"


class AssignmentInfo(BaseModel):
    assigned_surveyor_id: Optional[str] = None
    assigned_registrar_id: Optional[str] = None
    assignment_policy: str = "least-workload-first"


class ObjectionInfo(BaseModel):
    has_objection: bool = False
    objection_ids: List[str] = []


class InternalInfo(BaseModel):
    notes: List[str] = []
    visibility: str = "staff_only"


class Timestamps(BaseModel):
    submitted_at: Optional[datetime] = None
    pre_checked_at: Optional[datetime] = None
    survey_required_at: Optional[datetime] = None
    surveyed_at: Optional[datetime] = None
    legal_review_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    certificate_issued_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


#  Parcel Models

class ParcelCreate(BaseModel):
    parcel_code: str
    parcel_number: str
    block_number: str
    basin_number: str
    zone_id: str
    area_sqm: Optional[float] = None
    land_use: str = "residential"
    geometry: GeoJSONPolygon
    address_hint: Optional[str] = None
    current_owner_refs: List[dict] = []


class ParcelUpdate(BaseModel):
    parcel_number: Optional[str] = None
    block_number: Optional[str] = None
    basin_number: Optional[str] = None
    zone_id: Optional[str] = None
    area_sqm: Optional[float] = None
    land_use: Optional[str] = None
    geometry: Optional[GeoJSONPolygon] = None
    address_hint: Optional[str] = None
    current_owner_refs: Optional[List[dict]] = None


class ParcelResponse(ParcelCreate):
    id: str
    registration_status: str = "pending"
    dispute_state: str = "none"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Application Models 

class ApplicationCreate(BaseModel):
    application_type: ApplicationType
    priority: Priority = Priority.normal
    applicant_ref: ApplicantRef
    parcel_ref: ParcelRef
    description: Optional[str] = None
    tags: List[str] = []
    required_documents: List[RequiredDocument] = []
    idempotency_key: Optional[str] = None  # for duplicate prevention


class ApplicationUpdate(BaseModel):
    priority: Optional[Priority] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    required_documents: Optional[List[RequiredDocument]] = None


class ApplicationTransition(BaseModel):
    target_state: ApplicationStatus
    actor_id: str = "system"
    actor_type: str = "staff"
    note: Optional[str] = None


class HoldRequest(BaseModel):
    reason: str
    actor_id: str = "staff"


class RejectRequest(BaseModel):
    reason: str
    actor_id: str = "staff"
    legal_basis: Optional[str] = None


class NoteRequest(BaseModel):
    note: str
    actor_id: str = "staff"


class ApplicationResponse(BaseModel):
    id: str
    application_id: str
    application_type: str
    status: str
    priority: str
    applicant_ref: dict
    parcel_ref: dict
    description: Optional[str]
    tags: List[str]
    workflow: dict
    required_documents: List[dict]
    timestamps: dict
    assignment: dict
    objection: dict
    internal: dict
    certificate: Optional[dict] = None
