from core.risk_engine import level_for, score_indicators, is_threat


def test_levels_match_thresholds():
    assert level_for(0) == "safe"
    assert level_for(19) == "safe"
    assert level_for(20) == "low"
    assert level_for(45) == "medium"
    assert level_for(68) == "high"
    assert level_for(86) == "critical"
    assert level_for(100) == "critical"


def test_no_indicators_is_safe():
    risk = score_indicators([])
    assert risk.level == "safe"
    assert risk.score < 20


def test_strong_indicators_escalate():
    risk = score_indicators([("Asks for a one-time code", 0.95), ("Lookalike domain", 0.92)])
    assert risk.score >= 86
    assert risk.level == "critical"


def test_first_indicator_carries_more_weight():
    strong_first = score_indicators([("a", 0.9), ("b", 0.3)])
    weak_first = score_indicators([("b", 0.3), ("a", 0.9)])
    assert strong_first.score > weak_first.score


def test_category_multiplier_applies():
    plain = score_indicators([("x", 0.6)])
    ato = score_indicators([("x", 0.6)], category="Account takeover")
    assert ato.score > plain.score


def test_confidence_grows_with_corroboration():
    one = score_indicators([("x", 0.6)])
    many = score_indicators([("x", 0.6), ("y", 0.6), ("z", 0.6)])
    assert many.confidence > one.confidence
    assert abs(many.score - one.score) <= 1  # more evidence, same strength


def test_threat_floor():
    assert not is_threat(44)
    assert is_threat(45)
