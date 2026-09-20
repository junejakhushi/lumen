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
ARRAY_DENSE_MAX_PITCH_DEG = 30.0  # closer than this and the prongs are likely shared
ARRAY_MAX_GAP_CV = 0.4  # how uneven the spacing may be and still count as an array
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


def _islands(polys, T, axis_pt_2d, near_axis_mm: float = NEAR_AXIS_MM) -> list[dict]:
    out = []
    for p in polys:
        c = np.array([p.centroid.x, p.centroid.y])
        dist = float(np.linalg.norm(c - axis_pt_2d))
        if dist > near_axis_mm:
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


def _scan(mesh: trimesh.Trimesh, origin: np.ndarray, axis: np.ndarray,
          near_axis_mm: float = NEAR_AXIS_MM):
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
        islands = _islands(polys, T, axis_pt_2d, near_axis_mm)
        rows.append((float(off), islands, axis_pt_2d))
        if len(islands) >= 2:
            # In a dense array a section also catches the neighbours' prongs, and averaging
            # all of them lands between two stones and stays there. No setting has more
            # prongs than max(PRONG_COUNTS), so that many of the nearest islands are one
            # setting's worth at most, whether it is a four-prong head or a six.
            nearest = sorted(islands, key=lambda i: i["dist"])[: max(PRONG_COUNTS)]
            centre2d = np.mean([i["centre"] for i in nearest], axis=0)
            axis_pts.append(to_world(T, centre2d)[0])
    return rows, axis_pts


def _refine_axis(mesh, origin, axis, curve: Curve, band_r: float,
                 near_axis_mm: float = NEAR_AXIS_MM):
    """Re-centre the head on its own prong circle.

    A profile run sits between prongs, so the first guess is off to one side. The axis stays
    radial (SPEC §4.6); only where it meets the band is corrected, from the median centre of
    the island rings seen along it.
    """
    _, axis_pts = _scan(mesh, origin, axis, near_axis_mm)
    if len(axis_pts) < 3:
        return origin, axis
    centre = np.median(np.array(axis_pts), axis=0)
    rel = centre - curve.frame.center
    theta = float(np.arctan2(rel @ curve.frame.v, rel @ curve.frame.u))
    radial = curve.frame.direction(theta)
    z = float(rel @ curve.frame.normal)
    return curve.frame.center + radial * band_r + curve.frame.normal * z, radial


