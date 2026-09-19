"""S1.3: heads, prongs, inferred stones, head nodes, publish."""
import json

import numpy as np
import pytest
import trimesh

from lumen_pipeline.curve import fit_curve
from lumen_pipeline.export import HEAD_NODE_MARGIN_MM, split_head_nodes, write_glb_nodes
from lumen_pipeline.heads import detect_array, detect_heads, stone_from_r_in
from lumen_pipeline.process import band_radius
from lumen_pipeline.publish import ASSETS, NEVER_UPLOAD, object_key, publish, spaces_config


# --- synthetic settings -----------------------------------------------------------

def prong_head(centre, axis, r_in=1.47, prong_w=1.0, prongs=4, height=2.4):
    """k prong wires standing on a common circle around `axis`, as a real setting does."""
    axis = np.asarray(axis, dtype=float)
    axis = axis / np.linalg.norm(axis)
    side = np.cross(axis, [0, 0, 1.0])
    if np.linalg.norm(side) < 1e-6:
        side = np.cross(axis, [0, 1.0, 0])
    side /= np.linalg.norm(side)
    other = np.cross(axis, side)
    ring_r = r_in + prong_w / 2
    parts = []
    for i in range(prongs):
        a = 2 * np.pi * i / prongs
        offset = ring_r * (np.cos(a) * side + np.sin(a) * other)
        cyl = trimesh.creation.cylinder(radius=prong_w / 2, height=height, sections=32)
        T = trimesh.geometry.align_vectors([0, 0, 1.0], axis)
        cyl.apply_transform(T)
        cyl.apply_translation(np.asarray(centre) + offset + axis * height / 2)
        parts.append(cyl)
    return parts


def banded_ring_with_heads(n_heads=6, inner_r=9.0, band_t=1.6, width=3.0, r_in=1.47, prong_w=1.0):
    band = trimesh.creation.annulus(r_min=inner_r, r_max=inner_r + band_t, height=width,
                                    sections=720)
    parts = [band]
    for i in range(n_heads):
        a = 2 * np.pi * i / n_heads
        radial = np.array([np.cos(a), np.sin(a), 0.0])
        parts += prong_head(radial * (inner_r + band_t), radial, r_in=r_in, prong_w=prong_w)
    return trimesh.util.concatenate(parts)


@pytest.fixture(scope="module")
def synthetic():
    mesh = banded_ring_with_heads()
    curve = fit_curve(mesh.vertices)
    heads, warnings = detect_heads(mesh, curve, band_radius(curve))
    return mesh, curve, heads, warnings


def test_synthetic_heads_found(synthetic):
    _, _, heads, warnings = synthetic
    assert len(heads) == 6, warnings
    assert all(h["prongs"] == 4 for h in heads)


def test_synthetic_prong_and_stone(synthetic):
    _, _, heads, _ = synthetic
    assert np.mean([h["prong_w_mm"] for h in heads]) == pytest.approx(1.0, abs=0.12)
    assert np.mean([h["r_in_mm"] for h in heads]) == pytest.approx(1.47, abs=0.12)
    d = heads[0]["stone"]["d_mm"]
    assert d == pytest.approx(3.0, abs=0.25)
    assert heads[0]["stone"]["source"] == "inferred"


def test_synthetic_array_spacing(synthetic):
    _, _, heads, _ = synthetic
    array = detect_array(heads)
    assert array["count"] == 6
    assert array["spacing_deg"] == pytest.approx(60.0, abs=1.0)


def test_six_prong_head_classified():
    """A 6-prong setting added on the band opposite the 4-prong ones."""
    mesh = banded_ring_with_heads(n_heads=3)
    band_outer = 9.0 + 1.6
    six = trimesh.util.concatenate(
        [mesh] + prong_head([-band_outer, 0.0, 0.0], [-1.0, 0, 0], prongs=6))
    curve = fit_curve(six.vertices)
    heads, _ = detect_heads(six, curve, band_radius(curve))
    assert sorted(h["prongs"] for h in heads) == [4, 4, 4, 6]


def test_stone_diameter_and_carat_formula():
    d, ct = stone_from_r_in(1.47)
    assert d == pytest.approx(3.0, abs=1e-9)          # 2·1.47 + 0.06, snapped to 0.05
    assert 0.09 <= ct <= 0.11                          # round brilliant ≈ 0.1 ct at Ø 3 mm
    d2, ct2 = stone_from_r_in(2.0)
    assert d2 == pytest.approx(4.05, abs=1e-9)
    assert ct2 > ct


