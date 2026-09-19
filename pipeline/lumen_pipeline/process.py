"""End-to-end processing of one STL into a piece folder (SPEC §4)."""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import trimesh

from .curve import fit_curve
from .detect_export import detect_export
from .ends import segment_ends
from .export import (AR_TRIS, WEB_TRIS, decimate, draco_compress, render_thumb,
                     split_head_nodes, write_glb, write_glb_nodes, write_manifest)
from .heads import detect_array, detect_heads
from .load import load_stl
from .manifest import Manifest, piece_id
from .measure import measure
from .reconstruct import reconstruct
from .ring import analyse_ring
from .tops import analyse_tops
from .types import type_from_filename
from .volume import slice_layers

log = logging.getLogger(__name__)

ANALYSIS_TRIS = 300_000
BRACELET_SPAN_MIN_DEG = 20.0


@dataclass
class Result:
    piece_id: str
    type: str
    ok: bool
    manifest: dict | None = None
    warnings: list[str] = field(default_factory=list)
    timings: dict[str, float] = field(default_factory=dict)
    error: str | None = None


def band_radius(curve) -> float:
    """Outer radius of the band itself: a low percentile of the per-bin maxima excludes heads."""
    mx = curve.bins_max_r[np.isfinite(curve.bins_max_r)]
    return float(np.percentile(mx, 25)) if len(mx) else float(curve.inner_radius)


def _curve_model(curve) -> dict:
    outer = band_radius(curve)
    return {
        "inner_radius_mm": round(float(curve.inner_radius), 4),
        "span_deg": round(float(curve.span_deg), 3),
        "plane_normal": [round(float(x), 5) for x in curve.frame.normal],
        "center": [round(float(x), 4) for x in curve.frame.center],
        "ref_dir": [round(float(x), 5) for x in curve.frame.u],
        "start_deg": round(float(np.rad2deg(curve.start_rad) % 360), 3),
        "end_deg": round(float(np.rad2deg(curve.end_rad) % 360), 3),
        "outer_radius_mm": round(outer, 4),
        "fit_inliers": round(float(curve.inliers), 3),
    }


def process_file(path: str | Path, out_root: str | Path, *, draco: bool = True,
                 thumb: bool = True, progress: bool = False) -> Result:
    path, out_root = Path(path), Path(out_root)
    pid = piece_id(path)
    ptype = type_from_filename(path)
    t0 = time.perf_counter()
    timings: dict[str, float] = {}
    warnings: list[str] = []

    def stage(name: str, start: float) -> float:
        timings[name] = time.perf_counter() - start
        return time.perf_counter()

    try:
        t = time.perf_counter()
        loaded = load_stl(path)
        warnings += loaded.warnings
        mesh = loaded.mesh
        t = stage("load", t)

        det = detect_export(mesh)
        t = stage("detect", t)
        if det["export_type"] != "sliced":
            return Result(pid, ptype, False, warnings=warnings + ["solid export; skipped (SPEC §4.1)"],
                          timings=timings, error="solid export")

        stack = slice_layers(mesh, det["zmin"], det["layer_t"], det["layers"], progress=progress)
        t = stage("slice", t)
        del mesh, loaded

        rec = reconstruct(stack, progress=progress)
        warnings += rec.warnings
        recon = rec.mesh
        t = stage("reconstruct", t)

        meas = measure(recon, stack.volume_mm3)
        analysis = decimate(recon, ANALYSIS_TRIS)
        t = stage("measure", t)

        curve = segment = ring = tops = None
        heads: list[dict] = []
        stones: list[dict] = []
        array = None
        if ptype in ("bracelet", "ring"):
            c = fit_curve(analysis.vertices)
            curve = _curve_model(c)
            heads, w = detect_heads(recon, c, band_radius(c))
            warnings += w
            stones = [h["stone"] for h in heads if h.get("stone")]
            array = detect_array(heads)
            if c.inliers < 0.5:
                warnings.append(f"curve: weak circle fit ({c.inliers:.0%} inliers)")
            if ptype == "bracelet":
                if c.span_deg < BRACELET_SPAN_MIN_DEG:
                    warnings.append(f"bracelet: span {c.span_deg:.1f}° looks too small for a segment")
                segment = segment_ends(recon, c)
            else:
                ring, w = analyse_ring(analysis, c)
                warnings += w
        elif ptype == "tops":
            tops, w = analyse_tops(analysis)
            warnings += w
        else:
            warnings.append("type: unknown filename prefix; needs review")
        t = stage("geometry", t)

        out = out_root / pid
        out.mkdir(parents=True, exist_ok=True)
        web = decimate(recon, WEB_TRIS)
        ar = decimate(recon, AR_TRIS)
        write_glb_nodes(split_head_nodes(web, heads), out / "web.glb")
        write_glb(ar, out / "ar.glb", node_name="band")  # one node: instanced in AR
        t = stage("glb", t)

        if draco:
            for name in ("web.glb", "ar.glb"):
                if not draco_compress(out / name):
                    warnings.append(f"{name}: Draco compression unavailable")
            t = stage("draco", t)

        if thumb:
            used = render_thumb(web, out / "thumb.webp")
            if used is None:
                warnings.append("thumb: render failed")
            t = stage("thumb", t)

        manifest = Manifest(
            id=pid, type=ptype, layers=det["layers"], layer_t=round(float(det["layer_t"]), 6),
            volume_mm3=round(stack.volume_mm3, 4), volume_recon_mm3=round(rec.volume_mm3, 4),
            weights_g=meas["weights_g"], bbox_mm=meas["bbox_mm"], surface_mm2=meas["surface_mm2"],
            curve=curve, segment=segment, ring=ring, tops=tops,
            heads=heads, stones=stones, array=array,
            warnings=warnings, review={"status": "pending", "type": ptype},
        )
        write_manifest(manifest, out / "manifest.json")
        timings["total"] = time.perf_counter() - t0
        return Result(pid, ptype, True, manifest=manifest.model_dump(mode="json"),
                      warnings=warnings, timings=timings)
    except Exception as e:  # one bad file must not stop a batch
        log.exception("processing failed")
        timings["total"] = time.perf_counter() - t0
        return Result(pid, ptype, False, warnings=warnings, timings=timings, error=f"{type(e).__name__}: {e}")
