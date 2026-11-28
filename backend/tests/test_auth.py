from fastapi.testclient import TestClient
from app.database import init_db
from app.main import app
from app.security.auth import hash_password, seed_demo_users, verify_password


def test_argon2_password_hash_and_verify():
    hashed = hash_password("CyberGuard#2026")
    assert hashed.startswith("$argon2")
    assert verify_password("CyberGuard#2026", hashed) is True
    assert verify_password("WrongPass", hashed) is False


def test_demo_login_activity_tracking_and_citizen_rbac():
    init_db()
    seed_demo_users()
    client = TestClient(app)

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "citizen@cyberguard.in", "password": "Citizen@2026"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    chk = client.post("/api/v1/check-link", json={"url": "javascript:alert(1)"}, headers=headers)
    assert chk.status_code == 200
    assert chk.json()["verdict"] == "BLOCKED"

    act = client.get("/api/v1/auth/activity", headers=headers)
    assert act.status_code == 200
    assert act.json()["link_checks_count"] >= 1

    rem = client.post(
        "/api/v1/remediate",
        json={
            "url": "https://example.com",
            "agent_key": "dummy-key",
            "approved": True,
            "patches": ["hsts"],
        },
        headers=headers,
    )
    assert rem.status_code == 403
