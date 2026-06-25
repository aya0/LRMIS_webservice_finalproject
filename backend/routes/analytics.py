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
try:
    from fpdf import FPDF
    _FPDF_AVAILABLE = True
except ImportError:
    _FPDF_AVAILABLE = False

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


def _as_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _build_management_pdf_bytes(report: dict) -> bytes:
    """Generate a nicely formatted PDF report using fpdf2."""
    ACCENT = (37, 99, 235)
    ACCENT_2 = (16, 185, 129)
    ACCENT_3 = (245, 158, 11)
    DARK   = (15, 23, 42)
    MUTED  = (100, 116, 139)
    LIGHT  = (241, 245, 249)
    PALE   = (248, 250, 252)
    BORDER = (226, 232, 240)
    WHITE  = (255, 255, 255)

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    pdf.set_margins(20, 20, 20)

    def page_width():
        return pdf.w - pdf.l_margin - pdf.r_margin

    def safe_text(value):
        text = "-" if value is None else str(value)
        return text.replace("_", " ").title() if isinstance(value, str) else text

    def format_number(value):
        if value is None:
            return "0"
        try:
            if isinstance(value, float):
                rounded = round(value, 1)
                return str(int(rounded)) if rounded.is_integer() else f"{rounded:.1f}"
            return f"{int(value):,}"
        except (TypeError, ValueError):
            return str(value)

    def section_header(title: str, subtitle: str | None = None):
        pdf.ln(3)
        pdf.set_fill_color(*PALE)
        pdf.set_draw_color(*BORDER)
        pdf.set_text_color(*ACCENT)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(page_width(), 9, f"  {title.upper()}", ln=True, fill=True, border=1)
        if subtitle:
            pdf.set_text_color(*MUTED)
            pdf.set_font("Helvetica", "", 8.5)
            pdf.multi_cell(page_width(), 5, subtitle)
        pdf.ln(1)

    pdf.set_fill_color(*DARK)
    pdf.rect(0, 0, 210, 42, style="F")
    pdf.set_fill_color(*ACCENT)
    pdf.rect(0, 0, 210, 12, style="F")
    pdf.set_text_color(*WHITE)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_xy(20, 18)
    pdf.cell(0, 9, "LRMIS Management Report")
    pdf.set_xy(20, 27)
    pdf.set_font("Helvetica", "", 9.5)
    gen = report.get("generated_at", "")[:10]
    pdf.cell(0, 6, f"Land Registration Management Information System - Generated {gen}")
    pdf.set_text_color(*MUTED)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_xy(148, 18)
    pdf.multi_cell(42, 4, "Operational snapshot\nfor internal review", align="R")

    def metric_card(x, y, w, title, value, color, subtitle=None):
        pdf.set_xy(x, y)
        pdf.set_fill_color(*WHITE)
        pdf.set_draw_color(*BORDER)
        pdf.rect(x, y, w, 22, style="FD")
        pdf.set_fill_color(*color)
        pdf.rect(x, y, 3, 22, style="F")
        pdf.set_xy(x + 6, y + 4)
        pdf.set_text_color(*MUTED)
        pdf.set_font("Helvetica", "", 7.5)
        pdf.cell(w - 10, 4, title.upper())
        pdf.set_xy(x + 6, y + 10)
        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(w - 10, 5, value)
        if subtitle:
            pdf.set_xy(x + 6, y + 16)
            pdf.set_text_color(*MUTED)
            pdf.set_font("Helvetica", "", 7.2)
            pdf.cell(w - 10, 4, subtitle)

    s = report.get("summary", {})
    metric_card(20, 47, 40, "Total", format_number(s.get("total_applications")), ACCENT)
    metric_card(63, 47, 40, "Pending", format_number(s.get("pending_applications")), ACCENT_3)
    metric_card(106, 47, 40, "Issued", format_number(s.get("certificates_issued")), ACCENT_2)
    metric_card(149, 47, 41, "Delayed", format_number(s.get("delayed_applications")), (220, 38, 38))

    pdf.set_xy(20, 73)
    section_header("Key Performance Indicators", "High-level operational summary across the reporting period.")

    s = report.get("summary", {})
    kpi_rows = [
        ("Total Applications", s.get("total_applications")),
        ("Pending Applications", s.get("pending_applications")),
        ("Approved", s.get("approved_applications")),
        ("Rejected", s.get("rejected_applications")),
        ("Under Objection", s.get("applications_under_objection")),
        ("Certificates Issued", s.get("certificates_issued")),
        ("Average Processing Time (days)", s.get("avg_processing_days")),
        ("Delayed Applications (>30d)", s.get("delayed_applications")),
    ]
    left_x = 20
    right_x = 105
    start_y = pdf.get_y() + 2
    for idx, (label, value) in enumerate(kpi_rows):
        x = left_x if idx % 2 == 0 else right_x
        y = start_y + (idx // 2) * 10
        pdf.set_xy(x, y)
        pdf.set_fill_color(*WHITE)
        pdf.set_draw_color(*BORDER)
        pdf.rect(x, y, 80, 8, style="FD")
        pdf.set_xy(x + 4, y + 2.1)
        pdf.set_text_color(*MUTED)
        pdf.set_font("Helvetica", "", 8)
        pdf.cell(55, 4, label)
        pdf.set_xy(x + 57, y + 2.1)
        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(19, 4, format_number(value), align="R")

    pdf.set_y(start_y + 4 * 10 + 2)

    def section(title: str, subtitle: str | None = None):
        section_header(title, subtitle)

    def row_item(left: str, right: str, accent_right=False):
        pdf.set_fill_color(*WHITE)
        pdf.set_draw_color(*BORDER)
        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(128, 7, left, border=1, fill=True)
        if accent_right:
            pdf.set_text_color(*ACCENT)
            pdf.set_font("Helvetica", "B", 9)
        else:
            pdf.set_text_color(*DARK)
            pdf.set_font("Helvetica", "", 9)
        pdf.cell(0, 7, right, ln=True, border=1, fill=True)
        pdf.set_text_color(*DARK)

    section("Top Hotspot Zones", "Zones with the highest application volume.")
    for row in report.get("hotspot_zones", []):
        row_item(str(row.get("zone_id", "-")), format_number(row.get("count", 0)), accent_right=True)

    delayed = report.get("delayed_applications", {})
    section(f"Delayed Applications  ({format_number(delayed.get('count', 0))} total)", "Applications still pending beyond the delay threshold.")
    for row in (delayed.get("items") or [])[:15]:
        row_item(
            f"{row.get('application_id', '-')}  ({safe_text(row.get('status', '-'))})",
            f"{format_number(row.get('delay_days', 0))}d",
            accent_right=True
        )

    pdf.ln(12)
    sig_y = pdf.get_y()
    pdf.set_fill_color(*PALE)
    pdf.set_draw_color(*BORDER)
    pdf.rect(20, sig_y, 170, 36, style="FD")
    pdf.set_xy(25, sig_y + 4)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 5, "Prepared and submitted by:", ln=True)
    pdf.set_xy(25, pdf.get_y() + 2)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*DARK)
    pdf.cell(55, 6, "Tala Kherawish")
    pdf.cell(55, 6, "Julia Duaibes")
    pdf.cell(55, 6, "Aya Samara", ln=True)
    pdf.set_xy(25, pdf.get_y())
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*MUTED)
    pdf.cell(55, 5, "Student 3")
    pdf.cell(55, 5, "Student 2")
    pdf.cell(55, 5, "Student 1")

    pdf.set_y(-15)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 5, "LRMIS - Land Registration Management Information System  |  COMP4382 Final Project", align="C")

    return pdf.output()


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
                    {"$project": {"days": {"$divide": [{"$subtract": ["$timestamps.approved_at", "$timestamps.submitted_at"]}, 86400000]}}},
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
        {"$lookup": {"from": "parcels", "localField": "parcel_ref.parcel_id", "foreignField": "_id", "as": "parcel"}},
        {"$unwind": {"path": "$parcel", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"timestamps.submitted_at": 1}},
        {"$limit": limit},
        {"$project": {
            "application_id": 1, "status": 1, "application_type": 1,
            "submitted_at": "$timestamps.submitted_at",
            "zone_id": "$parcel_ref.zone_id",
            "parcel_number": "$parcel_ref.parcel_number",
            "parcel_code": "$parcel.parcel_code",
        }},
    ]
    items = list(db.land_applications.aggregate(pipeline))
    total = db.land_applications.count_documents({"status": {"$in": PENDING_STATUSES}, "timestamps.submitted_at": {"$lte": cutoff}})
    for item in items:
        submitted_at = _as_utc(item.get("submitted_at"))
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
            "pipeline": [{"$match": {"$expr": {"$or": [
                {"$eq": [{"$toString": "$registrar_review.registrar_id"}, "$$staff_code"]},
                {"$eq": [{"$toString": "$registrar_review.registrar_id"}, "$$staff_id"]},
            ]}}}],
            "as": "reviews",
        }},
        {"$lookup": {
            "from": "land_applications",
            "let": {"staff_code": "$staff_code", "staff_id": {"$toString": "$_id"}},
            "pipeline": [{"$match": {"$expr": {"$or": [
                {"$eq": [{"$toString": "$assignment.assigned_registrar_id"}, "$$staff_code"]},
                {"$eq": [{"$toString": "$assignment.assigned_registrar_id"}, "$$staff_id"]},
            ]}}}],
            "as": "assigned_applications",
        }},
        {"$project": {
            "_id": 0, "name": 1, "staff_code": 1,
            "review_count": {"$size": "$reviews"},
            "assigned_applications": {"$size": "$assigned_applications"},
            "inbox_backlog": {"$size": {"$filter": {
                "input": "$reviews", "as": "review",
                "cond": {"$in": ["$$review.status", ["draft", "pending", "review_requested"]]}
            }}},
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
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {k: snapshot[k] for k in [
            "total_applications", "pending_applications", "approved_applications",
            "rejected_applications", "applications_under_objection", "certificates_issued",
            "avg_processing_days", "delayed_applications",
        ]},
        "by_status": snapshot["by_status"],
        "by_type": snapshot["by_type"],
        "hotspot_zones": hotspots,
        "registrars": registrars,
        "surveyors": surveyors,
        "delayed_applications": delayed,
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
        rows.append({"section": "surveyors", "metric": row.get("name"), "value": row.get("active_tasks"), "details": f"completed={row.get('completed_tasks', 0)}"})
    for row in report["delayed_applications"]["items"]:
        rows.append({"section": "delayed_applications", "metric": row.get("application_id"), "value": row.get("delay_days"), "details": f"status={row.get('status')} zone={row.get('zone_id')}"})
    return rows


# ── GET /analytics/kpis ───────────────────────────────────────────────────────
@router.get("/kpis")
def get_kpis(force_refresh: bool = Query(False)):
    return _cached_json("kpis", _build_kpi_snapshot, force_refresh=force_refresh)


# ── GET /analytics/by-status ─────────────────────────────────────────────────
@router.get("/by-status")
@router.get("/applications-by-status")
def get_applications_by_status(force_refresh: bool = Query(False)):
    return _cached_json("applications_by_status", lambda: _build_kpi_snapshot()["by_status"], force_refresh=force_refresh)


# ── GET /analytics/by-type ───────────────────────────────────────────────────
@router.get("/by-type")
@router.get("/applications-by-type")
def get_applications_by_type(force_refresh: bool = Query(False)):
    return _cached_json("applications_by_type", lambda: _build_kpi_snapshot()["by_type"], force_refresh=force_refresh)


# ── GET /analytics/by-zone ───────────────────────────────────────────────────
@router.get("/by-zone")
@router.get("/applications-by-zone")
def get_applications_by_zone(force_refresh: bool = Query(False)):
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
    pipeline = [
        {"$match": {"status": "approved", "timestamps.approved_at": {"$ne": None}}},
        {"$project": {
            "application_type": 1,
            "days": {"$divide": [{"$subtract": ["$timestamps.approved_at", "$timestamps.submitted_at"]}, 86400000]}
        }},
        {"$group": {"_id": "$application_type", "avg_days": {"$avg": "$days"}}},
        {"$project": {"_id": 0, "application_type": "$_id", "avg_days": {"$round": ["$avg_days", 1]}}},
        {"$sort": {"avg_days": -1}},
    ]
    return _cached_json("processing_time", lambda: list(db.land_applications.aggregate(pipeline)), force_refresh=force_refresh)


# ── GET /analytics/surveyors ──────────────────────────────────────────────────
@router.get("/surveyors")
def get_surveyor_analytics(force_refresh: bool = Query(False)):
    def _builder():
        return list(db.staff_members.aggregate([
            {"$match": {"role": "surveyor", "active": True}},
            {"$lookup": {
                "from": "survey_tasks",
                "let": {"staff_id": {"$toString": "$_id"}},
                "pipeline": [{"$match": {"$expr": {"$eq": [{"$toString": "$assigned_surveyor_id"}, "$$staff_id"]}}}],
                "as": "tasks",
            }},
            {"$project": {
                "_id": 0, "name": 1, "staff_code": 1,
                "max_tasks": {"$ifNull": ["$workload.max_tasks", 10]},
                "active_tasks": {"$size": {"$filter": {
                    "input": "$tasks", "as": "task",
                    "cond": {"$not": [{"$in": ["$$task.status", ["survey_completed", "report_uploaded", "registrar_reviewed"]]}]}
                }}},
                "completed_tasks": {"$size": {"$filter": {
                    "input": "$tasks", "as": "task",
                    "cond": {"$in": ["$$task.status", ["survey_completed", "report_uploaded", "registrar_reviewed"]]}
                }}},
            }},
            {"$sort": {"active_tasks": -1}},
        ]))
    return _cached_json("surveyor_analytics", _builder, force_refresh=force_refresh)


# ── GET /analytics/registrars ────────────────────────────────────────────────
@router.get("/registrars")
def get_registrar_analytics(force_refresh: bool = Query(False)):
    return _cached_json("registrar_analytics", _build_registrar_workload, force_refresh=force_refresh)


# ── GET /analytics/certs-per-month ──────────────────────────────────────────
@router.get("/certs-per-month")
@router.get("/certificates-per-month")
def get_certificates_per_month(force_refresh: bool = Query(False)):
    pipeline = [
        {"$match": {"status": "issued"}},
        {"$group": {"_id": {"year": {"$year": "$issued_at"}, "month": {"$month": "$issued_at"}}, "count": {"$sum": 1}}},
        {"$project": {"_id": 0, "month": {"$concat": [
            {"$toString": "$_id.year"}, "-",
            {"$cond": [{"$lt": ["$_id.month", 10]}, {"$concat": ["0", {"$toString": "$_id.month"}]}, {"$toString": "$_id.month"}]}
        ]}, "count": 1}},
        {"$sort": {"month": 1}},
    ]
    return _cached_json("certificates_per_month", lambda: list(db.certificates.aggregate(pipeline)), force_refresh=force_refresh)


# ── GET /analytics/objections ────────────────────────────────────────────────
@router.get("/objections")
@router.get("/objection-stats")
def get_objection_stats(force_refresh: bool = Query(False)):
    pipeline = [
        {"$match": {"status": "under_objection"}},
        {"$group": {"_id": {"year": {"$year": "$timestamps.submitted_at"}, "month": {"$month": "$timestamps.submitted_at"}}, "count": {"$sum": 1}}},
        {"$project": {"_id": 0, "month": {"$concat": [
            {"$toString": "$_id.year"}, "-",
            {"$cond": [{"$lt": ["$_id.month", 10]}, {"$concat": ["0", {"$toString": "$_id.month"}]}, {"$toString": "$_id.month"}]}
        ]}, "count": 1}},
        {"$sort": {"month": 1}},
    ]
    return _cached_json("objection_stats", lambda: list(db.land_applications.aggregate(pipeline)), force_refresh=force_refresh)


# ── GET /analytics/processing-time-buckets ───────────────────────────────────
@router.get("/processing-time-buckets")
def get_processing_time_buckets(force_refresh: bool = Query(False), buckets: int = Query(5, ge=2, le=10)):
    """
    Uses $bucketAuto to group approved applications into N auto-sized
    processing-time buckets (days from submitted to approved).
    """
    pipeline = [
        {"$match": {"status": "approved",
                    "timestamps.approved_at":  {"$ne": None},
                    "timestamps.submitted_at": {"$ne": None}}},
        {"$project": {"days": {"$divide": [
            {"$subtract": ["$timestamps.approved_at", "$timestamps.submitted_at"]},
            86400000
        ]}}},
        {"$bucketAuto": {
            "groupBy": "$days",
            "buckets": buckets,
            "output":  {"count": {"$sum": 1}, "avg_days": {"$avg": "$days"}}
        }},
        {"$project": {
            "_id": 0,
            "range": {"$concat": [
                {"$toString": {"$round": ["$_id.min", 0]}}, "–",
                {"$toString": {"$round": ["$_id.max", 0]}}, "d"
            ]},
            "count":    1,
            "avg_days": {"$round": ["$avg_days", 1]}
        }},
    ]
    return _cached_json(
        "processing_time_buckets",
        lambda: list(db.land_applications.aggregate(pipeline)),
        force_refresh=force_refresh,
        buckets=buckets,
    )


# ── GET /analytics/applications-over-time ────────────────────────────────────
@router.get("/applications-over-time")
def get_applications_over_time(force_refresh: bool = Query(False)):
    """Monthly count of submitted applications — powers the 'Applications over Time' chart."""
    pipeline = [
        {"$match": {"timestamps.submitted_at": {"$ne": None}}},
        {"$group": {
            "_id": {
                "year":  {"$year":  "$timestamps.submitted_at"},
                "month": {"$month": "$timestamps.submitted_at"},
            },
            "count": {"$sum": 1},
        }},
        {"$project": {
            "_id": 0,
            "month": {"$concat": [
                {"$toString": "$_id.year"}, "-",
                {"$cond": [{"$lt": ["$_id.month", 10]},
                           {"$concat": ["0", {"$toString": "$_id.month"}]},
                           {"$toString": "$_id.month"}]}
            ]},
            "count": 1,
        }},
        {"$sort": {"month": 1}},
    ]
    return _cached_json(
        "applications_over_time",
        lambda: list(db.land_applications.aggregate(pipeline)),
        force_refresh=force_refresh,
    )


# ── GET /analytics/hotspot-zones ─────────────────────────────────────────────
@router.get("/hotspot-zones")
def get_hotspot_zones(force_refresh: bool = Query(False), limit: int = Query(10, ge=1, le=25)):
    return _cached_json("hotspot_zones", lambda: _build_hotspot_zones(limit=limit), force_refresh=force_refresh, limit=limit)


# ── GET /analytics/delayed-applications ──────────────────────────────────────
@router.get("/delayed-applications")
def get_delayed_applications(force_refresh: bool = Query(False), limit: int = Query(20, ge=1, le=100)):
    return _cached_json("delayed_applications", lambda: _build_delayed_applications(limit=limit), force_refresh=force_refresh, limit=limit)


# ── GET /analytics/reports/management ───────────────────────────────────────
@router.get("/reports/management")
def get_management_report(
    force_refresh: bool = Query(False),
    format: str = Query("json", pattern="^(json|csv|pdf)$"),
):
    report = _cached_json("management_report", _build_management_report, force_refresh=force_refresh)

    if format == "json":
        return report

    if format == "csv":
        rows = _build_management_csv(report)
        return _csv_response("lrmis-management-report.csv", rows, ["section", "metric", "value", "details"])

    if not _FPDF_AVAILABLE:
        return Response(
            content="fpdf2 not installed. Run: pip install fpdf2",
            media_type="text/plain",
            status_code=503,
        )
    pdf_bytes = _build_management_pdf_bytes(report)
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="lrmis-management-report.pdf"'},
    )


# ── GET /analytics/parcel-geo-feed ───────────────────────────────────────────
@router.get("/parcel-geo-feed")
@router.get("/geofeeds/parcels")
def get_parcel_geofeed(
    force_refresh: bool = Query(False),
    zone_id: str = Query(None),
    parcel_code: str = Query(None),
    parcel_status: str = Query(None),
    dispute_state: str = Query(None),
    near_lng: float = Query(None),
    near_lat: float = Query(None),
    max_distance_m: float = Query(5000),
):
    def _builder():
        query = {}
        if zone_id:
            query["zone_id"] = zone_id
        if parcel_code:
            query["parcel_code"] = parcel_code
        if parcel_status:
            query["registration_status"] = parcel_status
        if dispute_state:
            query["dispute_state"] = dispute_state

        features = []
        if near_lat is not None and near_lng is not None:
            pipeline = [
                {"$geoNear": {
                    "near": {"type": "Point", "coordinates": [near_lng, near_lat]},
                    "distanceField": "distance_m",
                    "spherical": True,
                    "key": "geometry",
                    "maxDistance": max_distance_m,
                }},
                {"$match": query} if query else {"$match": {}},
                {"$project": {
                    "geometry": 1, "parcel_number": 1, "block_number": 1,
                    "basin_number": 1, "zone_id": 1, "registration_status": 1,
                    "dispute_state": 1, "area_sqm": 1, "parcel_code": 1, "distance_m": 1,
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

    cache_params = {
        "zone_id": zone_id, "parcel_code": parcel_code, "parcel_status": parcel_status,
        "dispute_state": dispute_state, "near_lng": near_lng,
        "near_lat": near_lat, "max_distance_m": max_distance_m,
    }
    return _cached_json("parcel_geo_feed", _builder, force_refresh=force_refresh, **cache_params)


# ── GET /analytics/pending-heatmap ──────────────────────────────────────────
@router.get("/pending-heatmap")
@router.get("/geofeeds/pending-heatmap")
def get_pending_heatmap(force_refresh: bool = Query(False)):
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
                "status": 1, "application_type": 1,
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
            except (KeyError, IndexError, TypeError):
                pass
            if not coords or len(coords) < 2:
                continue
            lng, lat = coords[0], coords[1]
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
                "properties": {
                    "zone_id":          app.get("zone_id"),
                    "status":           app.get("status"),
                    "application_type": app.get("application_type"),
                    "parcel_code":      app.get("parcel_code"),
                },
            })
        return {"type": "FeatureCollection", "features": features}

    return _cached_json("pending_heatmap", _builder, force_refresh=force_refresh)
