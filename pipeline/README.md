# pipeline — Lumen asset pipeline (SPEC §4)

Python 3.11 package `lumen_pipeline`, CLI `lumen`.

```bash
cd pipeline
python3.11 -m venv .venv && .venv/bin/pip install -e '.[dev]'
.venv/bin/lumen probe ../private/stl_in/b_fixture_a.stl
.venv/bin/pytest -q
```

Modules (milestone S1.1):
- `load.py` — STL load (`force='mesh'`), vertex merge, unit sanity check (mm; rescale if max extent < 2 or > 300).
- `detect_export.py` — sliced vs solid detection (SPEC §4.1).
- `volume.py` — exact volume from mid-layer sections, `Σ area(unary_union) × t` (SPEC §4.2).
- `reconstruct.py` — rasterise layers → boolean voxel grid → marching cubes → Taubin smoothing (SPEC §4.3).
- `cli.py` — `lumen probe <file>`.

Inputs stay in `private/` (gitignored). Original filenames never appear in outputs.
