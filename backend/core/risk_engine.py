"""Risk scoring.

Takes the weighted indicators produced by a detection module and turns them
into a single 0-100 score plus a risk level. Every module goes through here,
so a score of 70 means the same thing whether it came from phishing, deepfake
or anomaly detection.
"""
from dataclasses import dataclass
from typing import List, Sequence, Tuple

# (label, strength 0..1), strongest signal first
Indicator = Tuple[str, float]

LEVELS: Sequence[Tuple[int, str]] = (
    (86, "critical"),
    (68, "high"),
    (45, "medium"),
    (20, "low"),
    (0, "safe"),
)

# The first indicator a detector returns is its strongest signal, so it carries
# more of the score than the supporting ones.
PRIMARY_WEIGHT = 1.4
SUPPORTING_WEIGHT = 1.0

# Some categories are more damaging when true, so they escalate faster.
CATEGORY_MULTIPLIER = {
    "account takeover": 1.12,
    "business email compromise": 1.10,
    "credential harvesting": 1.08,
    "deepfake media": 1.06,
    "synthetic voice": 1.06,
}


@dataclass
class Risk:
    score: int
    level: str
    confidence: float

    def as_dict(self) -> dict:
        return {"score": self.score, "level": self.level, "confidence": round(self.confidence, 3)}


def level_for(score: int) -> str:
    for threshold, name in LEVELS:
        if score >= threshold:
            return name
    return "safe"


def score_indicators(indicators: List[Indicator], category: str = "") -> Risk:
    """Weighted mean of indicator strengths, nudged by threat category."""
    if not indicators:
        return Risk(score=2, level="safe", confidence=0.4)

    total = 0.0
    weights = 0.0
    for i, (_label, strength) in enumerate(indicators):
        w = PRIMARY_WEIGHT if i == 0 else SUPPORTING_WEIGHT
        total += max(0.0, min(1.0, float(strength))) * w
        weights += w

    base = (total / weights) * 100
    base *= CATEGORY_MULTIPLIER.get(category.lower(), 1.0)

    # More corroborating indicators means more certainty, not a higher score.
    confidence = min(0.98, 0.55 + 0.11 * len(indicators))
    score = int(round(max(1, min(99, base))))
    return Risk(score=score, level=level_for(score), confidence=confidence)


def is_threat(score: int) -> bool:
    """Medium and above counts as a detected threat for the dashboard counters."""
    return score >= 45
