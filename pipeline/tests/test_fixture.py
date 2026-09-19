"""SPEC §4.9 fixture checks (skipped when private data is absent).

The P1 rows (heads / prongs / stones) land in milestone S1.3.
"""
import json

import pytest
import trimesh

from lumen_pipeline.detect_export import detect_export
from lumen_pipeline.load import load_stl
from lumen_pipeline.process import process_file
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


@pytest.fixture(scope="module")
def ingested(fixture_path, tmp_path_factory):
    out = tmp_path_factory.mktemp("assets_out")
    res = process_file(fixture_path, out, draco=False, thumb=False)
    assert res.ok, res.error
    return res, out / res.piece_id


def test_type_from_prefix(ingested):
    res, _ = ingested
    assert res.manifest["type"] == "bracelet"
    assert res.manifest["review"]["type"] == "bracelet"


def test_18k_yellow_weight(ingested):
    res, _ = ingested
    assert res.manifest["weights_g"]["18k_yellow"] == pytest.approx(10.4, abs=0.2)


def test_web_glb_size_and_nodes(ingested):
    _, folder = ingested
    web = folder / "web.glb"
    assert web.stat().st_size <= 5 * 1024 * 1024
    scene = trimesh.load(web, file_type="glb")
    assert "band" in scene.graph.nodes
    assert len(scene.to_mesh().faces) <= 60_000
    ar = trimesh.load(folder / "ar.glb", file_type="glb")
    assert len(ar.to_mesh().faces) <= 20_000


def test_manifest_written_and_opaque(ingested):
    res, folder = ingested
    data = json.loads((folder / "manifest.json").read_text())
    assert data["id"] == res.piece_id and data["id"].startswith("p_")
    assert "fixture" not in json.dumps(data).lower()  # no original filename anywhere
    assert data["segment"]["connector"] in ("butt", "hole")
    assert len(data["segment"]["ends"]) == 2


def test_arc_span_measured(ingested):
    """Measured arc span, pinned so a regression in the curve fit is caught.

    SPEC §4.9 gives 120–140°, which the spec owner has confirmed was an estimate: the
    fixture's inner surface is a clean 88° arc of R 30.5 mm (four segments make a 61 mm
    bangle), fitted with 100% RANSAC inliers.
    """
    res, _ = ingested
    assert res.manifest["curve"]["span_deg"] == pytest.approx(88.0, abs=1.0)
    assert res.manifest["curve"]["inner_radius_mm"] == pytest.approx(30.48, abs=0.05)
    assert res.manifest["curve"]["fit_inliers"] >= 0.9
