from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime

from database import certificates

router = APIRouter(prefix="/certificates", tags=["Certificates"])


def serialize(doc):
    if doc is None:
        return None
    out = {}
    for k, v in doc.items():
        if k == "_id":
            out["id"] = str(v)
        elif isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, dict):
            out[k] = serialize(v)
        else:
            out[k] = v
    return out


@router.get("/{certificate_id}")
def get_certificate(certificate_id: str):
    doc = certificates.find_one({"certificate_id": certificate_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Certificate not found.")
    return serialize(doc)


@router.get("/{certificate_id}/verify")
def verify_certificate(certificate_id: str):
    doc = certificates.find_one({"certificate_id": certificate_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Certificate not found.")
    return {
        "valid": doc.get("status") == "issued",
        "certificate_id": certificate_id,
        "application_id": doc.get("application_id"),
        "issued_at": doc.get("issued_at").isoformat() if isinstance(doc.get("issued_at"), datetime) else doc.get("issued_at"),
        "issued_by": doc.get("issued_by"),
    }
