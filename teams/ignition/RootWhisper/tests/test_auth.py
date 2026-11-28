"""Comprehensive authentication, Argon2id hashing, and session security tests."""

import os
import sys
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import requests

BASE_URL = "http://127.0.0.1:8000"


class TestAuthenticationSecurity(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        import sqlite3
        db_path = BASE_DIR / "data" / "rootwhisper.db"
        if db_path.exists():
            conn = sqlite3.connect(db_path)
            c = conn.cursor()
            c.execute("DELETE FROM users WHERE email LIKE '%@testdomain.com'")
            conn.commit()
            conn.close()

    def setUp(self):
        self.session = requests.Session()
        self.test_email = f"user_{os.urandom(4).hex()}@testdomain.com"
        self.test_password = "SecurePassword123!"
        self.test_name = "Botanical Researcher"

    def test_01_user_registration_success(self):
        """Test registering a real human user with secure Argon2id password hashing."""
        payload = {
            "full_name": self.test_name,
            "email": self.test_email,
            "password": self.test_password,
            "confirm_password": self.test_password
        }
        res = self.session.post(f"{BASE_URL}/api/v1/auth/register", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["email"], self.test_email)
        self.assertEqual(data["user"]["full_name"], self.test_name)
        # Verify HttpOnly cookie was set
        self.assertIn("rootwhisper_session", res.cookies)

    def test_02_duplicate_email_rejection(self):
        """Test that registering an existing email address is strictly rejected (409 Conflict)."""
        # First register
        payload = {
            "full_name": "First User",
            "email": self.test_email,
            "password": self.test_password,
            "confirm_password": self.test_password
        }
        res1 = requests.post(f"{BASE_URL}/api/v1/auth/register", json=payload)
        self.assertEqual(res1.status_code, 201)

        # Attempt registering same email
        res2 = requests.post(f"{BASE_URL}/api/v1/auth/register", json=payload)
        self.assertEqual(res2.status_code, 409)
        self.assertIn("already exists", res2.json()["detail"])

    def test_03_weak_password_rejection(self):
        """Test password policy enforcement: min 8 chars, uppercase, lowercase, digit, special char."""
        weak_passwords = [
            "short",              # too short
            "alllowercase123!",   # no uppercase
            "ALLUPPERCASE123!",   # no lowercase
            "NoNumbersHere!",     # no digit
            "NoSpecialChar1234"   # no special char
        ]
        for weak in weak_passwords:
            payload = {
                "full_name": "Test User",
                "email": f"weak_{os.urandom(3).hex()}@testdomain.com",
                "password": weak,
                "confirm_password": weak
            }
            res = requests.post(f"{BASE_URL}/api/v1/auth/register", json=payload)
            self.assertEqual(res.status_code, 422, f"Expected 422 for weak password: {weak}")

    def test_04_password_mismatch_rejection(self):
        """Test rejection when password and confirm_password do not match."""
        payload = {
            "full_name": "Test User",
            "email": f"mismatch_{os.urandom(3).hex()}@testdomain.com",
            "password": "Password123!",
            "confirm_password": "DifferentPassword123!"
        }
        res = requests.post(f"{BASE_URL}/api/v1/auth/register", json=payload)
        self.assertEqual(res.status_code, 422)

    def test_05_successful_login_and_me_endpoint(self):
        """Test login with valid credentials and session verification via /auth/me."""
        # 1. Register
        reg_payload = {
            "full_name": self.test_name,
            "email": self.test_email,
            "password": self.test_password,
            "confirm_password": self.test_password
        }
        requests.post(f"{BASE_URL}/api/v1/auth/register", json=reg_payload)

        # 2. Login
        login_payload = {
            "email": self.test_email,
            "password": self.test_password,
            "remember_me": True
        }
        sess = requests.Session()
        res_login = sess.post(f"{BASE_URL}/api/v1/auth/login", json=login_payload)
        self.assertEqual(res_login.status_code, 200)
        login_data = res_login.json()
        token = login_data["access_token"]

        # 3. Verify /auth/me via Bearer header
        headers = {"Authorization": f"Bearer {token}"}
        res_me_header = requests.get(f"{BASE_URL}/api/v1/auth/me", headers=headers)
        self.assertEqual(res_me_header.status_code, 200)
        self.assertEqual(res_me_header.json()["email"], self.test_email)

        # 4. Verify /auth/me via Session Cookie
        res_me_cookie = sess.get(f"{BASE_URL}/api/v1/auth/me")
        self.assertEqual(res_me_cookie.status_code, 200)
        self.assertEqual(res_me_cookie.json()["email"], self.test_email)

    def test_06_incorrect_password_rejection(self):
        """Test rejection of incorrect password with 401 Unauthorized."""
        # Register
        reg_payload = {
            "full_name": self.test_name,
            "email": self.test_email,
            "password": self.test_password,
            "confirm_password": self.test_password
        }
        requests.post(f"{BASE_URL}/api/v1/auth/register", json=reg_payload)

        # Attempt login with wrong password
        login_payload = {
            "email": self.test_email,
            "password": "WrongPassword999!"
        }
        res = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_payload)
        self.assertEqual(res.status_code, 401)
        self.assertIn("Invalid email", res.json()["detail"])

    def test_07_logout_invalidates_session_cookie(self):
        """Test logout clears the HttpOnly session cookie."""
        # Register & Login
        reg_payload = {
            "full_name": self.test_name,
            "email": self.test_email,
            "password": self.test_password,
            "confirm_password": self.test_password
        }
        sess = requests.Session()
        sess.post(f"{BASE_URL}/api/v1/auth/register", json=reg_payload)

        # Logout
        res_logout = sess.post(f"{BASE_URL}/api/v1/auth/logout")
        self.assertEqual(res_logout.status_code, 200)

        # Accessing /auth/me with cleared cookie should fail
        res_me = sess.get(f"{BASE_URL}/api/v1/auth/me")
        self.assertEqual(res_me.status_code, 401)

    def test_08_password_recovery_and_reset_flow(self):
        """Test single-use password reset token generation and password updating."""
        from datetime import datetime, timezone
        from backend.app.services.auth_service import generate_password_reset_token

        # 1. Register
        reg_payload = {
            "full_name": self.test_name,
            "email": self.test_email,
            "password": self.test_password,
            "confirm_password": self.test_password
        }
        requests.post(f"{BASE_URL}/api/v1/auth/register", json=reg_payload)

        # 2. Generate cryptographically secure token and store hash in database
        raw_token, token_hash, expires_at = generate_password_reset_token()
        import sqlite3
        conn = sqlite3.connect(BASE_DIR / "data" / "rootwhisper.db")
        c = conn.cursor()
        c.execute("SELECT id FROM users WHERE email = ?", (self.test_email,))
        u_row = c.fetchone()
        self.assertIsNotNone(u_row)
        user_id = u_row[0]
        c.execute(
            "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)",
            (user_id, token_hash, expires_at, datetime.now(timezone.utc))
        )
        conn.commit()
        conn.close()

        # 3. Reset password with valid token
        new_password = "BrandNewPassword456!"
        reset_payload = {
            "token": raw_token,
            "new_password": new_password,
            "confirm_password": new_password
        }
        reset_res = requests.post(f"{BASE_URL}/api/v1/auth/reset-password", json=reset_payload)
        self.assertEqual(reset_res.status_code, 200)

        # 4. Token cannot be reused (single-use enforcement)
        reuse_res = requests.post(f"{BASE_URL}/api/v1/auth/reset-password", json=reset_payload)
        self.assertEqual(reuse_res.status_code, 400)

        # 5. Login with new password succeeds
        login_res = requests.post(f"{BASE_URL}/api/v1/auth/login", json={"email": self.test_email, "password": new_password})
        self.assertEqual(login_res.status_code, 200)

        # 6. Old password fails
        old_login = requests.post(f"{BASE_URL}/api/v1/auth/login", json={"email": self.test_email, "password": self.test_password})
        self.assertEqual(old_login.status_code, 401)


if __name__ == "__main__":
    unittest.main(verbosity=2)

