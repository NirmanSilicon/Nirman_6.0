"""Metrics engine for resilience quantification."""
from __future__ import annotations

from typing import Optional
from packages.domain.models import Asset, DistrictModel, RunMetrics, SimulationEvent
from packages.simulation.state import SimulationState


def compute_run_metrics(
    district: DistrictModel,
    history: list[SimulationState],
    events: list[SimulationEvent],
    run_id: str = "RUN-001",
    delta_t: float = 1.0,
    csa_recovery_target: float = 0.8,
    recovery_hold_ticks: int = 5,
    resources_consumed: int = 0,
) -> RunMetrics:
    if not history:
        return RunMetrics(
            run_id=run_id,
            weighted_service_loss=0.0,
            normalized_weighted_service_loss=0.0,
            cascade_size=0,
            critical_service_availability_timeline=[],
            final_critical_service_availability=1.0,
            recovery_time=None,
            recovery_time_censored=True,
            resources_consumed=resources_consumed,
            total_events=0,
        )

    assets_by_id = {a.asset_id: a for a in district.assets}
    critical_assets = [a for a in district.assets if a.is_critical]
    total_critical_weight = sum(a.criticality_weight for a in critical_assets) or 1.0

    total_possible_weight = sum(a.criticality_weight for a in district.assets) or 1.0
    horizon_ticks = len(history)

    wsl = 0.0
    csa_timeline: list[float] = []

    # Cascade detection: find assets directly hit by hazard vs degraded later via dependencies
    direct_hit_assets = set()
    for ev in events:
        if ev.event_type in ("direct_damage", "hazard_exposure") and ev.asset_id:
            direct_hit_assets.add(ev.asset_id)

    cascaded_assets = set()
    for ev in events:
        if ev.event_type in ("asset_degraded", "asset_unavailable") and ev.asset_id:
            if ev.asset_id not in direct_hit_assets:
                cascaded_assets.add(ev.asset_id)

    # Calculate tick-by-tick WSL and CSA(t)
    for state in history:
        tick_loss = 0.0
        tick_crit_service = 0.0

        for asset_id, rstate in state.assets.items():
            asset = assets_by_id.get(asset_id)
            if not asset:
                continue
            weight = asset.criticality_weight
            loss_frac = max(0.0, 1.0 - rstate.delivered_service)
            tick_loss += weight * loss_frac * delta_t

            if asset.is_critical:
                tick_crit_service += weight * rstate.delivered_service

        wsl += tick_loss
        csa_timeline.append(tick_crit_service / total_critical_weight)

    max_possible_loss = total_possible_weight * horizon_ticks * delta_t
    nwsl = wsl / max(1e-6, max_possible_loss)

    # Determine recovery time
    # Condition: first tick after an observed disruption where CSA(t) >= target for K consecutive ticks
    disrupted = any(val < csa_recovery_target for val in csa_timeline)
    recovery_time: Optional[int] = None
    recovery_time_censored = True

    if disrupted:
        consecutive = 0
        for t, csa_val in enumerate(csa_timeline):
            if csa_val >= csa_recovery_target:
                consecutive += 1
                if consecutive >= recovery_hold_ticks:
                    recovery_time = (t - recovery_hold_ticks + 1)
                    recovery_time_censored = False
                    break
            else:
                consecutive = 0
    else:
        # Never disrupted
        recovery_time = 0
        recovery_time_censored = False

    return RunMetrics(
        run_id=run_id,
        weighted_service_loss=round(wsl, 4),
        normalized_weighted_service_loss=round(nwsl, 4),
        cascade_size=len(cascaded_assets),
        critical_service_availability_timeline=[round(v, 4) for v in csa_timeline],
        final_critical_service_availability=round(csa_timeline[-1] if csa_timeline else 1.0, 4),
        recovery_time=recovery_time,
        recovery_time_censored=recovery_time_censored,
        resources_consumed=resources_consumed,
        total_events=len(events),
    )


def compare_runs(baseline: RunMetrics, intervention: RunMetrics, epsilon: float = 1e-6) -> dict:
    """Compute paired comparison metrics between baseline and intervention."""
    abs_improvement = baseline.normalized_weighted_service_loss - intervention.normalized_weighted_service_loss
    rel_improvement = (
        (abs_improvement / baseline.normalized_weighted_service_loss)
        if baseline.normalized_weighted_service_loss > epsilon
        else 0.0
    )

    cascade_reduction = baseline.cascade_size - intervention.cascade_size
    csa_delta = intervention.final_critical_service_availability - baseline.final_critical_service_availability

    return {
        "absolute_nwsl_improvement": round(abs_improvement, 4),
        "relative_nwsl_improvement": round(rel_improvement * 100.0, 2),  # percentage
        "baseline_nwsl": baseline.normalized_weighted_service_loss,
        "intervention_nwsl": intervention.normalized_weighted_service_loss,
        "cascade_reduction": cascade_reduction,
        "csa_delta": round(csa_delta, 4),
        "baseline_recovery_time": baseline.recovery_time,
        "intervention_recovery_time": intervention.recovery_time,
        "resources_consumed": intervention.resources_consumed,
    }
