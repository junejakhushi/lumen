"""Settings (heads), prongs and inferred stones (SPEC §4.6).

The per-angle maximum-radius profile of a bracelet or ring gives protrusions of at least
HEAD_MIN_RISE_MM above the band: those are the heads. Each head's axis is radial. Cutting
it with planes perpendicular to that axis every SECTION_STEP_MM gives the prongs: k equal-angle
islands on a common circle, held for at least PRONG_MIN_RUN_MM.
"""
from __future__ import annotations

import numpy as np
import trimesh

from .curve import Curve
from .sections import equivalent_diameter, section_polygons, to_world

HEAD_MIN_RISE_MM = 1.0
HEAD_MIN_BINS = 2  # a head must occupy at least this many 1° bins
HEAD_MERGE_GAP_BINS = 2  # the gallery between a head's own prongs dips below the threshold
AXIS_REFINE_ROUNDS = 2   # a profile run sits between prongs; the true axis is found from them
DEDUPE_MM = 1.2          # refined origins closer than this are the same head
SECTION_STEP_MM = 0.1
PRONG_COUNTS = (2, 3, 4, 6)
PRONG_MIN_RUN_MM = 0.8
PRONG_D_MM = (0.3, 2.5)
NEAR_AXIS_MM = 3.5  # islands further from the head axis than this belong to a neighbour
RADIUS_TOL = 0.22  # spread of island distances accepted as "a common circle"
ANGLE_TOL_DEG = 18.0  # spread of island angles accepted as "equal-angle"
STONE_CLEARANCE_MM = 0.06  # SPEC: d = 2·r_in + 0.06
STONE_SNAP_MM = 0.05
CARAT_K = 0.0061 * 0.61  # round brilliant: ct ≈ 0.0061·d²·(0.61·d)
ARRAY_MIN_HEADS = 3
ARRAY_SPACING_TOL_DEG = 2.0


def stone_from_r_in(r_in_mm: float) -> tuple[float, float]:
    """Stone diameter (snapped to 0.05 mm) and round-brilliant carat estimate."""
    d = 2 * r_in_mm + STONE_CLEARANCE_MM
    d = round(d / STONE_SNAP_MM) * STONE_SNAP_MM
    return round(d, 3), round(CARAT_K * d ** 3, 4)


def _head_runs(profile: np.ndarray, band_r: float) -> list[list[int]]:
    """Contiguous (circular) runs of bins rising at least HEAD_MIN_RISE_MM above the band."""
    raised = np.nan_to_num(profile, nan=-np.inf) >= band_r + HEAD_MIN_RISE_MM
    if not raised.any():
        return []
    n = len(raised)
    start = 0
    if raised.all():
        return [list(range(n))]
    while raised[start]:  # rotate so a run never wraps the array end
        start = (start + 1) % n
    runs, current = [], []
    for k in range(n):
        i = (start + k) % n
        if raised[i]:
            current.append(i)
        elif current:
            runs.append(current)
            current = []
    if current:
        runs.append(current)
    merged: list[list[int]] = []
    for run in runs:
        if merged and (run[0] - merged[-1][-1] - 1) % n <= HEAD_MERGE_GAP_BINS:
            merged[-1] = merged[-1] + list(range(merged[-1][-1] + 1, run[0])) + run
        else:
            merged.append(run)
    return [r for r in merged if len(r) >= HEAD_MIN_BINS]


def _islands(polys, T, axis_pt_2d) -> list[dict]:
    out = []
    for p in polys:
        c = np.array([p.centroid.x, p.centroid.y])
        dist = float(np.linalg.norm(c - axis_pt_2d))
        if dist > NEAR_AXIS_MM:
            continue
        out.append({"centre": c, "dist": dist, "d_mm": equivalent_diameter(p), "area": p.area})
    return out


