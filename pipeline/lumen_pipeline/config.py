"""Pipeline configuration tables (SPEC §4.4, §4.5)."""
from __future__ import annotations

import math

# Alloy densities, g/cm³ (SPEC §4.4). Keys are the alloy codes used in manifests.
DENSITIES_G_CM3: dict[str, float] = {
    "14k_yellow": 13.1,
    "14k_white": 12.9,
    "14k_rose": 13.0,
    "18k_yellow": 15.5,
    "18k_white": 14.7,
    "18k_rose": 15.2,
    "22k_yellow": 17.8,
    "pt950": 20.7,
}

# Filename prefix -> piece type (SPEC §2, §4.5).
PREFIX_TYPES: dict[str, str] = {"b": "bracelet", "r": "ring", "t": "tops"}


def _ring_sizes() -> list[dict]:
    """Indian ring sizes 1–35 with the nearest US size.

    Indian size n has an inner circumference of (39.8 + n) mm (size 1 ≈ 40.8 mm,
    Ø 13.0 mm). US size s has an inner diameter of 11.63 + 0.8128·s mm, in half sizes.
    """
    rows = []
    for n in range(1, 36):
        circ = 39.8 + n
        d = circ / math.pi
        us = round(((d - 11.63) / 0.8128) * 2) / 2
        rows.append({"size_in": n, "circ_mm": round(circ, 2), "inner_d_mm": round(d, 2),
                     "size_us": max(us, 0.0)})
    return rows


RING_SIZES: list[dict] = _ring_sizes()


def ring_size_for(inner_d_mm: float) -> dict:
    """Closest row of RING_SIZES by inner diameter."""
    return min(RING_SIZES, key=lambda r: abs(r["inner_d_mm"] - inner_d_mm))
