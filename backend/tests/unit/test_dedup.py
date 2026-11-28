"""
Unit tests for backend/app/modules/ingestion/dedup.py (File 202)
Tests in-memory LRU deduplication cache, capacity bounds, recency refreshing,
and non-authoritative fallback documentation.
"""

from __future__ import annotations

import sys
import unittest
import uuid
from pathlib import Path

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.modules.ingestion.dedup import RecentMessageCache


class TestRecentMessageCache(unittest.TestCase):
    def test_seen_false_then_true_after_remember(self):
        """seen() returns False before remember(), True after."""
        c = RecentMessageCache(capacity=10)
        msg_id = uuid.uuid4()

        self.assertFalse(c.seen(msg_id))
        c.remember(msg_id)
        self.assertTrue(c.seen(msg_id))

    def test_remember_is_not_automatic(self):
        """Calling seen() alone does not insert into cache."""
        c = RecentMessageCache(capacity=10)
        msg_id = uuid.uuid4()

        self.assertFalse(c.seen(msg_id))
        self.assertFalse(c.seen(msg_id))
        self.assertEqual(len(c), 0)

    def test_lru_eviction_at_capacity(self):
        """Capacity=3: remember a, b, c; remember d evicts a."""
        c = RecentMessageCache(capacity=3)
        a, b, c_id, d = uuid.uuid4(), uuid.uuid4(), uuid.uuid4(), uuid.uuid4()

        c.remember(a)
        c.remember(b)
        c.remember(c_id)
        self.assertEqual(len(c), 3)

        c.remember(d)
        self.assertEqual(len(c), 3)
        self.assertFalse(c.seen(a), "Oldest element 'a' should have been evicted")
        self.assertTrue(c.seen(b))
        self.assertTrue(c.seen(c_id))
        self.assertTrue(c.seen(d))

    def test_seen_refreshes_recency(self):
        """seen(a) moves a to MRU; remember(d) then evicts b instead of a."""
        c = RecentMessageCache(capacity=3)
        a, b, c_id, d = uuid.uuid4(), uuid.uuid4(), uuid.uuid4(), uuid.uuid4()

        c.remember(a)
        c.remember(b)
        c.remember(c_id)

        # Accessing 'a' refreshes its recency
        self.assertTrue(c.seen(a))

        # Adding 'd' should now evict 'b' (the oldest unrefreshed item)
        c.remember(d)
        self.assertTrue(c.seen(a), "'a' was refreshed and should still be present")
        self.assertFalse(c.seen(b), "'b' was oldest and should have been evicted")
        self.assertTrue(c.seen(c_id))
        self.assertTrue(c.seen(d))

    def test_clear(self):
        """clear() removes all cached IDs."""
        c = RecentMessageCache(capacity=10)
        for _ in range(5):
            c.remember(uuid.uuid4())
        self.assertEqual(len(c), 5)

        c.clear()
        self.assertEqual(len(c), 0)

    def test_cache_is_not_authority_for_correctness(self):
        """
        Documentation test: Verifies that in-memory cache is purely an optimization.
        If the cache is cleared (simulating service restart), duplicate delivery
        must still be handled idempotently by the database layer.
        """
        c = RecentMessageCache(capacity=10)
        msg_id = uuid.uuid4()
        c.remember(msg_id)
        self.assertTrue(c.seen(msg_id))

        # Simulate service restart: cache wiped
        c.clear()
        self.assertFalse(c.seen(msg_id))
        # Downstream database layer (uq_occupancy_event_msg_bay) is authoritative


if __name__ == "__main__":
    unittest.main()
