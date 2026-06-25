from typing import Any

from bson import ObjectId
from fastapi import HTTPException

import database as db


def object_id(value: str, field_name: str = "id") -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name} format.")


def serialize_value(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, list):
        return [serialize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: serialize_value(item) for key, item in value.items()}
    return value


def serialize_doc_id(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


def find_applicant_by_id(applicant_id: str, context: str):
    applicant_oid = object_id(applicant_id, "applicant_id")
    query = {"_id": applicant_oid}
    applicant = db.applicants.find_one(query)
    if not applicant:
        print(
            f"{context} applicant lookup failed",
            {
                "received_applicant_id": applicant_id,
                "lookup_query": {"_id": f"ObjectId('{applicant_id}')"},
            },
        )
    return applicant


def find_application_with_query(application_id: str):
    query = [{"application_id": application_id}]
    if ObjectId.is_valid(application_id):
        query.append({"_id": ObjectId(application_id)})
    return db.land_applications.find_one({"$or": query}), query


def application_belongs_to_applicant(application: dict, applicant: dict, applicant_id: str, application_id: str) -> bool:
    linked = {str(item) for item in applicant.get("linked_applications", [])}
    application_identifiers = {application_id, str(application.get("_id")), str(application.get("application_id", ""))}
    if linked.intersection(application_identifiers):
        return True

    owner_ids = []
    applicant_ref = application.get("applicant_ref")
    if isinstance(applicant_ref, dict):
        owner_ids.append(applicant_ref.get("applicant_id"))
    owner_ids.append(application.get("applicant_id"))
    owner_ids = [str(item) for item in owner_ids if item]

    if owner_ids:
        return applicant_id in owner_ids
    return True


def validate_application_access(application_id: str, applicant_id: str, applicant: dict, context: str):
    application, lookup_query = find_application_with_query(application_id)
    if not application:
        print(
            f"{context} application lookup skipped",
            {
                "received_application_id": application_id,
                "lookup_query": {"$or": lookup_query},
                "reason": "No land_applications record found; Module 2 applicant action is allowed for a valid applicant.",
            },
        )
        return None

    if not application_belongs_to_applicant(application, applicant, applicant_id, application_id):
        raise HTTPException(status_code=403, detail="This application does not belong to the applicant.")
    return application
