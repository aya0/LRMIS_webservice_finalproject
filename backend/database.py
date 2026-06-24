from pymongo import MongoClient, ASCENDING, GEOSPHERE
from config import MONGODB_URI, DATABASE_NAME

client = MongoClient(MONGODB_URI)
db = client[DATABASE_NAME]

# ── Collections owned by Module 3 ─────────────────────────────────────────────
staff_members     = db["staff_members"]
survey_tasks      = db["survey_tasks"]
survey_reports    = db["survey_reports"]
performance_logs  = db["performance_logs"]

# MODULE 2: Applicant Portal collections
applicants            = db["applicants"]
application_documents = db["application_documents"]
applicant_comments    = db["applicant_comments"]
objections            = db["objections"]

# MODULE 1: Land Administration collections
land_applications = db["land_applications"]
parcels           = db["parcels"]
certificates      = db["certificates"]


def create_indexes():
    """Create all required indexes from the project spec."""

    # land_applications indexes Module 1
    land_applications.create_index("application_id", unique=True)
    land_applications.create_index("status")
    land_applications.create_index("application_type")
    land_applications.create_index("parcel_ref.parcel_number")
    land_applications.create_index("parcel_ref.zone_id")
    land_applications.create_index("timestamps.submitted_at")
    land_applications.create_index("idempotency_key", sparse=True)

    # parcels indexes Module 1
    parcels.create_index("parcel_code", unique=True)
    parcels.create_index([("geometry", GEOSPHERE)])
    parcels.create_index("zone_id")
    parcels.create_index("parcel_number")

    # certificates
    certificates.create_index("certificate_id", unique=True)
    certificates.create_index("application_id")

    # performance_logs
    performance_logs.create_index("application_id")

    # Module 3 required indexes (spec page: Required MongoDB Indexes)
    staff_members.create_index("staff_code", unique=True)
    survey_tasks.create_index("application_id")
    survey_tasks.create_index([("assigned_surveyor_id", ASCENDING), ("status", ASCENDING)])

    # Additional useful indexes for Module 3 queries
    survey_tasks.create_index("assigned_surveyor_id")
    survey_tasks.create_index("status")
    staff_members.create_index([("role", ASCENDING), ("active", ASCENDING), ("created_at", ASCENDING)])
    staff_members.create_index("coverage.zone_ids")
    performance_logs.create_index("application_id")

    # MODULE 2 indexes
    applicants.create_index("identity.national_id", unique=True, sparse=True)
    applicants.create_index("identity.registration_number", unique=True, sparse=True)
    application_documents.create_index("application_id")
    application_documents.create_index("applicant_id")
    applicant_comments.create_index("application_id")
    applicant_comments.create_index("applicant_id")
    objections.create_index("application_id")
    objections.create_index("applicant_id")
    performance_logs.create_index("application_id")

    print("Indexes created successfully.")
