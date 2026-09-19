"""Ring geometry: closed-loop check, size, band cross-section, head angle (SPEC §4.5)."""
from __future__ import annotations

import numpy as np
import trimesh

from .config import ring_size_for
from .curve import Curve

CLOSED_SPAN_DEG = 330.0
BOTTOM_HALF_WIDTH_DEG = 5
PLAUSIBLE_INNER_D_MM = (11.0, 26.0)


def analyse_ring(mesh: trimesh.Trimesh, curve: Curve) -> tuple[dict, list[str]]:
    warnings: list[str] = []
    if curve.span_deg < CLOSED_SPAN_DEG:
        warnings.append(f"ring: open loop, span {curve.span_deg:.1f}° < {CLOSED_SPAN_DEG:.0f}°")

    inner_d = 2 * curve.inner_radius
    if not PLAUSIBLE_INNER_D_MM[0] <= inner_d <= PLAUSIBLE_INNER_D_MM[1]:
        warnings.append(f"ring: inner Ø {inner_d:.2f} mm outside the plausible range "
                        f"{PLAUSIBLE_INNER_D_MM[0]}–{PLAUSIBLE_INNER_D_MM[1]} mm; check the type")
    size = ring_size_for(inner_d)

    # Head (top) = the bin with the largest radius; the shank bottom sits opposite it.
    mx = curve.bins_max_r
    top_bin = int(np.nanargmax(mx))
    top_angle = float(curve.bin_angle(top_bin))
    bottom_bin = (top_bin + 180) % len(mx)
    idx = [(bottom_bin + k) % len(mx) for k in range(-BOTTOM_HALF_WIDTH_DEG, BOTTOM_HALF_WIDTH_DEG + 1)]
    thickness = mx[idx] - curve.bins_min_r[idx]
    valid = ~np.isnan(thickness)
    if not valid.any():  # open ring: nothing modelled opposite the head
        band_t = float("nan")
        warnings.append("ring: no material opposite the head; band thickness unavailable")
    else:
        band_t = float(np.median(thickness[valid]))

    theta, r, z = curve.frame.polar(mesh.vertices)
    bottom = float(curve.bin_angle(bottom_bin))
    d = np.abs(np.arctan2(np.sin(theta - bottom), np.cos(theta - bottom)))
    near = d <= np.deg2rad(BOTTOM_HALF_WIDTH_DEG)
    band_w = float(z[near].max() - z[near].min()) if near.any() else float("nan")

    ring = {
        "inner_d_mm": round(inner_d, 3),
        "size_in": size["size_in"],
        "size_us": size["size_us"],
        "size_circ_mm": size["circ_mm"],
        "band_w_mm": round(band_w, 3),
        "band_t_mm": round(band_t, 3),
        "top_angle_deg": round(float(np.rad2deg(top_angle) % 360), 2),
    }
    return ring, warnings
