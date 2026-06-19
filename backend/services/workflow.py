"""
Strict workflow / state machine for LRMIS land applications.
Defines all valid transitions and the validation rules each requires.
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone

# ── Allowed transitions ────────────────────────────────────────────────────────
# Maps current_state -> list of valid next states
TRANSITIONS: Dict[str, List[str]] = {
    "submitted": ["pre_checked", "missing_documents", "rejected"],
    "pre_checked": ["survey_required", "legal_review", "missing_documents", "rejected", "under_objection"],
    "survey_required": ["surveyed", "missing_documents", "rejected", "on_hold"],
    "surveyed": ["legal_review", "missing_documents", "rejected"],
    "legal_review": ["approved", "rejected", "on_hold", "under_objection"],
    "approved": ["certificate_issued", "rejected"],
    "certificate_issued": ["closed"],
    "closed": [],
    "rejected": [],
    "on_hold": ["pre_checked", "survey_required", "legal_review", "rejected"],
    "missing_documents": ["pre_checked", "survey_required", "legal_review", "rejected"],
    "under_objection": ["legal_review", "rejected", "on_hold"],
}

# Timestamps to record when entering each state
STATE_TIMESTAMPS: Dict[str, str] = {
    "submitted": "submitted_at",
    "pre_checked": "pre_checked_at",
    "survey_required": "survey_required_at",
    "surveyed": "surveyed_at",
    "legal_review": "legal_review_at",
    "approved": "approved_at",
    "certificate_issued": "certificate_issued_at",
    "closed": "closed_at",
}


def get_allowed_next(current_state: str) -> List[str]:
    return TRANSITIONS.get(current_state, [])


def can_transition(current_state: str, target_state: str) -> bool:
    return target_state in TRANSITIONS.get(current_state, [])


def validate_transition(app: dict, target_state: str) -> Optional[str]:
    """
    Returns None if the transition is allowed, or an error message string.
    Enforces all mandatory-field rules from the spec.
    """
    current = app.get("status")

    if not can_transition(current, target_state):
        return (
            f"Transition from '{current}' to '{target_state}' is not allowed. "
            f"Valid next states: {get_allowed_next(current)}"
        )

    # ── Rule: submitted -> pre_checked ────────────────────────────────────────
    if target_state == "pre_checked":
        applicant = app.get("applicant_ref", {})
        parcel = app.get("parcel_ref", {})
        if not applicant.get("applicant_id"):
            return "Cannot move to pre_checked: applicant_id is missing."
        if not all([parcel.get("parcel_number"), parcel.get("zone_id"),
                    parcel.get("block_number"), parcel.get("basin_number")]):
            return "Cannot move to pre_checked: parcel information is incomplete."

    # ── Rule: pre_checked -> survey_required ──────────────────────────────────
    if target_state == "survey_required":
        parcel = app.get("parcel_ref", {})
        if not parcel.get("parcel_id") and not parcel.get("zone_id"):
            return "Cannot move to survey_required: parcel location (parcel_id or zone_id) is not valid."

    # ── Rule: survey_required -> surveyed ─────────────────────────────────────
    if target_state == "surveyed":
        assignment = app.get("assignment", {})
        if not assignment.get("assigned_surveyor_id"):
            return "Cannot move to surveyed: no survey report exists (no surveyor assigned)."

    # ── Rule: surveyed -> legal_review ────────────────────────────────────────
    if target_state == "legal_review":
        docs = app.get("required_documents", [])
        ownership_docs = [d for d in docs if d.get("document_type") in
                          ("ownership_deed", "sale_contract", "title_deed")]
        if not ownership_docs:
            return "Cannot move to legal_review: ownership documents have not been uploaded."

    # ── Rule: legal_review -> approved ────────────────────────────────────────
    if target_state == "approved":
        # legal review must have been started
        timestamps = app.get("timestamps", {})
        if not timestamps.get("legal_review_at"):
            return "Cannot move to approved: legal review has not been completed."

    # ── Rule: approved -> certificate_issued ──────────────────────────────────
    if target_state == "certificate_issued":
        if app.get("status") != "approved":
            return "Cannot issue a certificate unless the application is approved."

    # ── Rule: rejected must have reason ──────────────────────────────────────
    # (handled at endpoint level, not here)

    return None  # all good


def build_workflow_field(current_state: str) -> dict:
    return {
        "current_state": current_state,
        "allowed_next": get_allowed_next(current_state),
        "transition_rules_version": "v1.0",
    }


def get_timestamp_field_for_state(state: str) -> Optional[str]:
    return STATE_TIMESTAMPS.get(state)
