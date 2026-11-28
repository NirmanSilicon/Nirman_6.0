import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
for folder in ("ml-model", "voice-guidance", "database"):
    sys.path.insert(0, str(ROOT_DIR / folder))

from features import extract_features  # noqa: E402
from guidance import get_guidance_for_language  # noqa: E402
from mysql_config import get_mysql_status  # noqa: E402


class SatarkSetuBackendTests(unittest.TestCase):
    def test_url_feature_extraction(self):
        feats = extract_features("sbi-kyc-verify-now.xyz/login")
        self.assertEqual(feats["brand_spoof"], 1)
        self.assertEqual(feats["has_suspicious_tld"], 1)
        self.assertGreaterEqual(feats["action_keyword_count"], 3)

    def test_multilingual_guidance_languages(self):
        for lang in ("en", "hi", "or"):
            data = get_guidance_for_language(lang, "PHISHING_URL")
            self.assertIn("headline", data)
            self.assertIn("recommendedAction", data)
            self.assertTrue(len(data["headline"]) > 0)

    def test_mysql_status_structure(self):
        status = get_mysql_status()
        self.assertEqual(status["engine"], "mysql")
        self.assertIn("database", status)


if __name__ == "__main__":
    unittest.main()
