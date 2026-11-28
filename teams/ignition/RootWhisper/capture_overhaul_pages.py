import asyncio
import json
import subprocess
import time
import urllib.request
import base64
from pathlib import Path

PAGES = [
    ("fleet_overview", "http://localhost:8501/?view=Fleet"),
    ("tulsi_detail", "http://localhost:8501/?view=Tulsi"),
    ("hibiscus_detail", "http://localhost:8501/?view=Hibiscus"),
    ("historical_analytics", "http://localhost:8501/?view=Historical"),
    ("ai_screening", "http://localhost:8501/?view=AI"),
    ("hardware_diagnostics", "http://localhost:8501/?view=Hardware")
]

OUT_DIR = Path(r"C:\Users\ayesh\.gemini\antigravity\brain\615b154d-9cb2-47e7-8d10-ada68eba510f\premium_overhaul")
OUT_DIR.mkdir(parents=True, exist_ok=True)

chrome = subprocess.Popen([
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--remote-allow-origins=*',
    '--window-size=1440,900',
    '--user-data-dir=C:\\Users\\ayesh\\AppData\\Local\\Temp\\cdp_overhaul'
])
time.sleep(2)

import websockets

async def capture_all():
    tabs = json.loads(urllib.request.urlopen('http://127.0.0.1:9222/json/list').read())
    page_tab = [t for t in tabs if t.get('type') == 'page'][0]
    ws_url = page_tab['webSocketDebuggerUrl']
    
    async with websockets.connect(ws_url) as ws:
        msg_id = 1
        for name, url in PAGES:
            print(f"Navigating to {name}: {url} ...")
            await ws.send(json.dumps({'id': msg_id, 'method': 'Page.navigate', 'params': {'url': url}}))
            msg_id += 1
            await asyncio.sleep(4)
            
            await ws.send(json.dumps({'id': msg_id, 'method': 'Page.captureScreenshot', 'params': {'format': 'png'}}))
            capture_id = msg_id
            msg_id += 1
            
            while True:
                msg = json.loads(await ws.recv())
                if msg.get('id') == capture_id:
                    data = base64.b64decode(msg['result']['data'])
                    filepath = OUT_DIR / f"{name}.png"
                    with open(filepath, 'wb') as f:
                        f.write(data)
                    print(f"Saved {filepath.name} ({len(data)} bytes)")
                    break

try:
    asyncio.run(capture_all())
finally:
    chrome.terminate()

