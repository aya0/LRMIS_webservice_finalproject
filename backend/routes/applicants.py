from datetime import datetime
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pymongo.errors import DuplicateKeyError, OperationFailure

import database as db
from models.applicant import ApplicantCreate, ApplicantOut
from routes.module2_validation import Module2ValidationRoute

router = APIRouter(route_class=Module2ValidationRoute)


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


def _public_applicant(doc: dict) -> dict:
    identity = doc.get("identity", {})
    return {
        "id": str(doc["_id"]),
        "full_name": doc.get("full_name"),
        "national_id": doc.get("national_id") or identity.get("national_id"),
        "registration_number": doc.get("registration_number") or identity.get("registration_number"),
        "contact": doc.get("contact", {}),
        "address": doc.get("address", {}),
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


@router.post("/applicants/", response_model=ApplicantOut, status_code=201)
def create_applicant(body: ApplicantCreate):
    """Create an applicant profile."""
    try:
        _ensure_applicant_identity_indexes()
    except OperationFailure as exc:
        raise HTTPException(status_code=500, detail=f"Applicant identity index setup failed: {exc.details or str(exc)}")

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

    now = datetime.utcnow()
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


@router.get("/applicants/{applicant_id}", response_model=ApplicantOut)
def get_applicant(applicant_id: str):
    """Retrieve a restricted applicant profile."""
    applicant = db.applicants.find_one({"_id": _object_id(applicant_id, "applicant_id")})
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found.")
    return _public_applicant(applicant)


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
