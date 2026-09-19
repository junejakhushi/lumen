"""Per-piece outputs: web.glb, ar.glb, thumb.webp, manifest.json (SPEC §4.8)."""
from __future__ import annotations

import json
import logging
import subprocess
from pathlib import Path

import fast_simplification
import numpy as np
import trimesh

log = logging.getLogger(__name__)

WEB_TRIS = 60_000
AR_TRIS = 20_000
THUMB_PX = 1024
BG_RGB = (0xF5 / 255, 0xF0 / 255, 0xE8 / 255)  # paper ivory
GOLD_RGB = (0.78, 0.62, 0.32)
DRACO_TIMEOUT_S = 180


def decimate(mesh: trimesh.Trimesh, target_tris: int, rounds: int = 4) -> trimesh.Trimesh:
    """Simplify to at most target_tris. Repeated because one pass can stop short on
    topologically busy meshes (many small shells, holes)."""
    if len(mesh.faces) <= target_tris:
        return mesh.copy()
    # Round to float32 (what glTF stores anyway): at full float64 precision the simplifier
    # stalls part-way on these reconstructions instead of reaching the target.
    out = trimesh.Trimesh(np.asarray(mesh.vertices, dtype=np.float32).astype(np.float64),
                          mesh.faces, process=False)
    for i in range(rounds):
        before = len(out.faces)
        v, f = fast_simplification.simplify(out.vertices, out.faces.astype(np.int32),
                                            target_count=target_tris, agg=7 + 2 * i)
        out = trimesh.Trimesh(v, f, process=False)
        out.merge_vertices()
        out.update_faces(out.nondegenerate_faces())
        out.remove_unreferenced_vertices()
        if len(out.faces) <= target_tris:
            break
        if len(out.faces) > 0.98 * before:  # no further progress possible
            log.warning("decimate: stalled at %d faces (target %d)", len(out.faces), target_tris)
            break
    if out.volume < 0:
        out.invert()
    return out


def write_glb(mesh: trimesh.Trimesh, path: Path, node_name: str = "band") -> None:
    scene = trimesh.Scene()
    scene.add_geometry(mesh, node_name=node_name, geom_name=node_name)
    path.write_bytes(scene.export(file_type="glb"))


def draco_compress(path: Path) -> bool:
    """In-place Draco compression with the gltf-transform CLI. False if unavailable."""
    tmp = path.with_suffix(".draco.glb")
    try:
        r = subprocess.run(["npx", "--yes", "@gltf-transform/cli", "draco", str(path), str(tmp)],
                           capture_output=True, timeout=DRACO_TIMEOUT_S)
    except (OSError, subprocess.TimeoutExpired) as e:
        log.warning("draco: %s", e)
        return False
    if r.returncode != 0 or not tmp.exists():
        log.warning("draco failed: %s", r.stderr.decode()[-300:])
        tmp.unlink(missing_ok=True)
        return False
    tmp.replace(path)
    return True


def _camera_dir(mesh: trimesh.Trimesh) -> np.ndarray:
    """A three-quarter view: from the thin axis, tilted toward the long axis."""
    ext = mesh.extents
    thin = int(np.argmin(ext))
    long_ = int(np.argmax(ext))
    if long_ == thin:  # near-isotropic (a sphere); any stable pair will do
        long_ = (thin + 1) % 3
    third = 3 - thin - long_
    d = np.zeros(3)
    d[thin] = np.cos(np.deg2rad(25))
    d[long_] = np.sin(np.deg2rad(25)) * 0.6
    d[third] = np.sin(np.deg2rad(20))
    return d / np.linalg.norm(d)


def _camera_pose(mesh: trimesh.Trimesh) -> tuple[np.ndarray, float]:
    d = _camera_dir(mesh)
    up = np.array([0.0, 0.0, 1.0])
    if abs(d @ up) > 0.9:
        up = np.array([0.0, 1.0, 0.0])
    x = np.cross(up, d)
    x /= np.linalg.norm(x)
    y = np.cross(d, x)
    centre = mesh.bounds.mean(axis=0)
    radius = float(np.linalg.norm(mesh.extents) / 2)
    pose = np.eye(4)
    pose[:3, 0], pose[:3, 1], pose[:3, 2] = x, y, d
    pose[:3, 3] = centre + d * radius * 3
    local = (mesh.vertices - centre) @ np.column_stack([x, y])
    mag = float(np.abs(local).max() * 1.12)
    return pose, mag


