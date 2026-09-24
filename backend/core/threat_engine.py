"""Unified threat analysis pipeline.

Incidents are stored in PostgreSQL so they survive backend restarts.
"""

from __future__ import annotations

import time
from typing import Dict, List, Optional

from psycopg.types.json import Jsonb

from core.risk_engine import Indicator, is_threat, score_indicators
from database import get_connection


MODULES = {
    "phishing": "Phishing detection",
    "impersonation": "Impersonation detection",
    "anomaly": "Anomaly detection",
}


RESPONSE_PLAYBOOK: Dict[str, List[str]] = {
    "phishing": [
        "Quarantine the message",
        "Block the sending domain",
        "Warn the recipient",
        "Notify the SOC",
    ],
    "impersonation": [
        "Send for manual verification",
        "Report the impersonation",
        "Warn the named executive",
        "Escalate to investigation",
    ],
    "anomaly": [
        "Revoke the active session",
        "Require step-up authentication",
        "Block the source address",
        "Notify the account owner",
    ],
}


ESCALATING_ACTIONS = {
    "Report the impersonation",
    "Escalate to investigation",
}


def _next_id() -> str:
    """Generate a unique CyberGuard incident ID."""
    return f"CG-{int(time.time() * 1000)}"


def _initial_status(score: int) -> str:
    if score >= 68:
        return "Open"
    if score >= 45:
        return "Monitoring"
    return "Closed"


def _row_to_incident(row) -> dict:
    """Convert a PostgreSQL row into the dictionary expected by the API."""

    return {
        "id": row[0],
        "module": row[1],
        "module_name": row[2],
        "subject": row[3],
        "actor": row[4],
        "category": row[5],
        "score": row[6],
        "level": row[7],
        "confidence": float(row[8]) if row[8] is not None else 0.0,
        "evidence": row[9] or [],
        "explanation": row[10],
        "recommended_actions": row[11] or [],
        "actions_taken": row[12] or [],
        "alert": row[13],
        "status": row[14],
        "target": row[15],
        "source": row[16],
        "ts": row[17],
        "raw": row[18] or {},
    }


def analyse(
    module: str,
    subject: str,
    actor: str,
    indicators: List[Indicator],
    category: str,
    explanation: str,
    target: str = "",
    source: str = "",
    ts: Optional[float] = None,
    raw: Optional[dict] = None,
) -> dict:
    """Run detection result through classification, risk, XAI and response."""

    if module not in MODULES:
        raise ValueError(f"unknown module: {module}")

    risk = score_indicators(indicators, category)

    incident = {
        "id": _next_id(),
        "module": module,
        "module_name": MODULES[module],
        "subject": subject,
        "actor": actor,
        "category": category,
        "score": risk.score,
        "level": risk.level,
        "confidence": round(risk.confidence, 3),
        "evidence": [
            {
                "label": label,
                "weight": round(float(weight), 3),
            }
            for label, weight in indicators
        ],
        "explanation": explanation,
        "recommended_actions": RESPONSE_PLAYBOOK[module],
        "actions_taken": [],
        "alert": is_threat(risk.score),
        "status": _initial_status(risk.score),
        "target": target or actor,
        "source": source,
        "ts": ts if ts is not None else time.time(),
        "raw": raw or {},
    }

    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO incidents (
                    id,
                    module,
                    module_name,
                    subject,
                    actor,
                    category,
                    score,
                    level,
                    confidence,
                    evidence,
                    explanation,
                    recommended_actions,
                    actions_taken,
                    alert,
                    status,
                    target,
                    source,
                    ts,
                    raw
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                """,
                (
                    incident["id"],
                    incident["module"],
                    incident["module_name"],
                    incident["subject"],
                    incident["actor"],
                    incident["category"],
                    incident["score"],
                    incident["level"],
                    incident["confidence"],
                    Jsonb(incident["evidence"]),
                    incident["explanation"],
                    Jsonb(incident["recommended_actions"]),
                    Jsonb(incident["actions_taken"]),
                    incident["alert"],
                    incident["status"],
                    incident["target"],
                    incident["source"],
                    incident["ts"],
                    Jsonb(incident["raw"]),
                ),
            )

        conn.commit()

    finally:
        conn.close()

    return incident


def list_incidents(
    module: Optional[str] = None,
    min_score: int = 0,
    limit: int = 300,
) -> List[dict]:

    conn = get_connection()

    try:
        with conn.cursor() as cur:

            if module:
                cur.execute(
                    """
                    SELECT
                        id, module, module_name, subject, actor,
                        category, score, level, confidence,
                        evidence, explanation,
                        recommended_actions, actions_taken,
                        alert, status, target, source, ts, raw
                    FROM incidents
                    WHERE module = %s
                      AND score >= %s
                    ORDER BY ts DESC
                    LIMIT %s
                    """,
                    (module, min_score, limit),
                )
            else:
                cur.execute(
                    """
                    SELECT
                        id, module, module_name, subject, actor,
                        category, score, level, confidence,
                        evidence, explanation,
                        recommended_actions, actions_taken,
                        alert, status, target, source, ts, raw
                    FROM incidents
                    WHERE score >= %s
                    ORDER BY ts DESC
                    LIMIT %s
                    """,
                    (min_score, limit),
                )

            rows = cur.fetchall()

        return [_row_to_incident(row) for row in rows]

    finally:
        conn.close()


def get_incident(incident_id: str) -> Optional[dict]:

    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id, module, module_name, subject, actor,
                    category, score, level, confidence,
                    evidence, explanation,
                    recommended_actions, actions_taken,
                    alert, status, target, source, ts, raw
                FROM incidents
                WHERE id = %s
                """,
                (incident_id,),
            )

            row = cur.fetchone()

        if row is None:
            return None

        return _row_to_incident(row)

    finally:
        conn.close()


