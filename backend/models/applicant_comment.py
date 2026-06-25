from datetime import datetime

from pydantic import BaseModel, Field


# MODULE 2: Applicant comment/response models
class ApplicantCommentCreate(BaseModel):
    applicant_id: str = Field(..., pattern=r"^[a-fA-F0-9]{24}$", examples=["665f6b5d2b8f2f25d1b46311"])
    comment: str = Field(..., min_length=5, max_length=1000, examples=["I uploaded the requested ownership document."])

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "applicant_id": "665f6b5d2b8f2f25d1b46311",
                    "comment": "I uploaded the requested ownership document.",
                }
            ]
        }
    }


class ApplicantCommentOut(ApplicantCommentCreate):
    id: str
    application_id: str
    created_at: datetime
