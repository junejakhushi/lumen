"""Publish piece folders to private storage and the database (SPEC §4, §9).

Uploads `web.glb`, `ar.glb`, `thumb.webp` and `manifest.json` for each piece to the private
DigitalOcean Spaces bucket under `pieces/<id>/` (S3-compatible, AES256 at rest, private ACL)
and upserts the `pieces` row. STLs and `_index.csv` are never uploaded: the index maps opaque
ids back to original filenames and stays on the pipeline machine.
"""
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path

log = logging.getLogger(__name__)

ASSETS = ("web.glb", "ar.glb", "thumb.webp", "manifest.json")
NEVER_UPLOAD = ("_index.csv",)
CONTENT_TYPES = {".glb": "model/gltf-binary", ".webp": "image/webp", ".json": "application/json"}
KEY_PREFIX = "pieces"

UPSERT_SQL = """
INSERT INTO pieces (id, manifest, approved, type)
VALUES (%(id)s, %(manifest)s, false, %(type)s)
ON CONFLICT (id) DO UPDATE
SET manifest = EXCLUDED.manifest, type = EXCLUDED.type
"""  # approved / name / collection are owned by the atelier review tool, never overwritten


@dataclass
class PublishReport:
    uploaded: list[str] = field(default_factory=list)
    upserted: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    dry_run: bool = False


def load_dotenv(path: str | Path = Path(__file__).resolve().parents[2] / ".env") -> dict:
    """Read KEY=VALUE lines from the repo-root .env into os.environ (without overriding)."""
    path = Path(path)
    loaded: dict[str, str] = {}
    if not path.exists():
        return loaded
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        if value and key not in os.environ:
            os.environ[key] = value
            loaded[key] = value
    return loaded


def piece_folders(root: str | Path) -> list[Path]:
    return sorted(p for p in Path(root).iterdir() if p.is_dir() and p.name.startswith("p_"))


def spaces_config(env: dict | None = None) -> dict:
    e = os.environ if env is None else env
    cfg = {k: e.get(k, "") for k in
           ("SPACES_KEY", "SPACES_SECRET", "SPACES_BUCKET", "SPACES_REGION", "SPACES_ENDPOINT")}
    cfg["missing"] = [k for k, v in cfg.items() if not v]
    return cfg


def _client(cfg: dict):
    import boto3

    return boto3.client("s3", region_name=cfg["SPACES_REGION"], endpoint_url=cfg["SPACES_ENDPOINT"],
                        aws_access_key_id=cfg["SPACES_KEY"],
                        aws_secret_access_key=cfg["SPACES_SECRET"])


def object_key(piece_id: str, name: str) -> str:
    return f"{KEY_PREFIX}/{piece_id}/{name}"


def publish(root: str | Path, *, dry_run: bool = False, env: dict | None = None) -> PublishReport:
    root = Path(root)
    report = PublishReport(dry_run=dry_run)
    folders = piece_folders(root)
    if not folders:
        report.errors.append(f"no piece folders in {root}")
        return report

    cfg = spaces_config(env)
    e = os.environ if env is None else env
    database_url = e.get("DATABASE_URL", "")
    client = None
    conn = None
    if not dry_run:
        if cfg["missing"]:
            report.errors.append(f"missing storage credentials: {', '.join(cfg['missing'])}")
            return report
        if not database_url:
            report.errors.append("missing DATABASE_URL")
            return report
        client = _client(cfg)
        import psycopg

        conn = psycopg.connect(database_url)

    try:
        for folder in folders:
            manifest_path = folder / "manifest.json"
            if not manifest_path.exists():
                report.errors.append(f"{folder.name}: no manifest.json; skipped")
                continue
            manifest = json.loads(manifest_path.read_text())
            for name in ASSETS:
                path = folder / name
                if not path.exists():
                    report.skipped.append(f"{folder.name}/{name} (missing)")
                    continue
                key = object_key(folder.name, name)
                if dry_run:
                    report.uploaded.append(f"{key} ({path.stat().st_size // 1024} kB)")
                    continue
                client.put_object(
                    Bucket=cfg["SPACES_BUCKET"], Key=key, Body=path.read_bytes(),
                    ACL="private", ServerSideEncryption="AES256",
                    ContentType=CONTENT_TYPES.get(path.suffix, "application/octet-stream"),
                    CacheControl="private, no-store")
                report.uploaded.append(key)

            row = {"id": manifest["id"], "manifest": json.dumps(manifest), "type": manifest["type"]}
            if dry_run:
                report.upserted.append(f"{row['id']} ({row['type']})")
            else:
                with conn.cursor() as cur:
                    cur.execute(UPSERT_SQL, row)
                report.upserted.append(row["id"])
        if conn is not None:
            conn.commit()
    finally:
        if conn is not None:
            conn.close()
    return report
