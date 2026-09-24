"""Module 3 — technical threat and abnormal behaviour detection.

Phase 4 deliverable. Works on normalised log events. The baseline below is
behavioural and stateful: it remembers where and when each account is usually
active, which is what makes impossible travel and off-hours access detectable
without a trained model.

`_model_score()` is where an IsolationForest / autoencoder over the same
feature vector plugs in.
"""
from __future__ import annotations

import math
import time
from collections import defaultdict, deque
from typing import Deque, Dict, List, Tuple

Indicator = Tuple[str, float]

# Rough city coordinates for the demo. In production, resolve IP -> geo with a
# real database (MaxMind or equivalent) before this module is called.
GEO: Dict[str, Tuple[float, float]] = {
    "Kolkata, IN": (22.57, 88.36),
    "Bengaluru, IN": (12.97, 77.59),
    "Mumbai, IN": (19.08, 72.88),
    "Singapore, SG": (1.35, 103.82),
    "Frankfurt, DE": (50.11, 8.68),
    "Ashburn, US": (39.04, -77.49),
    "Lagos, NG": (6.52, 3.38),
    "Moscow, RU": (55.76, 37.62),
}
MAX_TRAVEL_KMH = 900.0  # a commercial flight, generously rounded up

# Hosting / VPN networks. Real deployments pull this from an ASN feed.
HOSTING_ASNS = {"AS14061", "AS16509", "AS14618", "AS16276", "AS9009", "AS49981"}

_history: Dict[str, Deque[dict]] = defaultdict(lambda: deque(maxlen=50))
_known_devices: Dict[str, set] = defaultdict(set)
_mfa_denials: Dict[str, int] = defaultdict(int)


def reset_baseline() -> None:
    _history.clear()
    _known_devices.clear()
    _mfa_denials.clear()


def _km(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def _classify(labels: List[str], action: str) -> str:
    joined = " ".join(labels).lower()
    if "impossible travel" in joined or "session" in joined or "mfa" in joined or "token" in joined:
        return "Account takeover"
    if "spray" in joined or "brute" in joined:
        return "Credential attack"
    return "Abnormal behaviour"


def _model_score(features: Dict[str, float]) -> float | None:
    """Hook for the unsupervised model (phase 4).

    Fit IsolationForest on the same feature dict over a clean baseline window,
    persist with joblib, load here and return a normalised 0..1 anomaly score.
    """
    return None


def detect(
    user: str = "",
    asset: str = "",
    action: str = "login",
    ip: str = "",
    asn: str = "",
    geo: str = "",
    device_id: str = "",
    ts: float | None = None,
    session_id: str = "",
    mfa_result: str = "",
    failed_accounts: int = 0,
    volume: float = 0.0,
    baseline_volume: float = 0.0,
    usual_hours: Tuple[int, int] = (8, 20),
) -> dict:
    """Analyse one normalised log event."""
    ts = ts or time.time()
    indicators: List[Indicator] = []
    reasons: List[str] = []
    key = user or ip

    prev = _history[key][-1] if _history[key] else None

    # --- impossible travel --------------------------------------------------
    if prev and geo and prev.get("geo") and geo != prev["geo"]:
        a, b = GEO.get(prev["geo"]), GEO.get(geo)
        if a and b:
            hours = max((ts - prev["ts"]) / 3600, 1 / 60)
            speed = _km(a, b) / hours
            if speed > MAX_TRAVEL_KMH:
                mins = int((ts - prev["ts"]) / 60)
                indicators.append((f"Impossible travel: {prev['geo']} to {geo} in {mins} min", 0.93))
                reasons.append(
                    f"two successful sessions {mins} minutes apart from places that cannot be travelled between"
                )

    # --- device and network -------------------------------------------------
    if device_id and device_id not in _known_devices[key]:
        if _known_devices[key]:
            indicators.append(("New device fingerprint", 0.70))
        _known_devices[key].add(device_id)
    if asn and asn.upper() in HOSTING_ASNS:
        indicators.append(("Source is a hosting or VPN network", 0.64))
        reasons.append("the source address belongs to a hosting provider rather than a consumer ISP")

    # --- credential attacks -------------------------------------------------
    if failed_accounts >= 15:
        indicators.append((f"Single source failing against {failed_accounts} accounts", 0.89))
        reasons.append("one source tried a small set of passwords across many accounts")

    # --- MFA abuse ----------------------------------------------------------
    if mfa_result == "denied":
        _mfa_denials[key] += 1
    elif mfa_result == "approved":
        if _mfa_denials[key] >= 5:
            indicators.append((f"MFA approved after {_mfa_denials[key]} denials", 0.91))
            reasons.append("the user denied repeated push prompts before approving one, the fatigue pattern")
        _mfa_denials[key] = 0

    # --- session replay -----------------------------------------------------
    if session_id and prev and prev.get("session_id") == session_id:
        if device_id and prev.get("device_id") and device_id != prev["device_id"]:
            indicators.append(("Session token seen on a second device", 0.88))
            reasons.append("one session identifier appeared on two device fingerprints with no re-authentication")

    # --- timing and volume --------------------------------------------------
    hour = time.localtime(ts).tm_hour
    if not (usual_hours[0] <= hour < usual_hours[1]):
        indicators.append((f"Activity at {hour:02d}:00, outside the learned window", 0.74))
    if baseline_volume and volume > baseline_volume * 3:
        factor = int(volume / baseline_volume)
        indicators.append((f"Volume {factor}x the daily baseline", 0.86))
        reasons.append(f"the account moved {factor} times its usual volume")

    ml = _model_score({"volume": volume, "hour": hour, "failed_accounts": failed_accounts})
    if ml is not None:
        indicators.insert(0, ("Anomaly model score", float(ml)))

    _history[key].append({"ts": ts, "geo": geo, "device_id": device_id, "session_id": session_id})

    indicators.sort(key=lambda i: -i[1])
    indicators = indicators[:5]

    subject = {
        "login": f"{action.title()} on {asset or 'unknown asset'}",
    }.get(action, f"{action.replace('_', ' ').title()} on {asset or 'unknown asset'}")
    if indicators:
        subject = indicators[0][0] if len(indicators[0][0]) > 24 else f"{subject} — {indicators[0][0].lower()}"

    explanation = (
        "Flagged because " + "; ".join(reasons[:3]) + "."
        if reasons
        else (
            "Behaviour matches this account's baseline for location, device, timing and volume."
            if not indicators
            else "Flagged on the combination of behavioural indicators listed below."
        )
    )

    return {
        "module": "anomaly",
        "subject": subject,
        "actor": f"{user or ip} · {asset or 'unknown asset'}" + (f" · {geo}" if geo else ""),
        "category": _classify([i[0] for i in indicators], action),
        "indicators": indicators,
        "explanation": explanation,
        "source": "Log collector",
        "target": asset or user,
    }
