"""Operator response playbooks for Tennessee Eastman Process (TEP) fault classes.

Provides structured equipment context, severity classification, operational
summaries, and concrete operator remediation steps for Normal operation (0)
and all 11 supported process faults.
"""

from typing import Final, TypedDict


class PlaybookInfo(TypedDict):
    """Structured operator response playbook for a TEP operating state."""

    equipment_unit: str
    severity_level: str
    summary: str
    recommended_actions: list[str]


FAULT_PLAYBOOKS: Final[dict[int, PlaybookInfo]] = {
    0: {
        "equipment_unit": "Plant-Wide Supervisory Control",
        "severity_level": "NORMAL",
        "summary": (
            "Process variables are within normal statistical operating envelopes. "
            "No active process fault or abnormal alarm cascade detected."
        ),
        "recommended_actions": [
            "Continue routine supervisory monitoring of reactor, separator, and stripper KPIs.",
            "Confirm automated control loops remain in normal cascade/auto mode.",
            "Log steady-state baseline snapshot for shift handover records.",
        ],
    },
    1: {
        "equipment_unit": "Stream 4 Feed System (A/C Feed Header)",
        "severity_level": "HIGH",
        "summary": (
            "Step disturbance in the A/C feed composition ratio entering via Stream 4, "
            "shifting reactor stoichiometry and downstream recycle composition."
        ),
        "recommended_actions": [
            "Inspect Stream 4 A/C ratio analyzer readings (XMEAS(23), XMEAS(25)) and upstream supply blending.",
            "Verify A feed valve (XMV(3)) and A/C feed valve (XMV(4)) tracking against ratio controller setpoints.",
            "Monitor reactor pressure (XMEAS(7)) and purge rate (XMEAS(10)) to prevent inert or reactant buildup.",
            "Coordinate with upstream feed unit operators to restore nominal Stream 4 A/C molar ratio.",
        ],
    },
    2: {
        "equipment_unit": "Stream 4 Feed System (Inert B Composition)",
        "severity_level": "MEDIUM",
        "summary": (
            "Step increase in inert component B concentration within Stream 4 feed, "
            "accumulating in the recycle loop and elevating purge demand."
        ),
        "recommended_actions": [
            "Check Stream 6 and Stream 9 component B composition analyzers (XMEAS(24), XMEAS(30)).",
            "Verify purge valve (XMV(6)) opens smoothly to reject excess inert B and stabilize reactor pressure.",
            "Monitor compressor recycle flow (XMEAS(5)) and compressor work (XMEAS(20)) for gas density shift.",
            "Notify feed prep operations to investigate elevated component B carryover in Stream 4.",
        ],
    },
    4: {
        "equipment_unit": "Reactor Cooling Water System",
        "severity_level": "HIGH",
        "summary": (
            "Step increase in reactor cooling water inlet temperature, reducing heat "
            "removal capacity and driving the cooling water control valve toward saturation."
        ),
        "recommended_actions": [
            "Check reactor cooling water valve position (XMV(10)) and outlet temperature (XMEAS(21)) for saturation.",
            "Verify reactor temperature (XMEAS(9)) stays below high-high trip limits; prepare manual trim if needed.",
            "Inspect plant cooling tower supply header temperature and booster pump pressure.",
            "Reduce reactor feed throughput incrementally if reactor temperature continues rising with XMV(10) > 90%.",
        ],
    },
    5: {
        "equipment_unit": "Condenser Cooling Water System",
        "severity_level": "HIGH",
        "summary": (
            "Step increase in condenser cooling water inlet temperature, degrading "
            "vapor condensation in the product separator and elevating separator pressure."
        ),
        "recommended_actions": [
            "Inspect separator temperature (XMEAS(11)), condenser CW outlet temp (XMEAS(22)), and CW valve (XMV(11)).",
            "Monitor separator level (XMEAS(12)) and underflow (XMEAS(14)) for reduced liquid knockout.",
            "Check cooling water supply header temperature and bypass valve alignment at the condenser.",
            "Adjust purge or recycle loop pressure setpoints per SOP if separator pressure approaches high alarm.",
        ],
    },
    6: {
        "equipment_unit": "Stream 1 Feed System (Reactant A Supply)",
        "severity_level": "CRITICAL",
        "summary": (
            "Severe loss of reactant A feed in Stream 1 (feed valve closure or header loss), "
            "rapidly depleting reactor A inventory and destabilizing product formation."
        ),
        "recommended_actions": [
            "Immediately verify Stream 1 feed flow (XMEAS(1)) and A feed valve (XMV(3)) actuator/air supply.",
            "Dispatch field operator to check Stream 1 block valves, strainer differential pressure, and feed pump status.",
            "Place reactor feed and stripper level loops in safe hold/cutback mode to prevent vessel depletion.",
            "Initiate controlled plant turndown or emergency isolation if Stream 1 flow cannot be restored promptly.",
        ],
    },
    7: {
        "equipment_unit": "Stream 4 C Header Supply",
        "severity_level": "HIGH",
        "summary": (
            "Pressure loss in the Stream 4 C feed header reducing feed availability "
            "and forcing feed control valve XMV(4) wide open to maintain flow."
        ),
        "recommended_actions": [
            "Verify Stream 4 flow (XMEAS(4)) and feed valve position (XMV(4)) for full-open saturation.",
            "Contact upstream C header / offsite tankage operators to restore supply header pressure.",
            "Reduce Stream 1 and Stream 2 feed ratios proportionally to keep stoichiometric balance.",
            "Monitor stripper and separator levels (XMEAS(15), XMEAS(12)) during reduced feed operation.",
        ],
    },
    8: {
        "equipment_unit": "Stream 4 Feed Composition Blending",
        "severity_level": "MEDIUM",
        "summary": (
            "Random continuous variation in A, B, and C feed compositions in Stream 4, "
            "causing oscillating reactor heat duty and purge/recycle composition swings."
        ),
        "recommended_actions": [
            "Trend Stream 6 and Stream 9 analyzer channels (XMEAS(23)–XMEAS(31)) to quantify oscillation period.",
            "Switch aggressive composition trim loops to conservative tuning or manual hold if cycling worsens.",
            "Inspect upstream Stream 4 mixing drum level and feed source switching schedule.",
            "Confirm reactor cooling and purge valves (XMV(10), XMV(6)) are not experiencing excessive actuator wear.",
        ],
    },
    10: {
        "equipment_unit": "Stream 4 Feed Preheater / Temperature",
        "severity_level": "MEDIUM",
        "summary": (
            "Random temperature fluctuations in Stream 4 C feed entering the stripper/reactor "
            "system, perturbing stripper thermal balance and vapor-liquid equilibrium."
        ),
        "recommended_actions": [
            "Monitor stripper temperature (XMEAS(18)) and stripper steam valve (XMV(9)) for hunting behavior.",
            "Check upstream Stream 4 heat exchanger steam trap and temperature controller tuning.",
            "Verify stripper bottoms product composition (XMEAS(37)–XMEAS(41)) remains within product spec.",
            "Stabilize steam header pressure or temporarily widen deadband on non-critical thermal alarms.",
        ],
    },
    11: {
        "equipment_unit": "Reactor Cooling Water Header",
        "severity_level": "MEDIUM",
        "summary": (
            "Random variation in reactor cooling water inlet temperature, inducing continuous "
            "disturbances in reactor temperature and cooling valve modulation."
        ),
        "recommended_actions": [
            "Track reactor temperature (XMEAS(9)) and cooling water valve (XMV(10)) correlation for oscillations.",
            "Inspect cooling tower fan staging and basin bypass control for cyclic hunting.",
            "Confirm reactor temperature cascade controller is maintaining +/- 1.5 sigma stability.",
            "Suppress chattering thermal pre-alarms only after verifying valve travel remains bounded.",
        ],
    },
    13: {
        "equipment_unit": "Main Catalytic Reactor",
        "severity_level": "HIGH",
        "summary": (
            "Slow progressive drift in reaction kinetics (catalyst deactivation or activity shift), "
            "gradually altering reactor conversion, pressure, and heat generation."
        ),
        "recommended_actions": [
            "Review long-horizon trends of reactor pressure (XMEAS(7)), level (XMEAS(8)), and temp (XMEAS(9)).",
            "Compare reactant A/C conversion ratios across Stream 6 and Stream 9 analyzers for efficiency drop.",
            "Adjust reactor temperature setpoint within safe metallurgical limits to compensate for drift.",
            "Schedule catalyst sampling / regeneration planning with process engineering.",
        ],
    },
    14: {
        "equipment_unit": "Reactor Cooling Water Control Valve (XMV(10))",
        "severity_level": "CRITICAL",
        "summary": (
            "Mechanical sticking on the reactor cooling water control valve (XMV(10)), "
            "causing sawtooth thermal cycling in the exothermic reactor and outlet temperature."
        ),
        "recommended_actions": [
            "Confirm sawtooth limit-cycle signature between reactor temp (XMEAS(9)), CW outlet (XMEAS(21)), and XMV(10).",
            "Place reactor cooling controller in manual or switch to redundant bypass cooling path immediately.",
            "Dispatch instrument technician to inspect XMV(10) valve positioner, stem packing, and I/P transducer.",
            "Monitor reactor high-temperature interlock readiness closely while operating on bypass.",
        ],
    },
}


def get_playbook(fault_id: int) -> PlaybookInfo:
    """Return a copy of the operator response playbook for a supported fault_id.

    Args:
        fault_id: Integer TEP STATUS code (0 for Normal, or one of 1,2,4,5,6,7,8,10,11,13,14).

    Returns:
        PlaybookInfo: Dictionary with equipment_unit, severity_level, summary,
            and recommended_actions.

    Raises:
        KeyError: If fault_id is not present in FAULT_PLAYBOOKS.
    """
    if fault_id not in FAULT_PLAYBOOKS:
        raise KeyError(f"Unsupported fault_id: {fault_id}. Supported: {sorted(FAULT_PLAYBOOKS)}")

    pb = FAULT_PLAYBOOKS[fault_id]
    return {
        "equipment_unit": pb["equipment_unit"],
        "severity_level": pb["severity_level"],
        "summary": pb["summary"],
        "recommended_actions": list(pb["recommended_actions"]),
    }
