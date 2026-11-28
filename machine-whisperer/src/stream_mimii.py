import argparse
import io
import time
from pathlib import Path
import httpx
import numpy as np
import soundfile as sf
from stream_unzip import stream_unzip

from src.features import array_to_features


def zipped_chunks(url: str, max_retries: int = 10):
    """Stream bytes with automatic HTTP Range resume if Zenodo drops the connection."""
    offset = 0
    retries = 0
    while True:
        headers = {"Range": f"bytes={offset}-"} if offset > 0 else {}
        try:
            with httpx.stream("GET", url, headers=headers, follow_redirects=True, timeout=120.0) as r:
                r.raise_for_status()
                for chunk in r.iter_bytes(chunk_size=65536):
                    offset += len(chunk)
                    yield chunk
            return
        except (httpx.RemoteProtocolError, httpx.ReadError, httpx.ReadTimeout) as e:
            retries += 1
            if retries > max_retries:
                raise
            print(f"\nConnection dropped at {offset / 1e6:.1f} MB ({e}). Resuming ({retries}/{max_retries})...")
            time.sleep(2)


def stream_and_extract(machine: str, snr: str = "6", target_id: str = "id_00", max_files: int | None = None):
    url = f"https://zenodo.org/records/3384388/files/{snr}_dB_{machine}.zip?download=1"
    out_path = Path(f"data/processed/{snr}_dB_{machine}_{target_id}.npz")

    X_list, y_list = [], []
    processed = 0

    print(f"Streaming {url} (target={target_id})...")
    try:
        for name_bytes, _, chunks in stream_unzip(zipped_chunks(url)):
            fname = name_bytes.decode("utf-8")

            if not fname.endswith(".wav") or f"/{target_id}/" not in fname:
                if processed > 0 and f"/{target_id}/" not in fname:
                    print(f"Finished {target_id}, stopping stream early.")
                    break
                for _ in chunks:
                    pass
                continue

            raw_bytes = b"".join(chunks)
            audio, sr = sf.read(io.BytesIO(raw_bytes), dtype="float32")
            ch0 = audio[:, 0] if audio.ndim > 1 else audio

            feats = array_to_features(ch0, sr=sr)
            label = 1 if "/abnormal/" in fname else 0

            X_list.append(feats)
            y_list.append(np.full(len(feats), label, dtype=np.int8))
            processed += 1

            if processed % 50 == 0 or processed == 1:
                print(f"[{processed}] {fname} -> {feats.shape} (label={label})")

            if max_files is not None and processed >= max_files:
                break
    except KeyboardInterrupt:
        print("\nInterrupted by user — saving progress collected so far...")

    if not X_list:
        print("No files extracted; nothing saved.")
        return

    X = np.vstack(X_list)
    y = np.concatenate(y_list)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(out_path, X=X, y=y)
    print(f"\nSaved {out_path} | X={X.shape}, y={y.shape} (normal={(y==0).sum()}, abnormal={(y==1).sum()})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--machine", default="pump", choices=["fan", "pump", "slider", "valve"])
    parser.add_argument("--snr", default="6", choices=["-6", "0", "6"])
    parser.add_argument("--id", default="id_00")
    args = parser.parse_args()
    stream_and_extract(machine=args.machine, snr=args.snr, target_id=args.id)