def _render_pyrender(mesh: trimesh.Trimesh, path: Path) -> bool:
    try:
        import pyrender
        from PIL import Image

        pose, mag = _camera_pose(mesh)
        material = pyrender.MetallicRoughnessMaterial(
            baseColorFactor=(*GOLD_RGB, 1.0), metallicFactor=1.0, roughnessFactor=0.28)
        scene = pyrender.Scene(bg_color=(*BG_RGB, 1.0), ambient_light=(0.35, 0.33, 0.30))
        scene.add(pyrender.Mesh.from_trimesh(mesh, material=material, smooth=True))
        scene.add(pyrender.OrthographicCamera(xmag=mag, ymag=mag, znear=0.01,
                                              zfar=mag * 100), pose=pose)
        key = pose.copy()
        scene.add(pyrender.DirectionalLight(color=(1.0, 0.97, 0.92), intensity=4.0), pose=key)
        fill = pose.copy()
        fill[:3, 3] = mesh.bounds.mean(axis=0) - pose[:3, 2] * mag * 4 + pose[:3, 0] * mag * 4
        scene.add(pyrender.DirectionalLight(color=(0.95, 0.95, 1.0), intensity=2.0), pose=fill)
        r = pyrender.OffscreenRenderer(THUMB_PX, THUMB_PX)
        try:
            colour, _ = r.render(scene)
        finally:
            r.delete()
        Image.fromarray(colour).save(path, "WEBP", quality=88, method=4)
        return True
    except Exception as e:  # no GL context (CI), driver issues, ...
        log.warning("pyrender unavailable (%s); falling back to matplotlib", e)
        return False


def _render_matplotlib(mesh: trimesh.Trimesh, path: Path) -> bool:
    """Orthographic painter's-algorithm render with flat Lambert shading."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from matplotlib.collections import PolyCollection
        from PIL import Image

        pose, mag = _camera_pose(mesh)
        x, y, d = pose[:3, 0], pose[:3, 1], pose[:3, 2]
        centre = mesh.bounds.mean(axis=0)
        tris = mesh.vertices[mesh.faces] - centre
        front = mesh.face_normals @ d > 0
        tris, normals = tris[front], mesh.face_normals[front]
        depth = (tris @ d).mean(axis=1)
        order = np.argsort(depth)
        tris, normals = tris[order], normals[order]
        proj = np.stack([tris @ x, tris @ y], axis=-1)

        light = (d * 0.6 + y * 0.6 + x * 0.35)
        light /= np.linalg.norm(light)
        lam = np.clip(normals @ light, 0, 1)
        spec = np.clip(normals @ light, 0, 1) ** 24
        shade = np.clip(0.28 + 0.75 * lam, 0, 1)[:, None] * np.array(GOLD_RGB) + spec[:, None] * 0.55
        fig = plt.figure(figsize=(THUMB_PX / 100, THUMB_PX / 100), dpi=100)
        ax = fig.add_axes([0, 0, 1, 1])
        ax.set_facecolor(BG_RGB)
        fig.patch.set_facecolor(BG_RGB)
        ax.add_collection(PolyCollection(proj, facecolors=np.clip(shade, 0, 1), linewidths=0))
        ax.set_xlim(-mag, mag)
        ax.set_ylim(-mag, mag)
        ax.set_aspect("equal")
        ax.axis("off")
        tmp = path.with_suffix(".png")
        fig.savefig(tmp, facecolor=BG_RGB)
        plt.close(fig)
        Image.open(tmp).convert("RGB").save(path, "WEBP", quality=88, method=4)
        tmp.unlink(missing_ok=True)
        return True
    except Exception as e:
        log.warning("thumbnail render failed: %s", e)
        return False


def render_thumb(mesh: trimesh.Trimesh, path: Path) -> str | None:
    """1024² WEBP on paper ivory. Returns the renderer used, or None if both failed."""
    if _render_pyrender(mesh, path):
        return "pyrender"
    if _render_matplotlib(mesh, path):
        return "matplotlib"
    return None


def write_manifest(manifest, path: Path) -> None:
    path.write_text(json.dumps(manifest.model_dump(mode="json"), indent=1))
