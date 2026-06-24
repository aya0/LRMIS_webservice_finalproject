import pytest
from types import SimpleNamespace

from models import survey_task as stmod
from models.schemas import ApplicationTransition, ApplicationStatus
import routes.applications as applications


def test_milestone_order_listed():
    # Ensure the milestone order list is present and in expected order
    order = stmod.MILESTONE_ORDER
    assert isinstance(order, list)
    assert order[0] == 'assigned'
    assert order[-1] == 'registrar_reviewed'


def test_transition_to_survey_required_triggers_auto_assignment(monkeypatch):
    application = {
        "application_id": "APP-100",
        "status": "pre_checked",
        "timestamps": {},
    }

    class FakeSurveyTasks:
        def find_one(self, query):
            return None

    class FakeLandApplications:
        def __init__(self):
            self.last_update = None

        def update_one(self, query, update):
            self.last_update = update

        def find_one(self, query):
            return {**application, "status": "survey_required", "workflow": {"current_state": "survey_required"}}

    fake_land_applications = FakeLandApplications()
    fake_db = SimpleNamespace(survey_tasks=FakeSurveyTasks())
    auto_assign_calls = []

    monkeypatch.setattr(applications, "get_app_or_404", lambda application_id: application.copy())
    monkeypatch.setattr(applications, "validate_transition", lambda app, target: None)
    monkeypatch.setattr(applications, "build_workflow_field", lambda state: {"current_state": state})
    monkeypatch.setattr(applications, "get_timestamp_field_for_state", lambda state: "survey_required_at" if state == "survey_required" else None)
    monkeypatch.setattr(applications, "log_event", lambda *args, **kwargs: None)
    monkeypatch.setattr(applications, "update_kpi", lambda *args, **kwargs: None)
    monkeypatch.setattr(applications, "land_applications", fake_land_applications)
    monkeypatch.setattr(applications, "db", fake_db)

    import routes.survey as survey_routes
    monkeypatch.setattr(survey_routes, "auto_assign_surveyor", lambda application_id: auto_assign_calls.append(application_id) or {"task_id": "TASK-1"})

    response = applications.transition_application(
        "APP-100",
        ApplicationTransition(target_state=ApplicationStatus.survey_required),
    )

    assert auto_assign_calls == ["APP-100"]
    assert response["application"]["status"] == "survey_required"
