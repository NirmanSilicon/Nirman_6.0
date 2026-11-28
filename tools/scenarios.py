"""Single source of truth for Ashvin demo scenarios and timings."""

from __future__ import annotations

DEFAULT_HOST = "127.0.0.1:8000"

CONFIRMATION_WINDOW_S = 5.0
STEP_DELAY_S = 1.2
CALL_START_DELAY_S = 1.2
FILTER_DELAY_S = 1.2
ANSWER_HIGH_DELAY_S = 3.2
ANSWER_LOW_DELAY_S = 2.4
SILENCE_DELAY_S = CONFIRMATION_WINDOW_S + 0.2
DISPATCH_DELAY_S = 1.0
HOSPITAL_DELAY_S = 1.0
HELP_SITE_DELAY_S = 1.0
CITIZEN_CONFIRM_DELAY_S = 1.5
CITIZEN_REJECT_DELAY_S = 1.5
IDENTITY_DELAY_S = 0.0
FIRST_AID_DELAY_S = 0.0
SMS_FALLBACK_DELAY_S = 1.0
SMS_SENT_DELAY_S = 1.2
SMS_OFFLINE_GAP_S = 6.0
SMS_RECEIVED_DELAY_S = 1.5
SMS_POST_DELAY_S = 1.0

_SMS_TO_NUMBER = "+911122334455"
_SMS_BODY = (
    "ASHVIN ALERT. Unit ASH-07. Crash detected. "
    "Lat 20.2725, Lon 85.8380. Speed 72 to 0 km/h. 20:41 IST."
)
_SMS_CHARS = len(_SMS_BODY)

_CRASH_IMPACT = (
    "impact_detected",
    {
        "lat": 20.2725,
        "lon": 85.8380,
        "peak_g": 18.4,
        "speed_before": 72,
        "speed_after": 0,
        "kind": "crash",
    },
    0.0,
)

_CALL_STARTED = (
    "alert_call_started",
    {
        "countdown_s": int(CONFIRMATION_WINDOW_S),
        "numbers": ["registered_user", "contact_1"],
    },
    CALL_START_DELAY_S,
)

_ANSWERED_HIGH_PREFIX = [
    _CRASH_IMPACT,
    _CALL_STARTED,
    ("alert_confirmed", {"level": "high"}, ANSWER_HIGH_DELAY_S),
]

_ANSWERED_LOW_PREFIX = [
    _CRASH_IMPACT,
    _CALL_STARTED,
    ("alert_confirmed", {"level": "low"}, ANSWER_LOW_DELAY_S),
]

