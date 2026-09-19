# pipeline — Lumen asset pipeline (SPEC §4)

Python 3.11 package `lumen_pipeline`, CLI `lumen`.

```bash
cd pipeline
python3.11 -m venv .venv && .venv/bin/pip install -e '.[dev]'
.venv/bin/lumen probe ../private/stl_in/b_fixture_a.stl
.venv/bin/lumen ingest ../private/stl_in ../private/assets_out --workers 2
.venv/bin/pytest -q
```

## Modules

S1.1 — core:
- `load.py` — STL load (`force='mesh'`), vertex merge, unit sanity check (mm; rescale if max
  extent < 2 or > 300), salvage of ASCII files that end mid-facet.
- `detect_export.py` — sliced vs solid detection (SPEC §4.1).
- `volume.py` — exact volume from mid-layer sections, `Σ area(unary_union) × t` (SPEC §4.2).
- `reconstruct.py` — rasterise layers → boolean voxel grid → marching cubes → Taubin smoothing,
  z-chunked above 150M voxels, 0.03 mm retry if the volume is off by more than 3% (SPEC §4.3).

S1.2 — measurement and export:
- `config.py` — alloy densities, filename-prefix → type map, Indian/US ring-size table.
- `types.py` — type from the filename prefix (`b`/`r`/`t`, else `unknown`).
- `measure.py` — weights per alloy, bbox, surface area (SPEC §4.4).
- `curve.py` — PCA plane → 1° angle bins → per-bin min radius → RANSAC circle → inner radius,
  arc span, plane frame (SPEC §4.5).
- `ring.py` — closed-loop check, inner Ø → ring size, band width/thickness, head angle.
- `tops.py` — post detection (thin round protrusion) and front direction.
- `ends.py` — bracelet segment ends, connector guess, chord and arc length (SPEC §4.7).
- `sections.py` — shared planar-section helper.
- `export.py` — decimation, GLB (node `band`), Draco via `npx @gltf-transform/cli`,
  1024² WEBP thumbnail (pyrender, matplotlib fallback).
- `manifest.py` — pydantic manifest schema and opaque ids (`p_` + 8 hex of the file sha256).
- `process.py` — one STL → one piece folder.
- `cli.py` — `lumen probe`, `lumen ingest`.

## Outputs

`<out>/<id>/web.glb`, `ar.glb`, `thumb.webp`, `manifest.json`, plus `<out>/_index.csv`
(id → original filename; local only, never published or committed).

Inputs and outputs live under `private/` (gitignored). Original filenames never appear in
manifests or GLB files.

## Notes

- Thumbnails use pyrender when a GL context is available and fall back to a matplotlib
  orthographic render (CI has no GL).
- Draco needs `npx`; without it the GLBs are written uncompressed and a warning is recorded.
- `--workers 2` is the default: large pieces peak around 5 GB per process.
