from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# MODULE 2: Supporting document metadata models
class DocumentStatus(str, Enum):
    pending_review = "pending_review"
    approved = "approved"
    rejected = "rejected"


class ApplicationDocumentCreate(BaseModel):
    applicant_id: str = Field(..., pattern=r"^[a-fA-F0-9]{24}$", examples=["665f6b5d2b8f2f25d1b46311"])
    document_type: str = Field(..., examples=["identity_card"])
    file_name: str = Field(..., pattern=r"^[A-Za-z0-9\s\-_\.]+\.[A-Za-z0-9]+$", examples=["id-card.pdf"])
    file_url: str = Field(..., pattern=r"^(https?://|local://).+", examples=["local://id-card.pdf"])
    file_size: Optional[int] = Field(default=None, ge=0, examples=[245760])
    file_extension: Optional[str] = Field(default=None, pattern=r"^[A-Za-z0-9]+$", examples=["pdf"])
    status: DocumentStatus = Field(default=DocumentStatus.pending_review)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "applicant_id": "665f6b5d2b8f2f25d1b46311",
                    "document_type": "identity_card",
                    "file_name": "id-card.pdf",
                    "file_url": "local://id-card.pdf",
                    "file_size": 245760,
                    "file_extension": "pdf",
                    "status": "pending_review",
                }
            ]
        }
    }


class ApplicationDocumentOut(ApplicationDocumentCreate):
    id: str
    application_id: str
    uploaded_at: datetime
