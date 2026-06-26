"""
rubric_scorer.py
────────────────
Local ML-based rubric scoring using sentence-transformers.

Model: all-MiniLM-L6-v2  (~80 MB, downloads automatically on first use)
  - Encodes student submission and each criterion's expected content into
    384-dimensional semantic embeddings.
  - Cosine similarity between submission and criterion → proportional score.
  - Runs on CPU; called via run_in_executor to stay non-blocking in FastAPI.
"""

from __future__ import annotations

import asyncio
from functools import partial

from sentence_transformers import SentenceTransformer, util

# ---------------------------------------------------------------------------
# Model singleton — loaded once, reused across requests
# ---------------------------------------------------------------------------
_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print("[RubricScorer] Loading sentence-transformers model (all-MiniLM-L6-v2)...")
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        print("[RubricScorer] Model loaded successfully.")
    return _model


# ---------------------------------------------------------------------------
# Synchronous scoring (runs in thread pool)
# ---------------------------------------------------------------------------
def _score_sync(submission_text: str, rubric: list[dict]) -> dict:
    """
    Synchronous scoring function — called via run_in_executor.

    rubric: [
        {"criterion": "Clarity", "expected": "Student explains clearly...", "max_points": 2},
        ...
    ]
    Returns:
        {
            "total_score": 3.5,
            "breakdown": [
                {"criterion": "Clarity", "max_points": 2, "score": 1.5, "comment": "..."},
                ...
            ]
        }
    """
    model = _get_model()

    # Encode the full student submission once
    sub_embedding = model.encode(submission_text, convert_to_tensor=True)

    breakdown = []
    total = 0.0

    for item in rubric:
        criterion = item.get("criterion", "Unnamed Criterion")
        # Use the detailed expected description for richer similarity
        expected_text = item.get("expected") or criterion
        max_pts = float(item.get("max_points", 1))

        crit_embedding = model.encode(expected_text, convert_to_tensor=True)

        # Cosine similarity is in [-1, 1]; normalise to [0, 1]
        similarity = float(util.cos_sim(sub_embedding, crit_embedding)[0][0])
        normalised = max(0.0, min(1.0, (similarity + 1.0) / 2.0))
        score = round(normalised * max_pts, 1)
        total += score

        # Human-readable match level
        if normalised >= 0.75:
            level = "Strong match"
        elif normalised >= 0.50:
            level = "Moderate match"
        elif normalised >= 0.25:
            level = "Partial match"
        else:
            level = "Weak match"

        comment = f"{level} ({int(normalised * 100)}% semantic alignment with expected content)"

        breakdown.append({
            "criterion": criterion,
            "max_points": max_pts,
            "score": score,
            "comment": comment,
        })

    return {"total_score": round(min(total, 5.0), 1), "breakdown": breakdown}


# ---------------------------------------------------------------------------
# Async wrapper — non-blocking for FastAPI
# ---------------------------------------------------------------------------
async def score_with_rubric(submission_text: str, rubric: list[dict]) -> dict:
    """
    Async entry-point.  Runs the CPU-bound ML scoring in a thread pool so
    FastAPI's event loop is not blocked.
    """
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, partial(_score_sync, submission_text, rubric)
    )
    return result
