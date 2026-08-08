"""Load the configurable research-inspired question bank."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.models.assessment import QuestionBankPublic, QuestionItem, ScaleOption

_DEFAULT_BANK_PATH = Path(__file__).resolve().parents[1] / "data" / "question_bank.json"


def _bank_path() -> Path:
    return _DEFAULT_BANK_PATH


@lru_cache
def _raw_bank() -> dict[str, Any]:
    path = _bank_path()
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("question bank must be a JSON object")
    return data


def clear_bank_cache() -> None:
    """Test helper: reload bank from disk after path/content changes."""
    _raw_bank.cache_clear()


def get_question_bank() -> QuestionBankPublic:
    """Return the public question bank (items + scale + label)."""
    data = _raw_bank()
    items = [QuestionItem.model_validate(item) for item in data["items"]]
    scale = [ScaleOption.model_validate(opt) for opt in data["scale"]]
    required = sum(1 for item in items if item.required)
    return QuestionBankPublic(
        bank_id=str(data["bank_id"]),
        label=str(data["label"]),
        scale=scale,
        items=items,
        required_count=required,
    )


def get_item_map() -> dict[str, QuestionItem]:
    """Map question_id → item."""
    bank = get_question_bank()
    return {item.id: item for item in bank.items}


def get_scale_values() -> set[int]:
    """Allowed Likert values for answers."""
    return {opt.value for opt in get_question_bank().scale}


def reverse_score(value: int, scale_min: int, scale_max: int) -> int:
    """Map a Likert value for reverse-scored items."""
    return scale_min + scale_max - value
