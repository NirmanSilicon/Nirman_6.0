import asyncio
import json
import logging
from backend.app.config import settings
from backend.app.websocket.manager import ws_manager

logger = logging.getLogger("MQTT")

class MQTTIngestionService:
    def __init__(self):
        self.client = None
        self.is_connected = False

    def start(self, loop: asyncio.AbstractEventLoop):
        try:
            import paho.mqtt.client as mqtt
            self.client = mqtt.Client(client_id="MechGuard_Backend")

            def on_connect(client, userdata, flags, rc):
                if rc == 0:
                    logger.info("Connected to MQTT Broker successfully")
                    self.is_connected = True
                    client.subscribe("mechguard/+/+/telemetry", qos=1)
                    client.subscribe("mechguard/+/+/heartbeat", qos=0)
                    client.subscribe("mechguard/+/+/status", qos=1)
                else:
                    logger.warning(f"MQTT connection failed with code {rc}")

            def on_message(client, userdata, msg):
                try:
                    payload = json.loads(msg.payload.decode("utf-8"))
                    topic = msg.topic
                    if "telemetry" in topic:
                        samples = payload.get("samples", [])
                        asyncio.run_coroutine_threadsafe(
                            ws_manager.update_telemetry(
                                machine_id=payload.get("machine_id", "MOTOR_01"),
                                temperature_c=float(payload.get("temperature_c", 32.0)),
                                motor_current_a=float(payload.get("motor_current_a", 0.8)),
                                samples=samples,
                                protocol="mqtt",
                                source="hardware"
                            ),
                            loop
                        )
                except Exception as e:
                    logger.error(f"Error parsing MQTT message: {e}")

            self.client.on_connect = on_connect
            self.client.on_message = on_message
            self.client.connect_async(settings.MQTT_BROKER_HOST, settings.MQTT_BROKER_PORT, 60)
            self.client.loop_start()
            logger.info("MQTT Client background loop started")
        except Exception as e:
            logger.warning(f"Paho MQTT not available or broker unreachable: {e}. Falling back to HTTP/Simulated ingestion.")

mqtt_service = MQTTIngestionService()
