"""Puts backend/ on the import path so tests can `from core import ...`
the same way the app does. Run pytest from the repo root."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
