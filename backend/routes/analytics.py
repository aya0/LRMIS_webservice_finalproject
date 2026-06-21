"""
Group Module — Analytics, KPIs, and Geospatial Feeds
Spec: Data Analysis, Map, and Visualization Module

These endpoints power:
    - Student 3's Analytics Dashboard (Analytics.jsx)
    - Student 3's Live Parcel Map (LiveMap.jsx)

All queries are read-only aggregations over shared collections.
"""
from fastapi import APIRouter, Query, Response
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import csv
import io
import json
import time
import database as db

router = APIRouter(prefix="/analytics", tags=["Analytics & Geofeeds"])

ACTIVE_STATUSES = [
    "submitted",
    "pre_checked",
    "survey_required",
    "surveyed",
    "legal_review",
    "under_objection",
    "missing_documents",
    "on_hold",
]
PENDING_STATUSES = ["submitted", "pre_checked", "survey_required", "surveyed", "legal_review"]
DELAY_DAYS = 30
_CACHE: dict = {}
_CACHE_TTL_SECONDS = 300


def _cache_key(name: str, **params):
    return (name, tuple(sorted(params.items())))


def _get_cache(name: str, **params):
    key = _cache_key(name, **params)
    entry = _CACHE.get(key)
    if not entry:
        return None
    if entry["expires_at"] < time.time():
        _CACHE.pop(key, None)
        return None
    return entry["value"]


def _set_cache(name: str, value, ttl: int = _CACHE_TTL_SECONDS, **params):
    key = _cache_key(name, **params)
    _CACHE[key] = {"value": value, "expires_at": time.time() + ttl}


def _cached_json(name: str, builder, force_refresh: bool = False, ttl: int = _CACHE_TTL_SECONDS, **params):
    if not force_refresh:
        cached = _get_cache(name, **params)
        if cached is not None:
            return cached
    value = builder()
    _set_cache(name, value, ttl=ttl, **params)
    return value


