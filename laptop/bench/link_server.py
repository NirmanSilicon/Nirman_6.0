"""Echo server for the Phase 0 link test (phone <-> laptop).

Protocol: each request is a 4-byte big-endian length followed by that many bytes; the reply is a
4-byte length followed by a 16-byte acknowledgement. So the phone measures the time to send a
payload of a given size and get a short answer, which is how frames will go to the laptop.

USB:      adb reverse tcp:8765 tcp:8765   then on the phone connect to 127.0.0.1:8765
Hotspot:  run with --host 0.0.0.0 and connect the phone to the laptop's IP (Windows may ask to
          allow Python through the firewall: allow it on private networks only).

Run:  laptop\\.venv\\Scripts\\python laptop/bench/link_server.py [--host 127.0.0.1] [--port 8765]
"""
from __future__ import annotations

import argparse
import asyncio
import struct

ACK = b"ok-saarthi-link\n"  # 16 bytes


async def handle(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    peer = writer.get_extra_info("peername")
    count = 0
    try:
        while True:
            header = await reader.readexactly(4)
            (n,) = struct.unpack(">I", header)
            await reader.readexactly(n)
            writer.write(struct.pack(">I", len(ACK)) + ACK)
            await writer.drain()
            count += 1
    except (asyncio.IncompleteReadError, ConnectionResetError):
        pass
    finally:
        print(f"{peer}: {count} messages, connection closed")
        writer.close()


async def main(host: str, port: int) -> None:
    server = await asyncio.start_server(handle, host, port)
    print(f"link echo server on {host}:{port}")
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8765)
    a = ap.parse_args()
    asyncio.run(main(a.host, a.port))
