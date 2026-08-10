"""Questionnaire scoring: total + per-category subscales (swappable instruments)."""

from __future__ import annotations

from app.models.assessment import QuestionItem, StoredQuestionResponse
from app.services.question_bank import reverse_score


def score_item_contribution(
    answer_value: int,
    item: QuestionItem,
    scale_min: int,
    scale_max: int,
) -> int:
    """Return the scored contribution of one answer (after reverse scoring)."""
    val = answer_value
    if item.reverse_scored:
        val = reverse_score(val, scale_min, scale_max)
    return val


def compute_questionnaire_scores(
    required_ids: list[str],
    items: dict[str, QuestionItem],
    answered: dict[str, StoredQuestionResponse],
    scale_min: int,
    scale_max: int,
) -> tuple[int, dict[str, int]]:
    """
    Sum answers into a total score and per-category subscale scores.

    Structure matches a fixed total + named subscale map so a later instrument
    swap can keep the same summary shape for downstream fusion.
    """
    total = 0
    subscales: dict[str, int] = {}
    for qid in required_ids:
        resp = answered[qid]
        item = items[qid]
        contrib = score_item_contribution(resp.answer_value, item, scale_min, scale_max)
        total += contrib
        cat = item.category or "general"
        subscales[cat] = subscales.get(cat, 0) + contrib
    return total, subscales
