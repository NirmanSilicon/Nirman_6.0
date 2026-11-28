# laptop/link: the phone ↔ laptop link and feed relay

## What it does, in plain words

The phone sends everything it perceives and decides as short JSON lines over the USB cable (feed
v1, `shared/feed/v1/README.md`). `feed_server.py` receives them, answers "I'm here" (an ack) twice a
second so the phone knows the link is alive, writes every line to `recordings/` (not in git), and
passes each line on to any open display, such as the blueprint, the HUD or a side quest, through a
WebSocket. A slow display just misses messages; it can never slow the phone down.

If the cable is pulled or this server stops, the phone notices within about 2 s, says once "I've
lost my extra vision; I can still help with the basics", and keeps working on its own. When the
server is back, the phone reconnects by itself, silently.

## Run (Windows, from the repo root)

```bash
adb reverse tcp:8765 tcp:8765                              # once per USB connection
laptop/.venv/Scripts/python laptop/link/feed_server.py     # Git Bash; PowerShell: laptop\.venv\Scripts\python
```

Then open http://127.0.0.1:8000/ for the blueprint. `http://127.0.0.1:8000/state.json` shows the
latest message of each type (debugging). Side quests connect to `ws://127.0.0.1:8000/feed`.

## Test

Verified on the Vivo (28 Oct): connect, 5.5 perception messages/s relayed with none dropped, server
stopped → phone reported `lost` and spoke once, server restarted → phone reconnected silently.
Not yet verified: a real cable pull with this server (Phase 0 measured 0.97 s detection with the
echo server), the hotspot backup.
