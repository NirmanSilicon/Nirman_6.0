import asyncio
import time
from datetime import UTC, datetime
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import HTTPException

from app.core.state_store import CorridorStateStore
from app.engine.disruption_causes import build_cause_cards
from app.engine.overtake_sim import simulate_corridor_overtakes
from app.engine.quantile_ml import QuantileMLEngine, build_quantile_feature_vector
from app.engine.rescue_engine import evaluate_connection_rescue
from app.engine.slack_adjuster import apply_slack_to_timeline
from app.models.schemas import (
    ForecastResponse,
    PredictCascadeRequest,
    PredictCascadeResponse,
    TrainKinematicState,
)


def _resolve_target_train(
    train_no: str,
    active_trains: list[TrainKinematicState],
    topology: dict[str, Any],
    default_delay_mins: float = 0.0,
) -> tuple[TrainKinematicState, list[TrainKinematicState]]:
    """Finds train in active_trains or synthesizes a SCHEDULED state from master topology."""
    target = next((t for t in active_trains if t.train_no == train_no), None)
    if target:
        return target, active_trains

    trains_master = {t["train_no"]: t for t in topology.get("trains", [])}
    if train_no not in trains_master:
        raise HTTPException(status_code=404, detail=f"Train {train_no} not found on active corridor")

    master_info = trains_master[train_no]
    first_halt = master_info["halts"][0] if master_info.get("halts") else None
    end_km = float(topology["stations"][-1]["chainage_km"]) if topology.get("stations") else 206.0
    start_km = 0.0 if master_info.get("direction") == "DN" else end_km
    target = TrainKinematicState(
        train_no=train_no,
        train_name=master_info["train_name"],
        direction=master_info["direction"],
        priority_rank=master_info.get("priority_rank", 3),
        chainage_km=start_km,
        speed_kmph=0.0,
        current_delay_mins=default_delay_mins,
        status="SCHEDULED",
        next_station=first_halt["station_code"] if first_halt else None,
    )
    return target, [*active_trains, target]


def _max_freight_shadow(
    snapshot: dict[str, Any], direction: str
) -> tuple[float, dict[str, Any] | None]:
    max_prob = 0.0
    primary: dict[str, Any] | None = None
    for shadow in snapshot.get("phantom_freights", []):
        if shadow.get("direction") == direction:
            prob = float(shadow.get("freight_probability", 0.0))
            if prob > max_prob:
                max_prob = prob
                primary = shadow
    return max_prob, primary


