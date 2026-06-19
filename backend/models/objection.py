from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# MODULE 2: Applicant objection models
class ObjectionStatus(str, Enum):
    submitted = "submitted"
    under_review = "under_review"
    resolved = "resolved"
    rejected = "rejected"


class ObjectionCreate(BaseModel):
    applicant_id: str = Field(..., pattern=r"^[a-fA-F0-9]{24}$", examples=["665f6b5d2b8f2f25d1b46311"])
    reason: str = Field(..., min_length=10, max_length=1500, examples=["The parcel boundary shown does not match my deed."])
    supporting_documents: Optional[List[str]] = Field(
        default=None,
        examples=[["https://files.example.com/deed.pdf"]],
    )
    status: ObjectionStatus = Field(default=ObjectionStatus.submitted)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "applicant_id": "665f6b5d2b8f2f25d1b46311",
                    "reason": "The parcel boundary shown does not match my deed.",
                    "supporting_documents": [
                        "https://files.example.com/deed.pdf"
                    ],
                    "status": "submitted",
                }
            ]
        }
    }


class ObjectionOut(ObjectionCreate):
    id: str
    application_id: str
    created_at: datetime
