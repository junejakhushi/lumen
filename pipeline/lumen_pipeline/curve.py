"""Curve-plane geometry for bracelets and rings (SPEC §4.5).

PCA plane -> 2D projection -> 1° angle bins -> per-bin minimum radius ->
RANSAC circle -> inner radius, arc span, plane frame.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

BINS = 360
RANSAC_ITERS = 400
RANSAC_TOL_MM = 0.05
CLOSED_GAP_DEG = 3.0  # a gap smaller than this is tessellation, not an opening
REFINE_ROUNDS = 3


@dataclass
class CurveFrame:
    center: np.ndarray  # world, mm
    normal: np.ndarray  # unit plane normal
    u: np.ndarray  # in-plane reference direction (θ = 0)
    v: np.ndarray  # normal × u

    def to_local(self, pts: np.ndarray) -> np.ndarray:
        """World -> (x_u, y_v, z_n) in the curve frame."""
        d = pts - self.center
        return np.column_stack([d @ self.u, d @ self.v, d @ self.normal])

    def polar(self, pts: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        loc = self.to_local(pts)
        return np.arctan2(loc[:, 1], loc[:, 0]), np.hypot(loc[:, 0], loc[:, 1]), loc[:, 2]

    def direction(self, theta: float) -> np.ndarray:
        return np.cos(theta) * self.u + np.sin(theta) * self.v


@dataclass
class Curve:
    frame: CurveFrame
    inner_radius: float
    span_deg: float
    start_rad: float  # arc runs counter-clockwise (about normal) from start to end
    end_rad: float
    bins_min_r: np.ndarray  # per-bin min radius (nan where empty), bin i covers [i°, i+1°) from start
    bins_max_r: np.ndarray
    inliers: float  # RANSAC inlier fraction

    @property
    def mid_rad(self) -> float:
        return self.start_rad + np.deg2rad(self.span_deg) / 2

    def bin_angle(self, i: int | np.ndarray) -> np.ndarray:
        """Centre angle of bin i (bins start at start_rad and run counter-clockwise)."""
        return self.start_rad + np.deg2rad(np.asarray(i) + 0.5)


def _unit(v: np.ndarray) -> np.ndarray:
    return v / np.linalg.norm(v)


def _canonical_sign(v: np.ndarray) -> np.ndarray:
    return v if v[np.argmax(np.abs(v))] >= 0 else -v


def pca_frame(pts: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    c = pts.mean(axis=0)
    _, _, vt = np.linalg.svd(pts[:: max(1, len(pts) // 200_000)] - c, full_matrices=False)
    u = _canonical_sign(vt[0])
    n = _canonical_sign(vt[2])
    v = np.cross(n, u)
    return c, u, v, n


def fit_circle_lsq(xy: np.ndarray) -> tuple[np.ndarray, float]:
    """Algebraic (Kåsa) least-squares circle."""
    A = np.column_stack([2 * xy, np.ones(len(xy))])
    b = (xy ** 2).sum(axis=1)
    sol, *_ = np.linalg.lstsq(A, b, rcond=None)
    c = sol[:2]
    return c, float(np.sqrt(sol[2] + c @ c))


def _circle3(p: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Circles through point triples p (k, 3, 2) -> centres (k, 2), radii (k,)."""
    a, b, c = p[:, 0], p[:, 1], p[:, 2]
    d = 2 * (a[:, 0] * (b[:, 1] - c[:, 1]) + b[:, 0] * (c[:, 1] - a[:, 1]) + c[:, 0] * (a[:, 1] - b[:, 1]))
    d = np.where(np.abs(d) < 1e-12, np.nan, d)
    a2, b2, c2 = (a ** 2).sum(1), (b ** 2).sum(1), (c ** 2).sum(1)
    ux = (a2 * (b[:, 1] - c[:, 1]) + b2 * (c[:, 1] - a[:, 1]) + c2 * (a[:, 1] - b[:, 1])) / d
    uy = (a2 * (c[:, 0] - b[:, 0]) + b2 * (a[:, 0] - c[:, 0]) + c2 * (b[:, 0] - a[:, 0])) / d
    cen = np.column_stack([ux, uy])
    return cen, np.linalg.norm(a - cen, axis=1)


