"""Manifest schema and opaque ids (SPEC §4.8). Original filenames never appear here."""
from __future__ import annotations

import hashlib
from pathlib import Path

from pydantic import BaseModel, Field


def piece_id(path: str | Path) -> str:
    """p_ + the first 8 hex characters of the sha256 of the file bytes."""
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 22), b""):
            h.update(chunk)
    return "p_" + h.hexdigest()[:8]


class BBox(BaseModel):
    min: list[float]
    max: list[float]
    size: list[float]


class CurveModel(BaseModel):
    inner_radius_mm: float
    span_deg: float
    plane_normal: list[float]
    center: list[float]
    ref_dir: list[float]  # in-plane direction of θ = 0
    start_deg: float
    end_deg: float
    outer_radius_mm: float
    fit_inliers: float


class Stone(BaseModel):
    d_mm: float
    ct_est: float
    source: str = "inferred"


class Head(BaseModel):
    axis: list[float]
    origin: list[float]
    prongs: int
    prong_w_mm: float
    r_in_mm: float
    theta_deg: float | None = None
    rise_mm: float | None = None
    run_mm: float | None = None
    stone: Stone | None = None  # placement for the app's procedural gem


class ArrayInfo(BaseModel):
    count: int
    spacing_deg: float


class EndInfo(BaseModel):
    center: list[float]
    tangent: list[float]
    theta_deg: float
    area_mm2: float
    connector: str
    holes: list[dict] = Field(default_factory=list)


class Segment(BaseModel):
    chord_mm: float
    arc_len_mm: float
    mid_radius_mm: float
    band_t_mm: float
    ends: list[EndInfo]
    connector: str


class RingInfo(BaseModel):
    inner_d_mm: float
    size_in: int
    size_us: float
    size_circ_mm: float
    band_w_mm: float
    band_t_mm: float
    top_angle_deg: float


class Post(BaseModel):
    origin: list[float]
    axis: list[float]
    len_mm: float
    d_mm: float


class TopsInfo(BaseModel):
    front: list[float]
    pair_in_file: bool = False  # the file already holds both earrings
    post: Post | None = None


class Review(BaseModel):
    status: str = "pending"
    type: str
    name: str | None = None
    collection: str | None = None
    overrides: dict = Field(default_factory=dict)


class Manifest(BaseModel):
    id: str
    type: str
    units: str = "mm"
    layers: int
    layer_t: float
    volume_mm3: float
    volume_recon_mm3: float
    weights_g: dict[str, float]
    bbox_mm: BBox
    surface_mm2: float
    curve: CurveModel | None = None
    heads: list[Head] = Field(default_factory=list)
    stones: list[Stone] = Field(default_factory=list)
    array: ArrayInfo | None = None
    segment: Segment | None = None
    ring: RingInfo | None = None
    tops: TopsInfo | None = None
    warnings: list[str] = Field(default_factory=list)
    review: Review
