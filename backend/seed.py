"""Demo seeder.

Replays the sample events in data/ through the real detectors so the dashboard
opens with 24 hours of history. Nothing here is special-cased: every incident
on screen came out of the same pipeline a live event would.

Turn it off with CYBERGUARD_SEED=0.
"""
from __future__ import annotations

import json
import random
import time
from pathlib import Path
from typing import List

from core import threat_engine
from models.anomaly import detector as anomaly
from models.deepfake import detector as deepfake
from models.phishing import detector as phishing

DATA = Path(__file__).resolve().parent.parent / "data"


def _only(sample: dict, fn) -> dict:
    """Drop keys the detector does not accept, so a stray field in a sample
    file cannot take the whole seeder down."""
    allowed = fn.__code__.co_varnames[: fn.__code__.co_argcount]
    return {k: v for k, v in sample.items() if k in allowed}


def _load(name: str) -> List[dict]:
    path = DATA / name
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


def seed_demo_events(count: int = 60, hours: int = 24) -> int:
    rng = random.Random(20260919)
    phish = _load("phishing/samples.jsonl")
    media = _load("deepfake/samples.jsonl")
    logs = _load("anomaly/samples.jsonl")
    if not (phish or media or logs):
        return 0

    now = time.time()
    made = 0
    for _ in range(count):
        ts = now - rng.uniform(60, hours * 3600)
        roll = rng.random()
        if roll < 0.45 and phish:
            sample = dict(rng.choice(phish))
            recipient = sample.pop("recipient", "")
            result = phishing.detect(**_only(sample, phishing.detect))
            target = recipient
        elif roll < 0.7 and media:
            sample = dict(rng.choice(media))
            result = deepfake.detect(**_only(sample, deepfake.detect))
            target = result.get("target", "")
        elif logs:
            sample = dict(rng.choice(logs))
            sample["ts"] = ts
            result = anomaly.detect(**_only(sample, anomaly.detect))
            target = result.get("target", "")
        else:
            continue

        threat_engine.analyse(
            module=result["module"],
            subject=result["subject"],
            actor=result["actor"],
            indicators=result["indicators"],
            category=result["category"],
            explanation=result["explanation"],
            target=target,
            source=result.get("source", ""),
            ts=ts,
        )
        made += 1
    return made
