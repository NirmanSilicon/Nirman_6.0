"""ParkSMART - Availability Monte Carlo Probability Simulation (File 112)."""

from __future__ import annotations

from dataclasses import dataclass

try:
    import numpy as np
except ImportError:
    np = None  # type: ignore


@dataclass
class SimResult:
    probability: float
    expected_available: float
    expected_occupancy_pct: float
    p10_available: float
    p90_available: float
    n: int


def simulate(
    *,
    capacity: int,
    center_pct: float,
    sigma_pct: float,
    n_simulations: int = 2000,
    seed: int = 42,
) -> SimResult:
    """Estimates probability that at least one bay is free at arrival time using Monte Carlo simulation."""
    if capacity < 1:
        raise ValueError("capacity must be at least 1")
    if n_simulations < 1:
        raise ValueError("n_simulations must be at least 1")
    if sigma_pct < 0:
        raise ValueError("sigma_pct must be non-negative")
    if not (0.0 <= center_pct <= 100.0):
        raise ValueError(f"center_pct {center_pct} out of [0, 100] bounds")

    if np is None:
        import random
        rng = random.Random(seed)
        mu = center_pct / 100.0
        sd = sigma_pct / 100.0
        avail_list = []
        occ_list = []
        for _ in range(n_simulations):
            q_val = mu if sigma_pct == 0.0 else max(0.0, min(1.0, rng.gauss(mu, sd)))
            # Binomial draw
            occ = sum(1 for _ in range(capacity) if rng.random() < q_val)
            occ_list.append(occ)
            avail_list.append(capacity - occ)
        avail_list.sort()
        prob = sum(1 for a in avail_list if a >= 1) / n_simulations
        exp_avail = sum(avail_list) / n_simulations
        exp_occ_pct = (sum(occ_list) / n_simulations) / capacity * 100.0
        p10 = avail_list[int(0.10 * n_simulations)]
        p90 = avail_list[int(0.90 * n_simulations)]
        return SimResult(
            probability=round(prob, 4),
            expected_available=round(exp_avail, 2),
            expected_occupancy_pct=round(exp_occ_pct, 2),
            p10_available=round(float(p10), 1),
            p90_available=round(float(p90), 1),
            n=n_simulations,
        )

    rng = np.random.default_rng(seed)

    # If uncertainty sigma is zero, fraction is exactly center
    if sigma_pct == 0.0:
        q = np.full(n_simulations, center_pct / 100.0)
    else:
        # Draw with rejection truncation to [0.0, 1.0]
        mu = center_pct / 100.0
        sd = sigma_pct / 100.0
        q = rng.normal(mu, sd, size=n_simulations)
        # Clip to [0, 1]
        q = np.clip(q, 0.0, 1.0)

    # Binomial occupancy draws given uncertain fraction q
    occupied = rng.binomial(capacity, q)
    available = capacity - occupied

    prob = float(np.mean(available >= 1))
    exp_avail = float(np.mean(available))
    exp_occ_pct = float(np.mean(occupied) / capacity * 100.0)
    p10 = float(np.percentile(available, 10))
    p90 = float(np.percentile(available, 90))

    return SimResult(
        probability=round(prob, 4),
        expected_available=round(exp_avail, 2),
        expected_occupancy_pct=round(exp_occ_pct, 2),
        p10_available=round(p10, 1),
        p90_available=round(p90, 1),
        n=n_simulations,
    )