async def build_train_forecast(
    train_no: str,
    state_store: CorridorStateStore,
    topology: dict[str, Any],
) -> ForecastResponse:
    """Computes full predictive intelligence breakdown (P10/P50/P90, slack, causal cards) for a train."""
    active_trains = await state_store.get_active_trains()
    target_train, active_trains = _resolve_target_train(train_no, active_trains, topology)

    freight_penalties = await state_store.get_freight_penalties()
    snapshot = await state_store.get_snapshot()
    rain_mm_hr = float(snapshot.get("weather", {}).get("rain_mm_hr", 0.0))
    max_freight_prob, _ = _max_freight_shadow(snapshot, target_train.direction)

    current_epoch = snapshot.get("tick_utc", int(time.time()))
    injected_shift = await state_store.get_injected_delay(train_no)
    loop_hold_override = await state_store.get_remaining_loop_hold(train_no)
    sim_result = await asyncio.to_thread(
        simulate_corridor_overtakes,
        target_train_no=train_no,
        active_trains=active_trains,
        topology=topology,
        freight_penalties=freight_penalties,
        current_epoch=current_epoch,
        delay_shift_mins=injected_shift,
        loop_hold_override_mins=loop_hold_override,
    )

    adjusted_timeline = apply_slack_to_timeline(
        timeline=sim_result.timeline,
        track_blocks=topology.get("track_blocks", []),
        direction=target_train.direction,
        rain_mm_hr=rain_mm_hr,
        freight_probability=max_freight_prob,
    )

    dest_arr = adjusted_timeline[-1] if adjusted_timeline else None
    sched_arr_epoch = dest_arr.sched_arr_epoch if dest_arr else int(time.time() + 3600)
    end_km = float(topology["stations"][-1]["chainage_km"]) if topology.get("stations") else 206.0
    dest_km = dest_arr.chainage_km if dest_arr else (end_km if target_train.direction == "DN" else 0.0)
    remaining_km = max(5.0, abs(dest_km - target_train.chainage_km))
    usable_slack = sum(max(0.0, a.raw_sim_delay_mins - a.net_delay_mins) for a in adjusted_timeline)

    feat = build_quantile_feature_vector(
        train_state=target_train,
        sim_result=sim_result,
        adjusted_timeline=adjusted_timeline,
        target_arrival=dest_arr,
        remaining_km=remaining_km,
        freight_shadow_prob=max_freight_prob,
        rain_mm_hr=rain_mm_hr,
        current_epoch=current_epoch,
    )
    quantiles = await asyncio.to_thread(QuantileMLEngine.predict, feat, sched_arr_epoch)

    naive_ntes_delay_mins = target_train.current_delay_mins
    naive_ntes_eta_epoch = sched_arr_epoch + int(naive_ntes_delay_mins * 60)

    active_causes = await state_store.get_train_causes(train_no)
    shadows_by_dir = [
        s for s in snapshot.get("phantom_freights", [])
        if s.get("direction") == target_train.direction
        and s.get("status") in ("PHANTOM_FREIGHT_SHADOW", "ULIP_FOIS_CONFIRMED")
    ]
    causal_cards = list(sim_result.causal_cards)
    causal_cards.extend(build_cause_cards(active_causes, target_train.direction))
    for arr in adjusted_timeline:
        causal_cards.extend(arr.causal_cards)

    if shadows_by_dir:
        primary_shadow = max(shadows_by_dir, key=lambda s: float(s.get("freight_probability", 0.0)))
        acc_pct = int(round(float(primary_shadow.get("freight_probability", 0.0)) * 100))
        str_val = float(primary_shadow.get("str_value", 0.0))
        clr_stn = primary_shadow.get("clearance_station") or "next loop"
        blk_id = primary_shadow.get("block_id") or ""
        for card in causal_cards:
            if card.event == "FREIGHT_SHADOW_DRAG" and "accuracy" not in card.human_message.lower():
                card.human_message = (
                    f"AI detected goods train on {blk_id} ({acc_pct}% accuracy, STR {str_val:.2f}) "
                    f"— adding +{card.added_delay_mins:.0f} min drag until clearance at {clr_stn}."
                )

    unique_cards = []
    seen_messages: set[str] = set()
    for card in causal_cards:
        if card.human_message not in seen_messages:
            seen_messages.add(card.human_message)
            unique_cards.append(card)

    return ForecastResponse(
        train_no=target_train.train_no,
        train_name=target_train.train_name,
        direction=target_train.direction,
        current_chainage_km=target_train.chainage_km,
        current_delay_mins=target_train.current_delay_mins,
        naive_ntes_eta_epoch=naive_ntes_eta_epoch,
        naive_ntes_delay_mins=naive_ntes_delay_mins,
        p10_eta_epoch=quantiles.p10_eta_epoch,
        p50_eta_epoch=quantiles.p50_eta_epoch,
        p90_eta_epoch=quantiles.p90_eta_epoch,
        p10_delay_mins=quantiles.p10_delay_mins,
        p50_delay_mins=quantiles.p50_delay_mins,
        p90_delay_mins=quantiles.p90_delay_mins,
        usable_slack_mins=round(usable_slack, 1),
        station_timeline=adjusted_timeline,
        causal_cards=unique_cards,
        overtakes_count=sim_result.overtakes_count,
    )


