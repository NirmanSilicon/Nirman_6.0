import warnings
from pathlib import Path

import joblib

warnings.filterwarnings("ignore", message="X does not have valid feature names")

BASE_DIR = Path(__file__).resolve().parent.parent
TEXT_MODEL_PATH = BASE_DIR / "ml-model" / "scam_text_model.joblib"

text_model = joblib.load(TEXT_MODEL_PATH)

SCAM_CUES = {
    "Asks for OTP or UPI PIN": ("otp", "upi pin", "pin डालें", "pin ଦିଅନ୍ତୁ"),
    "Uses arrest / cyber cell / legal threat": (
        "arrest", "cyber cell", "crime", "illegal", "गिरफ्तारी", "अपराध", "ଗିରଫ", "ଅପରାଧ"
    ),
    "Threatens account / SIM / electricity block": (
        "blocked", "suspended", "disconnected", "kyc", "बंद हो जाएगा", "कट जाएगा", "ବ୍ଲକ୍", "ବନ୍ଦ ହେବ"
    ),
    "Promises lottery / cashback / job for a fee": (
        "processing fee", "registration fee", "lucky draw", "cashback", "प्रोसेसिंग फीस", "କ୍ୟାସବ୍ୟାକ୍", "ପ୍ରୋସେସିଂ ଫି"
    ),
}


def scan_message_text(text: str, threshold: float = 0.60) -> dict:
    cleaned = str(text).strip()
    if not cleaned:
        return {"verdict": "SAFE", "scam_prob": 0.0, "red_flags": []}

    # Support pipelines with predict_proba() as well as LinearSVC/predict()-only models
    if hasattr(text_model, "predict_proba"):
        prob = float(text_model.predict_proba([cleaned])[0, 1])
    else:
        pred = int(text_model.predict([cleaned])[0])
        prob = 0.95 if pred == 1 else 0.05

    lower_text = cleaned.lower()
    flags = [
        label for label, keywords in SCAM_CUES.items()
        if any(kw in lower_text for kw in keywords)
    ]

    if prob >= threshold:  # 0.65
        verdict = "SCAM"
    elif prob >= 0.58 or (prob >= 0.40 and flags):
        verdict = "SUSPICIOUS"
    else:
        verdict = "SAFE"
    return {
        "verdict": verdict,
        "scam_prob": round(prob * 100, 2),
        "red_flags": flags,
    }


if __name__ == "__main__":
    samples = [
        "This is cyber cell. Your Aadhaar is used in a crime. Stay on the call or you will be arrested.",
        "कैशबैक पाने के लिए अपना UPI PIN डालें।",
        "ଆପଣଙ୍କ ଆଧାର କାର୍ଡ ବ୍ଲକ୍ ହୋଇଯାଇଛି। ତୁରନ୍ତ ଏହି ନମ୍ବରକୁ ଫୋନ୍ କରନ୍ତୁ।",
        "Your Swiggy order is out for delivery. Rider will reach in 10 mins.",
    ]
    for s in samples:
        print(scan_message_text(s), "->", s[:45])