from datetime import datetime
from passlib.context import CryptContext
from passlib.hash import pbkdf2_sha256
from auth import create_access_token
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pymongo.errors import DuplicateKeyError, OperationFailure

import database as db
from models.applicant import ApplicantCreate, ApplicantOut, ApplicantUpdate
from routes.module2_validation import Module2ValidationRoute

router = APIRouter(route_class=Module2ValidationRoute)

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt"],
    default="pbkdf2_sha256",
    deprecated="auto",
)


# MODULE 2: Applicant profile endpoints
def _ensure_applicant_identity_indexes():
    expected = {
        "national_id_unique_when_string": {
            "key": [("national_id", 1)],
            "partialFilterExpression": {"national_id": {"$type": "string"}},
        },
        "registration_number_unique_when_string": {
            "key": [("registration_number", 1)],
            "partialFilterExpression": {"registration_number": {"$type": "string"}},
        },
        "identity_national_id_unique_when_string": {
            "key": [("identity.national_id", 1)],
            "partialFilterExpression": {"identity.national_id": {"$type": "string"}},
        },
        "identity_registration_number_unique_when_string": {
            "key": [("identity.registration_number", 1)],
            "partialFilterExpression": {"identity.registration_number": {"$type": "string"}},
        },
    }

    existing_indexes = {index["name"]: index for index in db.applicants.list_indexes()}
    identity_fields = {
        "national_id",
        "registration_number",
        "identity.national_id",
        "identity.registration_number",
    }

    for name, index in existing_indexes.items():
        if name == "_id_":
            continue
        indexed_fields = set(index.get("key", {}).keys())
        if indexed_fields.intersection(identity_fields) and name not in expected:
            db.applicants.drop_index(name)

    existing_indexes = {index["name"]: index for index in db.applicants.list_indexes()}
    for name, config in expected.items():
        current = existing_indexes.get(name)
        if current:
            if current.get("partialFilterExpression") == config["partialFilterExpression"] and current.get("unique"):
                continue
            db.applicants.drop_index(name)
        db.applicants.create_index(
            config["key"],
            name=name,
            unique=True,
            partialFilterExpression=config["partialFilterExpression"],
        )


def _object_id(value: str, field_name: str = "id") -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name} format.")


def _serialize_value(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, list):
        return [_serialize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _serialize_value(item) for key, item in value.items()}
    return value


def _nonempty_string(value: Any):
    fake_values = {"unknown@example.com", "+97000000000", "Unknown", "ZONE-UNKNOWN"}
    if isinstance(value, str):
        value = value.strip()
        if value and value not in fake_values:
            return value
    return None


def _public_applicant(doc: dict) -> dict:
    identity = doc.get("identity", {})
    contact = doc.get("contact") or doc.get("contacts") or {}
    address = doc.get("address") or {}
    return {
        "id": str(doc["_id"]),
        "full_name": doc.get("full_name"),
        "national_id": doc.get("national_id") or identity.get("national_id"),
        "registration_number": doc.get("registration_number") or identity.get("registration_number"),
        "contact": {
            "email": _nonempty_string(contact.get("email")),
            "phone": _nonempty_string(contact.get("phone")),
        },
        "address": {
            "city": _nonempty_string(address.get("city")),
            "neighborhood": _nonempty_string(address.get("neighborhood")),
            "zone_id": _nonempty_string(address.get("zone_id")),
        },
        "applicant_type": doc.get("applicant_type"),
        "verification_state": doc.get("verification_state"),
        "preferred_language": doc.get("preferred_language", "ar"),
        "notification_preferences": doc.get("notification_preferences", {}),
        "linked_applications": doc.get("linked_applications", []),
        "privacy_settings": doc.get("privacy_settings", {}),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


def _serialize_application(doc: dict) -> dict:
    doc = _serialize_value(doc)
    doc["id"] = doc.pop("_id")
    return doc


def _enum_value(value: Any) -> Any:
    return getattr(value, "value", value)


@router.post("/applicants/", response_model=ApplicantOut, status_code=201)
def create_applicant(body: ApplicantCreate):
    """Create an applicant profile."""
    # try:
    #     _ensure_applicant_identity_indexes()
    # except OperationFailure as exc:
    #     raise HTTPException(status_code=500, detail=f"Applicant identity index setup failed: {exc.details or str(exc)}")

    national_id = body.national_id.strip() if body.national_id else None
    registration_number = body.registration_number.strip() if body.registration_number else None

    duplicate_conditions = []
    if national_id:
        duplicate_conditions.extend([
            {"national_id": national_id},
            {"identity.national_id": national_id},
        ])
    if registration_number:
        duplicate_conditions.extend([
            {"registration_number": registration_number},
            {"identity.registration_number": registration_number},
        ])

    duplicate = db.applicants.find_one({"$or": duplicate_conditions}, {"_id": 1}) if duplicate_conditions else None
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="national_id or registration_number already exists.",
        )

    now = datetime.now(timezone.utc)
    doc = body.model_dump(exclude={"national_id", "registration_number"})
    identity = {}
    if national_id:
        doc["national_id"] = national_id
        identity["national_id"] = national_id
    if registration_number:
        doc["registration_number"] = registration_number
        identity["registration_number"] = registration_number
    if identity:
        doc["identity"] = identity
    doc["created_at"] = now
    doc["updated_at"] = now

    try:
        result = db.applicants.insert_one(doc)
    except DuplicateKeyError as exc:
        print(
            "Applicant duplicate key error",
            {
                "national_id": national_id,
                "registration_number": registration_number,
                "duplicate_conditions": duplicate_conditions,
                "error": exc.details or str(exc),
            },
        )
        raise HTTPException(
            status_code=409,
            detail="national_id or registration_number already exists.",
        )

    created = db.applicants.find_one({"_id": result.inserted_id})
    return _public_applicant(created)