async def build_cascade_prediction(
    request: PredictCascadeRequest,
    state_store: CorridorStateStore,
    topology: dict[str, Any],
) -> PredictCascadeResponse:
    """Computes unified Section 7.2 cascade prediction with quantiles, overtakes, freight, and rescue audit."""
    train_no = request.train_number
    active_trains = await state_store.get_active_trains()
    existing = next((t for t in active_trains if t.train_no == train_no), None)

    if not existing:
        target_train, active_trains = _resolve_target_train(
            train_no, active_trains, topology, default_delay_mins=request.injected_delay_mins
        )
    else:
        target_train = existing.model_copy(deep=True)
        if request.injected_delay_mins > 0:
            target_train.current_delay_mins = max(
                target_train.current_delay_mins, request.injected_delay_mins
            )
        if request.current_station:
            stations_map = {s["station_code"]: s for s in topology.get("stations", [])}
            if request.current_station in stations_map:
                target_train.current_station = request.current_station
                target_train.chainage_km = stations_map[request.current_station]["chainage_km"]
        active_trains = [target_train if t.train_no == train_no else t for t in active_trains]

    freight_penalties = await state_store.get_freight_penalties()
    snapshot = await state_store.get_snapshot()
    current_epoch = snapshot.get("tick_utc", int(time.time()))
    rain_mm_hr = float(snapshot.get("weather", {}).get("rain_mm_hr", 0.0))

    sim_result = await asyncio.to_thread(
        simulate_corridor_overtakes,
        target_train_no=train_no,
        active_trains=active_trains,
        topology=topology,
        injected_delay_mins=request.injected_delay_mins,
        freight_penalties=freight_penalties,
        current_epoch=current_epoch,
    )

    max_freight_prob, active_freight_shadow = _max_freight_shadow(snapshot, target_train.direction)

    adjusted_timeline = apply_slack_to_timeline(
        timeline=sim_result.timeline,
        track_blocks=topology.get("track_blocks", []),
        direction=target_train.direction,
        rain_mm_hr=rain_mm_hr,
        freight_probability=max_freight_prob,
    )

    stations_list = topology.get("stations", [])
    default_dest_code = stations_list[-1]["station_code"] if stations_list else "BBS"
    target_stn_code = (
        request.connection_target.station_code
        if request.connection_target
        else (adjusted_timeline[-1].station_code if adjusted_timeline else default_dest_code)
    )
    target_arrival = next(
        (a for a in adjusted_timeline if a.station_code == target_stn_code),
        adjusted_timeline[-1] if adjusted_timeline else None,
    )

    sched_arr_epoch = target_arrival.sched_arr_epoch if target_arrival else current_epoch + 3600
    fallback_km = float(stations_list[-1]["chainage_km"]) if stations_list else 143.0
    target_km = target_arrival.chainage_km if target_arrival else fallback_km
    remaining_km = max(5.0, abs(target_km - target_train.chainage_km))

    feat = build_quantile_feature_vector(
        train_state=target_train,
        sim_result=sim_result,
        adjusted_timeline=adjusted_timeline,
        target_arrival=target_arrival,
        remaining_km=remaining_km,
        freight_shadow_prob=max_freight_prob,
        rain_mm_hr=rain_mm_hr,
        current_epoch=current_epoch,
    )
    quantiles = await asyncio.to_thread(QuantileMLEngine.predict, feat, sched_arr_epoch)

    ist = ZoneInfo("Asia/Kolkata")

    def _fmt(epoch: int) -> str:
        return datetime.fromtimestamp(epoch, tz=UTC).astimezone(ist).strftime("%H:%M")

    naive_ntes_eta_str = _fmt(sched_arr_epoch + int(target_train.current_delay_mins * 60))
    quantiles_dict = {
        "p10_safe_report": _fmt(quantiles.p10_eta_epoch),
        "p50_expected": _fmt(quantiles.p50_eta_epoch),
        "p90_worst_case": _fmt(quantiles.p90_eta_epoch),
    }

    overtake_alerts = [
        {
            "overtaking_train": card.caused_by_train or "Priority Express",
            "overtake_station": f"{card.station_code} ({card.station_name})",
            "projected_loop_hold_mins": int(card.added_delay_mins),
            "reason": card.human_message,
        }
        for card in sim_result.causal_cards
        if card.event in ("PRIORITY_OVERTAKE_HOLD", "CASCADE_DOUBLE_OVERTAKE")
    ]

    active_block_id = active_freight_shadow.get("block_id") if active_freight_shadow else "NONE"
    active_penalty = (
        int(freight_penalties.get(active_block_id, 20.0))
        if active_block_id != "NONE"
        else 0
    )
    freight_shadow_dict = {
        "block": active_block_id,
        "fsi_score": active_freight_shadow.get("str_value", 1.85) if active_freight_shadow else 1.0,
        "penalty_mins": active_penalty,
    }

    connection_audit: dict[str, Any] = {
        "survival_probability_pct": 100.0,
        "status": "SAFE",
        "bailout_recommendation": None,
    }

    if request.connection_target:
        parts = request.connection_target.deadline_time.split(":")
        hh, mm = int(parts[0]), int(parts[1])
        ref_dt = datetime.fromtimestamp(current_epoch, tz=UTC).astimezone(ist)
        target_deadline_epoch = int(ref_dt.replace(hour=hh, minute=mm, second=0, microsecond=0).timestamp())
        if target_deadline_epoch <= current_epoch:
            target_deadline_epoch += 86400

        rescue_eval = await asyncio.to_thread(
            evaluate_connection_rescue,
            train_state=target_train,
            destination_code=request.connection_target.station_code,
            connection_deadline_epoch=target_deadline_epoch,
            transfer_buffer_mins=request.connection_target.transfer_buffer_mins,
            passenger_status=request.passenger_status,
            sim_result=sim_result,
            topology=topology,
            current_epoch=current_epoch,
            use_live_traffic=(snapshot.get("mode") == "LIVE_FEED"),
            rain_mm_hr=rain_mm_hr,
            freight_shadow_prob=max_freight_prob,
            adjusted_timeline=adjusted_timeline,
        )

        bailout_rec = None
        if rescue_eval.get("bailout_recommended") and rescue_eval.get("bailout_plan"):
            plan = rescue_eval["bailout_plan"]
            bailout_rec = {
                "deboard_at": f"{plan['deboard_station_code']} ({plan['deboard_station_name']})",
                "deboard_eta_p50": _fmt(plan["deboard_eta_epoch"]),
                "road_mode": plan["road_mode"],
                "road_duration_mins": int(plan["road_drive_mins"]),
                "final_arrival_eta": (
                    f"{_fmt(plan['final_road_arrival_epoch'])} "
                    f"(Saves {plan['minutes_saved']:.0f} mins vs staying on train)"
                ),
            }

        connection_audit = {
            "survival_probability_pct": rescue_eval.get("survival_probability_pct", 100.0),
            "status": rescue_eval.get("risk_level", "SAFE"),
            "safe_boarding_lock": rescue_eval.get("safe_boarding_lock", False),
            "bailout_recommendation": bailout_rec,
        }

    return PredictCascadeResponse(
        train_number=train_no,
        train_name=target_train.train_name,
        naive_ntes_eta=naive_ntes_eta_str,
        quantiles_target=quantiles_dict,
        overtake_alerts=overtake_alerts,
        freight_shadow=freight_shadow_dict,
        connection_audit=connection_audit,
    )
