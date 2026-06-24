from datetime import datetime
from types import SimpleNamespace

import services.assignment as assignment


class FakeStaffMembers:
    def __init__(self, docs):
        self.docs = docs

    def find(self, query):
        return [
            doc.copy()
            for doc in self.docs
            if doc.get("role") == query.get("role") and doc.get("active") == query.get("active")
        ]


class FakeSurveyTasks:
    def __init__(self, counts):
        self.counts = counts

    def aggregate(self, pipeline):
        return [{"_id": staff_id, "active_tasks": count} for staff_id, count in self.counts.items()]


class FakeLandApplications:
    def __init__(self, application):
        self.application = application

    def find_one(self, query):
        if query.get("application_id") == self.application.get("application_id"):
            return self.application
        return None


def _make_assignment_db(staff_docs, task_counts, application):
    return SimpleNamespace(
        staff_members=FakeStaffMembers(staff_docs),
        survey_tasks=FakeSurveyTasks(task_counts),
        land_applications=FakeLandApplications(application),
    )


def test_find_best_surveyor_picks_lowest_workload(monkeypatch):
    staff_docs = [
        {
            "_id": "a",
            "staff_code": "SURV-001",
            "role": "surveyor",
            "active": True,
            "workload": {"active_tasks": 4, "max_tasks": 10},
            "created_at": datetime(2026, 1, 1, 8, 0),
        },
        {
            "_id": "b",
            "staff_code": "SURV-002",
            "role": "surveyor",
            "active": True,
            "workload": {"active_tasks": 1, "max_tasks": 10},
            "created_at": datetime(2026, 1, 2, 8, 0),
        },
        {
            "_id": "c",
            "staff_code": "SURV-003",
            "role": "surveyor",
            "active": True,
            "workload": {"active_tasks": 2, "max_tasks": 10},
            "created_at": datetime(2026, 1, 3, 8, 0),
        },
    ]
    monkeypatch.setattr(
        assignment,
        "db",
        _make_assignment_db(
            staff_docs,
            {"a": 4, "b": 1, "c": 2},
            {"application_id": "APP-1", "status": "survey_required"},
        ),
    )

    selected, application = assignment.find_best_surveyor("APP-1")

    assert selected["staff_code"] == "SURV-002"
    assert application["application_id"] == "APP-1"


def test_find_best_surveyor_uses_creation_order_for_ties(monkeypatch):
    staff_docs = [
        {
            "_id": "a",
            "staff_code": "SURV-001",
            "role": "surveyor",
            "active": True,
            "workload": {"active_tasks": 1, "max_tasks": 10},
            "created_at": datetime(2026, 1, 1, 8, 0),
        },
        {
            "_id": "b",
            "staff_code": "SURV-002",
            "role": "surveyor",
            "active": True,
            "workload": {"active_tasks": 1, "max_tasks": 10},
            "created_at": datetime(2026, 1, 2, 8, 0),
        },
    ]
    monkeypatch.setattr(
        assignment,
        "db",
        _make_assignment_db(
            staff_docs,
            {"a": 1, "b": 1},
            {"application_id": "APP-2", "status": "survey_required"},
        ),
    )

    selected, _ = assignment.find_best_surveyor("APP-2")

    assert selected["staff_code"] == "SURV-001"
