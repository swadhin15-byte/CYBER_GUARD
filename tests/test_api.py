import os

import pytest
from fastapi.testclient import TestClient

os.environ["CYBERGUARD_SEED"] = "0"

from main import app  # noqa: E402
from core import threat_engine  # noqa: E402


@pytest.fixture
def client():
    threat_engine.reset()
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth(client):
    """Log in as the seeded demo user and return {headers, client} for convenience."""
    r = client.post("/api/auth/login", json={"username": "analyst", "password": "cyberguard"})
    assert r.status_code == 200
    token = r.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_health_is_public(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_protected_route_requires_a_token(client):
    assert client.get("/api/stats").status_code == 401
    assert client.get("/api/events").status_code == 401


def test_wrong_password_is_rejected(client):
    r = client.post("/api/auth/login", json={"username": "analyst", "password": "wrong"})
    assert r.status_code == 401


def test_garbage_token_is_rejected(client):
    r = client.get("/api/stats", headers={"Authorization": "Bearer not-a-real-token"})
    assert r.status_code == 401


def test_valid_login_reaches_protected_routes(client, auth):
    r = client.get("/api/stats", headers=auth)
    assert r.status_code == 200


def test_phishing_flows_through_the_pipeline(client, auth):
    r = client.post("/api/analyze/phishing", headers=auth, json={
        "sender": "it@corp-identity-desk.com",
        "subject": "MFA reset approval needed",
        "body": "Reply with the one-time code. Urgent, expires in 10 minutes.",
        "spf_pass": False,
        "domain_age_days": 4,
        "recipient": "helpdesk",
    })
    assert r.status_code == 200
    inc = r.json()

    # every field the dashboard renders
    for key in ("id", "score", "level", "category", "evidence", "explanation",
                "recommended_actions", "status", "alert", "target"):
        assert key in inc
    assert inc["level"] in ("high", "critical")
    assert inc["alert"] is True
    assert inc["target"] == "helpdesk"
    assert len(inc["recommended_actions"]) == 4


def test_action_moves_status_and_is_recorded(client, auth):
    inc = client.post("/api/analyze/phishing", headers=auth, json={
        "sender": "it@corp-identity-desk.com", "subject": "MFA reset",
        "body": "reply with the one-time code, urgent", "spf_pass": False, "domain_age_days": 2,
    }).json()
    assert inc["status"] == "Open"

    after = client.post(f"/api/events/{inc['id']}/action", headers=auth,
                        json={"action": "Quarantine the message"}).json()
    assert after["status"] == "Contained"
    assert "Quarantine the message" in after["actions_taken"]


def test_escalating_action_sets_escalated(client, auth):
    inc = client.post("/api/analyze/deepfake", headers=auth, data={
        "uploader": "finance-ops", "claimed_identity": "CFO",
        "signals": '{"face_boundary_artefacts":0.9,"blink_rate_anomaly":0.85}',
    }, files={"file": ("clip.mp4", b"0000", "video/mp4")}).json()

    after = client.post(f"/api/events/{inc['id']}/action", headers=auth,
                        json={"action": "Report the impersonation"}).json()
    assert after["status"] == "Escalated"


def test_stats_counts_match_events(client, auth):
    client.post("/api/analyze/phishing", headers=auth, json={
        "sender": "it@corp-identity-desk.com", "subject": "MFA reset",
        "body": "reply with the one-time code urgent", "spf_pass": False, "domain_age_days": 2,
    })
    stats = client.get("/api/stats", headers=auth).json()
    assert stats["events_analysed"] == 1
    assert stats["phishing_attempts"] == 1
    assert stats["threats_detected"] == 1
    assert isinstance(stats["categories"], list)


def test_unknown_incident_is_404(client, auth):
    assert client.get("/api/events/CG-does-not-exist", headers=auth).status_code == 404


def test_bad_status_rejected(client, auth):
    inc = client.post("/api/analyze/anomaly", headers=auth, json={"user": "u", "asset": "SSO"}).json()
    assert client.post(f"/api/events/{inc['id']}/status", headers=auth,
                       json={"status": "Banana"}).status_code == 400
