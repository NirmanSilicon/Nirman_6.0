"""RootWhisper Gmail API OAuth 2.0 Authorization & Test Tool.

Walks through obtaining a permanent Google OAuth 2.0 Refresh Token
for sending password-reset emails to ANY recipient via the Gmail API over HTTPS (Port 443).

Requirements:
- Google Cloud Project with Gmail API enabled
- OAuth Client ID & Client Secret (Type: Web Application)
- Redirect URI configured in Google Cloud: http://localhost:8085

Usage:
    python tools/setup_gmail_oauth.py
    python tools/setup_gmail_oauth.py --client-id <ID> --client-secret <SECRET>
    python tools/setup_gmail_oauth.py --test-send <recipient_email>
"""

import sys
import os
import json
import argparse
import urllib.request
import urllib.parse
import urllib.error
import webbrowser
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

ENV_PATH = BASE_DIR / "backend" / ".env"
DEFAULT_REDIRECT_PORT = 8085
OAUTH_SCOPE = "https://www.googleapis.com/auth/gmail.send"

auth_code_received = None


class OAuthCallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code_received
        query_components = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        if "code" in query_components:
            auth_code_received = query_components["code"][0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>RootWhisper Authorization</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 60px 20px; background-color: #EAF2ED; color: #123B36;">
    <div style="max-width: 500px; margin: 0 auto; background: #FFFFFF; padding: 40px; border-radius: 16px; border: 1px solid #D4E7E1; box-shadow: 0 10px 25px rgba(18, 59, 54, 0.08);">
        <div style="font-size: 48px; margin-bottom: 16px;">&#10004;</div>
        <h1 style="color: #087E75; margin: 0 0 12px; font-size: 24px;">Authorization Successful!</h1>
        <p style="color: #4A5568; line-height: 1.6; margin: 0 0 20px;">
            Google OAuth 2.0 authorization code received by RootWhisper.
            Your permanent refresh token is being generated.
        </p>
        <p style="color: #087E75; font-size: 13px; font-weight: 600;">You can safely close this browser window and return to your terminal.</p>
    </div>
</body>
</html>
""")
        else:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"No authorization code found in request.")

    def log_message(self, format, *args):
        # Suppress server request logging to keep terminal output clean and secure
        pass


def exchange_code_for_tokens(client_id: str, client_secret: str, code: str, redirect_uri: str) -> dict:
    """Exchanges one-time authorization code for permanent refresh_token and short-lived access_token."""
    token_url = "https://oauth2.googleapis.com/token"
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }
    data = urllib.parse.urlencode(payload).encode("utf-8")
    req = urllib.request.Request(
        token_url,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": "RootWhisper-Setup/1.0"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def save_credentials_to_env(client_id: str, client_secret: str, refresh_token: str, sender_email: str):
    """Safely updates or appends Gmail API OAuth credentials in backend/.env without exposing secrets."""
    lines = []
    if ENV_PATH.exists():
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            lines = f.readlines()

    keys_to_update = {
        "GMAIL_CLIENT_ID": client_id,
        "GMAIL_CLIENT_SECRET": client_secret,
        "GMAIL_REFRESH_TOKEN": refresh_token,
        "GMAIL_SENDER_EMAIL": sender_email,
        "EMAIL_PROVIDER": "GMAIL_API"
    }

    new_lines = []
    updated_keys = set()
    for line in lines:
        stripped = line.strip()
        matched = False
        for k in keys_to_update:
            if stripped.startswith(f"{k}="):
                new_lines.append(f"{k}={keys_to_update[k]}\n")
                updated_keys.add(k)
                matched = True
                break
        if not matched:
            new_lines.append(line)

    for k, v in keys_to_update.items():
        if k not in updated_keys:
            new_lines.append(f"{k}={v}\n")

    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    print(f"[Success] Updated credentials saved securely to {ENV_PATH}")


def load_local_credentials() -> tuple:
    """
    Loads OAuth credentials privately from local files without exposing them.
    Checks:
    1. backend/.env (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_SENDER_EMAIL)
    2. Any client_secret*.json or credentials*.json in workspace or backend/
    3. os.environ
    """
    client_id = os.environ.get("GMAIL_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GMAIL_CLIENT_SECRET", "").strip()
    sender_email = os.environ.get("GMAIL_SENDER_EMAIL", os.environ.get("SMTP_USER", "patnaaik.ayes@gmail.com")).strip()

    # 1. Check backend/.env
    if ENV_PATH.exists():
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("GMAIL_CLIENT_ID="):
                    client_id = line.split("=", 1)[1].strip().strip("'\"")
                elif line.startswith("GMAIL_CLIENT_SECRET="):
                    client_secret = line.split("=", 1)[1].strip().strip("'\"")
                elif line.startswith("GMAIL_SENDER_EMAIL="):
                    sender_email = line.split("=", 1)[1].strip().strip("'\"")

    # 2. Check JSON credentials file if still missing
    if not (client_id and client_secret):
        for search_dir in [BASE_DIR, BASE_DIR / "backend"]:
            for pattern in ["*client_secret*.json", "*credentials*.json"]:
                for json_file in search_dir.glob(pattern):
                    try:
                        with open(json_file, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            info = data.get("web") or data.get("installed") or data
                            cid = info.get("client_id", "").strip()
                            csec = info.get("client_secret", "").strip()
                            if cid and csec:
                                client_id = cid
                                client_secret = csec
                                print(f"[Detected] Loaded OAuth credentials from local file: {json_file.name}")
                                break
                    except Exception:
                        pass
                if client_id and client_secret:
                    break

    return client_id, client_secret, sender_email


def main():
    parser = argparse.ArgumentParser(description="RootWhisper Gmail API OAuth 2.0 Setup & Verification Tool")
    parser.add_argument("--client-id", dest="client_id", default="", help="Google Cloud OAuth Client ID")
    parser.add_argument("--client-secret", dest="client_secret", default="", help="Google Cloud OAuth Client Secret")
    parser.add_argument("--sender-email", dest="sender_email", default="", help="Sender Gmail address")
    parser.add_argument("--test-send", dest="test_send", default="", help="Send live verification email to this address (skip setup)")
    parser.add_argument("--test-recipient", dest="test_recipient", default="", help="Automatically send verification email to this address after setup")
    parser.add_argument("--port", dest="port", type=int, default=DEFAULT_REDIRECT_PORT, help="Local redirect port (default: 8085)")
    parser.add_argument("--no-browser", action="store_true", help="Do not automatically launch web browser")
    args = parser.parse_args()

    redirect_port = args.port
    redirect_uri = f"http://localhost:{redirect_port}"

    print("=" * 70)
    print(" ROOTWHISPER GMAIL API OAUTH 2.0 SETUP & SENDER VERIFICATION")
    print("=" * 70)

    # 1. Test Send Mode
    if args.test_send:
        target = args.test_send.strip()
        import backend.app.config
        from backend.app.services.gmail_api_service import send_email_via_gmail_api
        print(f"\n[Test] Sending live test email to recipient: {target}...")
        ok, msg = send_email_via_gmail_api(
            to_email=target,
            subject="RootWhisper: Gmail API HTTPS Verification Test",
            html_content=(
                "<div style='font-family:sans-serif;padding:24px;border-radius:12px;border:1px solid #087E75;background-color:#EAF2ED;max-width:540px;'>"
                "<h2 style='color:#123B36;margin-top:0;'>🌿 RootWhisper Gmail API Test</h2>"
                "<p style='color:#26342D;line-height:1.5;'>This message confirms that RootWhisper has successfully sent an email "
                "via the <strong>official Google Gmail REST API over HTTPS (Port 443)</strong>.</p>"
                "<p style='color:#087E75;font-weight:600;margin-bottom:0;'>&#10004; Verified Delivery to Registered Recipient</p>"
                "</div>"
            ),
            text_content="RootWhisper Gmail API Test\nDelivered via Google Gmail REST API over HTTPS (port 443)."
        )
        print(f"[Test Result] Success: {ok} | Details: {msg}")
        return

    # 2. Setup Mode - Gather Credentials Privately
    local_cid, local_csec, local_sender = load_local_credentials()
    client_id = (args.client_id or local_cid).strip()
    client_secret = (args.client_secret or local_csec).strip()
    sender_email = (args.sender_email or local_sender).strip()

    if not client_id or not client_secret:
        print("\n[Action Required] Local OAuth credentials not found.")
        print("To keep all credentials 100% private on your machine:")
        print("  1. Open backend/.env in your editor.")
        print("  2. Add your Google OAuth credentials:")
        print("     GMAIL_CLIENT_ID=your_client_id_here")
        print("     GMAIL_CLIENT_SECRET=your_client_secret_here")
        print("  (Alternatively, place your downloaded client_secret_*.json in the backend/ folder)")
        print("\nOnce saved, rerun this command to complete authorization.")
        return

    print(f"\nConfiguration Check:")
    print(f" - Sender Email: {sender_email}")
    print(f" - Redirect URI: {redirect_uri}")
    print(f" - Client ID:    ...{client_id[-16:] if len(client_id) > 16 else client_id}")

    # 3. Construct Authorization URL
    auth_params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": OAUTH_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "login_hint": sender_email
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(auth_params)}"

    print("\n" + "-" * 70)
    print("STEP 1: Open Google OAuth Consent Authorization Page")
    print("-" * 70)
    print("Authorization URL:\n" + auth_url)
    print("-" * 70)

    # 4. Start Local Listener on all loopback interfaces
    server = HTTPServer(("0.0.0.0", redirect_port), OAuthCallbackHandler)
    server_thread = threading.Thread(target=server.handle_request)
    server_thread.daemon = True
    server_thread.start()

    if not args.no_browser:
        try:
            print("\nOpening your default web browser for Google sign-in...")
            webbrowser.open(auth_url)
        except Exception:
            print("Note: Could not open browser automatically. Please copy the URL above into your browser.")

    print(f"\nWaiting for browser callback on {redirect_uri} (timeout 900s / 15 mins)...")
    server_thread.join(timeout=900)

    global auth_code_received
    if not auth_code_received:
        print("[Error] Timeout reached (300s). No authorization callback received from Google.")
        return

    # 5. Exchange code for Refresh & Access Tokens
    print("\n[Step 2] Exchanging authorization code with Google for tokens...")
    try:
        tokens = exchange_code_for_tokens(client_id, client_secret, auth_code_received, redirect_uri)
        refresh_token = tokens.get("refresh_token")
        if not refresh_token:
            print("[Warning] Google did not return a refresh_token in response.")
            print("Response keys:", list(tokens.keys()))
            print("Note: If you have previously authorized this app, revoke access in your Google Account")
            print("(https://myaccount.google.com/connections) and re-run to generate a fresh refresh_token.")
            return

        print("[Success] OAuth 2.0 Refresh Token acquired successfully.")
        save_credentials_to_env(client_id, client_secret, refresh_token, sender_email)

        # 6. Verify API Connectivity
        os.environ["GMAIL_CLIENT_ID"] = client_id
        os.environ["GMAIL_CLIENT_SECRET"] = client_secret
        os.environ["GMAIL_REFRESH_TOKEN"] = refresh_token
        os.environ["GMAIL_SENDER_EMAIL"] = sender_email

        from backend.app.services.gmail_api_service import verify_gmail_api_connectivity
        verified, detail, profile = verify_gmail_api_connectivity()
        print(f"\n[Step 3] API Verification: {detail}")
        if verified:
            print("\n" + "=" * 70)
            print(">>> GMAIL API OAUTH 2.0 CONFIGURED & VERIFIED SUCCESSFULLY <<<")
            print("=" * 70)

        # 7. Optional Test Recipient Dispatch
        if verified and args.test_recipient:
            test_target = args.test_recipient.strip()
            print(f"\n[Step 4] Sending live verification email to: {test_target}...")
            from backend.app.services.gmail_api_service import send_email_via_gmail_api
            ok, msg = send_email_via_gmail_api(
                to_email=test_target,
                subject="RootWhisper: Gmail API HTTPS Verification Test",
                html_content=(
                    "<div style='font-family:sans-serif;padding:24px;border-radius:12px;border:1px solid #087E75;background-color:#EAF2ED;max-width:540px;'>"
                    "<h2 style='color:#123B36;margin-top:0;'>🌿 RootWhisper Gmail API Verification</h2>"
                    "<p style='color:#26342D;line-height:1.5;'>This automated test message confirms that RootWhisper has successfully sent an email "
                    "via the <strong>official Google Gmail REST API over HTTPS (Port 443)</strong>.</p>"
                    f"<p style='color:#26342D;'><strong>Sender:</strong> {sender_email}<br>"
                    f"<strong>Recipient:</strong> {test_target}<br>"
                    f"<strong>Protocol:</strong> HTTPS OAuth 2.0 (Port 443)</p>"
                    "<p style='color:#087E75;font-weight:600;margin-bottom:0;'>&#10004; Verified Delivery to Registered Recipient</p>"
                    "</div>"
                ),
                text_content=f"RootWhisper Gmail API Test\nDelivered via Google Gmail REST API over HTTPS (port 443) to {test_target}."
            )
            print(f"[Test Email Result] Success: {ok} | Details: {msg}")

    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"[Error] Failed to exchange token with Google (HTTP {e.code}): {err_body}")
    except Exception as e:
        print(f"[Error] Failed during token exchange: {type(e).__name__} - {e}")


if __name__ == "__main__":
    main()
