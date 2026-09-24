"""Module 2 — deepfake and digital impersonation detection.

Phase 3 deliverable. Real detection needs frame-level and spectral analysis;
that work belongs in notebooks/ and lands here as `_model_signals()`.

Until then this module scores the signals that can be computed cheaply or are
supplied by the caller, and is explicit about which are measured and which are
asserted. Being honest about that matters — a demo that claims frame analysis
it did not run is worse than one that says the analysis is pending.
"""
from __future__ import annotations

import os
from typing import Dict, List, Tuple

Indicator = Tuple[str, float]

VIDEO_EXT = {".mp4", ".mov", ".webm", ".avi", ".mkv"}
AUDIO_EXT = {".wav", ".mp3", ".m4a", ".ogg", ".flac"}
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic"}

# Signals the real model should produce, with the weight each carries once
# measured. The keys are what `signals` accepts from the caller or the model.
SIGNAL_WEIGHTS: Dict[str, Tuple[str, float]] = {
    "face_boundary_artefacts": ("Face boundary artefacts on head turn", 0.90),
    "blink_rate_anomaly": ("Blink rate outside natural range", 0.82),
    "lip_sync_drift_ms": ("Lip sync drift", 0.76),
    "compression_mismatch": ("Compression history inconsistent with claimed source", 0.58),
    "synthetic_prosody": ("Synthetic prosody markers", 0.87),
    "missing_room_reverb": ("Absent room reverberation", 0.72),
    "spectral_gap_high_freq": ("Spectral gaps above 12 kHz", 0.80),
    "face_embedding_match": ("Face matches a staff directory entry", 0.94),
    "image_previously_indexed": ("Image previously indexed elsewhere", 0.67),
    "generative_noise_fingerprint": ("Generative noise fingerprint", 0.71),
    "lighting_inconsistency": ("Lighting inconsistent across subject", 0.63),
    "account_age_days": ("Account created recently", 0.52),
}


def media_kind(filename: str) -> str:
    ext = os.path.splitext(filename or "")[1].lower()
    if ext in VIDEO_EXT:
        return "video"
    if ext in AUDIO_EXT:
        return "audio"
    if ext in IMAGE_EXT:
        return "image"
    return "unknown"


def _classify(kind: str, signals: Dict[str, float], flagged: bool = True) -> str:
    if not flagged:
        return "Media verified"
    if signals.get("face_embedding_match"):
        return "Identity impersonation"
    if kind == "audio":
        return "Synthetic voice"
    if kind in ("video", "image"):
        return "Deepfake media"
    return "Impersonation"


def _model_signals(path: str, kind: str) -> Dict[str, float]:
    """Hook for the trained authenticity models (phase 3).

    Video: per-frame face crops through an EfficientNet/Xception detector,
    plus blink-interval and lip-sync alignment.
    Audio: mel-spectrogram through an anti-spoofing model (ASVspoof style).
    Image: face embedding compared against the staff directory, plus a
    generative-noise residual check.

    Return a dict keyed by SIGNAL_WEIGHTS. Empty means not yet trained.
    """
    return {}


def detect(
    filename: str = "",
    path: str = "",
    uploader: str = "",
    claimed_identity: str = "",
    duration_s: float | None = None,
    signals: Dict[str, float] | None = None,
) -> dict:
    """Analyse one image, video or audio file.

    `signals` lets a caller (or a test fixture, or the demo seeder) supply
    measurements directly. Anything the trained model returns overrides them.
    """
    kind = media_kind(filename)
    measured = dict(signals or {})
    measured.update(_model_signals(path, kind))

    indicators: List[Indicator] = []
    for key, value in measured.items():
        if key not in SIGNAL_WEIGHTS:
            continue
        label, weight = SIGNAL_WEIGHTS[key]
        if key == "lip_sync_drift_ms":
            if float(value) < 60:
                continue
            strength = min(1.0, float(value) / 200) * weight
            label = f"{label} of {int(value)} ms"
        elif key == "account_age_days":
            if float(value) > 14:
                continue
            strength = weight
            label = f"Account created {int(value)} days ago"
        else:
            strength = float(value) * weight if 0 <= float(value) <= 1 else weight
        if strength >= 0.15:
            indicators.append((label, round(strength, 3)))

    indicators.sort(key=lambda i: -i[1])
    indicators = indicators[:5]

    if indicators:
        explanation = (
            "Authenticity analysis of this "
            + (kind if kind != "unknown" else "file")
            + " found "
            + ", ".join(label.lower() for label, _ in indicators[:3])
            + ". Treat the media as unverified until a person confirms it through a second channel."
        )
    else:
        explanation = (
            "No manipulation signals were measured. Either the media is authentic or the "
            "authenticity model has not been loaded yet — check which before clearing it."
        )

    if indicators:
        subject = {
            "video": "Video clip flagged for manipulation",
            "audio": "Voice recording flagged as possibly synthetic",
            "image": "Image flagged for identity misuse",
        }.get(kind, "Media flagged for verification")
    else:
        subject = {
            "video": "Video clip checked, no manipulation found",
            "audio": "Voice recording checked, no synthesis found",
            "image": "Image checked, no manipulation found",
        }.get(kind, "Media checked")
    if claimed_identity:
        subject = f"{subject.rstrip('.')} — claims to be {claimed_identity}"

    detail = filename or "uploaded media"
    if duration_s:
        detail += f" · {int(duration_s // 60):02d}:{int(duration_s % 60):02d}"

    return {
        "module": "impersonation",
        "subject": subject,
        "actor": f"Uploaded by {uploader or 'unknown'} · {detail}",
        "category": _classify(kind, measured, bool(indicators)),
        "indicators": indicators,
        "explanation": explanation,
        "source": "Media intake",
        "target": claimed_identity or uploader,
    }