def _fits_ring(subset: list[dict], axis_pt_2d: np.ndarray) -> tuple[int, float, float] | None:
    """(k, prong width, r_in) when these islands are equal-angle discs on a common circle."""
    d = np.array([i["d_mm"] for i in subset])
    if not np.all((PRONG_D_MM[0] <= d) & (d <= PRONG_D_MM[1])):
        return None
    dist = np.array([i["dist"] for i in subset])
    if dist.mean() <= 0 or dist.std() > RADIUS_TOL:
        return None
    rel = np.array([i["centre"] - axis_pt_2d for i in subset])
    ang = np.sort(np.degrees(np.arctan2(rel[:, 1], rel[:, 0])) % 360)
    gaps = np.diff(np.r_[ang, ang[0] + 360])
    if gaps.std() > ANGLE_TOL_DEG:
        return None
    return len(subset), float(np.median(d)), float(np.median(dist - d / 2))


def _classify_prongs(islands: list[dict], axis_pt_2d: np.ndarray) -> tuple[int, float, float] | None:
    """The prong ring in this section, if there is one.

    Dense arrays (eternity bands, shared prongs) put a neighbour's prongs in the same
    section, so the k islands nearest the axis are tried for each allowed k, largest first.
    """
    if len(islands) in PRONG_COUNTS:
        got = _fits_ring(islands, axis_pt_2d)
        if got is not None:
            return got
    nearest = sorted(islands, key=lambda i: i["dist"])
    for k in sorted(PRONG_COUNTS, reverse=True):
        if k >= len(islands):
            continue
        got = _fits_ring(nearest[:k], axis_pt_2d)
        if got is not None:
            return got
    return None


SCAN_BACK_MM = 2.0  # how far below the band surface a scan may start


def _scan(mesh: trimesh.Trimesh, origin: np.ndarray, axis: np.ndarray):
    """Section perpendicular to `axis` over the crop's own extent along that axis.

    The window is derived from the geometry rather than fixed, because refining the axis
    also moves the origin along it.
    """
    t = (mesh.vertices - origin) @ axis
    offsets = np.arange(max(float(t.min()), -SCAN_BACK_MM), float(t.max()) + SECTION_STEP_MM,
                        SECTION_STEP_MM)
    if len(offsets) < 2:
        return [], []
    rows, axis_pts = [], []
    for off, polys, T in section_polygons(mesh, origin, axis, offsets):
        # parallel planes share a 2D frame, so the head axis lands on the same point in each
        axis_pt_2d = (np.linalg.inv(T) @ np.r_[origin, 1.0])[:2]
        islands = _islands(polys, T, axis_pt_2d)
        rows.append((float(off), islands, axis_pt_2d))
        if 2 <= len(islands) <= max(PRONG_COUNTS):
            centre2d = np.mean([i["centre"] for i in islands], axis=0)
            axis_pts.append(to_world(T, centre2d)[0])
    return rows, axis_pts


def _refine_axis(mesh, origin, axis, curve: Curve, band_r: float):
    """Re-centre the head on its own prong circle.

    A profile run sits between prongs, so the first guess is off to one side. The axis stays
    radial (SPEC §4.6); only where it meets the band is corrected, from the median centre of
    the island rings seen along it.
    """
    _, axis_pts = _scan(mesh, origin, axis)
    if len(axis_pts) < 3:
        return origin, axis
    centre = np.median(np.array(axis_pts), axis=0)
    rel = centre - curve.frame.center
    theta = float(np.arctan2(rel @ curve.frame.v, rel @ curve.frame.u))
    radial = curve.frame.direction(theta)
    z = float(rel @ curve.frame.normal)
    return curve.frame.center + radial * band_r + curve.frame.normal * z, radial


