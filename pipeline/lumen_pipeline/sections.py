"""Shared helper: planar sections of a mesh as shapely polygons plus their to_3D transform."""
from __future__ import annotations

import numpy as np
import trimesh
from shapely.geometry import Polygon


def section_polygons(mesh: trimesh.Trimesh, origin, normal, offsets) -> list[tuple[float, list[Polygon], np.ndarray]]:
    """Sections at origin + offset·normal. Returns (offset, polygons_full, to_3D) per plane."""
    normal = np.asarray(normal, dtype=float)
    normal = normal / np.linalg.norm(normal)
    paths = mesh.section_multiplane(plane_origin=np.asarray(origin, dtype=float),
                                    plane_normal=normal, heights=np.asarray(offsets, dtype=float))
    out = []
    for off, p in zip(offsets, paths):
        if p is None:
            out.append((float(off), [], np.eye(4)))
            continue
        T = np.asarray(p.metadata.get("to_3D", np.eye(4)), dtype=float)
        out.append((float(off), [g for g in p.polygons_full if g is not None and not g.is_empty], T))
    return out


def to_world(T: np.ndarray, xy) -> np.ndarray:
    xy = np.atleast_2d(np.asarray(xy, dtype=float))
    pts = np.column_stack([xy, np.zeros(len(xy)), np.ones(len(xy))])
    return (pts @ T.T)[:, :3]


def equivalent_diameter(poly: Polygon) -> float:
    return float(2 * np.sqrt(poly.area / np.pi))
