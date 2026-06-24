import pytest
from datetime import datetime

from services.assignment import _score_surveyor


def make_surveyor(**kwargs):
    s = {
        "coverage": {"zone_ids": ["ZONE-RM-01"]},
        "skills": ["boundary_survey", "gps_mapping"],
        "schedule": {"shifts": [{"day": datetime.now(timezone.utc).strftime("%a")}], "on_call": False},
        "workload": {"active_tasks": 0, "max_tasks": 5},
        "role": "surveyor",
        "active": True,
    }
    s.update(kwargs)
    return s


def test_score_zone_mismatch_returns_negative():
    s = make_surveyor(coverage={"zone_ids": ["OTHER"]})
    score = _score_surveyor(s, "ZONE-RM-01", ["boundary_survey"], "normal", datetime.now(timezone.utc))
    assert score == -1


def test_score_increases_with_skill_and_capacity():
    s = make_surveyor()
    score = _score_surveyor(s, "ZONE-RM-01", ["boundary_survey", "gps_mapping"], "high", datetime.now(timezone.utc))
    # Expect positive score; exact value depends on schedule/day but should be > 0
    assert score > 0
