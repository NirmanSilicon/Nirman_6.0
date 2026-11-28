"""
ParkSMART - In-Memory Ingestion Message Deduplication Cache (File 82 / M2 Ownership)

Responsibility:
Fast in-memory duplicate suppression for message IDs (bounded LRU cache).
The database unique constraints (uq_occupancy_event_msg_bay and observation unique constraints)
remain the ultimate authority for system correctness.
"""

from __future__ import annotations

import uuid
from collections import OrderedDict

DEFAULT_CAPACITY = 10000


class RecentMessageCache:
    """
    In-memory LRU cache of recently processed message IDs:
      - Bounded capacity (default 10,000) using collections.OrderedDict.
      - seen(msg_id) checks presence and refreshes recency without inserting.
      - remember(msg_id) records a successfully processed msg_id, evicting the oldest if at capacity.
      - Lost on restart; correctness never depends on this cache (DB constraints are authoritative).
    """

    def __init__(self, capacity: int = DEFAULT_CAPACITY):
        self.capacity = max(1, capacity)
        self._cache: OrderedDict[uuid.UUID, None] = OrderedDict()

    def seen(self, msg_id: uuid.UUID | str) -> bool:
        """
        Returns True if msg_id is in the cache and refreshes recency (moves to end).
        Does not insert the ID if not already present.
        """
        try:
            uid = uuid.UUID(str(msg_id))
        except (ValueError, TypeError):
            return False

        if uid in self._cache:
            self._cache.move_to_end(uid)
            return True
        return False

    def remember(self, msg_id: uuid.UUID | str) -> None:
        """
        Records msg_id in the cache. Evicts LRU item if at capacity.
        Must only be called after message processing has succeeded so failed messages
        can be retried upon redelivery.
        """
        try:
            uid = uuid.UUID(str(msg_id))
        except (ValueError, TypeError):
            return

        self._cache[uid] = None
        self._cache.move_to_end(uid)
        if len(self._cache) > self.capacity:
            self._cache.popitem(last=False)

    def clear(self) -> None:
        """Clears the cache (primarily for unit tests)."""
        self._cache.clear()

    def __len__(self) -> int:
        return len(self._cache)

    def __contains__(self, msg_id: uuid.UUID | str) -> bool:
        try:
            uid = uuid.UUID(str(msg_id))
            return uid in self._cache
        except (ValueError, TypeError):
            return False


# Module-level singleton
cache = RecentMessageCache()