SCENARIOS: list[dict] = [
    {
        "id": 1,
        "key": "detection",
        "title": "Detection",
        "modes": [
            {
                "key": "crash",
                "label": "Real impact",
                "steps": [
                    _CRASH_IMPACT,
                    _CALL_STARTED,
                ],
            },
            {
                "key": "pothole",
                "label": "Pothole",
                "steps": [
                    (
                        "impact_detected",
                        {
                            "lat": 20.2725,
                            "lon": 85.8380,
                            "peak_g": 3.8,
                            "speed_before": 52,
                            "speed_after": 52,
                            "kind": "pothole",
                        },
                        0.0,
                    ),
                    (
                        "false_trigger_filtered",
                        {
                            "reason": "speed stayed above 30 km/h",
                            "peak_g": 3.8,
                            "speed_after": 52,
                        },
                        FILTER_DELAY_S,
                    ),
                ],
            },
            {
                "key": "hard_brake",
                "label": "Hard brake",
                "steps": [
                    (
                        "impact_detected",
                        {
                            "lat": 20.2725,
                            "lon": 85.8380,
                            "peak_g": 5.6,
                            "speed_before": 60,
                            "speed_after": 14,
                            "kind": "hard_brake",
                        },
                        0.0,
                    ),
                    (
                        "false_trigger_filtered",
                        {
                            "reason": "no sudden drop to near-zero speed",
                            "peak_g": 5.6,
                            "speed_after": 14,
                        },
                        FILTER_DELAY_S,
                    ),
                ],
            },
        ],
    },
    {
        "id": 2,
        "key": "confirmation",
        "title": "Confirmation",
        "modes": [
            {
                "key": "answered_high",
                "label": "Answered high alert",
                "steps": list(_ANSWERED_HIGH_PREFIX),
            },
            {
                "key": "answered_low",
                "label": "Answered low alert",
                "steps": list(_ANSWERED_LOW_PREFIX),
            },
            {
                "key": "silence",
                "label": "Silence (no response)",
                "steps": [
                    _CRASH_IMPACT,
                    _CALL_STARTED,
                    ("alert_confirmed", {"level": "no_response"}, SILENCE_DELAY_S),
                ],
            },
        ],
    },
    {
        "id": 3,
        "key": "dispatch",
        "title": "Dispatch",
        "modes": [
            {
                "key": "high_risk",
                "label": "High risk",
                "steps": [
                    *_ANSWERED_HIGH_PREFIX,
                    ("dispatched", {"service": "108", "eta_s": 420}, DISPATCH_DELAY_S),
                    (
                        "hospital_notified",
                        {
                            "hospital_id": "h-014",
                            "name": "Capital Hospital",
                            "distance_km": 2.4,
                        },
                        HOSPITAL_DELAY_S,
                    ),
                    (
                        "help_site_alerted",
                        {
                            "site_id": "p-03",
                            "name": "Petrol pump, Jaydev Vihar",
                            "distance_km": 0.9,
                        },
                        HELP_SITE_DELAY_S,
                    ),
                ],
            },
            {
                "key": "lower_risk",
                "label": "Lower risk",
                "steps": [
                    *_ANSWERED_LOW_PREFIX,
                    (
                        "help_site_alerted",
                        {
                            "site_id": "p-03",
                            "name": "Petrol pump, Jaydev Vihar",
                            "distance_km": 0.9,
                        },
                        HELP_SITE_DELAY_S,
                    ),
                    (
                        "hospital_notified",
                        {
                            "hospital_id": "h-014",
                            "name": "Capital Hospital",
                            "distance_km": 2.4,
                        },
                        HOSPITAL_DELAY_S,
                    ),
                ],
            },
        ],
    },
    {
        "id": 4,
        "key": "citizen",
        "title": "Citizen report",
        "modes": [
            {
                "key": "remote",
                "label": "Remote forest",
                "steps": [
                    (
                        "citizen_report",
                        {
                            "report_id": "r-77",
                            "accident_type": "two_wheeler",
                            "photo_url": "reports/r-77.jpg",
                            "lat": 20.2501,
                            "lon": 85.8102,
                            "zone": "remote",
                        },
                        0.0,
                    ),
                    (
                        "report_confirmed",
                        {"report_id": "r-77", "confirmations": 2, "threshold": 2},
                        CITIZEN_CONFIRM_DELAY_S,
                    ),
                ],
            },
            {
                "key": "populated",
                "label": "Populated city daytime",
                "steps": [
                    (
                        "citizen_report",
                        {
                            "report_id": "r-77",
                            "accident_type": "two_wheeler",
                            "photo_url": "reports/r-77.jpg",
                            "lat": 20.2501,
                            "lon": 85.8102,
                            "zone": "populated",
                        },
                        0.0,
                    ),
                    (
                        "report_confirmed",
                        {"report_id": "r-77", "confirmations": 5, "threshold": 5},
                        CITIZEN_CONFIRM_DELAY_S,
                    ),
                ],
            },
            {
                "key": "false_report",
                "label": "False report",
                "steps": [
                    (
                        "citizen_report",
                        {
                            "report_id": "r-88",
                            "accident_type": "two_wheeler",
                            "photo_url": "reports/r-88.jpg",
                            "lat": 20.2501,
                            "lon": 85.8102,
                            "zone": "populated",
                        },
                        0.0,
                    ),
                    (
                        "report_rejected",
                        {
                            "report_id": "r-88",
                            "reason": "no matching reports, photo inconsistent",
                            "fine_applied": True,
                        },
                        CITIZEN_REJECT_DELAY_S,
                    ),
                ],
            },
        ],
    },
    {
        "id": 5,
        "key": "identity",
        "title": "Identity and first aid",
        "modes": [
            {
                "key": "identity",
                "label": "Identity card",
                "steps": [
                    (
                        "identity_resolved",
                        {"licence_verified": True, "unit_code": "ASH-07"},
                        IDENTITY_DELAY_S,
                    ),
                ],
            },
            {
                "key": "first_aid",
                "label": "First aid steps",
                "steps": [
                    (
                        "first_aid_shown",
                        {
                            "steps": [
                                "Do not move the victim",
                                "Control the bleeding",
                                "Keep the airway clear",
                            ]
                        },
                        FIRST_AID_DELAY_S,
                    ),
                ],
            },
        ],
    },
    {
        "id": 6,
        "key": "fallback",
        "title": "SMS fallback",
        "modes": [
            {
                "key": "data_ok",
                "label": "Data link OK",
                "steps": [
                    *_ANSWERED_HIGH_PREFIX,
                    ("dispatched", {"service": "108", "eta_s": 420}, DISPATCH_DELAY_S),
                ],
            },
            {
                "key": "sms_only",
                "label": "SMS fallback",
                "steps": [
                    _CRASH_IMPACT,
                    (
                        "sms_fallback_started",
                        {"reason": "no data", "to_number": _SMS_TO_NUMBER},
                        SMS_FALLBACK_DELAY_S,
                    ),
                    (
                        "sms_sent",
                        {"to": _SMS_TO_NUMBER, "body": _SMS_BODY, "chars": _SMS_CHARS},
                        SMS_SENT_DELAY_S,
                    ),
                    (
                        "sms_received",
                        {"gateway": "SMS gateway", "latency_s": 6},
                        SMS_RECEIVED_DELAY_S,
                    ),
                    ("alert_confirmed", {"level": "high"}, SMS_POST_DELAY_S),
                    ("dispatched", {"service": "108", "eta_s": 420}, DISPATCH_DELAY_S),
                ],
            },
            {
                "key": "offline",
                "label": "Offline SMS",
                "steps": [
                    _CRASH_IMPACT,
                    (
                        "sms_fallback_started",
                        {"reason": "no signal", "to_number": _SMS_TO_NUMBER},
                        SMS_FALLBACK_DELAY_S,
                    ),
                    (
                        "sms_sent",
                        {"to": _SMS_TO_NUMBER, "body": _SMS_BODY, "chars": _SMS_CHARS},
                        SMS_OFFLINE_GAP_S,
                    ),
                    (
                        "sms_received",
                        {"gateway": "SMS gateway", "latency_s": 6},
                        SMS_RECEIVED_DELAY_S,
                    ),
                ],
            },
        ],
    },
]
