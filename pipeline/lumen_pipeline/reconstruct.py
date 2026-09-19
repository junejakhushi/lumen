"""Reconstruct a clean watertight mesh from the layer stack (SPEC §4.3).

Each layer's union is rasterised onto an XY grid (holes cut), the layers are
stacked into a boolean volume (z spacing = layer_t), padded, meshed with
marching cubes, Taubin-smoothed, and checked against the exact slice volume.
"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field

import numpy as np
import trimesh
from shapely.geometry import MultiPolygon, Polygon
from skimage.draw import polygon as fill_polygon
from skimage.measure import marching_cubes
from tqdm import tqdm

from .volume import LayerStack

log = logging.getLogger(__name__)

RES_MM = 0.04
RETRY_RES_MM = 0.03
PAD = 2
MAX_VOXELS = 150_000_000
TAUBIN_ITERATIONS = 8
VOLUME_TOL = 0.03
MIN_COMPONENT_FRACTION = 0.01  # drop shells smaller than 1% of the largest


@dataclass
class Grid:
    x0: float  # world x of column 0 (padded)
    y0: float  # world y of row 0 (padded)
    res: float
    nx: int
    ny: int
    nz: int  # padded layer count

    @property
    def voxels(self) -> int:
        return self.nx * self.ny * self.nz


@dataclass
class Recon:
    mesh: trimesh.Trimesh
    volume_mm3: float
    res_mm: float
    rel_error: float
    chunks: int
    warnings: list[str] = field(default_factory=list)


def make_grid(stack: LayerStack, res: float) -> Grid:
    minx, miny, maxx, maxy = stack.bounds_xy()
    nx = int(math.ceil((maxx - minx) / res)) + 1 + 2 * PAD
    ny = int(math.ceil((maxy - miny) / res)) + 1 + 2 * PAD
    return Grid(x0=minx - PAD * res, y0=miny - PAD * res, res=res, nx=nx, ny=ny,
                nz=len(stack.layers) + 2 * PAD)


def _polys(geom) -> list[Polygon]:
    if geom.is_empty:
        return []
    if isinstance(geom, Polygon):
        return [geom]
    if isinstance(geom, MultiPolygon):
        return list(geom.geoms)
    return [g for g in getattr(geom, "geoms", []) if isinstance(g, Polygon)]


def rasterize_layer(geom, grid: Grid) -> np.ndarray:
    """Boolean (ny, nx) mask of a layer: exteriors filled, holes cut."""
    out = np.zeros((grid.ny, grid.nx), dtype=bool)
    for poly in _polys(geom):
        ext = np.asarray(poly.exterior.coords)
        c = (ext[:, 0] - grid.x0) / grid.res
        r = (ext[:, 1] - grid.y0) / grid.res
        c0, r0 = max(int(np.floor(c.min())), 0), max(int(np.floor(r.min())), 0)
        c1, r1 = min(int(np.ceil(c.max())) + 1, grid.nx), min(int(np.ceil(r.max())) + 1, grid.ny)
        local = np.zeros((r1 - r0, c1 - c0), dtype=bool)
        rr, cc = fill_polygon(r - r0, c - c0, shape=local.shape)
        local[rr, cc] = True
        for hole in poly.interiors:
            h = np.asarray(hole.coords)
            rr, cc = fill_polygon((h[:, 1] - grid.y0) / grid.res - r0,
                                  (h[:, 0] - grid.x0) / grid.res - c0, shape=local.shape)
            local[rr, cc] = False
        out[r0:r1, c0:c1] |= local
    return out


def _mesh_chunk(stack: LayerStack, grid: Grid, k0: int, k1: int, bar) -> trimesh.Trimesh | None:
    """Marching cubes over padded layers k0..k1 inclusive (chunks share one boundary layer)."""
    vol = np.zeros((k1 - k0 + 1, grid.ny, grid.nx), dtype=np.float32)
    for i, kk in enumerate(range(k0, k1 + 1)):
        k = kk - PAD
        if 0 <= k < len(stack.layers):
            vol[i] = rasterize_layer(stack.layers[k], grid)
        if i > 0 or k0 == 0:  # the shared boundary layer is counted once
            bar.update(1)
    if not vol.any():
        return None
    # z stays in layer-index units so seam vertices of adjacent chunks match bit-for-bit.
    verts, faces, _, _ = marching_cubes(vol, level=0.5, spacing=(1.0, grid.res, grid.res),
                                        allow_degenerate=False)
    del vol
    # (z, y, x) -> world (x, y, z); layer k's centre sits at zmin + (k + 0.5)·t.
    world = np.column_stack([
        verts[:, 2] + grid.x0,
        verts[:, 1] + grid.y0,
        stack.zmin + (verts[:, 0] + (k0 - PAD) + 0.5) * stack.layer_t,
    ])
    return trimesh.Trimesh(world, faces, process=False)


def _keep_largest(mesh: trimesh.Trimesh, warnings: list[str]) -> trimesh.Trimesh:
    parts = mesh.split(only_watertight=False)
    if len(parts) <= 1:
        parts = [mesh]
    vols = np.array([abs(p.volume) for p in parts])
    keep = vols >= MIN_COMPONENT_FRACTION * vols.max()
    dropped = vols[~keep].sum()
    if dropped > 0.005 * vols.sum():
        warnings.append(f"reconstruct: dropped {int((~keep).sum())} small shells ({dropped:.2f} mm³)")
    kept = []
    for p in (p for p, k in zip(parts, keep) if k):
        if p.volume < 0:  # outward normals
            p.invert()
        kept.append(p)
    return trimesh.util.concatenate(kept) if len(kept) > 1 else kept[0]


def reconstruct_at(stack: LayerStack, res: float, progress: bool = True) -> Recon:
    grid = make_grid(stack, res)
    plane = grid.nx * grid.ny
    chunk_layers = max(2, MAX_VOXELS // plane)
    bounds = list(range(0, grid.nz - 1, chunk_layers - 1)) + [grid.nz - 1]
    bounds = sorted(set(bounds))
    warnings: list[str] = []
    parts = []
    with tqdm(total=grid.nz, desc=f"voxelise {res:g}mm", unit="layer",
              disable=not progress, leave=False) as bar:
        for k0, k1 in zip(bounds[:-1], bounds[1:]):
            m = _mesh_chunk(stack, grid, k0, k1, bar)
            if m is not None:
                parts.append(m)
    mesh = trimesh.util.concatenate(parts) if len(parts) > 1 else parts[0]
    mesh.merge_vertices()  # stitch chunk seams (shared boundary layer gives identical vertices)
    mesh.update_faces(mesh.nondegenerate_faces())
    mesh.remove_unreferenced_vertices()

    mesh = _keep_largest(mesh, warnings)
    trimesh.smoothing.filter_taubin(mesh, iterations=TAUBIN_ITERATIONS)
    if mesh.volume < 0:
        mesh.invert()
    vol = float(mesh.volume)
    rel = abs(vol - stack.volume_mm3) / stack.volume_mm3
    return Recon(mesh=mesh, volume_mm3=vol, res_mm=res, rel_error=rel,
                 chunks=len(bounds) - 1, warnings=warnings)


def reconstruct(stack: LayerStack, progress: bool = True) -> Recon:
    rec = reconstruct_at(stack, RES_MM, progress)
    if rec.rel_error <= VOLUME_TOL:
        return rec
    log.warning("recon volume off by %.2f%% at %g mm; retrying at %g mm",
                rec.rel_error * 100, RES_MM, RETRY_RES_MM)
    first = rec
    rec = reconstruct_at(stack, RETRY_RES_MM, progress)
    rec.warnings.insert(0, f"recon: {first.rel_error:.1%} off at {RES_MM} mm; retried at {RETRY_RES_MM} mm")
    if rec.rel_error > VOLUME_TOL:
        rec.warnings.append(f"recon: volume {rec.rel_error:.1%} off slice volume (> {VOLUME_TOL:.0%})")
    return rec
