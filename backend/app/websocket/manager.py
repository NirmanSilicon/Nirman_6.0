import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Set
from fastapi import WebSocket, WebSocketDisconnect
from backend.app.schemas.telemetry import (
    UnifiedState,
    FeatureSnapshot,
    DiagnosticsResult,
    WorkerSafetyStatus,
    RiskBreakdown,
    ActionRecommendation
)
from backend.app.diagnostics.engine import diagnostics_engine
from backend.app.safety.engine import safety_engine
from backend.app.risk.engine import risk_engine
from backend.app.config import settings

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "telemetry": set(),
            "diagnostics": set(),
            "safety": set(),
            "risk": set(),
            "alerts": set(),
            "unified": set()
        }
        
        # Last received timestamp for stale-data check
        self.last_telemetry_time = time.time()
        self.is_stale = False
        
        # Unified State Cache
        self.current_state = UnifiedState(
            machine_id="MOTOR_01",
            timestamp=datetime.utcnow().isoformat(),
            source="hardware",
            protocol="mqtt",
            sensor_status="CONNECTED",
            model_version="1.0.0",
            temperature_c=32.0,
            vibration_rms_g=0.45,
            vibration_peak_g=0.63,
            dominant_frequency_hz=25.0,
            motor_current_a=0.85,
            diagnostics=DiagnosticsResult(),
            safety=WorkerSafetyStatus(),
            risk=RiskBreakdown(),
            recommendation=ActionRecommendation()
        )

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = set()
        self.active_connections[channel].add(websocket)

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections:
            self.active_connections[channel].discard(websocket)

    async def broadcast_channel(self, channel: str, data: dict):
        if channel in self.active_connections:
            dead_sockets = []
            for connection in self.active_connections[channel]:
                try:
                    await connection.send_json(data)
                except Exception:
                    dead_sockets.append(connection)
            for dead in dead_sockets:
                self.active_connections[channel].discard(dead)

    async def update_telemetry(
        self,
        machine_id: str,
        temperature_c: float,
        motor_current_a: float,
        samples: list,
        protocol: str = "mqtt",
        source: str = "hardware"
    ):
        self.last_telemetry_time = time.time()
        self.is_stale = False

        # 1. Push to diagnostics engine
        diagnostics_engine.push_samples(samples, temperature_c, motor_current_a)
        features: FeatureSnapshot = diagnostics_engine.extract_features()
        
        # 2. Run Diagnostics ML/Heuristics
        diag_res: DiagnosticsResult = diagnostics_engine.evaluate(features)

        # 3. Read current Safety status
        safety_status: WorkerSafetyStatus = safety_engine.current_status

        # 4. Run Risk Correlation Engine
        risk_breakdown, recommendation = risk_engine.evaluate_risk(
            diagnostics=diag_res,
            safety=safety_status,
            motor_current_a=features.motor_current_a,
            is_stale=False
        )

        # 5. Formulate Unified State
        self.current_state = UnifiedState(
            machine_id=machine_id,
            timestamp=datetime.utcnow().isoformat(),
            source=source,
            protocol=protocol,
            sensor_status="CONNECTED",
            model_version="1.0.0",
            temperature_c=round(features.temperature_c, 1),
            vibration_rms_g=round(features.vibration_rms_g, 2),
            vibration_peak_g=round(features.vibration_peak_g, 2),
            dominant_frequency_hz=round(features.dominant_frequency_hz, 1),
            motor_current_a=round(features.motor_current_a, 2),
            diagnostics=diag_res,
            safety=safety_status,
            risk=risk_breakdown,
            recommendation=recommendation
        )

        # 6. Broadcast across WebSockets
        state_dict = self.current_state.model_dump()
        await self.broadcast_channel("unified", state_dict)
        await self.broadcast_channel("telemetry", {
            "machine_id": machine_id,
            "timestamp": state_dict["timestamp"],
            "temperature_c": state_dict["temperature_c"],
            "vibration_rms_g": state_dict["vibration_rms_g"],
            "vibration_peak_g": state_dict["vibration_peak_g"],
            "dominant_frequency_hz": state_dict["dominant_frequency_hz"],
            "motor_current_a": state_dict["motor_current_a"],
            "sensor_status": state_dict["sensor_status"]
        })
        await self.broadcast_channel("diagnostics", diag_res.model_dump())
        await self.broadcast_channel("safety", safety_status.model_dump())
        await self.broadcast_channel("risk", {
            "risk": risk_breakdown.model_dump(),
            "recommendation": recommendation.model_dump()
        })

    async def check_stale_loop(self):
        """Background task checking if telemetry is stale (>5s)."""
        while True:
            await asyncio.sleep(1.0)
            now = time.time()
            if (now - self.last_telemetry_time) > settings.STALE_DATA_TIMEOUT_SECONDS and not self.is_stale:
                self.is_stale = True
                self.current_state.sensor_status = "STALE"
                # Re-evaluate risk with stale condition (Rule R4)
                risk_breakdown, recommendation = risk_engine.evaluate_risk(
                    diagnostics=self.current_state.diagnostics,
                    safety=self.current_state.safety,
                    motor_current_a=self.current_state.motor_current_a,
                    is_stale=True
                )
                self.current_state.risk = risk_breakdown
                self.current_state.recommendation = recommendation
                await self.broadcast_channel("unified", self.current_state.model_dump())
                await self.broadcast_channel("risk", {
                    "risk": risk_breakdown.model_dump(),
                    "recommendation": recommendation.model_dump()
                })

ws_manager = ConnectionManager()
