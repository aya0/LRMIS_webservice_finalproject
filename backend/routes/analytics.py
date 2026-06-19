"""
Group Module — Analytics, KPIs, and Geospatial Feeds
Spec: Data Analysis, Map, and Visualization Module

These endpoints power:
  - Student 3's Analytics Dashboard (Analytics.jsx)
  - Student 3's Live Parcel Map (LiveMap.jsx)

All queries are read-only aggregations over shared collections.
"""
from fastapi import APIRouter
from datetime import datetime, timedelta
import database as db

router = APIRouter(prefix="/analytics", tags=["Analytics & Geofeeds"])


# ── GET /analytics/kpis ───────────────────────────────────────────────────────
@router.get("/kpis")
def get_kpis():
    """
    Return system-wide KPI counts.
    Used by: Analytics.jsx KPI cards row.
    """
    total       = db.land_applications.count_documents({})
    pending     = db.land_applications.count_documents({
        "status": {"$in": ["submitted", "pre_checked", "survey_required", "surveyed", "legal_review"]}
    })
    approved    = db.land_applications.count_documents({"status": "approved"})
    rejected    = db.land_applications.count_documents({"status": "rejected"})
    under_obj   = db.land_applications.count_documents({"status": "under_objection"})
    certs       = db.certificates.count_documents({"status": "issued"})

    # Average processing time in days (submitted_at → approved_at)
    pipeline = [
        {"$match": {"status": "approved", "timestamps.approved_at": {"$ne": None}}},
        {"$project": {
            "days": {
                "$divide": [
                    {"$subtract": ["$timestamps.approved_at", "$timestamps.submitted_at"]},
                    86400000  # ms → days
                ]
            }
        }},
        {"$group": {"_id": None, "avg": {"$avg": "$days"}}}
    ]
    avg_result = list(db.land_applications.aggregate(pipeline))
    avg_days   = round(avg_result[0]["avg"], 1) if avg_result else None

    # Active surveyor tasks
    surveyor_active = db.survey_tasks.count_documents({
        "status": {"$nin": ["survey_completed", "report_uploaded", "registrar_reviewed"]}
    })

    return {
        "total_applications":            total,
        "pending_applications":          pending,
        "approved_applications":         approved,
        "rejected_applications":         rejected,
        "applications_under_objection":  under_obj,
        "certificates_issued":           certs,
        "avg_processing_days":           avg_days,
        "surveyor_active_tasks":         surveyor_active,
    }


# ── GET /analytics/applications-by-status ────────────────────────────────────
@router.get("/applications-by-status")
def get_applications_by_status():
    """
    Return count of applications grouped by status.
    Used by: Analytics.jsx "Applications by Status" bar chart.
    Returns: [{ "status": "submitted", "count": 5 }, ...]
    """
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$project": {"_id": 0, "status": "$_id", "count": 1}},
        {"$sort": {"count": -1}},
    ]
    return list(db.land_applications.aggregate(pipeline))


# ── GET /analytics/applications-by-zone ──────────────────────────────────────
@router.get("/applications-by-zone")
def get_applications_by_zone():
    """
    Return count of pending applications grouped by zone.
    Used by: Analytics.jsx "Pending Applications by Zone" bar chart.
    Returns: [{ "zone_id": "ZONE-RM-01", "count": 3 }, ...]
    """
    pipeline = [
        {"$match": {"status": {"$in": ["submitted", "pre_checked", "survey_required", "surveyed", "legal_review"]}}},
        {"$group": {"_id": "$parcel_ref.zone_id", "count": {"$sum": 1}}},
        {"$project": {"_id": 0, "zone_id": "$_id", "count": 1}},
        {"$sort": {"count": -1}},
    ]
    return list(db.land_applications.aggregate(pipeline))


# ── GET /analytics/processing-time ───────────────────────────────────────────
@router.get("/processing-time")
def get_processing_time():
    """
    Return average processing time in days grouped by application type.
    Used by: Analytics.jsx "Average Processing Time" bar chart.
    Returns: [{ "application_type": "ownership_transfer", "avg_days": 12.3 }, ...]
    """
    pipeline = [
        {"$match": {"status": "approved", "timestamps.approved_at": {"$ne": None}}},
        {"$project": {
            "application_type": 1,
            "days": {
                "$divide": [
                    {"$subtract": ["$timestamps.approved_at", "$timestamps.submitted_at"]},
                    86400000
                ]
            }
        }},
        {"$group": {
            "_id": "$application_type",
            "avg_days": {"$avg": "$days"}
        }},
        {"$project": {"_id": 0, "application_type": "$_id", "avg_days": {"$round": ["$avg_days", 1]}}},
        {"$sort": {"avg_days": -1}},
    ]
    return list(db.land_applications.aggregate(pipeline))


# ── GET /analytics/surveyors ──────────────────────────────────────────────────
@router.get("/surveyors")
def get_surveyor_analytics():
    """
    Return workload summary per surveyor.
    Used by: Analytics.jsx "Surveyor Workload" grouped bar chart.
    Returns: [{ "name": "Survey Team A", "active_tasks": 4, "completed_tasks": 7 }, ...]
    """
    surveyors = list(db.staff_members.find({"role": "surveyor", "active": True}))
    result = []
    for s in surveyors:
        sid = str(s["_id"])
        active    = db.survey_tasks.count_documents({
            "assigned_surveyor_id": sid,
            "status": {"$nin": ["survey_completed", "report_uploaded", "registrar_reviewed"]}
        })
        completed = db.survey_tasks.count_documents({
            "assigned_surveyor_id": sid,
            "status": {"$in": ["survey_completed", "report_uploaded", "registrar_reviewed"]}
        })
        result.append({
            "name":            s.get("name", sid),
            "staff_code":      s.get("staff_code", ""),
            "active_tasks":    active,
            "completed_tasks": completed,
            "max_tasks":       s.get("workload", {}).get("max_tasks", 10),
        })
    return result