def test_no_heads_on_plain_band():
    band = trimesh.creation.annulus(r_min=9.0, r_max=10.6, height=3.0, sections=720)
    heads, warnings = detect_heads(band, fit_curve(band.vertices), band_radius(fit_curve(band.vertices)))
    assert heads == []
    assert warnings == []


def test_array_needs_even_spacing():
    heads = [{"theta_deg": t} for t in (0.0, 10.0, 21.0, 60.0)]
    assert detect_array(heads) is None
    assert detect_array([{"theta_deg": t} for t in (0.0, 10.0, 20.0)])["spacing_deg"] == 10.0


# --- glb nodes --------------------------------------------------------------------

def test_head_nodes_labelled(tmp_path, synthetic):
    mesh, _, heads, _ = synthetic
    parts = split_head_nodes(mesh, heads)
    names = [n for n, _ in parts]
    assert names[0] == "band"
    assert names[1:] == [f"head_{i}" for i in range(len(heads))]
    assert all(len(p.faces) > 0 for _, p in parts)
    assert sum(len(p.faces) for _, p in parts) == len(mesh.faces)

    p = tmp_path / "web.glb"
    write_glb_nodes(parts, p)
    scene = trimesh.load(p, file_type="glb")
    assert {"band", "head_0"} <= set(scene.graph.nodes)


def test_head_node_radius_follows_spec(synthetic):
    mesh, _, heads, _ = synthetic
    h = heads[0]
    radius = h["r_in_mm"] + h["prong_w_mm"] + HEAD_NODE_MARGIN_MM
    part = dict(split_head_nodes(mesh, heads))["head_0"]
    origin = np.asarray(h["origin"])
    axis = np.asarray(h["axis"])
    rel = part.triangles_center - origin
    along = rel @ axis
    off = np.linalg.norm(rel - np.outer(along, axis), axis=1)
    assert off.max() <= radius + 1e-6


def test_no_heads_gives_single_band_node():
    mesh = trimesh.creation.icosphere(subdivisions=2)
    assert [n for n, _ in split_head_nodes(mesh, [])] == ["band"]


# --- publish ----------------------------------------------------------------------

def _piece_folder(root, pid="p_12345678", ptype="bracelet"):
    d = root / pid
    d.mkdir(parents=True)
    for name in ("web.glb", "ar.glb", "thumb.webp"):
        (d / name).write_bytes(b"x" * 2048)
    (d / "manifest.json").write_text(json.dumps({"id": pid, "type": ptype}))
    return d


def test_publish_dry_run_lists_assets(tmp_path):
    _piece_folder(tmp_path)
    (tmp_path / "_index.csv").write_text("id,file\np_12345678,b_secret.stl\n")
    report = publish(tmp_path, dry_run=True, env={})
    assert report.dry_run and not report.errors
    assert len(report.uploaded) == len(ASSETS)
    assert report.upserted == ["p_12345678 (bracelet)"]
    listed = " ".join(report.uploaded)
    assert "_index.csv" not in listed and ".stl" not in listed
    assert all(k.startswith("pieces/p_12345678/") for k in
               (object_key("p_12345678", n) for n in ASSETS))


def test_publish_reports_missing_asset(tmp_path):
    d = _piece_folder(tmp_path)
    (d / "thumb.webp").unlink()
    report = publish(tmp_path, dry_run=True, env={})
    assert any("thumb.webp" in s for s in report.skipped)


def test_publish_requires_credentials(tmp_path):
    _piece_folder(tmp_path)
    report = publish(tmp_path, dry_run=False, env={})
    assert report.errors and "credentials" in report.errors[0]
    assert not report.uploaded


def test_publish_never_uploads_the_index(tmp_path):
    assert "_index.csv" in NEVER_UPLOAD
    assert "_index.csv" not in ASSETS


def test_spaces_config_reports_missing_keys():
    cfg = spaces_config(env={"SPACES_KEY": "k"})
    assert "SPACES_KEY" not in cfg["missing"]
    assert "SPACES_BUCKET" in cfg["missing"]


def test_upsert_preserves_review_fields():
    from lumen_pipeline.publish import UPSERT_SQL
    sql = " ".join(UPSERT_SQL.split()).lower()
    assert "on conflict (id) do update" in sql
    assert "approved" not in sql.split("do update")[1]
    assert "name" not in sql.split("do update")[1]
    assert "collection" not in sql.split("do update")[1]
