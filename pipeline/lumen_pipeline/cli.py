"""`lumen` command-line interface."""
from __future__ import annotations

import csv
import logging
import os
import multiprocessing as mp
import resource
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from contextlib import contextmanager
from pathlib import Path

import click

from .detect_export import detect_export
from .load import load_stl
from .process import process_file
from .publish import ASSETS, NEVER_UPLOAD, load_dotenv, publish, spaces_config
from .reconstruct import reconstruct
from .volume import slice_layers

INDEX_CSV = "_index.csv"


class Timings(dict):
    @contextmanager
    def stage(self, name: str):
        t = time.perf_counter()
        yield
        self[name] = time.perf_counter() - t


def _peak_rss_gb() -> float:
    rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return rss / (1024 ** 3 if sys.platform == "darwin" else 1024 ** 2)


@click.group()
@click.option("-v", "--verbose", is_flag=True)
def main(verbose: bool) -> None:
    """Lumen asset pipeline."""
    logging.basicConfig(level=logging.INFO if verbose else logging.WARNING,
                        format="%(levelname)s %(name)s: %(message)s")


@main.command()
@click.argument("file", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option("--no-recon", is_flag=True, help="Skip reconstruction (detection + slice volume only).")
@click.option("--quiet", is_flag=True, help="No progress bars.")
def probe(file: Path, no_recon: bool, quiet: bool) -> None:
    """Detect the export type, compute the exact slice volume and reconstruct."""
    tm = Timings()
    with tm.stage("load"):
        loaded = load_stl(file)
    mesh = loaded.mesh
    with tm.stage("detect"):
        det = detect_export(mesh)

    click.echo(f"faces            {len(mesh.faces):,}")
    click.echo(f"export_type      {det['export_type']}")
    if det["export_type"] != "sliced":
        click.echo("WARNING: solid export; not supported in the MVP (skipped)")
        _print_timings(tm, loaded.warnings)
        return
    click.echo(f"layer_t          {det['layer_t']:.4f} mm")
    click.echo(f"layers           {det['layers']}")
    click.echo(f"z range          {det['zmin']:.4f} .. {det['zmax']:.4f} mm")

    with tm.stage("slice+volume"):
        stack = slice_layers(mesh, det["zmin"], det["layer_t"], det["layers"], progress=not quiet)
    click.echo(f"volume_slices    {stack.volume_mm3:.2f} mm³")

    warnings = list(loaded.warnings)
    if not no_recon:
        del mesh, loaded
        with tm.stage("reconstruct"):
            rec = reconstruct(stack, progress=not quiet)
        warnings += rec.warnings
        signed = (rec.volume_mm3 - stack.volume_mm3) / stack.volume_mm3
        click.echo(f"volume_recon     {rec.volume_mm3:.2f} mm³  ({signed:+.2%} vs slices, "
                   f"{rec.res_mm:g} mm grid, {rec.chunks} chunk(s))")
        click.echo(f"recon mesh       {len(rec.mesh.faces):,} faces, watertight={rec.mesh.is_watertight}")
    _print_timings(tm, warnings)


def _print_timings(tm: Timings, warnings: list[str]) -> None:
    for w in warnings:
        click.echo(f"WARNING: {w}")
    click.echo("timings:")
    for k, v in tm.items():
        click.echo(f"  {k:<14} {v:6.2f} s")
    click.echo(f"  {'total':<14} {sum(tm.values()):6.2f} s")
    click.echo(f"peak RSS         {_peak_rss_gb():.2f} GB")


if __name__ == "__main__":
    main()


def _rows_table(rows: list[dict]) -> str:
    head = ["id", "type", "layers", "volume_mm3", "18k_yellow_g", "span_deg", "warnings"]
    widths = [max(len(h), *(len(str(r[k])) for r in rows)) if rows else len(h)
              for h, k in zip(head, head)]
    out = ["  ".join(h.ljust(w) for h, w in zip(head, widths))]
    out.append("  ".join("-" * w for w in widths))
    for r in rows:
        out.append("  ".join(str(r[k]).ljust(w) for k, w in zip(head, widths)))
    return "\n".join(out)


@main.command()
@click.argument("src", type=click.Path(exists=True, file_okay=False, path_type=Path))
@click.argument("dst", type=click.Path(file_okay=False, path_type=Path))
@click.option("--workers", "-w", default=2, show_default=True,
              help="Parallel processes (each peaks around 5 GB on large files).")
@click.option("--no-draco", is_flag=True, help="Skip Draco compression (no npx needed).")
@click.option("--no-thumb", is_flag=True, help="Skip thumbnail rendering.")
def ingest(src: Path, dst: Path, workers: int, no_draco: bool, no_thumb: bool) -> None:
    """Process every STL in SRC into piece folders under DST."""
    files = sorted(p for p in src.iterdir() if p.suffix.lower() == ".stl")
    if not files:
        raise click.ClickException(f"no .stl files in {src}")
    dst.mkdir(parents=True, exist_ok=True)
    if "private" not in dst.resolve().parts:
        click.echo(f"WARNING: {dst} is not under a private/ directory; {INDEX_CSV} maps ids to "
                   "original filenames and must never be published or committed.")

    t0 = time.perf_counter()
    rows, index, failures = [], [], []
    ctx = mp.get_context("spawn")
    with ProcessPoolExecutor(max_workers=workers, mp_context=ctx, max_tasks_per_child=1) as pool:
        futures = {pool.submit(process_file, f, dst, draco=not no_draco, thumb=not no_thumb): f
                   for f in files}
        for fut in as_completed(futures):
            f = futures[fut]
            res = fut.result()
            index.append({"id": res.piece_id, "file": f.name, "type": res.type,
                          "ok": int(res.ok), "error": res.error or ""})
            if not res.ok:
                failures.append((f.name, res.error))
                click.echo(f"FAILED {f.name}: {res.error}")
                continue
            m = res.manifest
            span = m["curve"]["span_deg"] if m.get("curve") else ""
            rows.append({"id": m["id"], "type": m["type"], "layers": m["layers"],
                         "volume_mm3": round(m["volume_mm3"], 2),
                         "18k_yellow_g": round(m["weights_g"]["18k_yellow"], 3),
                         "span_deg": span,
                         "warnings": "; ".join(res.warnings) if res.warnings else "-"})
            click.echo(f"done {f.name} -> {res.piece_id} ({res.timings.get('total', 0):.0f} s)")

    dupes = {}
    for r in index:
        dupes.setdefault(r["id"], []).append(r["file"])
    for pid, names in dupes.items():
        if len(names) > 1:
            click.echo(f"NOTE duplicate input bytes share id {pid}: {', '.join(sorted(names))}")

    with open(dst / INDEX_CSV, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["id", "file", "type", "ok", "error"])
        w.writeheader()
        w.writerows(sorted(index, key=lambda r: r["file"]))

    rows.sort(key=lambda r: (r["type"], r["id"]))
    click.echo("")
    click.echo(_rows_table(rows))
    click.echo(f"\n{len(rows)}/{len(files)} pieces in {time.perf_counter() - t0:.0f} s "
               f"({len(failures)} failed)")


@main.command("publish")
@click.argument("assets_out", type=click.Path(exists=True, file_okay=False, path_type=Path))
@click.option("--dry-run", is_flag=True, help="List what would be uploaded and upserted.")
def publish_cmd(assets_out: Path, dry_run: bool) -> None:
    """Upload piece assets to private storage and upsert the pieces rows."""
    load_dotenv()
    if not dry_run:
        if not os.environ.get("DATABASE_URL"):
            raise click.ClickException(
                "missing DATABASE_URL (see .env.example); run with --dry-run to preview")
        cfg = spaces_config()
        if cfg["missing"]:
            click.echo(
                f"No object storage configured ({', '.join(cfg['missing'])}). "
                "Assets will be stored in the database, which the app serves through the "
                "same signed URLs."
            )
    report = publish(assets_out, dry_run=dry_run)
    head = "would upload" if dry_run else "uploaded"
    for k in report.uploaded:
        click.echo(f"{head} {k}")
    for k in report.skipped:
        click.echo(f"skipped {k}")
    click.echo(f"\n{'would upsert' if dry_run else 'upserted'}: {len(report.upserted)} pieces")
    click.echo(f"never uploaded: {', '.join(NEVER_UPLOAD)}, *.stl")
    for e in report.errors:
        click.echo(f"ERROR {e}")
    if report.errors:
        raise SystemExit(1)
