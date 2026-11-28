"""MQTT message bus connector for industrial telemetry and actuator control."""

import json
import logging
from typing import Any, Callable
import paho.mqtt.client as mqtt
from src.config import settings

logger = logging.getLogger("VidyutSync.MQTT")


class MQTTBusConnector:
    """Manages asynchronous publishing and subscriptions over Eclipse Mosquitto."""

    def __init__(
        self,
        host: str | None = None,
        port: int | None = None,
        client_id: str | None = None,
    ):
        self.host = host or settings.MQTT_BROKER_HOST
        self.port = port or settings.MQTT_BROKER_PORT
        self.client_id = client_id or settings.MQTT_CLIENT_ID

        # paho-mqtt v2 callback API
        try:
            self.client = mqtt.Client(
                mqtt.CallbackAPIVersion.VERSION2,
                client_id=self.client_id,
            )
        except AttributeError:
            self.client = mqtt.Client(client_id=self.client_id)

        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect

        self._telemetry_callbacks: list[Callable[[str, dict], None]] = []
        self._is_connected = False

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            self._is_connected = True
            logger.info(f"MQTT Connected to broker {self.host}:{self.port}")
            # Subscribe to all incoming telemetry topics
            self.client.subscribe("vidyutsync/telemetry/#")
            self.client.subscribe("vidyutsync/overrides/#")
        else:
            logger.warning(f"MQTT connection failed with code {rc}")

    def _on_disconnect(self, client, userdata, disconnect_flags_or_rc, properties=None):
        self._is_connected = False
        logger.warning("MQTT disconnected from broker.")

    def _on_message(self, client, userdata, msg):
        topic = msg.topic
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            for callback in self._telemetry_callbacks:
                callback(topic, payload)
        except Exception as e:
            logger.error(f"Error handling MQTT message on {topic}: {e}")

    def register_telemetry_listener(self, callback: Callable[[str, dict], None]):
        """Registers a listener callback for incoming MQTT messages."""
        self._telemetry_callbacks.append(callback)

    def start(self) -> bool:
        """Starts the MQTT network loop."""
        try:
            self.client.connect_async(self.host, self.port, keepalive=settings.MQTT_KEEPALIVE)
            self.client.loop_start()
            return True
        except Exception as e:
            logger.warning(f"Could not connect to MQTT broker ({e}). Offline mode active.")
            return False

    def stop(self):
        """Stops the network loop and disconnects."""
        self.client.loop_stop()
        self.client.disconnect()
        self._is_connected = False

    def publish_telemetry(self, asset_id: str, data: dict[str, Any]):
        """Publishes real-time asset telemetry."""
        topic = f"vidyutsync/telemetry/{asset_id}"
        self._publish(topic, data)

    def publish_control_setpoint(self, asset_id: str, setpoints: dict[str, Any]):
        """Publishes actuator setpoints (in live_pilot mode)."""
        topic = f"vidyutsync/control/{asset_id}"
        self._publish(topic, setpoints)

    def publish_safety_alert(self, alert_data: dict[str, Any]):
        """Publishes safety/guardrail alerts."""
        topic = "vidyutsync/alerts/safety"
        self._publish(topic, alert_data)

    def _publish(self, topic: str, payload: dict):
        if self._is_connected:
            try:
                self.client.publish(topic, json.dumps(payload, default=str), qos=1)
            except Exception as e:
                logger.error(f"Failed to publish to {topic}: {e}")
        else:
            logger.debug(f"[MQTT Offline] Message on {topic}: {payload}")
