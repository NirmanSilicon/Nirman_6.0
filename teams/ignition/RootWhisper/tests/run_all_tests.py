"""Comprehensive test suite runner for RootWhisper platform."""

import sys
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from tests.test_data_validator import TestDataValidator
from tests.test_screener import TestScreener
from tests.test_api import TestAPIEndpoints
from tests.test_auth import TestAuthenticationSecurity
from tests.test_password_recovery import TestPasswordRecoveryAndSmtp

def suite():
    s = unittest.TestSuite()
    s.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(TestDataValidator))
    s.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(TestScreener))
    s.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(TestAPIEndpoints))
    s.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(TestAuthenticationSecurity))
    s.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(TestPasswordRecoveryAndSmtp))
    return s

if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite())
    sys.exit(not result.wasSuccessful())
