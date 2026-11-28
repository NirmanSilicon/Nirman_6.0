"""Comprehensive tests for Gmail SMTP integration, password recovery tokens, and reset flow."""

import os
import sys
import unittest
import urllib.request
import urllib.error
import json
import sqlite3
import hashlib
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app.services.auth_service import (
    hash_password,
    verify_password,
    generate_password_reset_token,
    hash_token,
    verify_smtp_connectivity,
    send_test_email,
    RESET_TOKEN_EXPIRY_MINUTES,
    FORGOT_PASSWORD_MAX_ATTEMPTS
)

BASE_URL = "http://127.0.0.1:8000"


class TestPasswordRecoveryAndSmtp(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Register a dedicated test user for recovery tests
        cls.db_path = BASE_DIR / "data" / "rootwhisper.db"
        cls.test_email = "recovery_tester@testdomain.com"
        cls.test_initial_password = "InitialPassword123!#"
        cls.test_new_password = "UpdatedPassword2026!#"
        cls.test_name = "Recovery Test User"

        # Create or ensure user in database
        conn = sqlite3.connect(cls.db_path)
        c = conn.cursor()
        c.execute("DELETE FROM users WHERE email = ?", (cls.test_email,))
        c.execute(
            "INSERT INTO users (email, full_name, hashed_password, is_active, created_at) VALUES (?, ?, ?, 1, ?)",
            (cls.test_email, cls.test_name, hash_password(cls.test_initial_password), datetime.now(timezone.utc))
        )
        cls.test_user_id = c.lastrowid
        conn.commit()
        conn.close()

    @classmethod
    def tearDownClass(cls):
        # Clean up test user and any test tokens
        conn = sqlite3.connect(cls.db_path)
        c = conn.cursor()
        c.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", (cls.test_user_id,))
        c.execute("DELETE FROM users WHERE email = ?", (cls.test_email,))
        conn.commit()
        conn.close()

    def test_01_smtp_status_and_connectivity(self):
        """Verify Gmail SMTP configuration via backend endpoint and direct socket handshake."""
        # 1. Endpoint status
        req = urllib.request.Request(f"{BASE_URL}/api/v1/auth/smtp-status")
        with urllib.request.urlopen(req, timeout=5) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode())
            self.assertTrue(data["configured"])
            self.assertEqual(len(data["missing_variables"]), 0)
            self.assertEqual(data["smtp_host"], "smtp.gmail.com")
            self.assertEqual(data["smtp_port"], 587)
            self.assertIn("patnaaik.ayes@gmail.com", data["smtp_from_email"])

        # 2. Live SMTP handshake
        ok, msg = verify_smtp_connectivity()
        if not ok and ("authentication failed" in msg or "SMTPServerDisconnected" in msg or "Connection unexpectedly closed" in msg or "BadCredentials" in msg):
            self.skipTest(f"Live Gmail SMTP server rejected App Password (may need refresh in Google Account): {msg}")
        self.assertTrue(ok, f"SMTP handshake failed: {msg}")
        self.assertIn("verified successfully", msg)

    def test_02_invalid_email_format_rejected(self):
        """Verify invalid email formats are rejected by the API."""
        invalid_emails = ["not-an-email", "@missinguser.com", "user@", "spaces in@email.com"]
        for bad in invalid_emails:
            payload = json.dumps({"email": bad}).encode("utf-8")
            req = urllib.request.Request(
                f"{BASE_URL}/api/v1/auth/forgot-password",
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            with self.assertRaises(urllib.error.HTTPError) as ctx:
                urllib.request.urlopen(req, timeout=5)
            self.assertEqual(ctx.exception.code, 422)

    def test_03_forgot_password_unregistered_email(self):
        """Verify unregistered email returns generic privacy-preserving message."""
        payload = json.dumps({"email": "nonexistent_researcher_999@unknown.org"}).encode("utf-8")
        req = urllib.request.Request(
            f"{BASE_URL}/api/v1/auth/forgot-password",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode())
            self.assertEqual(data["status"], "SUCCESS")
            self.assertIn("password-reset instructions will be sent", data["message"])
            self.assertNotIn("token", data)
            self.assertNotIn("test_reset_token", data)

    def test_04_token_generation_and_hashing_security(self):
        """Verify tokens are cryptographically random, hashed before storage, and expire in 30m."""
        raw_token, token_hash, expires_at = generate_password_reset_token()
        self.assertEqual(len(raw_token), 43)  # 32 urlsafe bytes = 43 chars
        self.assertEqual(token_hash, hashlib.sha256(raw_token.encode("utf-8")).hexdigest())
        expected_expiry = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRY_MINUTES)
        # Expiration must match 30 minutes within 5 seconds tolerance
        diff = abs((expires_at - expected_expiry).total_seconds())
        self.assertLess(diff, 5)

    def test_05_verify_reset_token_valid(self):
        """Verify GET /verify-reset-token succeeds for a valid, active token."""
        raw_token, token_hash, expires_at = generate_password_reset_token()
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute(
            "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)",
            (self.test_user_id, token_hash, expires_at, datetime.now(timezone.utc))
        )
        conn.commit()
        conn.close()

        req = urllib.request.Request(f"{BASE_URL}/api/v1/auth/verify-reset-token?token={raw_token}")
        with urllib.request.urlopen(req, timeout=5) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode())
            self.assertEqual(data["status"], "VALID")
            self.assertIn("r***r@testdomain.com", data["user_email_masked"])

    def test_06_verify_reset_token_invalid_or_expired(self):
        """Verify invalid and expired tokens are rejected with HTTP 400."""
        # 1. Random non-existent token
        fake_token = "invalid_token_which_does_not_exist_in_db_1234567890"
        req_fake = urllib.request.Request(f"{BASE_URL}/api/v1/auth/verify-reset-token?token={fake_token}")
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req_fake, timeout=5)
        self.assertEqual(ctx.exception.code, 400)

        # 2. Expired token
        raw_exp, hash_exp, _ = generate_password_reset_token()
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        past_time = datetime.now(timezone.utc) - timedelta(minutes=10)
        c.execute(
            "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)",
            (self.test_user_id, hash_exp, past_time, past_time - timedelta(minutes=30))
        )
        conn.commit()
        conn.close()

        req_exp = urllib.request.Request(f"{BASE_URL}/api/v1/auth/verify-reset-token?token={raw_exp}")
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req_exp, timeout=5)
        self.assertEqual(ctx.exception.code, 400)
        err = json.loads(ctx.exception.read().decode())
        self.assertIn("expired", err["detail"].lower())

    def test_07_successful_password_reset_and_token_invalidation(self):
        """Verify successful password update via reset-password, token invalidation, and replay prevention."""
        raw_token, token_hash, expires_at = generate_password_reset_token()
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute(
            "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)",
            (self.test_user_id, token_hash, expires_at, datetime.now(timezone.utc))
        )
        conn.commit()
        conn.close()

        # Submit new password
        payload = json.dumps({
            "token": raw_token,
            "new_password": self.test_new_password,
            "confirm_password": self.test_new_password
        }).encode("utf-8")
        req_reset = urllib.request.Request(
            f"{BASE_URL}/api/v1/auth/reset-password",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req_reset, timeout=5) as resp:
            self.assertEqual(resp.status, 200)
            res_data = json.loads(resp.read().decode())
            self.assertEqual(res_data["status"], "SUCCESS")

        # Verify token is now marked used in SQLite
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT used FROM password_reset_tokens WHERE token_hash = ?", (token_hash,))
        self.assertEqual(c.fetchone()[0], 1)
        conn.close()

        # Replaying the same token must fail (HTTP 400)
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req_reset, timeout=5)
        self.assertEqual(ctx.exception.code, 400)
        err = json.loads(ctx.exception.read().decode())
        self.assertIn("already been used", err["detail"])

    def test_08_login_with_new_password_and_old_password_rejected(self):
        """Verify that login succeeds with the updated password and fails with the old password."""
        # Old password must fail
        old_payload = json.dumps({
            "email": self.test_email,
            "password": self.test_initial_password
        }).encode("utf-8")
        req_old = urllib.request.Request(
            f"{BASE_URL}/api/v1/auth/login",
            data=old_payload,
            headers={"Content-Type": "application/json"}
        )
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req_old, timeout=5)
        self.assertEqual(ctx.exception.code, 401)

        # New password must succeed
        new_payload = json.dumps({
            "email": self.test_email,
            "password": self.test_new_password
        }).encode("utf-8")
        req_new = urllib.request.Request(
            f"{BASE_URL}/api/v1/auth/login",
            data=new_payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req_new, timeout=5) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode())
            self.assertIn("access_token", data)
            self.assertEqual(data["user"]["email"], self.test_email)


if __name__ == "__main__":
    unittest.main(verbosity=2)

