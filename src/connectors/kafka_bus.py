"""Optional high-throughput Kafka streaming connector with graceful local fallback."""

import json
import logging
from typing import Any, Callable
from src.config import settings

logger = logging.getLogger("VidyutSync.Kafka")


class KafkaBusConnector:
    """Kafka event stream connector for large-scale enterprise deployments."""

    def __init__(self, bootstrap_servers: str | None = None):
        self.bootstrap_servers = bootstrap_servers or settings.KAFKA_BOOTSTRAP_SERVERS
        self.topic_prefix = settings.KAFKA_TOPIC_PREFIX
        self._is_active = False

    async def start(self) -> bool:
        """Attempts to connect to Kafka broker."""
        try:
            # We import lazily so aiokafka is strictly optional
            import aiokafka
            self.producer = aiokafka.AIOKafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
            )
            await self.producer.start()
            self._is_active = True
            logger.info(f"Connected to Kafka broker at {self.bootstrap_servers}")
            return True
        except Exception as e:
            logger.info(f"Kafka unavailable ({e}). Operating with local MQTT bus.")
            self._is_active = False
            return False

    async def stop(self):
        """Stops the Kafka producer."""
        if self._is_active and hasattr(self, "producer"):
            await self.producer.stop()
            self._is_active = False

    async def emit_event(self, topic_suffix: str, payload: dict[str, Any]):
        """Publishes an event to Kafka topic."""
        topic = f"{self.topic_prefix}{topic_suffix}"
        if self._is_active:
            try:
                await self.producer.send_and_wait(topic, payload)
            except Exception as e:
                logger.error(f"Failed to publish to Kafka topic {topic}: {e}")
        else:
            logger.debug(f"[Kafka Offline] Emitted event on {topic}: {payload}")