def apply_action(
    incident_id: str,
    action: str,
) -> Optional[dict]:

    incident = get_incident(incident_id)

    if incident is None:
        return None

    actions_taken = incident["actions_taken"]

    if action not in actions_taken:
        actions_taken.append(action)

    status = incident["status"]

    if status == "Open":
        if action in ESCALATING_ACTIONS:
            status = "Escalated"
        else:
            status = "Contained"

    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE incidents
                SET
                    actions_taken = %s,
                    status = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (
                    Jsonb(actions_taken),
                    status,
                    incident_id,
                ),
            )

        conn.commit()

    finally:
        conn.close()

    return get_incident(incident_id)


def set_status(
    incident_id: str,
    status: str,
) -> Optional[dict]:

    incident = get_incident(incident_id)

    if incident is None:
        return None

    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE incidents
                SET
                    status = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (status, incident_id),
            )

        conn.commit()

    finally:
        conn.close()

    return get_incident(incident_id)


def stats() -> dict:
    """Dashboard statistics for the last 24 hours."""

    window = time.time() - 86400

    incidents = list_incidents(limit=10000)

    day = [
        incident
        for incident in incidents
        if incident["ts"] >= window
    ]

    threats = [
        incident
        for incident in day
        if is_threat(incident["score"])
    ]

    categories: Dict[str, int] = {}
    targets: Dict[str, dict] = {}

    for incident in threats:

        category = incident["category"]

        categories[category] = categories.get(category, 0) + 1

        target = incident["target"]

        item = targets.setdefault(
            target,
            {
                "count": 0,
                "peak": 0,
            },
        )

        item["count"] += 1
        item["peak"] = max(
            item["peak"],
            incident["score"],
        )

    return {
        "events_analysed": len(day),

        "threats_detected": len(threats),

        "critical": len(
            [
                incident
                for incident in day
                if incident["score"] >= 86
            ]
        ),

        "phishing_attempts": len(
            [
                incident
                for incident in threats
                if incident["module"] == "phishing"
            ]
        ),

        "impersonation_attempts": len(
            [
                incident
                for incident in threats
                if incident["module"] == "impersonation"
            ]
        ),

        "suspected_deepfakes": len(
            [
                incident
                for incident in threats
                if incident["category"]
                in ("Deepfake media", "Synthetic voice")
            ]
        ),

        "account_takeover": len(
            [
                incident
                for incident in threats
                if incident["category"] == "Account takeover"
            ]
        ),

        "open_incidents": len(
            [
                incident
                for incident in incidents
                if incident["status"] == "Open"
            ]
        ),

        "categories": [
            {
                "name": name,
                "count": count,
            }
            for name, count in sorted(
                categories.items(),
                key=lambda item: -item[1],
            )
        ],

        "targets": [
            {
                "name": name,
                "count": value["count"],
                "peak": value["peak"],
            }
            for name, value in sorted(
                targets.items(),
                key=lambda item: (
                    -item[1]["count"],
                    -item[1]["peak"],
                ),
            )
        ][:7],
    }


def reset() -> None:
    """Delete all stored incidents."""

    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM incidents")

        conn.commit()

    finally:
        conn.close()