"""Weights, bounding box and surface area (SPEC §4.4)."""
from __future__ import annotations

import numpy as np
import trimesh

from .config import DENSITIES_G_CM3


def weights_g(volume_mm3: float) -> dict[str, float]:
    """Weight per alloy, g (1 mm³ = 1e-3 cm³)."""
    return {k: round(volume_mm3 * d / 1000.0, 4) for k, d in DENSITIES_G_CM3.items()}


def bbox_mm(mesh: trimesh.Trimesh) -> dict:
    lo, hi = mesh.bounds
    return {"min": [round(float(x), 4) for x in lo],
            "max": [round(float(x), 4) for x in hi],
            "size": [round(float(x), 4) for x in (hi - lo)]}


def surface_area_mm2(mesh: trimesh.Trimesh) -> float:
    return round(float(mesh.area), 3)


def measure(mesh: trimesh.Trimesh, volume_mm3: float) -> dict:
    return {"weights_g": weights_g(volume_mm3),
            "bbox_mm": bbox_mm(mesh),
            "surface_mm2": surface_area_mm2(mesh)}