def _csv_response(filename: str, rows: list[dict], fieldnames: list[str]):
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow({key: row.get(key, "") for key in fieldnames})
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _escape_pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _pdf_response(filename: str, lines: list[str]):
    content_lines = ["BT", "/F1 12 Tf"]
    y = 780
    for line in lines[:45]:
        content_lines.append(f"1 0 0 1 50 {y} Tm")
        content_lines.append(f"({_escape_pdf_text(line)}) Tj")
        y -= 16
    content_lines.append("ET")
    stream = "\n".join(content_lines).encode("latin-1", "replace")

    objects = [
        b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
        b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
        b"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>endobj\n",
        b"4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
        b"5 0 obj<< /Length " + str(len(stream)).encode("ascii") + b" >>stream\n" + stream + b"\nendstream endobj\n",
    ]

    output = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(output))
        output.extend(obj)

    xref_pos = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    output.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    output.extend(
        (
            "trailer\n"
            f"<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            "startxref\n"
            f"{xref_pos}\n"
            "%%EOF"
        ).encode("ascii")
    )

    return Response(
        content=bytes(output),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _build_kpi_snapshot():
    cutoff = datetime.now(timezone.utc) - timedelta(days=DELAY_DAYS)
    pipeline = [
        {
            "$facet": {
                "status_counts": [
                    {"$group": {"_id": "$status", "count": {"$sum": 1}}},
                    {"$sort": {"count": -1}},
                ],
                "type_counts": [
                    {"$group": {"_id": "$application_type", "count": {"$sum": 1}}},
                    {"$sort": {"count": -1}},
                ],
                "approved": [{"$match": {"status": "approved"}}, {"$count": "count"}],
                "rejected": [{"$match": {"status": "rejected"}}, {"$count": "count"}],
                "under_objection": [{"$match": {"status": "under_objection"}}, {"$count": "count"}],
                "certificates": [{"$match": {"status": "issued"}}, {"$count": "count"}],
                "processing": [
                    {"$match": {"status": "approved", "timestamps.approved_at": {"$ne": None}, "timestamps.submitted_at": {"$ne": None}}},
                    {
                        "$project": {
                            "days": {
                                "$divide": [
                                    {"$subtract": ["$timestamps.approved_at", "$timestamps.submitted_at"]},
                                    86400000,
                                ]
                            }
                        }
                    },
                    {"$group": {"_id": None, "avg": {"$avg": "$days"}}},
                ],
                "pending": [{"$match": {"status": {"$in": PENDING_STATUSES}}}, {"$count": "count"}],
                "delayed": [
                    {"$match": {"status": {"$in": PENDING_STATUSES}, "timestamps.submitted_at": {"$lte": cutoff}}},
                    {"$count": "count"},
                ],
            }
        }
    ]
    snapshot = list(db.land_applications.aggregate(pipeline))[0]

    def _single_count(name: str) -> int:
        bucket = snapshot.get(name, [])
        return bucket[0]["count"] if bucket else 0

    avg_bucket = snapshot.get("processing", [])
    avg_days = round(avg_bucket[0]["avg"], 1) if avg_bucket else None

    return {
        "total_applications": db.land_applications.count_documents({}),
        "pending_applications": _single_count("pending"),
        "approved_applications": _single_count("approved"),
        "rejected_applications": _single_count("rejected"),
        "applications_under_objection": _single_count("under_objection"),
        "certificates_issued": _single_count("certificates"),
        "avg_processing_days": avg_days,
        "delayed_applications": _single_count("delayed"),
        "by_status": snapshot.get("status_counts", []),
        "by_type": snapshot.get("type_counts", []),
    }


def _build_delayed_applications(limit: int = 20):
    cutoff = datetime.now(timezone.utc) - timedelta(days=DELAY_DAYS)
    pipeline = [
        {"$match": {"status": {"$in": PENDING_STATUSES}, "timestamps.submitted_at": {"$lte": cutoff}}},
        {"$lookup": {
            "from": "parcels",
            "localField": "parcel_ref.parcel_id",
            "foreignField": "_id",
            "as": "parcel",
        }},
        {"$unwind": {"path": "$parcel", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"timestamps.submitted_at": 1}},
        {"$limit": limit},
        {"$project": {
            "application_id": 1,
            "status": 1,
            "application_type": 1,
            "submitted_at": "$timestamps.submitted_at",
            "zone_id": "$parcel_ref.zone_id",
            "parcel_number": "$parcel_ref.parcel_number",
            "parcel_code": "$parcel.parcel_code",
        }},
    ]
    items = list(db.land_applications.aggregate(pipeline))
    total = db.land_applications.count_documents({"status": {"$in": PENDING_STATUSES}, "timestamps.submitted_at": {"$lte": cutoff}})
    for item in items:
        submitted_at = item.get("submitted_at")
        if submitted_at:
            item["delay_days"] = max(0, (datetime.now(timezone.utc) - submitted_at).days)
    return {"count": total, "items": items}


def _build_hotspot_zones(limit: int = 10):
    pipeline = [
        {"$group": {"_id": "$parcel_ref.zone_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
        {"$project": {"_id": 0, "zone_id": "$_id", "count": 1}},
    ]
    return list(db.land_applications.aggregate(pipeline))


def _build_registrar_workload():
    pipeline = [
        {"$match": {"role": "registrar", "active": True}},
        {"$lookup": {
            "from": "survey_reports",
            "let": {"staff_code": "$staff_code", "staff_id": {"$toString": "$_id"}},
            "pipeline": [
                {"$match": {"$expr": {"$or": [
                    {"$eq": [{"$toString": "$registrar_review.registrar_id"}, "$$staff_code"]},
                    {"$eq": [{"$toString": "$registrar_review.registrar_id"}, "$$staff_id"]},
                ]}}}
            ],
            "as": "reviews",
        }},
        {"$lookup": {
            "from": "land_applications",
            "let": {"staff_code": "$staff_code", "staff_id": {"$toString": "$_id"}},
            "pipeline": [
                {"$match": {"$expr": {"$or": [
                    {"$eq": [{"$toString": "$assignment.assigned_registrar_id"}, "$$staff_code"]},
                    {"$eq": [{"$toString": "$assignment.assigned_registrar_id"}, "$$staff_id"]},
                ]}}}
            ],
            "as": "assigned_applications",
        }},
        {"$project": {
            "_id": 0,
            "name": 1,
            "staff_code": 1,
            "review_count": {"$size": "$reviews"},
            "assigned_applications": {"$size": "$assigned_applications"},
            "inbox_backlog": {
                "$size": {
                    "$filter": {
                        "input": "$reviews",
                        "as": "review",
                        "cond": {"$in": ["$$review.status", ["draft", "pending", "review_requested"]]}
                    }
                }
            },
        }},
        {"$sort": {"review_count": -1, "assigned_applications": -1}},
    ]
    return list(db.staff_members.aggregate(pipeline))


def _build_management_report():
    snapshot = _build_kpi_snapshot()
    delayed = _build_delayed_applications(limit=25)
    hotspots = _build_hotspot_zones(limit=10)
    registrars = _build_registrar_workload()
    surveyors = get_surveyor_analytics()

    processing_buckets = list(db.land_applications.aggregate([
        {"$match": {"status": "approved", "timestamps.approved_at": {"$ne": None}, "timestamps.submitted_at": {"$ne": None}}},
        {"$project": {
            "days": {
                "$divide": [
                    {"$subtract": ["$timestamps.approved_at", "$timestamps.submitted_at"]},
                    86400000,
                ]
            }
        }},
        {"$bucketAuto": {"groupBy": "$days", "buckets": 5}},
    ]))

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {k: snapshot[k] for k in [
            "total_applications",
            "pending_applications",
            "approved_applications",
            "rejected_applications",
            "applications_under_objection",
            "certificates_issued",
            "avg_processing_days",
            "delayed_applications",
        ]},
        "by_status": snapshot["by_status"],
        "by_type": snapshot["by_type"],
        "hotspot_zones": hotspots,
        "registrars": registrars,
        "surveyors": surveyors,
        "delayed_applications": delayed,
        "processing_buckets": processing_buckets,
    }


def _build_management_csv(report: dict) -> list[dict]:
    rows = []
    for key, value in report["summary"].items():
        rows.append({"section": "summary", "metric": key, "value": value, "details": ""})
    for row in report["by_status"]:
        rows.append({"section": "applications_by_status", "metric": row.get("status"), "value": row.get("count"), "details": ""})
    for row in report["by_type"]:
        rows.append({"section": "applications_by_type", "metric": row.get("application_type"), "value": row.get("count"), "details": ""})
    for row in report["hotspot_zones"]:
        rows.append({"section": "hotspot_zones", "metric": row.get("zone_id"), "value": row.get("count"), "details": ""})
    for row in report["registrars"]:
        rows.append({"section": "registrars", "metric": row.get("name"), "value": row.get("review_count"), "details": f"assigned={row.get('assigned_applications', 0)} backlog={row.get('inbox_backlog', 0)}"})
    for row in report["surveyors"]:
        rows.append({"section": "surveyors", "metric": row.get("name"), "value": row.get("active_tasks"), "details": f"completed={row.get('completed_tasks', 0)} max={row.get('max_tasks', 0)}"})
    for row in report["delayed_applications"]["items"]:
        rows.append({"section": "delayed_applications", "metric": row.get("application_id"), "value": row.get("delay_days"), "details": f"status={row.get('status')} zone={row.get('zone_id')}"})
    return rows


# ── GET /analytics/kpis ───────────────────────────────────────────────────────
@router.get("/kpis")
def get_kpis(force_refresh: bool = Query(False)):
    """
    Return system-wide KPI counts.
    Used by: Analytics.jsx KPI cards row.
    """
    return _cached_json("kpis", _build_kpi_snapshot, force_refresh=force_refresh)


# ── GET /analytics/by-status ────────────────────────────────────────────────
@router.get("/by-status")
@router.get("/applications-by-status")
def get_applications_by_status(force_refresh: bool = Query(False)):
    """
    Return count of applications grouped by status.
    Used by: Analytics.jsx "Applications by Status" bar chart.
    Returns: [{ "status": "submitted", "count": 5 }, ...]
    """
    return _cached_json("applications_by_status", lambda: _build_kpi_snapshot()["by_status"], force_refresh=force_refresh)


# ── GET /analytics/by-type ───────────────────────────────────────────────────
@router.get("/by-type")
@router.get("/applications-by-type")
def get_applications_by_type(force_refresh: bool = Query(False)):
    """Return count of applications grouped by type."""
    return _cached_json("applications_by_type", lambda: _build_kpi_snapshot()["by_type"], force_refresh=force_refresh)


# ── GET /analytics/by-zone ───────────────────────────────────────────────────
@router.get("/by-zone")
@router.get("/applications-by-zone")
def get_applications_by_zone(force_refresh: bool = Query(False)):
    """
    Return count of pending applications grouped by zone.
    Used by: Analytics.jsx "Pending Applications by Zone" bar chart.
    Returns: [{ "zone_id": "ZONE-RM-01", "count": 3 }, ...]
    """
    def _builder():
        pipeline = [
            {"$match": {"status": {"$in": PENDING_STATUSES}}},
            {"$group": {"_id": "$parcel_ref.zone_id", "count": {"$sum": 1}}},
            {"$project": {"_id": 0, "zone_id": "$_id", "count": 1}},
            {"$sort": {"count": -1}},
        ]
        return list(db.land_applications.aggregate(pipeline))

    return _cached_json("applications_by_zone", _builder, force_refresh=force_refresh)


# ── GET /analytics/processing-time ───────────────────────────────────────────
@router.get("/processing-time")
def get_processing_time(force_refresh: bool = Query(False)):
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
    return _cached_json("processing_time", lambda: list(db.land_applications.aggregate(pipeline)), force_refresh=force_refresh)


# ── GET /analytics/surveyors ──────────────────────────────────────────────────
@router.get("/surveyors")
def get_surveyor_analytics(force_refresh: bool = Query(False)):
    """
    Return workload summary per surveyor.
    Used by: Analytics.jsx "Surveyor Workload" grouped bar chart.
    Returns: [{ "name": "Survey Team A", "active_tasks": 4, "completed_tasks": 7 }, ...]
    """
    def _builder():
        surveyors = list(db.staff_members.aggregate([
            {"$match": {"role": "surveyor", "active": True}},
            {"$lookup": {
                "from": "survey_tasks",
                "let": {"staff_code": "$staff_code", "staff_id": {"$toString": "$_id"}},
                "pipeline": [
                    {"$match": {"$expr": {"$or": [
                        {"$eq": [{"$toString": "$assigned_surveyor_id"}, "$$staff_id"]},
                        {"$eq": [{"$toString": "$assigned_surveyor_id"}, "$$staff_code"]},
                    ]}}}
                ],
                "as": "tasks",
            }},
            {"$project": {
                "_id": 0,
                "name": 1,
                "staff_code": 1,
                "max_tasks": {"$ifNull": ["$workload.max_tasks", 10]},
                "active_tasks": {
                    "$size": {
                        "$filter": {
                            "input": "$tasks",
                            "as": "task",
                            "cond": {"$not": [{"$in": ["$$task.status", ["survey_completed", "report_uploaded", "registrar_reviewed"]]}]}
                        }
                    }
                },
                "completed_tasks": {
                    "$size": {
                        "$filter": {
                            "input": "$tasks",
                            "as": "task",
                            "cond": {"$in": ["$$task.status", ["survey_completed", "report_uploaded", "registrar_reviewed"]]}
                        }
                    }
                },
            }},
            {"$sort": {"active_tasks": -1, "completed_tasks": -1}},
        ]))
        return surveyors

    return _cached_json("surveyor_analytics", _builder, force_refresh=force_refresh)


# ── GET /analytics/registrars ────────────────────────────────────────────────
@router.get("/registrars")
def get_registrar_analytics(force_refresh: bool = Query(False)):
    """Return registrar review workload analytics."""
    return _cached_json("registrar_analytics", _build_registrar_workload, force_refresh=force_refresh)


# ── GET /analytics/certs-per-month ──────────────────────────────────────────
@router.get("/certs-per-month")
@router.get("/certificates-per-month")
def get_certificates_per_month(force_refresh: bool = Query(False)):
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
    return _cached_json("certificates_per_month", lambda: list(db.certificates.aggregate(pipeline)), force_refresh=force_refresh)


# ── GET /analytics/objections ────────────────────────────────────────────────
@router.get("/objections")
@router.get("/objection-stats")
def get_objection_stats(force_refresh: bool = Query(False)):
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
    return _cached_json("objection_stats", lambda: list(db.land_applications.aggregate(pipeline)), force_refresh=force_refresh)


# ── GET /analytics/hotspot-zones ─────────────────────────────────────────────
@router.get("/hotspot-zones")
def get_hotspot_zones(force_refresh: bool = Query(False), limit: int = Query(10, ge=1, le=25)):
    """Return the busiest zones by application volume."""
    return _cached_json(
        "hotspot_zones",
        lambda: _build_hotspot_zones(limit=limit),
        force_refresh=force_refresh,
        limit=limit,
    )


# ── GET /analytics/delayed-applications ──────────────────────────────────────
@router.get("/delayed-applications")
def get_delayed_applications(force_refresh: bool = Query(False), limit: int = Query(20, ge=1, le=100)):
    """Return delayed applications and the total delayed count."""
    return _cached_json(
        "delayed_applications",
        lambda: _build_delayed_applications(limit=limit),
        force_refresh=force_refresh,
        limit=limit,
    )


# ── GET /analytics/reports/management ───────────────────────────────────────
@router.get("/reports/management")
def get_management_report(
    force_refresh: bool = Query(False),
    format: str = Query("json", pattern="^(json|csv|pdf)$"),
):
    """Generate a management report in JSON, CSV, or PDF format."""
    report = _cached_json("management_report", _build_management_report, force_refresh=force_refresh)

    if format == "json":
        return report

    if format == "csv":
        rows = _build_management_csv(report)
        return _csv_response(
            "lrmis-management-report.csv",
            rows,
            ["section", "metric", "value", "details"],
        )

    lines = [
        "LRMIS Management Report",
        f"Generated: {report['generated_at']}",
        "",
    ]
    for metric, value in report["summary"].items():
        lines.append(f"{metric}: {value}")
    lines.append("")
    lines.append("Top hotspot zones:")
    for row in report["hotspot_zones"]:
        lines.append(f"- {row.get('zone_id', '—')}: {row.get('count', 0)}")
    lines.append("")
    lines.append("Registrar workload:")
    for row in report["registrars"]:
        lines.append(
            f"- {row.get('name', '—')}: reviews={row.get('review_count', 0)} assigned={row.get('assigned_applications', 0)} backlog={row.get('inbox_backlog', 0)}"
        )
    lines.append("")
    lines.append(f"Delayed applications: {report['delayed_applications']['count']}")
    for row in report["delayed_applications"]["items"][:10]:
        lines.append(
            f"- {row.get('application_id', '—')}: {row.get('delay_days', 0)} days ({row.get('status', '—')})"
        )
    return _pdf_response("lrmis-management-report.pdf", lines)


# ── GET /analytics/parcel-geo-feed ───────────────────────────────────────────
@router.get("/parcel-geo-feed")
@router.get("/geofeeds/parcels")
def get_parcel_geofeed(
    force_refresh: bool = Query(False),
    zone_id: str = Query(None),
    parcel_status: str = Query(None),
    dispute_state: str = Query(None),
    near_lng: float = Query(None),
    near_lat: float = Query(None),
    max_distance_m: float = Query(5000),
):
    """
    Return all parcels as a GeoJSON FeatureCollection.
    Used by: LiveMap.jsx parcel boundary polygons layer.

    Each feature includes properties:
      parcel_number, block_number, basin_number, zone_id,
      registration_status, dispute_state, area_sqm
    """
    def _builder():
        query = {}
        if zone_id:
            query["zone_id"] = zone_id
        if parcel_status:
            query["registration_status"] = parcel_status
        if dispute_state:
            query["dispute_state"] = dispute_state

        features = []
        if near_lat is not None and near_lng is not None:
            pipeline = [
                {
                    "$geoNear": {
                        "near": {"type": "Point", "coordinates": [near_lng, near_lat]},
                        "distanceField": "distance_m",
                        "spherical": True,
                        "key": "geometry",
                        "maxDistance": max_distance_m,
                    }
                },
                {"$match": query} if query else {"$match": {}},
                {"$project": {
                    "geometry": 1,
                    "parcel_number": 1,
                    "block_number": 1,
                    "basin_number": 1,
                    "zone_id": 1,
                    "registration_status": 1,
                    "dispute_state": 1,
                    "area_sqm": 1,
                    "parcel_code": 1,
                    "distance_m": 1,
                }},
            ]
            docs = list(db.parcels.aggregate(pipeline))
        else:
            docs = list(db.parcels.find(query))

        for p in docs:
            geometry = p.get("geometry")
            if not geometry:
                continue
            props = {
                "parcel_number":       p.get("parcel_number"),
                "block_number":        p.get("block_number"),
                "basin_number":        p.get("basin_number"),
                "zone_id":             p.get("zone_id"),
                "registration_status": p.get("registration_status", "registered"),
                "dispute_state":       p.get("dispute_state", "none"),
                "area_sqm":            p.get("area_sqm"),
                "parcel_code":         p.get("parcel_code"),
            }
            if p.get("distance_m") is not None:
                props["distance_m"] = round(p["distance_m"], 2)
            features.append({"type": "Feature", "geometry": geometry, "properties": props})
        return {"type": "FeatureCollection", "features": features}

    cache_params = {"zone_id": zone_id, "parcel_status": parcel_status, "dispute_state": dispute_state, "near_lng": near_lng, "near_lat": near_lat, "max_distance_m": max_distance_m}
    return _cached_json("parcel_geo_feed", _builder, force_refresh=force_refresh, **cache_params)


# ── GET /analytics/pending-heatmap ──────────────────────────────────────────
@router.get("/pending-heatmap")
@router.get("/geofeeds/pending-heatmap")
def get_pending_heatmap(force_refresh: bool = Query(False)):
    """
    Return pending/active applications as a GeoJSON FeatureCollection of Points.
    Used by: LiveMap.jsx clustered marker layer.

    Joins applications to parcels to get the parcel centroid.
    Each feature is a Point at the parcel's first coordinate.

    Properties: zone_id, status, application_type
    """
    active_statuses = ["submitted", "pre_checked", "survey_required", "surveyed",
                       "legal_review", "under_objection", "missing_documents", "on_hold"]

    def _builder():
        pipeline = [
            {"$match": {"status": {"$in": active_statuses}}},
            {"$lookup": {
                "from": "parcels",
                "let": {"parcel_id": "$parcel_ref.parcel_id"},
                "pipeline": [
                    {"$match": {"$expr": {"$eq": [{"$toString": "$_id"}, {"$toString": "$$parcel_id"}]}}},
                    {"$project": {"geometry": 1, "parcel_code": 1}},
                ],
                "as": "parcel",
            }},
            {"$unwind": {"path": "$parcel", "preserveNullAndEmptyArrays": True}},
            {"$project": {
                "status": 1,
                "application_type": 1,
                "zone_id": "$parcel_ref.zone_id",
                "geometry": "$parcel.geometry",
                "parcel_code": "$parcel.parcel_code",
            }},
        ]
        docs = list(db.land_applications.aggregate(pipeline))
        features = []
        for app in docs:
            parcel_geometry = app.get("geometry") or {}
            coords = None
            try:
                coords = parcel_geometry["coordinates"][0][0]
            except Exception:
                continue
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": coords},
                "properties": {
                    "zone_id": app.get("zone_id"),
                    "status": app.get("status"),
                    "application_type": app.get("application_type"),
                    "parcel_code": app.get("parcel_code"),
                },
            })
        return {"type": "FeatureCollection", "features": features}

    return _cached_json("pending_heatmap", _builder, force_refresh=force_refresh)
