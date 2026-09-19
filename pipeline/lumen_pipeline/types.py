"""Piece type from the filename prefix (SPEC §4.5). The filename itself never leaves the pipeline."""
from __future__ import annotations

from pathlib import Path

from .config import PREFIX_TYPES


def type_from_filename(path: str | Path) -> str:
    name = Path(path).name.strip().lower()
    return PREFIX_TYPES.get(name[:1], "unknown")
