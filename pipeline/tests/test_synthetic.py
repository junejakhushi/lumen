"""Fast tests on synthetic sliced stacks (no private data needed)."""
import numpy as np
import pytest
import trimesh

from lumen_pipeline import reconstruct as rc
from lumen_pipeline.detect_export import detect_export
from lumen_pipeline.load import _unit_scale
from lumen_pipeline.volume import slice_layers

T = 0.05
LAYERS = 40
R_IN, R_OUT = 2.0, 3.0


def sliced_annulus(layers=LAYERS, t=T, z0=1.0) -> trimesh.Trimesh:
    """A tube exported JewelCAD-style: one annulus prism shell per layer."""
    shells = []
    for k in range(layers):
        a = trimesh.creation.annulus(r_min=R_IN, r_max=R_OUT, height=t, sections=64)
        a.apply_translation([0, 0, z0 + (k + 0.5) * t])
        shells.append(a)
    return trimesh.util.concatenate(shells)


def exact_volume(layers=LAYERS, t=T, sections=64):
    # regular 64-gon areas
    area = 0.5 * sections * np.sin(2 * np.pi / sections) * (R_OUT**2 - R_IN**2)
    return area * layers * t


def test_detect_sliced():
    det = detect_export(sliced_annulus())
    assert det["export_type"] == "sliced"
    assert det["layer_t"] == pytest.approx(T, abs=1e-6)
    assert det["layers"] == LAYERS


def test_detect_solid():
    det = detect_export(trimesh.creation.box([5, 5, 5]))
    assert det["export_type"] == "solid"


def test_slice_volume_with_hole():
    m = sliced_annulus()
    det = detect_export(m)
    stack = slice_layers(m, det["zmin"], det["layer_t"], det["layers"], progress=False)
    assert stack.volume_mm3 == pytest.approx(exact_volume(), rel=1e-6)


def test_recon_chunked_matches_single(monkeypatch):
    m = sliced_annulus()
    det = detect_export(m)
    stack = slice_layers(m, det["zmin"], det["layer_t"], det["layers"], progress=False)
    single = rc.reconstruct_at(stack, 0.04, progress=False)
    grid = rc.make_grid(stack, 0.04)
    monkeypatch.setattr(rc, "MAX_VOXELS", grid.nx * grid.ny * 7)
    chunked = rc.reconstruct_at(stack, 0.04, progress=False)
    assert single.chunks == 1 and chunked.chunks > 3
    assert chunked.mesh.is_watertight
    assert chunked.volume_mm3 == pytest.approx(single.volume_mm3, rel=1e-3)
    assert single.rel_error < 0.03


@pytest.mark.parametrize("extent,expected", [(40.0, 1.0), (1.6, 25.4), (0.04, 1000.0), (40000.0, 0.001)])
def test_unit_scale(extent, expected):
    assert _unit_scale(extent) == expected


def test_truncated_ascii_stl(tmp_path):
    from lumen_pipeline.load import load_stl

    m = sliced_annulus(layers=4)
    full = trimesh.exchange.stl.export_stl_ascii(m)
    cut = full[: int(len(full) * 0.8)]  # ends mid-facet, no endsolid
    p = tmp_path / "cut.stl"
    p.write_text(cut)
    loaded = load_stl(p)
    assert 0 < len(loaded.mesh.faces) < len(m.faces)
    assert any("truncated" in w for w in loaded.warnings)
