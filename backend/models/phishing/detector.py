"""Module 1 — phishing and social engineering detection.

Phase 2 deliverable. This is a rule/feature baseline that runs with no model
file, so the pipeline is demonstrable from day one. Each rule returns a
(label, strength) indicator, which is exactly the shape a trained classifier's
feature attribution should return — so swapping in the real model later does
not change anything downstream.

To plug in a trained model, implement `_model_score()` and merge its output
into `indicators` before returning.
"""
from __future__ import annotations

import re
from typing import Dict, List, Tuple
from urllib.parse import urlparse

Indicator = Tuple[str, float]

URGENCY = re.compile(
    r"\b(urgent|immediately|within \d+ ?(hours|hrs|minutes)|before \d{1,2}[:.]\d{2}|"
    r"final notice|last warning|expires today|act now|overdue)\b",
    re.I,
)
CREDENTIAL = re.compile(
    r"\b(verify your (account|identity)|confirm your password|sign in to (continue|avoid)|"
    r"re-?activate|validate your (mailbox|account)|update your credentials)\b",
    re.I,
)
OTP_REQUEST = re.compile(
    r"\b(one[- ]time (code|passcode|password)|otp|2fa code|mfa code|security code)\b.{0,60}"
    r"\b(share|send|read|provide|reply|confirm)\b|"
    r"\b(share|send|read|provide|reply with)\b.{0,60}\b(one[- ]time|otp|2fa|mfa|security) code\b",
    re.I,
)
PAYMENT = re.compile(
    r"\b(bank details|account number|iban|swift|wire transfer|remit|invoice|payment details|"
    r"card number|cvv)\b",
    re.I,
)
THREAT = re.compile(
    r"\b(deactivat|suspend|clos(e|ing) your account|lose access|legal action|terminat)\w*\b", re.I
)

# TLDs that carry disproportionate abuse volume relative to legitimate traffic.
RISKY_TLDS = {"biz", "top", "xyz", "app", "click", "zip", "live", "icu", "rest", "cfd"}
SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "rb.gy", "is.gd", "cutt.ly"}

# Brands worth checking for lookalike spelling. Extend from your own tenant.
BRANDS = [
    "microsoft", "office365", "outlook", "google", "paypal", "amazon", "apple",
    "okta", "dropbox", "linkedin", "netflix", "hdfc", "sbi", "icici",
]
HOMOGLYPHS = str.maketrans({"0": "o", "1": "l", "3": "e", "5": "s", "4": "a", "@": "a", "$": "s"})

IP_HOST = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")


def _host(url: str) -> str:
    try:
        netloc = urlparse(url if "//" in url else "//" + url).netloc.lower()
        return netloc.split("@")[-1].split(":")[0]
    except ValueError:
        return ""


def _registrable(host: str) -> str:
    parts = host.split(".")
    return ".".join(parts[-2:]) if len(parts) >= 2 else host


def _lookalike(host: str) -> str | None:
    """Return the impersonated brand if the host is a near-miss for it.

    Two passes: the host as written, and the host with homoglyph substitutions
    undone. Digits are substituted in the brand too, so `0ffice365` still
    matches `office365` once both sides are normalised the same way.
    """
    raw = re.sub(r"[^a-z0-9]", "", host.lower())
    folded = re.sub(r"[^a-z0-9]", "", host.lower().translate(HOMOGLYPHS))
    for brand in BRANDS:
        if host.endswith(f"{brand}.com") or host.endswith(f"{brand}.net"):
            continue  # the real thing, not an imitation
        brand_folded = brand.translate(HOMOGLYPHS)
        if brand in raw or brand_folded in folded:
            return brand
    return None


def _classify(indicator_labels: List[str], body: str, channel: str) -> str:
    joined = " ".join(indicator_labels).lower()
    if "one-time code" in joined or "credential" in joined or "login form" in joined:
        return "Credential harvesting"
    if "payment or bank detail" in joined:
        # Invoice and bank-detail fraud over email is BEC; the same lure over
        # SMS is consumer payment fraud, not a compromise of the business.
        return "Business email compromise" if channel == "email" else "Payment fraud"
    return "Phishing / social engineering"


def _model_score(text: str) -> float | None:
    """Hook for the trained classifier (phase 2).

    Load a joblib model from backend/models/phishing/model.joblib and return a
    probability in 0..1. Returning None means 'not trained yet' and the
    baseline rules carry the decision on their own.
    """
    return None


