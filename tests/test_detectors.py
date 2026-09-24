import pytest

from models.anomaly import detector as anomaly
from models.deepfake import detector as deepfake
from models.phishing import detector as phishing
from core.risk_engine import score_indicators


@pytest.fixture(autouse=True)
def clean_baseline():
    anomaly.reset_baseline()
    yield
    anomaly.reset_baseline()


def test_otp_request_is_the_top_indicator():
    r = phishing.detect(
        sender="it@corp-identity-desk.com",
        subject="MFA reset",
        body="Please reply with the one-time code we sent you. Urgent.",
        spf_pass=False,
        domain_age_days=4,
    )
    assert r["indicators"][0][1] >= 0.9
    assert r["category"] == "Credential harvesting"
    assert score_indicators(r["indicators"], r["category"]).level in ("high", "critical")


def test_legitimate_mail_stays_quiet():
    r = phishing.detect(
        sender="notifications@github.com",
        subject="Weekly digest",
        body="Here is a summary of activity across your repositories.",
        urls=["https://github.com/notifications"],
        spf_pass=True,
    )
    assert score_indicators(r["indicators"], r["category"]).level == "safe"


def test_homoglyph_domain_is_caught():
    r = phishing.detect(sender="support@0ffice365-verify.net", subject="Verify", body="Verify your account")
    labels = " ".join(l for l, _ in r["indicators"]).lower()
    assert "lookalike" in labels


def test_sms_payment_lure_is_not_labelled_bec():
    r = phishing.detect(
        channel="sms",
        sender="+910000011122",
        body="Pay the redelivery fee with your card number to release your parcel.",
        urls=["https://bit.ly/3xk9red"],
    )
    assert r["category"] == "Payment fraud"


def test_impossible_travel_needs_two_events():
    first = anomaly.detect(user="u1", asset="SSO", geo="Kolkata, IN", device_id="d1")
    assert score_indicators(first["indicators"]).level in ("safe", "low", "medium")

    second = anomaly.detect(user="u1", asset="SSO", geo="Ashburn, US", device_id="d2", asn="AS14061")
    labels = " ".join(l for l, _ in second["indicators"]).lower()
    assert "impossible travel" in labels
    assert second["category"] == "Account takeover"


def test_mfa_fatigue_pattern():
    for _ in range(6):
        anomaly.detect(user="u2", asset="VPN", geo="Lagos, NG", device_id="d3", mfa_result="denied")
    final = anomaly.detect(user="u2", asset="VPN", geo="Lagos, NG", device_id="d3", mfa_result="approved")
    labels = " ".join(l for l, _ in final["indicators"]).lower()
    assert "mfa approved after" in labels


def test_session_replay_on_second_device():
    anomaly.detect(user="u3", asset="Payroll", geo="Kolkata, IN", device_id="dA", session_id="s9")
    r = anomaly.detect(user="u3", asset="Payroll", geo="Kolkata, IN", device_id="dB", session_id="s9")
    labels = " ".join(l for l, _ in r["indicators"]).lower()
    assert "second device" in labels


def test_deepfake_video_signals_score_high():
    r = deepfake.detect(
        filename="clip.mp4",
        uploader="finance-ops",
        claimed_identity="CFO",
        signals={"face_boundary_artefacts": 0.9, "blink_rate_anomaly": 0.85, "lip_sync_drift_ms": 130},
    )
    assert r["category"] == "Deepfake media"
    assert score_indicators(r["indicators"], r["category"]).level in ("high", "critical")


def test_clean_media_is_reported_as_verified():
    r = deepfake.detect(filename="townhall.mp4", uploader="comms", signals={"compression_mismatch": 0.05})
    assert r["category"] == "Media verified"
    assert r["indicators"] == []
