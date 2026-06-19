from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId

from database import parcels
from models.schemas import ParcelCreate

router = APIRouter(prefix="/parcels", tags=["Parcels"])


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
        elif isinstance(v, list):
            out[k] = [serialize(i) if isinstance(i, dict) else i for i in v]
        else:
            out[k] = v
    return out


@router.post("/", status_code=201)
def create_parcel(body: ParcelCreate):
    existing = parcels.find_one({"parcel_code": body.parcel_code})
    if existing:
        raise HTTPException(status_code=409,
                            detail=f"Parcel '{body.parcel_code}' already exists.")

    now = datetime.now(timezone.utc)
    doc = {
        **body.model_dump(),
        "registration_status": "pending",
        "dispute_state": "none",
        "created_at": now,
        "updated_at": now,
    }
    result = parcels.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"message": "Parcel created.", "parcel": serialize(doc)}


@router.get("/{parcel_id}")
def get_parcel(parcel_id: str):
    doc = parcels.find_one({"parcel_code": parcel_id})
    if not doc:
        try:
            doc = parcels.find_one({"_id": ObjectId(parcel_id)})
        except Exception:
            pass
    if not doc:
        raise HTTPException(status_code=404, detail=f"Parcel '{parcel_id}' not found.")
    return serialize(doc)


@router.get("/")
def list_parcels(
    zone_id: Optional[str] = None,
    registration_status: Optional[str] = None,
    dispute_state: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    query = {}
    if zone_id:
        query["zone_id"] = zone_id
    if registration_status:
        query["registration_status"] = registration_status
    if dispute_state:
        query["dispute_state"] = dispute_state

    total = parcels.count_documents(query)
    skip = (page - 1) * page_size
    cursor = parcels.find(query).skip(skip).limit(page_size)

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [serialize(doc) for doc in cursor],
    }
