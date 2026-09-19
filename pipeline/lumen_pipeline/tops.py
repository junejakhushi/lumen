"""Stud earring ("tops") geometry: bbox, front direction and post (SPEC §4.5)."""
from __future__ import annotations

import numpy as np
import trimesh

from .sections import equivalent_diameter, section_polygons, to_world

POST_D_MM = (0.5, 1.4)  # SPEC: Ø 0.6–1.2 mm, with tolerance for the reconstruction
POST_STEP_MM = 0.1
POST_SEARCH_MM = 12.0
POST_MIN_LEN_MM = 1.5
POST_CIRCULARITY = 0.6
NEAR_TIP_MM = 1.5
PAIR_BODY_FRACTION = 0.2   # a "body" holds at least this share of the volume
PAIR_VOLUME_TOL = 0.25     # the two bodies of a pair are within this much of each other


def _candidate_axes(mesh: trimesh.Trimesh) -> list[np.ndarray]:
    pts = mesh.vertices
    _, _, vt = np.linalg.svd(pts[:: max(1, len(pts) // 100_000)] - pts.mean(axis=0), full_matrices=False)
    axes: list[np.ndarray] = []
    for a in list(np.eye(3)) + list(vt):
        for s in (1.0, -1.0):
            d = s * a / np.linalg.norm(a)
            if not any(d @ e > 0.99 for e in axes):
                axes.append(d)
    return axes


def _circularity(poly) -> float:
    return float(4 * np.pi * poly.area / max(poly.length ** 2, 1e-9))


def _thin_at(mesh: trimesh.Trimesh, tip: np.ndarray, d: np.ndarray, offsets) -> bool:
    """Cheap probe: is the section near the tip a single thin round island?"""
    for _, polys, T in section_polygons(mesh, tip, d, offsets):
        ok = False
        for p in polys:
            c3 = to_world(T, [p.centroid.x, p.centroid.y])[0]
            radial = np.linalg.norm((c3 - tip) - ((c3 - tip) @ d) * d)
            if radial <= NEAR_TIP_MM:
                ok = (POST_D_MM[0] <= equivalent_diameter(p) <= POST_D_MM[1]
                      and _circularity(p) >= POST_CIRCULARITY)
                break
        if not ok:
            return False
    return True


def _post_along(mesh: trimesh.Trimesh, d: np.ndarray) -> dict | None:
    """A thin, round protrusion running inward from the extreme point along d."""
    proj = mesh.vertices @ d
    tip = mesh.vertices[int(np.argmax(proj))]
    if not _thin_at(mesh, tip, d, [-0.3, -POST_MIN_LEN_MM]):
        return None
    offsets = -np.arange(POST_STEP_MM, POST_SEARCH_MM, POST_STEP_MM)
    run = 0.0
    base = None
    for _, polys, T in section_polygons(mesh, tip, d, offsets):
        hit = None
        for p in polys:
            c3 = to_world(T, [p.centroid.x, p.centroid.y])[0]
            radial = np.linalg.norm((c3 - tip) - ((c3 - tip) @ d) * d)
            if radial <= NEAR_TIP_MM:
                dia = equivalent_diameter(p)
                if POST_D_MM[0] <= dia <= POST_D_MM[1] and _circularity(p) >= POST_CIRCULARITY:
                    hit = (c3, dia)
                break
        if hit is None:
            break
        run += POST_STEP_MM
        base = hit
    if base is None or run < POST_MIN_LEN_MM:
        return None
    return {"origin": [round(float(x), 4) for x in base[0]],
            "axis": [round(float(x), 4) for x in d],
            "len_mm": round(float(run), 2),
            "d_mm": round(float(base[1]), 3),
            "tip": [round(float(x), 4) for x in tip]}


def detect_post(mesh: trimesh.Trimesh) -> dict | None:
    best = None
    for d in _candidate_axes(mesh):
        p = _post_along(mesh, d)
        if p is not None and (best is None or p["len_mm"] > best["len_mm"]):
            best = p
    return best


def front_direction(mesh: trimesh.Trimesh, post: dict | None) -> np.ndarray:
    """Opposite the post; otherwise the axis with the largest projected area, facing the busier side."""
    if post is not None:
        return -np.asarray(post["axis"], dtype=float)
    areas = mesh.area_faces[:, None] * mesh.face_normals
    axis = int(np.argmax(np.abs(areas).sum(axis=0)))
    d = np.zeros(3)
    d[axis] = 1.0
    facing = mesh.area_faces[mesh.face_normals @ d > 0].sum()
    return d if facing >= mesh.area - facing else -d


def pair_in_file(mesh: trimesh.Trimesh) -> bool:
    """True when one file already holds both earrings (two similar large bodies).

    The app shows and prices tops as a pair, so it must not mirror these again.
    """
    vols = np.array([abs(p.volume) for p in mesh.split(only_watertight=False)])
    if len(vols) < 2:
        return False
    big = np.sort(vols)[::-1]
    big = big[big >= PAIR_BODY_FRACTION * vols.sum()]
    return bool(len(big) == 2 and abs(big[0] - big[1]) <= PAIR_VOLUME_TOL * big[0])


def analyse_tops(mesh: trimesh.Trimesh) -> tuple[dict, list[str]]:
    warnings: list[str] = []
    post = detect_post(mesh)
    if post is None:
        warnings.append("tops: post not modelled")
    pair = pair_in_file(mesh)
    if pair:
        warnings.append("tops: both earrings are modelled in this file; weight and price "
                        "already cover the pair (do not double)")
    front = front_direction(mesh, post)
    return {"front": [round(float(x), 4) for x in front],
            "pair_in_file": pair,
            "post": None if post is None else {k: post[k] for k in ("origin", "axis", "len_mm", "d_mm")}}, warnings