def detect(
    channel: str = "email",
    sender: str = "",
    reply_to: str = "",
    subject: str = "",
    body: str = "",
    urls: List[str] | None = None,
    link_text: Dict[str, str] | None = None,
    spf_pass: bool | None = None,
    sender_first_seen: bool = False,
    domain_age_days: int | None = None,
) -> dict:
    """Analyse one message or URL.

    Returns the module contract every detector shares:
        {subject, actor, category, indicators, explanation, source, target}
    """
    urls = urls or []
    link_text = link_text or {}
    text = f"{subject}\n{body}"
    indicators: List[Indicator] = []
    reasons: List[str] = []

    sender_domain = _host(sender.split("@")[-1]) if "@" in sender else _host(sender)
    hosts = [_host(u) for u in urls if _host(u)]

    # --- domain and URL features -------------------------------------------
    for host in {h for h in hosts + ([sender_domain] if sender_domain else [])}:
        brand = _lookalike(host)
        if brand:
            indicators.append((f"Lookalike domain imitating {brand}", 0.92))
            reasons.append(f"the host {host} is a near-miss spelling of {brand}")
            break

    if domain_age_days is not None and domain_age_days <= 30:
        indicators.append((f"Domain registered {domain_age_days} days ago", 0.88))
        reasons.append("the sending domain was registered within the last month")

    for host in hosts:
        tld = host.rsplit(".", 1)[-1]
        if IP_HOST.match(host):
            indicators.append(("Link points at a raw IP address", 0.8))
            reasons.append("a link resolves to a bare IP rather than a hostname")
            break
        if host in SHORTENERS:
            indicators.append(("Shortlink hides the destination", 0.61))
            reasons.append("the destination is hidden behind a shortener")
            break
        if tld in RISKY_TLDS:
            indicators.append((f"High-abuse top level domain (.{tld})", 0.55))
            break

    for shown, actual in link_text.items():
        if _registrable(_host(shown)) and _registrable(_host(shown)) != _registrable(_host(actual)):
            indicators.append(("Link text does not match target host", 0.81))
            reasons.append("the visible link and its destination disagree")
            break

    # --- sender authenticity -----------------------------------------------
    if spf_pass is False:
        indicators.append(("Sender fails SPF for the claimed domain", 0.69))
        reasons.append("the sender fails SPF for the domain it claims")
    if reply_to and _registrable(_host(reply_to.split("@")[-1])) != _registrable(sender_domain):
        indicators.append(("Reply-to differs from sender", 0.71))
        reasons.append("replies would go to a different domain than the sender")
    if sender_first_seen:
        indicators.append(("First contact from this domain", 0.5))

    # --- language and intent ------------------------------------------------
    if OTP_REQUEST.search(text):
        indicators.append(("Asks the recipient to share a one-time code", 0.95))
        reasons.append("it asks the recipient to hand over a one-time code, which no real process does")
    if CREDENTIAL.search(text):
        indicators.append(("Credential request language", 0.85))
    if PAYMENT.search(text):
        indicators.append(("Payment or bank detail change requested", 0.79))
    if URGENCY.search(text):
        indicators.append(("Urgency and deadline pressure", 0.74))
    if THREAT.search(text):
        indicators.append(("Threat of account loss", 0.63))

    score_hint = _model_score(text)
    if score_hint is not None:
        indicators.insert(0, ("Classifier probability", float(score_hint)))

    indicators.sort(key=lambda i: -i[1])
    indicators = indicators[:6]

    if indicators:
        explanation = (
            "Flagged because " + "; ".join(reasons[:3]) + "."
            if reasons
            else "Flagged on the combination of indicators listed below."
        )
    else:
        explanation = "No phishing indicators matched. Sender, links and language all look ordinary."

    return {
        "module": "phishing",
        "subject": subject or (urls[0] if urls else "Message inspected"),
        "actor": sender or (urls[0] if urls else "unknown sender"),
        "category": _classify([i[0] for i in indicators], body, channel),
        "indicators": indicators,
        "explanation": explanation,
        "source": {"email": "SMTP gateway", "sms": "SMS gateway", "url": "URL scanner"}.get(channel, "SMTP gateway"),
        "target": "",
    }
