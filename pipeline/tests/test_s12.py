"""S1.2: types, measurements, curve/ring/tops geometry, ends, exports, manifest."""
import json

import numpy as np
import pytest
import trimesh

from lumen_pipeline.config import ring_size_for
from lumen_pipeline.curve import fit_curve
from lumen_pipeline.ends import segment_ends
from lumen_pipeline.export import AR_TRIS, WEB_TRIS, decimate, render_thumb, write_glb
from lumen_pipeline.manifest import Manifest, piece_id
from lumen_pipeline.measure import measure, weights_g
from lumen_pipeline.ring import analyse_ring
from lumen_pipeline.tops import analyse_tops
from lumen_pipeline.types import type_from_filename


@pytest.mark.parametrize("name,expected", [
    ("b_fixture_a.stl", "bracelet"), ("b-811.stl", "bracelet"), ("B-853.stl", "bracelet"),
    ("r-5366.stl", "ring"), ("R-5356 file.stl", "ring"),
    ("t-4522.stl", "tops"), ("T-4537 (1).stl", "tops"),
    ("x-99.stl", "unknown"), ("4522.stl", "unknown"),
])
def test_prefix_type_mapping(name, expected):
    assert type_from_filename(name) == expected


def test_weights_match_spec_densities():
    w = weights_g(1000.0)  # 1000 mm³ = 1 cm³ -> weight == density
    assert w["18k_yellow"] == pytest.approx(15.5)
    assert w["pt950"] == pytest.approx(20.7)
    assert set(w) == {"14k_yellow", "14k_white", "14k_rose", "18k_yellow", "18k_white",
                      "18k_rose", "22k_yellow", "pt950"}


def test_measure_bbox_and_area():
    box = trimesh.creation.box([2, 4, 6])
    m = measure(box, 48.0)
    assert m["bbox_mm"]["size"] == [2.0, 4.0, 6.0]
    assert m["surface_mm2"] == pytest.approx(88.0)


# --- curve / ring -----------------------------------------------------------------

def torus_ring(inner_d_mm=17.0, wire_r=1.2, sections=200):
    """A plain band: torus with the given inner diameter, axis = +Z."""
    r_mid = inner_d_mm / 2 + wire_r
    return trimesh.creation.torus(major_radius=r_mid, minor_radius=wire_r,
                                  major_sections=sections, minor_sections=48)


def test_synthetic_ring_recovers_size():
    m = torus_ring(17.0)
    c = fit_curve(m.vertices)
    assert c.span_deg == pytest.approx(360.0, abs=1.0)
    assert 2 * c.inner_radius == pytest.approx(17.0, abs=0.15)
    ring, warnings = analyse_ring(m, c)
    assert ring["size_in"] == 14  # Indian 14 = Ø 17.13 mm
    assert ring["size_us"] == pytest.approx(7.0)  # US size of the snapped Indian row
    assert ring["band_w_mm"] == pytest.approx(2.4, abs=0.3)
    assert ring["band_t_mm"] == pytest.approx(2.4, abs=0.3)
    assert warnings == []


def test_ring_size_table_monotonic():
    sizes = [ring_size_for(d)["size_in"] for d in np.arange(13.0, 22.0, 0.5)]
    assert sizes == sorted(sizes)
    assert ring_size_for(17.13)["size_in"] == 14


def test_open_ring_warns():
    m = torus_ring(17.0)
    ang = np.arctan2(m.vertices[:, 1], m.vertices[:, 0]) % (2 * np.pi)
    keep = ang[m.faces].max(axis=1) < np.deg2rad(200)
    m = m.submesh([np.flatnonzero(keep)], append=True)
    _, warnings = analyse_ring(m, fit_curve(m.vertices))
    assert any("open loop" in w for w in warnings)


# --- bracelet segment + ends ------------------------------------------------------

def arc_segment(span_deg=130.0, inner_r=28.0, thickness=3.0, width=5.0, hole=False):
    """A curved band; optionally with a Ø 1.5 mm through-hole near each end (axis = Z)."""
    band = trimesh.creation.annulus(r_min=inner_r, r_max=inner_r + thickness, height=width,
                                    sections=720)
    ang = np.arctan2(band.vertices[:, 1], band.vertices[:, 0])
    keep = (ang >= 0) & (ang <= np.deg2rad(span_deg))
    seg = band.submesh([np.flatnonzero(keep[band.faces].all(axis=1))], append=True)
    seg = trimesh.Trimesh(seg.vertices, seg.faces)
    seg.fill_holes()
    if hole:
        r_mid = inner_r + thickness / 2
        cuts = []
        for a in (np.deg2rad(2.0), np.deg2rad(span_deg - 2.0)):
            cyl = trimesh.creation.cylinder(radius=0.75, height=width * 3, sections=48)
            cyl.apply_translation([r_mid * np.cos(a), r_mid * np.sin(a), 0])
            cuts.append(cyl)
        seg = seg.difference(trimesh.util.concatenate(cuts))
    return seg


def test_segment_span_and_arc_length():
    seg = arc_segment(span_deg=130.0, inner_r=28.0, thickness=3.0)
    c = fit_curve(seg.vertices)
    assert c.span_deg == pytest.approx(130.0, abs=1.5)
    assert c.inner_radius == pytest.approx(28.0, abs=0.1)
    s = segment_ends(seg, c)
    assert s["mid_radius_mm"] == pytest.approx(29.5, abs=0.3)
    assert s["arc_len_mm"] == pytest.approx(np.deg2rad(130) * 29.5, rel=0.03)
    assert s["chord_mm"] == pytest.approx(2 * 29.5 * np.sin(np.deg2rad(65)), rel=0.03)
    assert len(s["ends"]) == 2
    assert s["connector"] == "butt"