def ransac_circle(xy: np.ndarray, iters: int = RANSAC_ITERS, tol: float = RANSAC_TOL_MM,
                  seed: int = 0) -> tuple[np.ndarray, float, np.ndarray]:
    rng = np.random.default_rng(seed)
    idx = np.array([rng.choice(len(xy), 3, replace=False) for _ in range(iters)])
    cen, rad = _circle3(xy[idx])
    ok = np.isfinite(rad)
    cen, rad = cen[ok], rad[ok]
    dist = np.abs(np.linalg.norm(xy[None, :, :] - cen[:, None, :], axis=2) - rad[:, None])
    counts = (dist < tol).sum(axis=1)
    best = np.argmax(counts)
    inl = dist[best] < tol
    c, r = fit_circle_lsq(xy[inl]) if inl.sum() >= 3 else (cen[best], rad[best])
    # re-collect inliers around the refined circle
    inl = np.abs(np.linalg.norm(xy - c, axis=1) - r) < tol
    return c, r, inl


def _bin_extrema(theta: np.ndarray, r: np.ndarray, start: float) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    b = (np.floor(np.rad2deg((theta - start) % (2 * np.pi))).astype(int)) % BINS
    order = np.lexsort((r, b))  # sort by bin, then radius
    bs = b[order]
    first = np.r_[0, np.flatnonzero(np.diff(bs)) + 1]
    last = np.r_[first[1:] - 1, len(bs) - 1]
    min_idx = np.full(BINS, -1)
    min_r = np.full(BINS, np.nan)
    max_r = np.full(BINS, np.nan)
    min_idx[bs[first]] = order[first]
    min_r[bs[first]] = r[order[first]]
    max_r[bs[last]] = r[order[last]]
    return min_idx, min_r, max_r


def _arc_start(theta: np.ndarray) -> tuple[float, float]:
    """Start angle (just after the largest angular gap) and span in degrees.

    Exact rather than bin-quantised: the arc runs counter-clockwise from the angle
    following the widest empty gap to the angle preceding it.
    """
    t = np.sort(theta % (2 * np.pi))
    gaps = np.diff(np.r_[t, t[0] + 2 * np.pi])
    i = int(np.argmax(gaps))
    gap = float(gaps[i])
    if gap < np.deg2rad(CLOSED_GAP_DEG):  # closed loop (allowing for coarse tessellation)
        return float(t[0]), 360.0
    start = float(t[(i + 1) % len(t)])
    return start, float(np.rad2deg(2 * np.pi - gap))


def fit_curve(pts: np.ndarray) -> Curve:
    c0, u, v, n = pca_frame(pts)
    loc = (pts - c0) @ np.column_stack([u, v])
    center2, _ = fit_circle_lsq(loc)
    inl_frac = 0.0
    for _ in range(REFINE_ROUNDS):
        rel = loc - center2
        theta = np.arctan2(rel[:, 1], rel[:, 0])
        r = np.hypot(rel[:, 0], rel[:, 1])
        start, _span = _arc_start(theta)
        min_idx, _, _ = _bin_extrema(theta, r, start)
        cand = loc[min_idx[min_idx >= 0]]
        center2, radius, inl = ransac_circle(cand)
        inl_frac = float(inl.mean())

    frame = CurveFrame(center=c0 + center2[0] * u + center2[1] * v, normal=n, u=u, v=v)
    theta, r, _ = frame.polar(pts)
    start, span = _arc_start(theta)
    _, min_r, max_r = _bin_extrema(theta, r, start)
    return Curve(frame=frame, inner_radius=float(radius), span_deg=span, start_rad=float(start),
                 end_rad=float(start + np.deg2rad(span)), bins_min_r=min_r, bins_max_r=max_r,
                 inliers=inl_frac)