def _analyse_head(mesh: trimesh.Trimesh, curve: Curve, bins: list[int], band_r: float,
                  polar: tuple[np.ndarray, np.ndarray, np.ndarray]) -> dict | None:
    profile = curve.bins_max_r
    peak_r = float(np.nanmax(profile[bins]))
    theta_all, r_all, z_all = polar

    mid = float(curve.bin_angle(bins[len(bins) // 2]))
    half = np.deg2rad(len(bins) / 2 + 1)
    # The crop has to reach around the head's own prong circle, which sits off the profile
    # run; islands belonging to a neighbour are dropped by the NEAR_AXIS_MM filter.
    half_crop = half + NEAR_AXIS_MM / max(band_r, 1e-6)
    d_ang = np.arctan2(np.sin(theta_all - mid), np.cos(theta_all - mid))
    raised = (np.abs(d_ang) <= half) & (r_all >= band_r + HEAD_MIN_RISE_MM * 0.5)
    if raised.sum() < 16:
        return None
    theta = float(mid + d_ang[raised].mean())
    z_head = float(z_all[raised].mean())
    radial = curve.frame.direction(theta)
    origin = curve.frame.center + radial * band_r + curve.frame.normal * z_head

    keep = (np.abs(np.arctan2(np.sin(theta_all - theta), np.cos(theta_all - theta))) <= half_crop) & \
           (r_all >= band_r - 0.5)
    faces = np.flatnonzero(keep[mesh.faces].all(axis=1))
    if len(faces) < 32:
        return None
    crop = mesh.submesh([faces], append=True)

    depth = peak_r - band_r
    axis = radial
    for _ in range(AXIS_REFINE_ROUNDS):
        origin, axis = _refine_axis(crop, origin, axis, curve, band_r)

    rows, _ = _scan(crop, origin, axis)
    runs: list[list[tuple[float, int, float, float]]] = []
    current: list[tuple[float, int, float, float]] = []
    for off, islands, axis_pt_2d in rows:
        got = _classify_prongs(islands, axis_pt_2d)
        if got is None or (current and current[-1][1] != got[0]):
            if current:
                runs.append(current)
                current = []
            if got is None:
                continue
        k, w, r_in = got
        current.append((float(off), k, w, r_in))
    if current:
        runs.append(current)

    runs = [r for r in runs if len(r) * SECTION_STEP_MM >= PRONG_MIN_RUN_MM]
    if not runs:
        return None
    run = max(runs, key=len)
    k = run[0][1]
    prong_w = float(np.median([x[2] for x in run]))
    r_in = float(np.median([x[3] for x in run]))
    d_mm, ct = stone_from_r_in(r_in)
    rel = origin - curve.frame.center
    theta_out = float(np.arctan2(rel @ curve.frame.v, rel @ curve.frame.u))
    return {
        "axis": [round(float(x), 5) for x in axis],
        "origin": [round(float(x), 4) for x in origin],
        "prongs": int(k),
        "prong_w_mm": round(prong_w, 4),
        "r_in_mm": round(r_in, 4),
        "theta_deg": round(float(np.rad2deg(theta_out) % 360), 2),
        "rise_mm": round(depth, 3),
        "run_mm": round(len(run) * SECTION_STEP_MM, 2),
        "stone": {"d_mm": d_mm, "ct_est": ct, "source": "inferred"},
    }


def detect_array(heads: list[dict]) -> dict | None:
    """Equal angular spacing across at least ARRAY_MIN_HEADS heads (SPEC §4.6)."""
    if len(heads) < ARRAY_MIN_HEADS:
        return None
    ang = np.sort(np.array([h["theta_deg"] for h in heads]))
    gaps = np.diff(ang)
    if len(gaps) == 0 or gaps.std() > ARRAY_SPACING_TOL_DEG:
        return None
    return {"count": len(heads), "spacing_deg": round(float(gaps.mean()), 3)}


def detect_heads(mesh: trimesh.Trimesh, curve: Curve, band_r: float) -> tuple[list[dict], list[str]]:
    """Heads, their prongs and inferred stones, ordered along the curve."""
    warnings: list[str] = []
    runs = _head_runs(curve.bins_max_r, band_r)
    if not runs:
        return [], warnings
    polar = curve.frame.polar(mesh.vertices)
    heads = []
    for bins in runs:
        h = _analyse_head(mesh, curve, bins, band_r, polar)
        if h is not None:
            heads.append(h)
    heads.sort(key=lambda h: -h["run_mm"])
    unique: list[dict] = []
    for h in heads:
        o = np.asarray(h["origin"])
        if any(np.linalg.norm(o - np.asarray(u["origin"])) < DEDUPE_MM for u in unique):
            continue
        unique.append(h)
    heads = sorted(unique, key=lambda h: h["theta_deg"])
    missed = len(runs) - len(heads)
    if missed > 0 and not heads:
        warnings.append(f"heads: none of the {len(runs)} protrusions were recognised as "
                        "prong settings")
    return heads, warnings
