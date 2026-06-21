import pytest

from models import survey_task as stmod


def test_milestone_order_listed():
    # Ensure the milestone order list is present and in expected order
    order = stmod.MILESTONE_ORDER
    assert isinstance(order, list)
    assert order[0] == 'assigned'
    assert order[-1] == 'registrar_reviewed'
