"""ParkSMART - Unit Tests for Monte Carlo Availability Simulation (File 199)."""

import unittest

from app.modules.availability.monte_carlo import simulate


class TestMonteCarlo(unittest.TestCase):
    def test_deterministic_for_seed(self):
        r1 = simulate(capacity=10, center_pct=50.0, sigma_pct=10.0, n_simulations=1000, seed=123)
        r2 = simulate(capacity=10, center_pct=50.0, sigma_pct=10.0, n_simulations=1000, seed=123)
        self.assertEqual(r1.probability, r2.probability)
        self.assertEqual(r1.expected_available, r2.expected_available)
        self.assertEqual(r1.expected_occupancy_pct, r2.expected_occupancy_pct)

    def test_rejects_invalid_inputs(self):
        with self.assertRaises(ValueError):
            simulate(capacity=0, center_pct=50.0, sigma_pct=10.0)
        with self.assertRaises(ValueError):
            simulate(capacity=10, center_pct=50.0, sigma_pct=10.0, n_simulations=0)
        with self.assertRaises(ValueError):
            simulate(capacity=10, center_pct=-1.0, sigma_pct=10.0)
        with self.assertRaises(ValueError):
            simulate(capacity=10, center_pct=101.0, sigma_pct=10.0)
        with self.assertRaises(ValueError):
            simulate(capacity=10, center_pct=50.0, sigma_pct=-5.0)

    def test_center_zero_is_nearly_certain_available(self):
        res = simulate(capacity=10, center_pct=0.0, sigma_pct=0.0, n_simulations=500, seed=42)
        self.assertEqual(res.probability, 1.0)
        self.assertEqual(res.expected_available, 10.0)
        self.assertEqual(res.expected_occupancy_pct, 0.0)

    def test_center_hundred_zero_sigma_is_zero_probability(self):
        res = simulate(capacity=10, center_pct=100.0, sigma_pct=0.0, n_simulations=500, seed=42)
        self.assertEqual(res.probability, 0.0)
        self.assertEqual(res.expected_available, 0.0)
        self.assertEqual(res.expected_occupancy_pct, 100.0)

    def test_monotonic_in_center(self):
        r_low = simulate(capacity=20, center_pct=20.0, sigma_pct=5.0, seed=100)
        r_mid = simulate(capacity=20, center_pct=50.0, sigma_pct=5.0, seed=100)
        r_high = simulate(capacity=20, center_pct=80.0, sigma_pct=5.0, seed=100)
        self.assertTrue(r_low.probability >= r_mid.probability >= r_high.probability)

    def test_sigma_zero_matches_binomial_closed_form(self):
        # capacity = 10, center_pct = 50%, sigma = 0 => p(occupied) = 0.5 for each bay
        # P(at least 1 free) = 1 - P(all 10 occupied) = 1 - (0.5)^10 = 1 - 0.000976 = 0.9990
        res = simulate(capacity=10, center_pct=50.0, sigma_pct=0.0, n_simulations=5000, seed=42)
        expected_prob = 1.0 - (0.5 ** 10)
        self.assertLess(abs(res.probability - expected_prob), 0.01)

    def test_probability_between_zero_and_one(self):
        res = simulate(capacity=5, center_pct=60.0, sigma_pct=15.0, seed=42)
        self.assertTrue(0.0 <= res.probability <= 1.0)

    def test_expected_available_consistency(self):
        capacity = 15
        res = simulate(capacity=capacity, center_pct=40.0, sigma_pct=10.0, seed=42)
        calc_total = res.expected_available + (res.expected_occupancy_pct / 100.0 * capacity)
        self.assertLess(abs(calc_total - capacity), 0.5)

    def test_percentiles_ordered(self):
        res = simulate(capacity=25, center_pct=50.0, sigma_pct=10.0, seed=42)
        self.assertLessEqual(res.p10_available, res.p90_available)


if __name__ == "__main__":
    unittest.main()
