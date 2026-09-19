"""Bracelet segment ends and connectors (SPEC §4.7)."""
from __future__ import annotations

import numpy as np
import trimesh
from shapely.geometry import Polygon
from shapely.ops import unary_union

from .curve import Curve
from .sections import equivalent_diameter, section_polygons, to_world

HOLE_D_MIN, HOLE_D_MAX = 0.6, 3.0
HOLE_NEAR_END_MM = 3.0
SECTION_STEP_MM = 0.25
END_INSET_MM = (0.15, 0.3, 0.5, 0.8, 1.2)  # tried in turn until the section is non-empty
MIN_HOLE_RUN = 2  # a hole must persist over consecutive sections


def _band_radii(curve: Curve) -> tuple[float, float]:
    """Inner radius and band outer radius (heads excluded via a low percentile)."""
    mx = curve.bins_max_r[np.isfinite(curve.bins_max_r)]
    outer = float(np.percentile(mx, 25)) if len(mx) else curve.inner_radius
    return curve.inner_radius, outer


def _end_section(mesh: trimesh.Trimesh, curve: Curve, theta: float, outward: int) -> dict | None:
    """Cross-section on the radial plane just inside an angular extreme."""
    inner, outer = _band_radii(curve)
    r_mid = 0.5 * (inner + outer)
    keep: list[Polygon] = []
    T = np.eye(4)
    radial = curve.frame.direction(theta)
    tangent = outward * np.cross(curve.frame.normal, radial)
    for inset in END_INSET_MM:
        theta_in = theta - outward * inset / max(r_mid, 1e-6)
        radial = curve.frame.direction(theta_in)
        tangent = outward * np.cross(curve.frame.normal, radial)
        _, polys, T = section_polygons(mesh, curve.frame.center, tangent, [0.0])[0]
        keep = []
        for p in polys:
            c3 = to_world(T, [p.centroid.x, p.centroid.y])[0]
            d = c3 - curve.frame.center
            r_xy = np.linalg.norm(d - (d @ curve.frame.normal) * curve.frame.normal)
            if d @ radial > 0 and 0.5 * inner < r_xy < 1.6 * max(outer, inner):
                keep.append(p)
        if keep:
            break
    if not keep:
        return None
    u = unary_union(keep)
    c3 = to_world(T, [u.centroid.x, u.centroid.y])[0]
    return {"center": [round(float(x), 4) for x in c3],
            "tangent": [round(float(x), 4) for x in tangent],
            "theta_deg": round(float(np.rad2deg(theta)), 2),
            "area_mm2": round(float(u.area), 4)}


def _holes_near(mesh: trimesh.Trimesh, curve: Curve, theta_end: float, outward: int) -> list[dict]:
    """Through-holes Ø 0.6–3 mm within 3 mm of an end, seen along the plane normal or the tangent."""
    inner, outer = _band_radii(curve)
    r_mid = 0.5 * (inner + outer)
    radial = curve.frame.direction(theta_end)
    tangent = outward * np.cross(curve.frame.normal, radial)
    span = HOLE_NEAR_END_MM

    # Only jump-ring orientations are considered: holes through the band face (axis =
    # plane normal) and holes along the chain (axis = tangent). Radial openings are stone
    # seats, not connectors, so planes perpendicular to the radial direction are skipped.
    loc = curve.frame.to_local(mesh.vertices)
    w = np.abs(loc[:, 2]).max()
    planes = [(curve.frame.normal, np.arange(-w, w + SECTION_STEP_MM, SECTION_STEP_MM)),
              (tangent, -np.arange(0.0, span + SECTION_STEP_MM, SECTION_STEP_MM))]

    found: dict[tuple, dict] = {}
    for normal, offsets in planes:
        run: dict[tuple, int] = {}
        for _, polys, T in section_polygons(mesh, curve.frame.center, normal, offsets):
            seen: dict[tuple, dict] = {}
            for p in polys:
                for ring in p.interiors:
                    hole = Polygon(ring)
                    d = equivalent_diameter(hole)
                    if not (HOLE_D_MIN <= d <= HOLE_D_MAX):
                        continue
                    cx, cy = hole.centroid.x, hole.centroid.y
                    c3 = to_world(T, [cx, cy])[0]
                    rel = c3 - curve.frame.center
                    th = np.arctan2(rel @ curve.frame.v, rel @ curve.frame.u)
                    arc = abs(np.arctan2(np.sin(th - theta_end), np.cos(th - theta_end))) * r_mid
                    if arc > span:
                        continue
                    # Parallel planes share a 2D frame, so the in-plane centroid identifies
                    # the same hole from one section to the next.
                    key = (round(float(normal[0]), 3), round(cx * 2) / 2, round(cy * 2) / 2)
                    seen[key] = {"d_mm": round(d, 3), "center": [round(float(x), 4) for x in c3],
                                 "arc_from_end_mm": round(float(arc), 3),
                                 "axis": [round(float(x), 4) for x in normal]}
            run = {k: run.get(k, 0) + 1 for k in seen}
            for k, h in seen.items():
                if run[k] >= MIN_HOLE_RUN:
                    found.setdefault(k, h)
    return list(found.values())


def segment_ends(mesh: trimesh.Trimesh, curve: Curve) -> dict:
    """Both ends, the connector guess, and the segment chord / arc length at the mid radius."""
    inner, outer = _band_radii(curve)
    r_mid = 0.5 * (inner + outer)
    span_rad = np.deg2rad(curve.span_deg)
    ends = []
    holes = []
    for theta, outward in ((curve.start_rad, -1), (curve.end_rad, +1)):
        e = _end_section(mesh, curve, theta, outward)
        h = _holes_near(mesh, curve, theta, outward)
        if e is not None:
            e["connector"] = "hole" if h else "butt"
            e["holes"] = h[:4]
            ends.append(e)
        holes.extend(h)
    connector = "hole" if holes else "butt"
    return {"chord_mm": round(float(2 * r_mid * np.sin(span_rad / 2)), 4),
            "arc_len_mm": round(float(r_mid * span_rad), 4),
            "mid_radius_mm": round(float(r_mid), 4),
            "band_t_mm": round(float(outer - inner), 4),
            "ends": ends,
            "connector": connector}
