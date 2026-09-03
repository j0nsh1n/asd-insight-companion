"""Deterministic, non-diagnostic explanation copy (no LLM)."""

from __future__ import annotations

from app.models.result import (
    DataQualityBlock,
    ExplanationBlock,
    SafetyBlock,
    VideoTaskSummary,
)
from app.models.session import QuestionnaireSummary

NEXT_STEP = (
    "If you have questions or ongoing concerns, consider discussing them "
    "with a qualified healthcare professional."
)

ALWAYS_LIMITATIONS = (
    "The self-report questionnaire is a development placeholder, not a "
    "validated clinical instrument.",
    "Webcam estimates depend on the device, lighting, camera position, "
    "and whether tracking stayed on a single face.",
    "One short research task cannot assess autism.",
    "This prototype does not diagnose autism or replace a professional "
    "assessment, and it does not provide a clinical probability.",
)


def safety_flags() -> SafetyBlock:
    return SafetyBlock()


def build_safe_explanation(
    *,
    questionnaire: QuestionnaireSummary | None,
    quality: DataQualityBlock,
    video: VideoTaskSummary | None,
) -> ExplanationBlock:
    available: list[str] = []
    limited: list[str] = []
    lines: list[str] = []

    if quality.questionnaire_completed:
        available.append("Self-report questionnaire answers and response timing")
        lines.append("The self-report questionnaire was completed.")
    else:
        limited.append("Self-report questionnaire was not completed")
        lines.append("The self-report questionnaire was not completed.")

    if quality.video_task_status == "completed":
        available.append("Numeric video-task tracking summary")
        lines.append("The video task finished and numeric tracking notes were stored.")
        if quality.overall_quality_label == "limited":
            limited.append("Camera-based tracking was limited")
            lines.append("Camera-based tracking was limited during this session.")
    elif quality.video_task_status == "skipped":
        limited.append("Video task was skipped")
        lines.append(
            "The video task was skipped, so no video-task observations are shown."
        )
    else:
        available.append("Video task was watched")
        limited.append("Camera-based tracking was limited or unavailable")
        lines.append(
            "The video task finished. Camera-based tracking was limited or "
            "unavailable, so blink and head-motion estimates are not shown."
        )

    if video is None or not video.attention_estimates_available:
        limited.append("Blink and head-motion estimates were not available")

    limited.append("Calibration pass or fail is not stored on the server")

    if quality.overall_quality_label == "insufficient":
        lines.append(
            "This session does not have enough stored research-task data "
            "for a full display."
        )
    elif quality.overall_quality_label == "limited":
        lines.append(
            "This research-session summary is partial because some tasks "
            "were skipped or tracking was limited."
        )
    else:
        lines.append(
            "This is a research-session summary of the tasks that were completed."
        )

    lines.append(
        "This prototype does not diagnose autism or replace a professional assessment."
    )

    return ExplanationBlock(
        summary=" ".join(lines),
        available_data=available,
        unavailable_or_limited_data=limited,
        limitations=list(ALWAYS_LIMITATIONS),
        next_steps=[NEXT_STEP],
    )
