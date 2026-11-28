import json
from pathlib import Path

SCRIPTS_PATH = Path(__file__).resolve().parent / "scripts.json"

with SCRIPTS_PATH.open("r", encoding="utf-8") as fh:
    _CATALOG = json.load(fh)


def get_guidance_for_language(language: str = "en", category: str | None = None) -> dict:
    lang = language if language in ("en", "hi", "or") else "en"
    lang_map = _CATALOG.get(lang, _CATALOG["en"])
    if category:
        return lang_map.get(category, lang_map["SCAM_SMS"])
    return lang_map
