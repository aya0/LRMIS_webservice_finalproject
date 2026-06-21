from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId

from database import parcels
from models.schemas import ParcelCreate, ParcelUpdate

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


@router.patch("/{parcel_id}")
def update_parcel(parcel_id: str, body: ParcelUpdate):
    """Update parcel fields while keeping parcel_code immutable."""
    doc = parcels.find_one({"parcel_code": parcel_id})
    if not doc:
        try:
            doc = parcels.find_one({"_id": ObjectId(parcel_id)})
        except Exception:
            pass
    if not doc:
        raise HTTPException(status_code=404, detail=f"Parcel '{parcel_id}' not found.")

    payload = body.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields provided for update.")

    update_fields = {k: v for k, v in payload.items() if v is not None}
    update_fields["updated_at"] = datetime.now(timezone.utc)

    parcels.update_one({"_id": doc["_id"]}, {"$set": update_fields})
    updated = parcels.find_one({"_id": doc["_id"]})
    return {"message": "Parcel updated successfully.", "parcel": serialize(updated)}


@router.delete("/{parcel_id}")
def delete_parcel(parcel_id: str):
    """Delete a parcel only if it is not referenced by land applications."""
    doc = parcels.find_one({"parcel_code": parcel_id})
    if not doc:
        try:
            doc = parcels.find_one({"_id": ObjectId(parcel_id)})
        except Exception:
            pass
    if not doc:
        raise HTTPException(status_code=404, detail=f"Parcel '{parcel_id}' not found.")

    from database import land_applications, certificates

    in_use = land_applications.count_documents({"parcel_ref.parcel_id": doc["_id"]})
    cert_in_use = certificates.count_documents({"parcel_id": doc["_id"]})
    if in_use or cert_in_use:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete parcel because it is referenced by an application or certificate.",
        )

    parcels.delete_one({"_id": doc["_id"]})
    return {"message": "Parcel deleted successfully.", "parcel_id": str(doc["_id"])}


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
