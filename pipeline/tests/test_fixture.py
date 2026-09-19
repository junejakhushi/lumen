"""SPEC §4.9 fixture checks for S1.1 (skipped when private data is absent)."""
import pytest

from lumen_pipeline.detect_export import detect_export
from lumen_pipeline.load import load_stl
from lumen_pipeline.reconstruct import reconstruct
from lumen_pipeline.volume import slice_layers


@pytest.fixture(scope="module")
def fixture_run(fixture_path):
    mesh = load_stl(fixture_path).mesh
    det = detect_export(mesh)
    stack = slice_layers(mesh, det["zmin"], det["layer_t"], det["layers"], progress=False)
    return det, stack


def test_detect(fixture_run):
    det, _ = fixture_run
    assert det["export_type"] == "sliced"
    assert det["layer_t"] == pytest.approx(0.0508, abs=0.0005)
    assert det["layers"] == 673


def test_volume_slices(fixture_run):
    _, stack = fixture_run
    assert stack.volume_mm3 == pytest.approx(671.5, rel=0.01)


def test_recon_within_3pct(fixture_run):
    _, stack = fixture_run
    rec = reconstruct(stack, progress=False)
    assert rec.rel_error <= 0.03
    assert rec.mesh.is_watertight
    assert rec.mesh.volume > 0
