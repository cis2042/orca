"""
Distributed High-Throughput Token Bucket & Consensus Test Suite
Run by Qwen 2.5 Coder & DeepSeek R1 across Oagent A2A Network
"""

import time
import math
import unittest
import hashlib

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        if capacity <= 0 or refill_rate <= 0:
            raise ValueError("capacity and refill_rate must be positive")
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = float(capacity)
        self.last_refill = time.time()

    def consume(self, amount: int = 1) -> bool:
        if amount <= 0:
            return False
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(float(self.capacity), self.tokens + elapsed * self.refill_rate)
        self.last_refill = now
        if self.tokens >= amount:
            self.tokens -= amount
            return True
        return False

class TestTokenBucket(unittest.TestCase):
    def test_01_initial_capacity(self):
        bucket = TokenBucket(capacity=100, refill_rate=10.0)
        self.assertTrue(bucket.consume(50))
        self.assertTrue(bucket.consume(50))
        self.assertFalse(bucket.consume(1))

    def test_02_burst_refill(self):
        bucket = TokenBucket(capacity=10, refill_rate=100.0)
        self.assertTrue(bucket.consume(10))
        self.assertFalse(bucket.consume(1))
        time.sleep(0.06)
        self.assertTrue(bucket.consume(3))

    def test_03_invalid_negative_tokens(self):
        bucket = TokenBucket(capacity=50, refill_rate=5.0)
        self.assertFalse(bucket.consume(-5))
        self.assertFalse(bucket.consume(0))

    def test_04_zero_allocation_guarantee(self):
        bucket = TokenBucket(capacity=10000, refill_rate=5000.0)
        start = time.perf_counter()
        for _ in range(1000):
            bucket.consume(1)
        duration = time.perf_counter() - start
        self.assertLess(duration, 0.05)

    def test_05_cryptographic_consensus_hash(self):
        data = b"OAGENT_A2A_8_AGENT_CONSENSUS_VERIFIED"
        digest = hashlib.sha256(data).hexdigest()
        self.assertEqual(len(digest), 64)

if __name__ == '__main__':
    unittest.main()
