import argparse
from pathlib import Path
import joblib
import sounddevice as sd

from src.diagnostics import Debouncer, analyze_audio
from src.features import load_wav

DEFAULT_MODEL = Path("models/fan_id_00_lof.joblib")
SAMPLE_RATE = 16000


def predict_wav(wav_path: str, bundle: dict):
    y, sr = load_wav(wav_path)
    res = analyze_audio(y, sr, bundle)
    status = "ABNORMAL" if res["is_abnormal"] else "NORMAL"
    print(
        f"[{status}] {wav_path} | health={res['health']}/100 | "
        f"fault={res['fault']} | score={res['score']:.4f} (thresh={res['threshold']:.4f})"
    )


def predict_live(bundle: dict, clip_sec: float = 2.0):
    debouncer = Debouncer(window=5, trigger=3)
    print(f"Listening live ({clip_sec}s chunks at {SAMPLE_RATE} Hz, 3-of-5 debounce)... Press Ctrl+C to stop.\n")
    try:
        clip_num = 1
        while True:
            audio = sd.rec(
                int(clip_sec * SAMPLE_RATE),
                samplerate=SAMPLE_RATE,
                channels=1,
                dtype="float32",
            )
            sd.wait()
            res = analyze_audio(audio[:, 0], SAMPLE_RATE, bundle)
            alarm = debouncer.update(res["is_abnormal"])
            alarm_str = "ALARM!" if alarm else "OK    "
            print(
                f"[Clip {clip_num:03d}] {alarm_str} | health={res['health']:3d}/100 | "
                f"fault={res['fault']:<16} | score={res['score']:.4f}"
            )
            clip_num += 1
    except KeyboardInterrupt:
        print("\nStopped live monitoring.")


def main():
    parser = argparse.ArgumentParser(description="Machine Whisperer diagnostics")
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL, help="Path to saved .joblib bundle")
    parser.add_argument("--seconds", type=float, default=2.0, help="Chunk length in seconds for --live mode")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--wav", type=str, help="Path to a WAV file to evaluate")
    group.add_argument("--live", action="store_true", help="Monitor live microphone input")
    args = parser.parse_args()

    bundle = joblib.load(args.model)
    if args.wav:
        predict_wav(args.wav, bundle)
    else:
        predict_live(bundle, clip_sec=args.seconds)


if __name__ == "__main__":
    main()