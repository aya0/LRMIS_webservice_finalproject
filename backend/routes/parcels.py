from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId

from database import land_applications, parcels, staff_members
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


FALLBACK_ZONE_IDS = ["ZONE-RM-01", "ZONE-RM-02", "ZONE-RM-03", "ZONE-RM-04", "ZONE-NB-01"]


def _clean_zone_ids(values):
    zone_ids = set()
    for value in values:
        if isinstance(value, list):
            zone_ids.update(item.strip() for item in value if isinstance(item, str) and item.strip())
        elif isinstance(value, str) and value.strip():
            zone_ids.add(value.strip())
    return zone_ids


def _safe_object_id(value):
    try:
        return ObjectId(value)
    except Exception:
        return None


def _build_application_summary(doc: dict) -> dict:
    parcel_ref = doc.get("parcel_ref") or {}
    assignment = doc.get("assignment") or {}
    return {
        "application_id": doc.get("application_id"),
        "status": doc.get("status"),
        "application_type": doc.get("application_type"),
        "parcel_ref": {
            "parcel_id": str(parcel_ref.get("parcel_id")) if parcel_ref.get("parcel_id") is not None else None,
            "parcel_number": parcel_ref.get("parcel_number"),
            "block_number": parcel_ref.get("block_number"),
            "basin_number": parcel_ref.get("basin_number"),
            "zone_id": parcel_ref.get("zone_id"),
        },
        "assignment": {
            "assigned_surveyor_id": str(assignment.get("assigned_surveyor_id")) if assignment.get("assigned_surveyor_id") is not None else None,
            "assigned_registrar_id": str(assignment.get("assigned_registrar_id")) if assignment.get("assigned_registrar_id") is not None else None,
        },
    }


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


@router.get("/zones")
def list_zones():
    """Return distinct zone IDs already present in shared MongoDB collections."""
    zone_ids = set()
    zone_ids.update(_clean_zone_ids(parcels.distinct("zone_id")))
    zone_ids.update(_clean_zone_ids(land_applications.distinct("parcel_ref.zone_id")))
    zone_ids.update(_clean_zone_ids(staff_members.distinct("coverage.zone_ids")))

    if not zone_ids:
        zone_ids.update(FALLBACK_ZONE_IDS)

    return [{"zone_id": zone_id, "label": zone_id} for zone_id in sorted(zone_ids)]


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

    payload = serialize(doc)
    app_doc = land_applications.find_one({"parcel_ref.parcel_id": doc["_id"]})
    payload["application_ref"] = _build_application_summary(app_doc) if app_doc else None
    return payload


@router.get("/")
def list_parcels(
    zone_id: Optional[str] = None,
    registration_status: Optional[str] = None,
    dispute_state: Optional[str] = None,
    assigned_staff_id: Optional[str] = None,
    assigned_staff_role: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    query = {}
    visible_parcel_ids = None
    parcel_summary_by_id = {}
    if assigned_staff_id:
        staff_doc = None
        try:
            staff_doc = staff_members.find_one({"_id": ObjectId(assigned_staff_id)})
        except Exception:
            staff_doc = None
        if not staff_doc:
            staff_doc = staff_members.find_one({"staff_code": assigned_staff_id})

        if not staff_doc:
            return {
                "total": 0,
                "page": page,
                "page_size": page_size,
                "items": [],
            }

        staff_role = assigned_staff_role or staff_doc.get("role")
        staff_values = [assigned_staff_id]
        safe_oid = _safe_object_id(assigned_staff_id)
        if safe_oid is not None:
            staff_values.append(safe_oid)

        if staff_role == "surveyor":
            app_query = {"assignment.assigned_surveyor_id": {"$in": staff_values}}
        elif staff_role == "registrar":
            app_query = {"assignment.assigned_registrar_id": {"$in": staff_values}}
        else:
            app_query = {
                "$or": [
                    {"assignment.assigned_surveyor_id": {"$in": staff_values}},
                    {"assignment.assigned_registrar_id": {"$in": staff_values}},
                ]
            }

        assigned_apps = list(land_applications.find(app_query, {"application_id": 1, "status": 1, "application_type": 1, "parcel_ref": 1, "assignment": 1}))
        visible_parcel_ids = []
        for app in assigned_apps:
            parcel_ref = app.get("parcel_ref") or {}
            parcel_oid = parcel_ref.get("parcel_id")
            if parcel_oid is None:
                continue
            if parcel_oid not in parcel_summary_by_id:
                parcel_summary_by_id[parcel_oid] = _build_application_summary(app)
                visible_parcel_ids.append(parcel_oid)

        coverage_zone_ids = list(_clean_zone_ids([staff_doc.get("coverage", {}).get("zone_ids", [])]))
        if coverage_zone_ids:
            if zone_id and zone_id not in coverage_zone_ids:
                return {
                    "total": 0,
                    "page": page,
                    "page_size": page_size,
                    "items": [],
                }
            if not zone_id:
                query["zone_id"] = {"$in": coverage_zone_ids}

        if visible_parcel_ids is not None:
            query["_id"] = {"$in": visible_parcel_ids}

    if zone_id:
        query["zone_id"] = zone_id if not isinstance(query.get("zone_id"), dict) else query["zone_id"]
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
        "items": [
            {**serialize(doc), "application_ref": parcel_summary_by_id.get(doc.get("_id"))}
            for doc in cursor
        ],
    }
