"""`lumen` command-line interface."""
from __future__ import annotations

import logging
import resource
import sys
import time
from contextlib import contextmanager
from pathlib import Path

import click

from .detect_export import detect_export
from .load import load_stl
from .reconstruct import reconstruct
from .volume import slice_layers


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
