"""Automated screenshot capture for RootWhisper dashboard testing."""

import os
import sys
import time
import subprocess
from pathlib import Path
import urllib.request

SCREENSHOT_DIR = Path(r"C:\Users\ayesh\.gemini\antigravity\brain\615b154d-9cb2-47e7-8d10-ada68eba510f\screenshots")
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
BASE_DIR = Path(__file__).resolve().parent.parent

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

PAGES = [
    ("overview.png", "http://127.0.0.1:8501/?view=overview"),
    ("tulsi.png", "http://127.0.0.1:8501/?view=tulsi"),
    ("hibiscus_stress.png", "http://127.0.0.1:8501/?view=hibiscus"),
    ("moneyplant.png", "http://127.0.0.1:8501/?view=moneyplant"),
    ("analytics.png", "http://127.0.0.1:8501/?view=analytics"),
    ("system_hardware.png", "http://127.0.0.1:8501/?view=system"),
]


def wait_for_server(url: str, timeout: int = 30):
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status in (200, 304):
                    return True
        except Exception as e:
            time.sleep(1)
    return False


def main():
    print(f"Starting Streamlit server on http://127.0.0.1:8501 ...")
    cmd = [
        sys.executable, "-m", "streamlit", "run", "dashboard/app.py",
        "--server.port", "8501",
        "--server.headless", "true",
        "--server.address", "127.0.0.1",
        "--browser.gatherUsageStats", "false"
    ]
    env = os.environ.copy()
    env["USERPROFILE"] = str(BASE_DIR)
    env["HOME"] = str(BASE_DIR)
    env["STREAMLIT_SERVER_HEADLESS"] = "true"
    env["STREAMLIT_BROWSER_GATHER_USAGE_STATS"] = "false"

    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=env,
        text=True,
        bufsize=1
    )

    try:
        print("Waiting for Streamlit health check (/_stcore/health)...")
        if not wait_for_server("http://127.0.0.1:8501/_stcore/health", timeout=25):
            print("Streamlit health check timed out. Attempting root URL...")
            if not wait_for_server("http://127.0.0.1:8501/", timeout=10):
                print("Server failed to respond.")
                proc.terminate()
                out, _ = proc.communicate(timeout=5)
                print("STDOUT/STDERR:", out)
                return

        print("Streamlit is online! Capturing screenshots...")
        for filename, url in PAGES:
            out_file = SCREENSHOT_DIR / filename
            chrome_cmd = [
                CHROME_PATH,
                "--headless=new",
                "--disable-gpu",
                "--no-sandbox",
                "--window-size=1400,1100",
                "--hide-scrollbars",
                "--virtual-time-budget=8000",
                f"--screenshot={out_file}",
                url
            ]
            print(f"Capturing {filename} from {url} ...")
            res = subprocess.run(chrome_cmd, capture_output=True, timeout=40)
            if out_file.exists():
                print(f"  -> Successfully captured {filename} ({out_file.stat().st_size} bytes)")
            else:
                print(f"  -> Failed to capture {filename}. STDERR: {res.stderr.decode('utf-8', errors='replace')}")

        print("All screenshot operations completed!")

    finally:
        print("Stopping Streamlit server...")
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()


if __name__ == "__main__":
    main()