def _analyse_head(mesh: trimesh.Trimesh, curve: Curve, bins: list[int], band_r: float,
                  polar: tuple[np.ndarray, np.ndarray, np.ndarray],
                  near_axis_mm: float = NEAR_AXIS_MM) -> dict | None:
    profile = curve.bins_max_r
    peak_r = float(np.nanmax(profile[bins]))
    theta_all, r_all, z_all = polar

    mid = float(curve.bin_angle(bins[len(bins) // 2]))
    half = np.deg2rad(len(bins) / 2 + 1)
    # The crop has to reach around the head's own prong circle, which sits off the profile
    # run; islands belonging to a neighbour are dropped by the NEAR_AXIS_MM filter.
    half_crop = half + near_axis_mm / max(band_r, 1e-6)
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

    axis = radial
    for _ in range(AXIS_REFINE_ROUNDS):
        origin, axis = _refine_axis(crop, origin, axis, curve, band_r, near_axis_mm)

    rows, _ = _scan(crop, origin, axis, near_axis_mm)
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

    # How far the setting stands above the band: the highest section along the head's own
    # axis that still cuts prongs. Taking it from the candidate's profile instead would read
    # the band itself whenever the candidate started life as a gap between two settings.
    tops = [off for off, islands, _ in rows if len(islands) >= 2]
    depth = max(tops) if tops else peak_r - band_r
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


def _run_centre(run: list[int]) -> float:
    return (run[0] + run[-1]) / 2


def _gap_stats(runs: list[list[int]]) -> tuple[float, float]:
    """Typical angular spacing between protrusions, and how even that spacing is.

    An array of settings repeats at one pitch, so its gaps barely vary. The prongs of a
    single head also sit close together, but the gap to the next head is several times
    larger, so the spread gives the two cases away.
    """
    centres = sorted(_run_centre(r) for r in runs)
    gaps = np.array([b - a for a, b in zip(centres, centres[1:]) if 0 < b - a < 60])
    if len(gaps) < 2 or gaps.mean() <= 0:
        return (float(np.median(gaps)) if len(gaps) else 0.0), 1.0
    return float(np.median(gaps)), float(gaps.std() / gaps.mean())


def _candidates(runs: list[list[int]], band_r: float) -> tuple[list[list[int]], float]:
    """Where to look for settings, and how far around each one to look.

    A piece with well-separated heads has one setting per protrusion. A dense band shares its
    prongs between neighbours, so the stones sit *between* the protrusions — those midpoints
    are offered as candidates too, and the search radius is cut to the array's own pitch so a
    neighbour's prongs are not mistaken for this stone's.
    """
    candidates = list(runs)
    if len(runs) < 3:
        return candidates, NEAR_AXIS_MM

    pitch_deg, cv = _gap_stats(runs)
    if not pitch_deg or pitch_deg > ARRAY_DENSE_MAX_PITCH_DEG or cv > ARRAY_MAX_GAP_CV:
        return candidates, NEAR_AXIS_MM
    pitch_mm = np.deg2rad(pitch_deg) * band_r

    centres = sorted(_run_centre(r) for r in runs)

    for a, b in zip(centres, centres[1:]):
        if b - a < 60:
            mid = int(round((a + b) / 2))
            candidates.append([mid - 1, mid, mid + 1])
    # Shared prongs sit about half a pitch from each stone's centre, so the window has to
    # reach a little past that — but stop well short of the next stone's far prongs.
    near = float(np.clip(pitch_mm * 0.8, 1.2, NEAR_AXIS_MM))
    return candidates, near


def _explained_fraction(heads: list[dict], runs: list[list[int]], curve: Curve,
                        band_r: float) -> float:
    """How much of the raised metal the settings found account for.

    A prong belongs to a head if it stands within the head's own footprint — the prongs of a
    setting sit a stone's radius plus a prong's width from its axis. Protrusions left over
    are metal the detector could not explain.
    """
    if not runs:
        return 1.0
    if not heads:
        return 0.0
    reach = [
        max(np.rad2deg((h.get("r_in_mm", 0.0) + h.get("prong_w_mm", 0.0)) / band_r), 3.0)
        for h in heads
    ]
    hit = 0
    for run in runs:
        theta = np.rad2deg(float(curve.bin_angle(_run_centre(run)))) % 360
        for h, span in zip(heads, reach):
            gap = abs((theta - h["theta_deg"] + 180) % 360 - 180)
            if gap <= span:
                hit += 1
                break
    return hit / len(runs)


def _prong_width(
    mesh: trimesh.Trimesh,
    curve: Curve,
    band_r: float,
    run: list[int],
    pitch_mm: float,
) -> float:
    """How wide one prong is, measured across a section through it."""
    theta = float(curve.bin_angle(_run_centre(run)))
    radial = curve.frame.direction(theta)
    theta_all, r_all, z_all = curve.frame.polar(mesh.vertices)
    near = np.abs(np.arctan2(np.sin(theta_all - theta), np.cos(theta_all - theta)))
    keep = (near <= np.deg2rad(6)) & (r_all >= band_r - 0.5)
    faces = np.flatnonzero(keep[mesh.faces].all(axis=1))
    if len(faces) < 32:
        return pitch_mm * 0.25
    crop = mesh.submesh([faces], append=True)
    z_head = float(z_all[keep].mean())
    origin = curve.frame.center + radial * band_r + curve.frame.normal * z_head
    rows, _ = _scan(crop, origin, radial, pitch_mm)
    widths = [
        i["d_mm"] for _, islands, _ in rows for i in islands
        if PRONG_D_MM[0] <= i["d_mm"] <= PRONG_D_MM[1]
    ]
    return float(np.median(widths)) if widths else pitch_mm * 0.25


def _shared_prong_array(
    mesh: trimesh.Trimesh,
    curve: Curve,
    band_r: float,
    runs: list[list[int]],
) -> list[dict]:
    """Settings for a band whose prongs are shared between neighbours.

    An eternity band does not have a head per stone: one pair of prongs sits between each
    pair of stones and holds both. There is no ring of prongs around a single axis to find,
    so the settings are read from the array itself — the stones sit between the protrusions,
    a stone's width is the centre-to-centre pitch less one prong, and the seat is as deep as
    the protrusions are tall. Every number here is measured; only the arrangement is assumed.
    """
    centres = sorted(_run_centre(r) for r in runs)
    pairs = [(a, b) for a, b in zip(centres, centres[1:]) if b - a < 60]
    if len(pairs) < ARRAY_MIN_HEADS:
        return []

    pitch_deg = float(np.median([b - a for a, b in pairs]))
    pitch_mm = np.deg2rad(pitch_deg) * band_r

    theta_all, r_all, z_all = curve.frame.polar(mesh.vertices)
    rise = float(np.median([float(np.nanmax(curve.bins_max_r[run])) - band_r for run in runs]))

    # Measure a prong across a section through one of them, rather than from the profile:
    # neighbouring prongs merge into one run there, which doubles the apparent width.
    prong_w = _prong_width(mesh, curve, band_r, runs[len(runs) // 2], pitch_mm)
    stone_d = max(pitch_mm - prong_w, pitch_mm * 0.4)
    r_in = max((stone_d - STONE_CLEARANCE_MM) / 2, 0.2)

    # An eternity band is regular by construction, so the stones are laid at the measured
    # pitch across the span the protrusions cover, rather than at gaps that merged runs
    # have made uneven.
    first = (pairs[0][0] + pairs[0][1]) / 2
    last = (pairs[-1][0] + pairs[-1][1]) / 2
    count = max(1, int(round((last - first) / pitch_deg)))
    step = (last - first) / count if count else pitch_deg

    heads: list[dict] = []
    for k in range(count + 1):
        theta = float(curve.bin_angle(first + k * step))
        radial = curve.frame.direction(theta)
        d_ang = np.abs(np.arctan2(np.sin(theta_all - theta), np.cos(theta_all - theta)))
        near = d_ang <= np.deg2rad(pitch_deg / 2)
        out = near & (r_all >= band_r)
        z_head = float(z_all[out].mean()) if out.any() else 0.0
        origin = curve.frame.center + radial * band_r + curve.frame.normal * z_head
        d_mm, ct = stone_from_r_in(r_in)
        heads.append({
            "axis": [round(float(x), 5) for x in radial],
            "origin": [round(float(x), 4) for x in origin],
            "prongs": 4,  # two pairs, each shared with a neighbour
            "prong_w_mm": round(prong_w, 4),
            "r_in_mm": round(r_in, 4),
            "theta_deg": round(float(np.rad2deg(theta) % 360), 2),
            "rise_mm": round(rise, 3),
            "run_mm": round(pitch_mm, 2),
            "shared_prongs": True,
            "stone": {"d_mm": d_mm, "ct_est": ct, "source": "inferred"},
        })
    return heads


def detect_heads(mesh: trimesh.Trimesh, curve: Curve, band_r: float) -> tuple[list[dict], list[str]]:
    """Heads, their prongs and inferred stones, ordered along the curve."""
    warnings: list[str] = []
    runs = _head_runs(curve.bins_max_r, band_r)
    if not runs:
        return [], warnings
    candidates, near_axis = _candidates(runs, band_r)
    polar = curve.frame.polar(mesh.vertices)
    heads = []
    for bins in candidates:
        h = _analyse_head(mesh, curve, bins, band_r, polar, near_axis)
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
    # A dense band with shared prongs has no head per stone to find; read the array instead.
    # The test is whether the settings found account for the protrusions on the band: a head
    # owns several of them (its own prongs), so counting heads against runs says nothing.
    pitch_deg, gap_cv = _gap_stats(runs)
    if (
        len(runs) >= 6
        and gap_cv <= ARRAY_MAX_GAP_CV
        and _explained_fraction(heads, runs, curve, band_r) < 0.5
    ):
        shared = _shared_prong_array(mesh, curve, band_r, runs)
        if len(shared) > len(heads):
            heads = shared
            warnings.append(
                f"heads: {len(shared)} settings read as a shared-prong array "
                f"(stones sit between the prongs); sizes are inferred from the spacing"
            )

    if not heads:
        warnings.append(f"heads: none of the {len(runs)} protrusions were recognised as "
                        "prong settings")
    return heads, warnings
