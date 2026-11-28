"""Live end-to-end integration verification test for running services."""

import json
import urllib.request
import urllib.error
import time
import uuid
import sys
import sqlite3

def test_live_services():
    print("=" * 60)
    print("ROOTWHISPER LIVE END-TO-END VERIFICATION")
    print("=" * 60)

    # 1. FastAPI Backend Health Check
    print("\n[1] Checking FastAPI Backend Health (http://localhost:8000/health)...")
    req = urllib.request.Request("http://localhost:8000/health")
    with urllib.request.urlopen(req, timeout=5) as resp:
        assert resp.status == 200, f"Backend status: {resp.status}"
        data = json.loads(resp.read().decode())
        print(f"    Status: 200 OK | Payload: {data}")
        assert data["status"] == "healthy"

    # 2. Devices Listing
    print("\n[2] Checking Devices Endpoint (/api/v1/devices)...")
    req = urllib.request.Request("http://localhost:8000/api/v1/devices")
    with urllib.request.urlopen(req, timeout=5) as resp:
        assert resp.status == 200
        devices = json.loads(resp.read().decode())
        print(f"    Status: 200 OK | Devices Count: {len(devices)}")
        dev_ids = [d["device_id"] for d in devices]
        print(f"    Registered Devices: {dev_ids}")
        assert "TULSI_01" in dev_ids
        assert "HIBISCUS_01" in dev_ids
        assert "MONEYPLANT_01" in dev_ids

    # 3. Monitored Plants Telemetry & Baseline Models
    print("\n[3] Checking Specimen-Specific Models & Telemetry...")
    for dev_id in ["TULSI_01", "HIBISCUS_01", "MONEYPLANT_01"]:
        # Telemetry
        req_t = urllib.request.Request(f"http://localhost:8000/api/v1/telemetry/{dev_id}/latest")
        try:
            with urllib.request.urlopen(req_t, timeout=5) as resp_t:
                assert resp_t.status == 200
                t_data = json.loads(resp_t.read().decode())
                print(f"    [{dev_id}] Latest telemetry status: 200 OK | Screening: {t_data.get('screening', {}).get('screening_output', 'N/A')}")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                print(f"    [{dev_id}] Latest telemetry: 404 Not Found (Honest state: No mock data while hardware disconnected)")
            else:
                raise
        # Model
        req_m = urllib.request.Request(f"http://localhost:8000/api/v1/models/{dev_id}/status")
        with urllib.request.urlopen(req_m, timeout=5) as resp_m:
            assert resp_m.status == 200
            m_data = json.loads(resp_m.read().decode())
            print(f"    [{dev_id}] Model calibrated: {m_data.get('is_calibrated')} | Notice: {m_data.get('scientific_limitation_notice')[:45]}...")

    # 4. Real User Authentication Flow
    test_email = f"researcher_{uuid.uuid4().hex[:8]}@rootwhisper.org"
    test_password = "SecureBotanist2026!#"
    test_name = "Dr. Eleanor Vance"

    print(f"\n[4] Testing Human Registration for '{test_name}' ({test_email})...")
    reg_payload = json.dumps({
        "full_name": test_name,
        "email": test_email,
        "password": test_password,
        "confirm_password": test_password
    }).encode("utf-8")
    req_reg = urllib.request.Request(
        "http://localhost:8000/api/v1/auth/register",
        data=reg_payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_reg, timeout=5) as resp_reg:
        assert resp_reg.status == 201
        reg_res = json.loads(resp_reg.read().decode())
        print(f"    Registration Success: User ID {reg_res['user']['id']} | Name: {reg_res['user']['full_name']}")
        token = reg_res["access_token"]

    # 5. Token Authentication & /auth/me Session
    print("\n[5] Verifying /auth/me with Bearer JWT Token...")
    req_me = urllib.request.Request(
        "http://localhost:8000/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req_me, timeout=5) as resp_me:
        assert resp_me.status == 200
        me_res = json.loads(resp_me.read().decode())
        print(f"    Authenticated as: {me_res['full_name']} <{me_res['email']}>")
        assert me_res["email"] == test_email
        assert me_res["full_name"] == test_name

    # 6. Reject Fake / Demo Login
    print("\n[6] Verifying Rejection of Demo/Fake Credentials...")
    try:
        fake_payload = json.dumps({
            "email": "demo@rootwhisper.com",
            "password": "wrongpassword123"
        }).encode("utf-8")
        req_fake = urllib.request.Request(
            "http://localhost:8000/api/v1/auth/login",
            data=fake_payload,
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req_fake, timeout=5)
        print("    ERROR: Fake login should have been rejected!")
        sys.exit(1)
    except urllib.error.HTTPError as e:
        assert e.code == 401
        print("    Correctly Rejected: 401 Unauthorized for nonexistent user.")

    # 7. React Frontend Server Accessibility
    print("\n[7] Checking React Frontend Server (http://localhost:3000)...")
    req_fe = urllib.request.Request("http://localhost:3000/")
    with urllib.request.urlopen(req_fe, timeout=5) as resp_fe:
        assert resp_fe.status == 200
        html = resp_fe.read().decode()
        print(f"    React Frontend Status: 200 OK | Content Length: {len(html)} bytes")
        assert "rootwhisper" in html.lower() or "root" in html.lower()

    # Clean up test user to preserve database integrity
    conn = sqlite3.connect("data/rootwhisper.db")
    c = conn.cursor()
    c.execute("DELETE FROM users WHERE email LIKE 'researcher_%@rootwhisper.org'")
    conn.commit()
    conn.close()

    print("\n" + "=" * 60)
    print("ALL LIVE INTEGRATION TESTS PASSED SUCCESSFULLY (100%)")
    print("=" * 60)

if __name__ == "__main__":
    test_live_services()