# ── GET /analytics/certificates-per-month ────────────────────────────────────
@router.get("/certificates-per-month")
def get_certificates_per_month():
    """
    Return count of certificates issued grouped by month.
    Used by: Analytics.jsx "Certificates Issued per Month" bar chart.
    Returns: [{ "month": "2026-02", "count": 3 }, ...]
    """
    pipeline = [
        {"$match": {"status": "issued"}},
        {"$group": {
            "_id": {
                "year":  {"$year":  "$issued_at"},
                "month": {"$month": "$issued_at"},
            },
            "count": {"$sum": 1}
        }},
        {"$project": {
            "_id": 0,
            "month": {
                "$concat": [
                    {"$toString": "$_id.year"}, "-",
                    {"$cond": [{"$lt": ["$_id.month", 10]},
                               {"$concat": ["0", {"$toString": "$_id.month"}]},
                               {"$toString": "$_id.month"}]}
                ]
            },
            "count": 1,
        }},
        {"$sort": {"month": 1}},
    ]
    return list(db.certificates.aggregate(pipeline))


# ── GET /analytics/objection-stats ───────────────────────────────────────────
@router.get("/objection-stats")
def get_objection_stats():
    """
    Return count of applications under objection grouped by month submitted.
    Used by: Analytics.jsx "Applications under Objection" line chart.
    Returns: [{ "month": "2026-02", "count": 1 }, ...]
    """
    pipeline = [
        {"$match": {"status": "under_objection"}},
        {"$group": {
            "_id": {
                "year":  {"$year":  "$timestamps.submitted_at"},
                "month": {"$month": "$timestamps.submitted_at"},
            },
            "count": {"$sum": 1}
        }},
        {"$project": {
            "_id": 0,
            "month": {
                "$concat": [
                    {"$toString": "$_id.year"}, "-",
                    {"$cond": [{"$lt": ["$_id.month", 10]},
                               {"$concat": ["0", {"$toString": "$_id.month"}]},
                               {"$toString": "$_id.month"}]}
                ]
            },
            "count": 1,
        }},
        {"$sort": {"month": 1}},
    ]
    return list(db.land_applications.aggregate(pipeline))


# ── GET /analytics/geofeeds/parcels ──────────────────────────────────────────
@router.get("/geofeeds/parcels")
def get_parcel_geofeed():
    """
    Return all parcels as a GeoJSON FeatureCollection.
    Used by: LiveMap.jsx parcel boundary polygons layer.

    Each feature includes properties:
      parcel_number, block_number, basin_number, zone_id,
      registration_status, dispute_state, area_sqm
    """
    parcels = list(db.parcels.find({}))
    features = []
    for p in parcels:
        geometry = p.get("geometry")
        if not geometry:
            continue
        features.append({
            "type": "Feature",
            "geometry": geometry,
            "properties": {
                "parcel_number":       p.get("parcel_number"),
                "block_number":        p.get("block_number"),
                "basin_number":        p.get("basin_number"),
                "zone_id":             p.get("zone_id"),
                "registration_status": p.get("registration_status", "registered"),
                "dispute_state":       p.get("dispute_state", "none"),
                "area_sqm":            p.get("area_sqm"),
                "parcel_code":         p.get("parcel_code"),
            }
        })
    return {"type": "FeatureCollection", "features": features}


# ── GET /analytics/geofeeds/pending-heatmap ──────────────────────────────────
@router.get("/geofeeds/pending-heatmap")
def get_pending_heatmap():
    """
    Return pending/active applications as a GeoJSON FeatureCollection of Points.
    Used by: LiveMap.jsx clustered marker layer.

    Joins applications to parcels to get the parcel centroid.
    Each feature is a Point at the parcel's first coordinate.

    Properties: zone_id, status, application_type
    """
    active_statuses = ["submitted", "pre_checked", "survey_required", "surveyed",
                       "legal_review", "under_objection", "missing_documents", "on_hold"]

    apps = list(db.land_applications.find(
        {"status": {"$in": active_statuses}},
        {"parcel_ref": 1, "status": 1, "application_type": 1}
    ))

    features = []
    for app in apps:
        parcel_ref = app.get("parcel_ref", {})
        zone_id    = parcel_ref.get("zone_id")
        parcel_id  = parcel_ref.get("parcel_id")

        # Look up parcel geometry for the centroid point
        parcel = None
        if parcel_id:
            try:
                from bson import ObjectId
                parcel = db.parcels.find_one({"_id": ObjectId(str(parcel_id))}, {"geometry": 1})
            except Exception:
                pass

        # Use first coordinate of the parcel polygon as the point
        coords = None
        if parcel and parcel.get("geometry", {}).get("coordinates"):
            try:
                coords = parcel["geometry"]["coordinates"][0][0]  # [lng, lat]
            except (IndexError, TypeError):
                pass

        if not coords:
            continue

        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": coords},
            "properties": {
                "zone_id":          zone_id,
                "status":           app.get("status"),
                "application_type": app.get("application_type"),
            }
        })

    return {"type": "FeatureCollection", "features": features}
