"""Verify RootWhisper React frontend integration across all pages."""

import asyncio
import json
import subprocess
import time
import urllib.request
import base64
from pathlib import Path

OUT_DIR = Path(r"C:\Users\ayesh\.gemini\antigravity\brain\615b154d-9cb2-47e7-8d10-ada68eba510f\frontend_integration")
OUT_DIR.mkdir(parents=True, exist_ok=True)

chrome = subprocess.Popen([
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9224',
    '--remote-allow-origins=*',
    '--window-size=1440,900',
    '--user-data-dir=C:\\Users\\ayesh\\AppData\\Local\\Temp\\cdp_frontend_full'
])
time.sleep(2)

import websockets

async def capture_all_views():
    tabs = json.loads(urllib.request.urlopen('http://127.0.0.1:9224/json/list').read())
    page_tab = [t for t in tabs if t.get('type') == 'page'][0]
    ws_url = page_tab['webSocketDebuggerUrl']
    
    async with websockets.connect(ws_url) as ws:
        msg_id = 1
        
        # 1. Dashboard Overview
        print("Navigating to http://localhost:3000/ ...")
        await ws.send(json.dumps({'id': msg_id, 'method': 'Page.navigate', 'params': {'url': 'http://localhost:3000/'}}))
        msg_id += 1
        await asyncio.sleep(4)

        async def screenshot(filename):
            nonlocal msg_id
            await ws.send(json.dumps({'id': msg_id, 'method': 'Page.captureScreenshot', 'params': {'format': 'png'}}))
            cap_id = msg_id
            msg_id += 1
            while True:
                msg = json.loads(await ws.recv())
                if msg.get('id') == cap_id:
                    data = base64.b64decode(msg['result']['data'])
                    filepath = OUT_DIR / filename
                    with open(filepath, 'wb') as f:
                        f.write(data)
                    print(f"Captured: {filename} ({len(data)} bytes)")
                    break

        await screenshot("react_dashboard.png")

        # 2. Plant Monitoring Tab
        click_nav = """
        (() => {
            const btns = Array.from(document.querySelectorAll('button, nav a'));
            const pmBtn = btns.find(b => b.innerText.includes('Plant Monitoring'));
            if (pmBtn) { pmBtn.click(); return true; }
            return false;
        })()
        """
        await ws.send(json.dumps({'id': msg_id, 'method': 'Runtime.evaluate', 'params': {'expression': click_nav, 'returnByValue': True}}))
        msg_id += 1
        await asyncio.sleep(3)
        await screenshot("react_plant_monitoring.png")

        # 3. AI Screening Tab
        click_ai = """
        (() => {
            const btns = Array.from(document.querySelectorAll('button, nav a'));
            const aiBtn = btns.find(b => b.innerText.includes('AI Fingerprinting') || b.innerText.includes('AI Screening'));
            if (aiBtn) { aiBtn.click(); return true; }
            return false;
        })()
        """
        await ws.send(json.dumps({'id': msg_id, 'method': 'Runtime.evaluate', 'params': {'expression': click_ai, 'returnByValue': True}}))
        msg_id += 1
        await asyncio.sleep(3)
        await screenshot("react_ai_screening.png")

        # 4. Sensor Diagnostics Tab
        click_diag = """
        (() => {
            const btns = Array.from(document.querySelectorAll('button, nav a'));
            const diagBtn = btns.find(b => b.innerText.includes('Sensor Diagnostics'));
            if (diagBtn) { diagBtn.click(); return true; }
            return false;
        })()
        """
        await ws.send(json.dumps({'id': msg_id, 'method': 'Runtime.evaluate', 'params': {'expression': click_diag, 'returnByValue': True}}))
        msg_id += 1
        await asyncio.sleep(3)
        await screenshot("react_sensor_diagnostics.png")

        # 5. System Settings Tab
        click_settings = """
        (() => {
            const btns = Array.from(document.querySelectorAll('button, nav a'));
            const setBtn = btns.find(b => b.innerText.includes('System Settings'));
            if (setBtn) { setBtn.click(); return true; }
            return false;
        })()
        """
        await ws.send(json.dumps({'id': msg_id, 'method': 'Runtime.evaluate', 'params': {'expression': click_settings, 'returnByValue': True}}))
        msg_id += 1
        await asyncio.sleep(3)
        await screenshot("react_settings.png")

try:
    asyncio.run(capture_all_views())
finally:
    chrome.terminate()
