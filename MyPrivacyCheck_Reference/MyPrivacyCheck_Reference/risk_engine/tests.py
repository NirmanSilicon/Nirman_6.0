import unittest
from risk_engine.scoring import calculate_assessment
class RiskTests(unittest.TestCase):
    def test_yes_higher_than_no(self):
        yes = calculate_assessment([{"category":"digital_footprint","response":"yes","weight":2}])
        no = calculate_assessment([{"category":"digital_footprint","response":"no","weight":2}])
        self.assertGreater(yes["overall_score"], no["overall_score"])
    def test_not_sure_is_not_zero(self):
        result = calculate_assessment([{"category":"digital_footprint","response":"not_sure","weight":2}])
        self.assertEqual(result["overall_score"], 50)
