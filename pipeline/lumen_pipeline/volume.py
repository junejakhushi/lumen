"""Exact volume of a sliced export from its mid-layer sections (SPEC §4.2).

For each layer k the mesh is cut at zmin + (k + 0.5)·t; the section polygons are
unioned with shapely and volume = Σ area × t.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import shapely
import trimesh
from shapely.geometry import MultiPolygon, Polygon
from shapely.ops import unary_union
from tqdm import tqdm

SECTION_BATCH = 32


@dataclass
class LayerStack:
    zmin: float
    layer_t: float
    layers: list  # shapely geometry (Polygon / MultiPolygon / empty) per layer, world XY
    areas: np.ndarray  # mm² per layer

    @property
    def volume_mm3(self) -> float:
        return float(self.areas.sum() * self.layer_t)

    def bounds_xy(self) -> tuple[float, float, float, float]:
        b = np.array([g.bounds for g in self.layers if not g.is_empty])
        return float(b[:, 0].min()), float(b[:, 1].min()), float(b[:, 2].max()), float(b[:, 3].max())


def _to_world_xy(poly: Polygon, T: np.ndarray) -> Polygon:
    """Apply the 2D part of a section's to_3D transform (identity for z-normal planes)."""
    if np.allclose(T[:2, :2], np.eye(2)) and np.allclose(T[:2, 3], 0):
        return poly
    a, b, d, e = T[0, 0], T[0, 1], T[1, 0], T[1, 1]
    return shapely.affinity.affine_transform(poly, [a, b, d, e, T[0, 3], T[1, 3]])


def _union(path) -> Polygon | MultiPolygon:
    if path is None:
        return Polygon()
    T = path.metadata.get("to_3D", np.eye(4))
    polys = [_to_world_xy(p, T) for p in path.polygons_full if p is not None and not p.is_empty]
    if not polys:
        return Polygon()
    u = unary_union([p if p.is_valid else p.buffer(0) for p in polys])
    return u


def slice_layers(mesh: trimesh.Trimesh, zmin: float, layer_t: float, layers: int,
                 progress: bool = True) -> LayerStack:
    heights = (np.arange(layers) + 0.5) * layer_t
    geoms: list = []
    bar = tqdm(total=layers, desc="slice", unit="layer", disable=not progress, leave=False)
    for start in range(0, layers, SECTION_BATCH):
        h = heights[start:start + SECTION_BATCH]
        paths = mesh.section_multiplane(plane_origin=[0.0, 0.0, zmin],
                                        plane_normal=[0.0, 0.0, 1.0], heights=h)
        geoms.extend(_union(p) for p in paths)
        bar.update(len(h))
    bar.close()
    areas = shapely.area(np.array(geoms, dtype=object)).astype(float)
    return LayerStack(zmin=zmin, layer_t=layer_t, layers=geoms, areas=areas)
