"""Online session memory (D53): what was asked online, what the cloud answered, the things it named and
whether Saarthi's own map agreed. Text only, never images: kept in memory for this server run and
appended to recordings/online_<date>.jsonl (gitignored), so the telemetry page can show it.

It is given back to the cloud as context ("earlier in this session …"), so a later question such as
"which drink did they offer me?" can be answered from what was seen before.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RECORDINGS = ROOT / "recordings"
CONTEXT_ITEMS = 15


class Memory:
    def __init__(self) -> None:
        self.items: list[dict] = []
        RECORDINGS.mkdir(exist_ok=True)
        self.file = (RECORDINGS / time.strftime("online_%Y%m%d.jsonl")).open("a", encoding="utf-8")

    def add(self, ask_id: str, question: str, answer: dict) -> None:
        item = {"id": ask_id, "at": time.strftime("%H:%M:%S"), "question": question, "answer": answer.get("text"),
                "things": answer.get("things", []), "model": answer.get("model"), "error": answer.get("error")}
        self.items.append(item)
        self._write({"type": "exchange", **item})

    def verdict(self, ask_id: str, verdict: str, reason: str | None) -> None:
        """The phone's check of the answer against its own map (agrees / contradicts / unchecked)."""
        for item in reversed(self.items):
            if item["id"] == ask_id:
                item["verdict"], item["reason"] = verdict, reason
                self._write({"type": "verdict", "id": ask_id, "verdict": verdict, "reason": reason})
                return

    def context(self) -> str:
        """The last answered exchanges, oldest first, as plain text for the prompt."""
        lines = []
        for it in [i for i in self.items if i.get("answer")][-CONTEXT_ITEMS:]:
            things = "; ".join(f"{t.get('name')} ({t.get('where', '?')})" for t in it.get("things") or [] if t.get("name"))
            doubt = " [Saarthi's own camera map disagreed]" if it.get("verdict") == "contradicts" else ""
            lines.append(f"- {it['at']}: asked \"{it['question']}\" -> answered \"{it['answer']}\"" + (f"; seen: {things}" if things else "") + doubt)
        return "\n".join(lines)

    def _write(self, rec: dict) -> None:
        self.file.write(json.dumps(rec, ensure_ascii=False) + "\n")
        self.file.flush()