def test_segment_connector_hole_detected():
    seg = arc_segment(span_deg=130.0, hole=True)
    s = segment_ends(seg, fit_curve(seg.vertices))
    assert s["connector"] == "hole"
    assert all(e["connector"] == "hole" for e in s["ends"])
    assert all(0.6 <= h["d_mm"] <= 3.0 for e in s["ends"] for h in e["holes"])


# --- tops -------------------------------------------------------------------------

def stud_with_post(post_d=0.9, post_len=9.0):
    head = trimesh.creation.icosphere(subdivisions=3, radius=4.0)
    head.apply_scale([1.0, 1.0, 0.45])
    post = trimesh.creation.cylinder(radius=post_d / 2, height=post_len, sections=48)
    post.apply_translation([0, 0, -post_len / 2 - 1.0])
    return trimesh.util.concatenate([head, post])


def test_tops_post_and_front():
    tops, warnings = analyse_tops(stud_with_post())
    assert warnings == []
    assert tops["post"]["d_mm"] == pytest.approx(0.9, abs=0.15)
    assert np.allclose(np.abs(tops["post"]["axis"]), [0, 0, 1], atol=1e-6)
    assert tops["post"]["axis"][2] == pytest.approx(-1.0)  # post points away from the face
    assert tops["front"][2] == pytest.approx(1.0)
    assert tops["post"]["len_mm"] >= 1.5


def test_tops_pair_in_one_file_flagged():
    a = stud_with_post()
    b = stud_with_post()
    b.apply_translation([20.0, 0, 0])
    tops, warnings = analyse_tops(trimesh.util.concatenate([a, b]))
    assert tops["pair_in_file"] is True
    assert any("both earrings" in w for w in warnings)


def test_single_stud_not_flagged_as_pair():
    tops, _ = analyse_tops(stud_with_post())
    assert tops["pair_in_file"] is False


def test_tops_without_post_warns():
    head = trimesh.creation.icosphere(subdivisions=3, radius=4.0)
    head.apply_scale([1.0, 1.0, 0.45])
    tops, warnings = analyse_tops(head)
    assert tops["post"] is None
    assert any("post not modelled" in w for w in warnings)


# --- exports + manifest -----------------------------------------------------------

def test_decimate_and_glb_limits(tmp_path):
    m = trimesh.creation.icosphere(subdivisions=6)  # ~80k faces
    web = decimate(m, WEB_TRIS)
    ar = decimate(m, AR_TRIS)
    assert len(web.faces) <= WEB_TRIS and len(ar.faces) <= AR_TRIS
    p = tmp_path / "web.glb"
    write_glb(web, p, node_name="band")
    assert p.stat().st_size <= 5 * 1024 * 1024
    scene = trimesh.load(p, file_type="glb")
    assert "band" in scene.graph.nodes


def test_thumb_render(tmp_path):
    p = tmp_path / "thumb.webp"
    used = render_thumb(trimesh.creation.icosphere(subdivisions=3, radius=5), p)
    assert used in ("pyrender", "matplotlib")
    from PIL import Image
    with Image.open(p) as im:
        assert im.size == (1024, 1024)


def test_piece_id_is_opaque_and_stable(tmp_path):
    f = tmp_path / "b_secret_name.stl"
    f.write_bytes(b"solid x\nendsolid x\n")
    pid = piece_id(f)
    assert pid.startswith("p_") and len(pid) == 10
    assert piece_id(f) == pid
    g = tmp_path / "different.stl"
    g.write_bytes(b"solid y\nendsolid y\n")
    assert piece_id(g) != pid


def test_manifest_schema_validates():
    m = Manifest(id="p_12345678", type="bracelet", layers=673, layer_t=0.0508,
                 volume_mm3=671.5, volume_recon_mm3=671.5,
                 weights_g=weights_g(671.5), bbox_mm={"min": [0, 0, 0], "max": [1, 1, 1],
                                                      "size": [1, 1, 1]},
                 surface_mm2=2250.8, review={"status": "pending", "type": "bracelet"})
    d = json.loads(m.model_dump_json())
    for key in ("id", "type", "layers", "layer_t", "volume_mm3", "volume_recon_mm3", "weights_g",
                "bbox_mm", "curve", "heads", "stones", "array", "segment", "ring", "tops",
                "warnings", "review"):
        assert key in d
    assert d["review"]["status"] == "pending"
    with pytest.raises(Exception):
        Manifest(id="p_1", type="ring")  # missing required fields


def test_manifest_never_contains_filenames(tmp_path):
    f = tmp_path / "b_studio_signature_piece.stl"
    f.write_bytes(b"solid x\nendsolid x\n")
    m = Manifest(id=piece_id(f), type="bracelet", layers=1, layer_t=0.05, volume_mm3=1.0,
                 volume_recon_mm3=1.0, weights_g=weights_g(1.0),
                 bbox_mm={"min": [0, 0, 0], "max": [1, 1, 1], "size": [1, 1, 1]},
                 surface_mm2=1.0, review={"status": "pending", "type": "bracelet"})
    assert "studio_signature" not in m.model_dump_json()
