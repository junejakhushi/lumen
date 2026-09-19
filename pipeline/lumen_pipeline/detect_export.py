"""Detect JewelCAD "sliced" exports vs solid exports (SPEC §4.1).

Sliced: >= 50% of shells with >= 12 faces share an identical z-extent t (±1 µm)
and (zmax - zmin) / t is an integer (±0.01).
"""
from __future__ import annotations

import numpy as np
import trimesh

MIN_SHELL_FACES = 12
T_TOL_MM = 0.001
INT_TOL = 0.01
SHARE_MIN = 0.5


def shell_z_extents(mesh: trimesh.Trimesh) -> np.ndarray:
    """z-extent of every face-connected shell with >= MIN_SHELL_FACES faces."""
    labels = trimesh.graph.connected_component_labels(
        mesh.face_adjacency, node_count=len(mesh.faces)
    )
    fz = mesh.vertices[:, 2][mesh.faces]
    n = labels.max() + 1
    lo = np.full(n, np.inf)
    hi = np.full(n, -np.inf)
    np.minimum.at(lo, labels, fz.min(axis=1))
    np.maximum.at(hi, labels, fz.max(axis=1))
    counts = np.bincount(labels, minlength=n)
    keep = counts >= MIN_SHELL_FACES
    return (hi - lo)[keep]


def detect_export(mesh: trimesh.Trimesh) -> dict:
    zmin, zmax = (float(v) for v in mesh.bounds[:, 2])
    result = {"export_type": "solid", "layer_t": None, "layers": None, "zmin": zmin, "zmax": zmax}

    ext = shell_z_extents(mesh)
    ext = ext[ext > T_TOL_MM]
    if len(ext) == 0:
        return result

    # Mode of the extents on a 1 µm grid, then refine t as the mean of shells within ±1 µm.
    keys = np.round(ext / T_TOL_MM).astype(np.int64)
    vals, counts = np.unique(keys, return_counts=True)
    mode = vals[np.argmax(counts)] * T_TOL_MM
    share_mask = np.abs(ext - mode) <= T_TOL_MM
    share = share_mask.sum() / len(ext)
    t = float(ext[share_mask].mean())

    ratio = (zmax - zmin) / t
    layers = int(round(ratio))
    if share >= SHARE_MIN and abs(ratio - layers) <= INT_TOL and layers >= 2:  # a single shell spanning the part is a solid
        result.update(export_type="sliced", layer_t=t, layers=layers)
    result["shell_share"] = float(share)
    return result
