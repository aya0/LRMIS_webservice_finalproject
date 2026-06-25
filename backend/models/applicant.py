from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# MODULE 2: Applicant Portal profile models
class ApplicantType(str, Enum):
    citizen = "citizen"
    lawyer = "lawyer"
    company = "company"
    surveyor = "surveyor"
    authorized_representative = "authorized_representative"


class VerificationState(str, Enum):
    unverified = "unverified"
    verified = "verified"
    suspended = "suspended"


class ApplicantContact(BaseModel):
    email: str = Field(..., pattern=r"^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$", examples=["applicant@example.com"])
    phone: str = Field(..., pattern=r"^\+?[0-9]{8,15}$", examples=["+970599111111"])


class ApplicantAddress(BaseModel):
    city: str = Field(..., pattern=r"^[A-Za-z\u0600-\u06FF\s]+$", examples=["Ramallah"])
    neighborhood: str = Field(..., pattern=r"^[A-Za-z0-9\u0600-\u06FF\s\-]+$", examples=["Al-Masyoun"])
    zone_id: str = Field(..., pattern=r"^[A-Za-z0-9\-]+$", examples=["ZONE-RM-01"])


class ApplicantContactOut(BaseModel):
    email: Optional[str] = Field(default=None, pattern=r"^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$")
    phone: Optional[str] = Field(default=None, pattern=r"^\+?[0-9]{8,15}$")


class ApplicantAddressOut(BaseModel):
    city: Optional[str] = Field(default=None, pattern=r"^[A-Za-z\u0600-\u06FF\s]+$")
    neighborhood: Optional[str] = Field(default=None, pattern=r"^[A-Za-z0-9\u0600-\u06FF\s\-]+$")
    zone_id: Optional[str] = Field(default=None, pattern=r"^[A-Za-z0-9\-]+$")


class NotificationPreferences(BaseModel):
    email: bool = Field(default=True, examples=[True])
    sms: bool = Field(default=False, examples=[False])


class PrivacySettings(BaseModel):
    share_contact_with_staff: bool = Field(default=False, examples=[False])
    allow_status_notifications: bool = Field(default=True, examples=[True])


class ApplicantCreate(BaseModel):
    full_name: str = Field(..., min_length=2, pattern=r"^[A-Za-z\u0600-\u06FF\s\-']+$", examples=["Alaa Nasser"])
    national_id: Optional[str] = Field(default=None, pattern=r"^\d{6,20}$", examples=["407123456"])
    registration_number: Optional[str] = Field(default=None, max_length=30, pattern=r"^[A-Za-z0-9\-/]+$", examples=["COMP-2026-001"])
    contact: ApplicantContact
    address: ApplicantAddress
    applicant_type: ApplicantType = Field(..., examples=["citizen"])
    verification_state: VerificationState = Field(..., examples=["unverified"])
    preferred_language: str = Field(..., min_length=2, max_length=5, examples=["ar"])
    notification_preferences: NotificationPreferences = Field(default_factory=NotificationPreferences)
    linked_applications: List[str] = Field(default_factory=list, examples=[["APP-2026-0001"]])
    privacy_settings: PrivacySettings = Field(default_factory=PrivacySettings)

    @field_validator("national_id", "registration_number", mode="before")
    @classmethod
    def blank_identity_to_none(cls, value):
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "full_name": "Alaa Nasser",
                    "national_id": "407123456",
                    "registration_number": None,
                    "contact": {
                        "email": "applicant@example.com",
                        "phone": "+970599111111",
                    },
                    "address": {
                        "city": "Ramallah",
                        "neighborhood": "Al-Masyoun",
                        "zone_id": "ZONE-RM-01",
                    },
                    "applicant_type": "citizen",
                    "verification_state": "unverified",
                    "preferred_language": "ar",
                    "notification_preferences": {
                        "email": True,
                        "sms": False,
                    },
                    "linked_applications": [],
                    "privacy_settings": {
                        "share_contact_with_staff": False,
                        "allow_status_notifications": True,
                    },
                }
            ]
        }
    }

    @model_validator(mode="after")
    def validate_identity(self):
        if self.applicant_type == ApplicantType.citizen and not self.national_id:
            raise ValueError("national_id is required for citizen applicants.")
        if self.applicant_type != ApplicantType.citizen and not self.registration_number:
            raise ValueError("registration_number is required for this applicant type.")
        if self.national_id is not None and not self.national_id.strip():
            raise ValueError("national_id cannot be blank.")
        if self.registration_number is not None and not self.registration_number.strip():
            raise ValueError("registration_number cannot be blank.")
        return self


class ApplicantUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, pattern=r"^[A-Za-z\u0600-\u06FF\s\-']+$")
    national_id: Optional[str] = Field(default=None, pattern=r"^\d{6,20}$")
    registration_number: Optional[str] = Field(default=None, max_length=30, pattern=r"^[A-Za-z0-9\-/]+$")
    contact: Optional[ApplicantContact] = None
    address: Optional[ApplicantAddress] = None
    applicant_type: Optional[ApplicantType] = None
    preferred_language: Optional[str] = Field(default=None, min_length=2, max_length=5)
    notification_preferences: Optional[NotificationPreferences] = None
    privacy_settings: Optional[PrivacySettings] = None

    @field_validator("national_id", "registration_number", mode="before")
    @classmethod
    def blank_identity_to_none(cls, value):
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @model_validator(mode="after")
    def validate_identity_when_type_changes(self):
        if self.applicant_type == ApplicantType.citizen and not self.national_id:
            raise ValueError("national_id is required for citizen applicants.")
        if self.applicant_type and self.applicant_type != ApplicantType.citizen and not self.registration_number:
            raise ValueError("registration_number is required for this applicant type.")
        return self


class ApplicantOut(BaseModel):
    id: str = Field(..., examples=["665f6b5d2b8f2f25d1b46311"])
    full_name: str
    national_id: Optional[str] = None
    registration_number: Optional[str] = None
    contact: ApplicantContactOut
    address: ApplicantAddressOut
    applicant_type: ApplicantType
    verification_state: VerificationState
    preferred_language: str
    notification_preferences: NotificationPreferences
    linked_applications: List[str]
    privacy_settings: PrivacySettings
    created_at: datetime
    updated_at: datetime
