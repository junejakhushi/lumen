"""Load an STL (ASCII or binary) as a single mesh in millimetres (SPEC §4.1)."""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import trimesh

log = logging.getLogger(__name__)

MIN_EXTENT_MM = 2.0
MAX_EXTENT_MM = 300.0


@dataclass
class Loaded:
    mesh: trimesh.Trimesh
    scale: float = 1.0
    warnings: list[str] = field(default_factory=list)


def _unit_scale(max_extent: float) -> float:
    """Pick a rescale factor that brings the max extent into [2, 300] mm."""
    if MIN_EXTENT_MM <= max_extent <= MAX_EXTENT_MM:
        return 1.0
    if max_extent < MIN_EXTENT_MM:
        candidates = (25.4, 1000.0)  # inches, metres
    else:
        candidates = (0.001, 0.1)  # micrometres, 1/10 mm
    for f in candidates:
        if MIN_EXTENT_MM <= max_extent * f <= MAX_EXTENT_MM:
            return f
    return candidates[-1]


_VERTEX = re.compile(rb"vertex\s+(\S+)\s+(\S+)\s+(\S+)")


def _load_truncated_ascii(path: Path) -> trimesh.Trimesh | None:
    """Salvage the complete facets of an ASCII STL that ends mid-file (no endsolid)."""
    data = path.read_bytes()
    if not data.lstrip().startswith(b"solid"):
        return None
    end = data.rfind(b"endfacet")
    if end < 0:
        return None
    coords = np.array(_VERTEX.findall(data[:end]), dtype=np.float64)
    n = len(coords) // 3
    if n == 0:
        return None
    verts = coords[: n * 3]
    return trimesh.Trimesh(verts, np.arange(n * 3).reshape(-1, 3), process=False)


def load_stl(path: str | Path) -> Loaded:
    path = Path(path)
    warnings: list[str] = []
    mesh = trimesh.load(str(path), file_type="stl", force="mesh", process=False)
    if not isinstance(mesh, trimesh.Trimesh) or len(mesh.faces) == 0:
        mesh = _load_truncated_ascii(path)
        if mesh is None:
            raise ValueError("no triangles found in input")
        msg = f"load: truncated ASCII STL; salvaged {len(mesh.faces):,} complete facets"
        log.warning(msg)
        warnings.append(msg)
    mesh.merge_vertices()

    max_extent = float(np.max(mesh.extents))
    scale = _unit_scale(max_extent)
    if scale != 1.0:
        msg = f"units: max extent {max_extent:.4g} outside [{MIN_EXTENT_MM}, {MAX_EXTENT_MM}] mm; rescaled ×{scale:g}"
        log.warning(msg)
        warnings.append(msg)
        mesh.apply_scale(scale)
    return Loaded(mesh=mesh, scale=scale, warnings=warnings)