@router.patch("/applicants/{applicant_id}", response_model=ApplicantOut)
def update_applicant(applicant_id: str, body: ApplicantUpdate):
    """Update applicant-owned profile fields only."""
    applicant_oid = _object_id(applicant_id, "applicant_id")
    existing = db.applicants.find_one({"_id": applicant_oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Applicant not found.")

    payload = body.model_dump(exclude_unset=True)
    update_doc = {}
    unset_doc = {}

    for field in ("full_name", "applicant_type", "preferred_language"):
        if field in payload:
            update_doc[field] = payload[field]

    if "contact" in payload:
        update_doc["contact"] = payload["contact"]

    if "address" in payload:
        update_doc["address"] = payload["address"]

    applicant_type = _enum_value(payload.get("applicant_type", existing.get("applicant_type")))
    national_id = payload.get("national_id")
    registration_number = payload.get("registration_number")

    if applicant_type == "citizen":
        if "national_id" in payload:
            if national_id:
                duplicate = db.applicants.find_one({
                    "_id": {"$ne": applicant_oid},
                    "$or": [
                        {"national_id": national_id},
                        {"identity.national_id": national_id},
                    ],
                }, {"_id": 1})
                if duplicate:
                    raise HTTPException(status_code=409, detail="national_id already exists.")
                update_doc["national_id"] = national_id
                update_doc["identity.national_id"] = national_id
            else:
                unset_doc["national_id"] = ""
                unset_doc["identity.national_id"] = ""
        unset_doc["registration_number"] = ""
        unset_doc["identity.registration_number"] = ""
    else:
        if "registration_number" in payload:
            if registration_number:
                duplicate = db.applicants.find_one({
                    "_id": {"$ne": applicant_oid},
                    "$or": [
                        {"registration_number": registration_number},
                        {"identity.registration_number": registration_number},
                    ],
                }, {"_id": 1})
                if duplicate:
                    raise HTTPException(status_code=409, detail="registration_number already exists.")
                update_doc["registration_number"] = registration_number
                update_doc["identity.registration_number"] = registration_number
            else:
                unset_doc["registration_number"] = ""
                unset_doc["identity.registration_number"] = ""
        unset_doc["national_id"] = ""
        unset_doc["identity.national_id"] = ""

    if "notification_preferences" in payload:
        update_doc["notification_preferences"] = payload["notification_preferences"]
    if "privacy_settings" in payload:
        update_doc["privacy_settings"] = payload["privacy_settings"]

    update_doc["updated_at"] = datetime.utcnow()
    operations = {"$set": update_doc}
    if unset_doc:
        operations["$unset"] = unset_doc

    try:
        db.applicants.update_one({"_id": applicant_oid}, operations)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="national_id or registration_number already exists.")

    updated = db.applicants.find_one({"_id": applicant_oid})
    return _public_applicant(updated)


@router.post("/applicants/register", response_model=ApplicantOut, status_code=201)
def register_applicant(payload: dict):
    """Simplified applicant registration endpoint.

    Accepts minimal fields: `full_name`, `national_id` (or `registration_number`), and `password`.
    Does not invent contact or address data when it is not supplied.
    """
    # Basic validation
    full_name = (payload.get("full_name") or "").strip()
    national_id = (payload.get("national_id") or payload.get("nid") or None)
    registration_number = payload.get("registration_number")
    password = payload.get("password")

    if not full_name:
        raise HTTPException(status_code=400, detail="full_name is required")

    # Avoid duplicate national_id/registration_number
    dup_query = {"$or": []}
    if national_id:
        dup_query["$or"].append({"national_id": national_id})
        dup_query["$or"].append({"identity.national_id": national_id})
    if registration_number:
        dup_query["$or"].append({"registration_number": registration_number})
        dup_query["$or"].append({"identity.registration_number": registration_number})

    if dup_query["$or"]:
        if db.applicants.find_one(dup_query):
            raise HTTPException(status_code=409, detail="Applicant with provided identity already exists")

    now = datetime.now(timezone.utc)
    doc = {
        "full_name": full_name,
        "national_id": national_id,
        "registration_number": registration_number,
        "applicant_type": payload.get("applicant_type") or "citizen",
        "verification_state": "unverified",
        "preferred_language": payload.get("preferred_language") or "ar",
        "notification_preferences": payload.get("notification_preferences") or {},
        "linked_applications": [],
        "privacy_settings": payload.get("privacy_settings") or {},
        "created_at": now,
        "updated_at": now,
    }

    if isinstance(payload.get("contact"), dict):
        contact = {
            key: value.strip()
            for key, value in payload["contact"].items()
            if key in {"email", "phone"} and isinstance(value, str) and value.strip()
        }
        if contact:
            doc["contact"] = contact

    if isinstance(payload.get("address"), dict):
        address = {
            key: value.strip()
            for key, value in payload["address"].items()
            if key in {"city", "neighborhood", "zone_id"} and isinstance(value, str) and value.strip()
        }
        if address:
            doc["address"] = address

    if password:
        doc["password_hash"] = pwd_context.hash(password)

    result = db.applicants.insert_one(doc)
    created = db.applicants.find_one({"_id": result.inserted_id})
    return _public_applicant(created)


@router.post("/applicants/login", response_model=dict)
def applicant_login(body: dict):
    """Authenticate applicant by `national_id` or `registration_number` + `password`.
    Returns an access token containing `applicant_id`.
    """
    identifier = body.get("national_id") or body.get("registration_number")
    password = body.get("password")
    if not identifier or not password:
        raise HTTPException(status_code=400, detail="national_id/registration_number and password are required")

    # Try national_id first, then registration_number
    applicant = db.applicants.find_one({"$or": [{"national_id": identifier}, {"identity.national_id": identifier}, {"registration_number": identifier}, {"identity.registration_number": identifier}]})
    if not applicant:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    password_hash = applicant.get("password_hash")
    if not password_hash:
        raise HTTPException(status_code=401, detail="No password set for this applicant")

    if not (pwd_context.verify(password, password_hash) or (password_hash and pbkdf2_sha256.verify(password, password_hash))):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create token
    applicant_id = str(applicant.get("_id"))
    token = create_access_token({"applicant_id": applicant_id})
    public = _public_applicant(applicant)
    return {"access_token": token, "token_type": "bearer", "applicant": public}


@router.get("/applicants/{applicant_id}", response_model=ApplicantOut)
def get_applicant(applicant_id: str):
    """Retrieve a restricted applicant profile."""
    applicant = db.applicants.find_one({"_id": _object_id(applicant_id, "applicant_id")})
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found.")
    return _public_applicant(applicant)


@router.get("/applicants/", response_model=list)
def list_applicants(national_id: str = None, registration_number: str = None, q: str = None, limit: int = 50):
    """List or search applicants.

    Supports lookup by `national_id`, `registration_number`, or a simple full-name `q` search.
    Used by the frontend applicant login lookup (best-effort).
    """
    conditions = []
    if national_id:
        conditions.append({"$or": [{"national_id": national_id}, {"identity.national_id": national_id}]})
    if registration_number:
        conditions.append({"$or": [{"registration_number": registration_number}, {"identity.registration_number": registration_number}]})
    if q:
        # simple case-insensitive name search
        conditions.append({"full_name": {"$regex": q, "$options": "i"}})

    query = {}
    if conditions:
        query = {"$and": conditions} if len(conditions) > 1 else conditions[0]

    cursor = db.applicants.find(query).limit(min(max(1, limit), 200))
    results = list(cursor)
    return [_public_applicant(doc) for doc in results]


@router.get("/applicants/{applicant_id}/applications", response_model=list)
def get_applicant_applications(applicant_id: str):
    """Return applications submitted by or linked to this applicant."""
    applicant_oid = _object_id(applicant_id, "applicant_id")
    applicant = db.applicants.find_one({"_id": applicant_oid})
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found.")

    linked = applicant.get("linked_applications", [])
    linked_object_ids = [ObjectId(item) for item in linked if ObjectId.is_valid(item)]

    query_parts = [
        {"applicant_ref.applicant_id": applicant_id},
        {"applicant_id": applicant_id},
    ]
    if linked:
        query_parts.append({"application_id": {"$in": linked}})
    if linked_object_ids:
        query_parts.append({"_id": {"$in": linked_object_ids}})

    # PLACEHOLDER (Student 1): land_applications schema is owned by Module 1.
    applications = list(db.land_applications.find({"$or": query_parts}))
    return [_serialize_application(app) for app in applications]
