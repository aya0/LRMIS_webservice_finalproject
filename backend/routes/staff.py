from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
from passlib.context import CryptContext
from passlib.hash import pbkdf2_sha256
import database as db
from models.staff import StaffCreate, StaffOut, LoginRequest
from auth import create_access_token, decode_access_token

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt"],
    default="pbkdf2_sha256",
    deprecated="auto",
)

router = APIRouter()


# ── Simple staff-only access control (spec: "basic access control") ───────────
def require_staff(authorization: Optional[str] = Header(None), x_staff_id: Optional[str] = Header(None)):
    """
    Require a valid staff identity. Prefer Authorization bearer token; fall back to X-Staff-Id for backwards compatibility.
    """
    # 1) Try Authorization: Bearer <token>
    if authorization and authorization.lower().startswith('bearer '):
        token = authorization.split(None, 1)[1]
        try:
            payload = decode_access_token(token)
            staff_id = payload.get('staff_id')
            if not staff_id:
                raise HTTPException(status_code=401, detail="Invalid token payload")
            staff = db.staff_members.find_one({"_id": ObjectId(staff_id)})
            if not staff:
                raise HTTPException(status_code=403, detail="Staff member not found")
            return staff
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

    # 2) Fallback: X-Staff-Id header (existing behavior)
    if x_staff_id:
        staff = db.staff_members.find_one({"_id": ObjectId(x_staff_id)})
        if not staff:
            raise HTTPException(status_code=403, detail="Staff member not found.")
        return staff

    raise HTTPException(status_code=401, detail="Authorization required")


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    doc.pop("password_hash", None)   # Never expose the hash
    return doc


# ── POST /staff/ ──────────────────────────────────────────────────────────────
@router.post("/staff/", response_model=dict, status_code=201)
def create_staff(body: StaffCreate):
    """
    Create a surveyor or registrar staff account.
    Password is hashed securely before storage — never stored in plain text.
    staff_code must be unique (enforced by DB index).
    """
    existing = db.staff_members.find_one({"staff_code": body.staff_code})
    if existing:
        raise HTTPException(status_code=409, detail=f"staff_code '{body.staff_code}' already exists.")

    doc = body.model_dump()
    # Hash password before storing — plain text is discarded
    doc["password_hash"] = pwd_context.hash(doc.pop("password"))
    doc["created_at"] = datetime.now(timezone.utc)

    result = db.staff_members.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    doc.pop("password_hash", None)   # Never return hash to client
    return doc


# ── POST /auth/login ──────────────────────────────────────────────────────────
@router.post("/auth/login", response_model=dict)
def login(body: LoginRequest):
    """
    Authenticate a staff member by staff_code + password.
    Returns the staff profile (no password_hash). The client stores
    the staff id and sends it as X-Staff-Id on subsequent requests.
    Spec: "Passlib or simple token-based authentication".
    """
    staff = db.staff_members.find_one({"staff_code": body.staff_code})
    if not staff:
        raise HTTPException(status_code=401, detail="Invalid staff code or password.")

    password_hash = staff.get("password_hash", "")
    if not (
        (password_hash and pwd_context.verify(body.password, password_hash))
        or (password_hash and pbkdf2_sha256.verify(body.password, password_hash))
    ):
        raise HTTPException(status_code=401, detail="Invalid staff code or password.")

    if not staff.get("active", True):
        raise HTTPException(status_code=403, detail="Account is inactive.")

    staff = _serialize(staff)
    staff.pop("password_hash", None)   # Never return hash to client

    # Create demo access token (contains staff id)
    token = create_access_token({"staff_id": staff.get("id")})
    return {"access_token": token, "token_type": "bearer", "staff": staff}


# ── GET /staff/{staff_id} ─────────────────────────────────────────────────────
@router.get("/staff/{staff_id}", response_model=dict)
def get_staff(staff_id: str):
    """
    Retrieve staff profile, current workload, and performance summary.
    Includes active survey tasks count and completed tasks count.
    """
    try:
        oid = ObjectId(staff_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid staff_id format.")

    staff = db.staff_members.find_one({"_id": oid})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found.")

    staff = _serialize(staff)

    # Workload: count active survey tasks assigned to this staff member
    query_values = [staff_id]
    try:
        query_values.append(ObjectId(staff_id))
    except Exception:
        pass

    active_tasks = db.survey_tasks.count_documents({
        "assigned_surveyor_id": {"$in": query_values},
        "status": {"$nin": ["survey_completed", "report_uploaded", "registrar_reviewed"]}
    })
    completed_tasks = db.survey_tasks.count_documents({
        "assigned_surveyor_id": {"$in": query_values},
        "status": {"$in": ["survey_completed", "report_uploaded", "registrar_reviewed"]}
    })

    staff["performance_summary"] = {
        "active_tasks":    active_tasks,
        "completed_tasks": completed_tasks,
        "max_tasks":       staff.get("workload", {}).get("max_tasks", 10),
    }

    return staff


# ── GET /staff/ ───────────────────────────────────────────────────────────────
@router.get("/staff/", response_model=list)
def list_staff(role: Optional[str] = None, zone: Optional[str] = None, active: bool = True):
    """List all staff members, optionally filtered by role, zone, or active status."""
    query: dict = {"active": active}
    if role:
        query["role"] = role
    if zone:
        query["coverage.zone_ids"] = zone

    staff_list = list(db.staff_members.find(query))
    return [_serialize(s) for s in staff_list]
