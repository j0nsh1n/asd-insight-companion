"""Unit tests for swappable questionnaire scoring."""

from __future__ import annotations

from app.models.assessment import QuestionItem, StoredQuestionResponse
from app.services.scoring import compute_questionnaire_scores, score_item_contribution


def _resp(qid: str, value: int) -> StoredQuestionResponse:
    return StoredQuestionResponse(
        question_id=qid,
        answer_value=value,
        shown_at="2026-01-01T00:00:00+00:00",
        answered_at="2026-01-01T00:00:01+00:00",
        time_to_first_interaction_ms=10,
        total_time_on_question_ms=100,
        answer_change_count=0,
    )


def test_score_item_reverse() -> None:
    item = QuestionItem(
        id="x",
        text="t",
        reverse_scored=True,
        category="social_preference",
    )
    # 1-4 scale: reverse of 1 is 4
    assert score_item_contribution(1, item, 1, 4) == 4
    assert score_item_contribution(4, item, 1, 4) == 1


def test_compute_total_and_subscales() -> None:
    items = {
        "a": QuestionItem(id="a", text="t", reverse_scored=False, category="routine"),
        "b": QuestionItem(id="b", text="t", reverse_scored=True, category="routine"),
        "c": QuestionItem(
            id="c", text="t", reverse_scored=False, category="sensory_experience"
        ),
    }
    answered = {
        "a": _resp("a", 3),
        "b": _resp("b", 1),  # reverse -> 4
        "c": _resp("c", 2),
    }
    total, subscales = compute_questionnaire_scores(
        ["a", "b", "c"], items, answered, 1, 4
    )
    assert total == 3 + 4 + 2
    assert subscales == {"routine": 7, "sensory_experience": 2}
