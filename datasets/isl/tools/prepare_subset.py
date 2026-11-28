"""
Phase 3/4 for ONE category of the official INCLUDE dataset (AI4Bharat, CC BY 4.0, Zenodo record 4010759).

  1. Safely extract the archive (refuses any path that would escape the target folder). The archive itself is never modified.
  2. Match every video to the OFFICIAL metadata (Hugging Face ai4bharat/INCLUDE), using only the rows that reproduce the
     paper's INCLUDE split: include_50 == False  ->  3,475 train+val and 817 test over the whole dataset.
  3. Exclude, and record WHY, every video that has no trustworthy label: missing file, unreadable video, or a path that the
     metadata lists under two different labels (33 such paths exist; the "Second (Number)" class is one source).
  4. Decode each kept video with OpenCV and store its frames as JPEG at 1280x720 (what the app asks the webcam for) together
     with the true timestamp of every frame. The browser tracker then reads these frames, so the keypoints come from the SAME
     MediaPipe Holistic build the app uses.

Usage:  python prepare_subset.py --category Seasons --archive D:/SANGAM_ISL_data/raw/Seasons_1of1.zip
Writes: <extracted>/..., <frames>/<id>/NNNNNN.jpg + frames.json, reports/validation_<category>.json, reports/manifest_<category>.csv
"""
import argparse, csv, json, os, sys, zipfile, hashlib
import cv2
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
META = os.path.join(PROJ, "datasets", "isl", "metadata")
REPORTS = os.path.join(PROJ, "datasets", "isl", "reports")


def safe_extract(archive, dest):
    os.makedirs(dest, exist_ok=True)
    base = os.path.realpath(dest)
    n = 0
    with zipfile.ZipFile(archive) as z:
        bad = z.testzip()
        if bad:
            raise SystemExit(f"archive is corrupt at {bad}")
        for m in z.infolist():
            target = os.path.realpath(os.path.join(dest, m.filename))
            if not (target == base or target.startswith(base + os.sep)):
                raise SystemExit(f"refusing unsafe path in archive: {m.filename}")
        z.extractall(dest)
        n = len(z.infolist())
    return n


def load_metadata():
    frames = []
    for s in ("train", "val", "test"):
        df = pd.read_csv(os.path.join(META, f"include_{s}.csv"))
        df["split"] = "train" if s in ("train", "val") else "test"   # paper: 3475 train (train+val rows) / 817 test
        df["hf_split"] = s
        frames.append(df)
    al = pd.concat(frames, ignore_index=True)
    return al[al["include_50"] == False].copy()                       # the full-INCLUDE rows; True rows are the separate INCLUDE-50 split


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--category", required=True)
    ap.add_argument("--archive", required=True)
    ap.add_argument("--root", default="D:/SANGAM_ISL_data")
    ap.add_argument("--skip-extract", action="store_true")
    ap.add_argument("--max-videos", type=int, default=0, help="0 = all")
    a = ap.parse_args()
    ext_dir = os.path.join(a.root, "extracted")
    frames_dir = os.path.join(a.root, "frames")
    os.makedirs(REPORTS, exist_ok=True); os.makedirs(frames_dir, exist_ok=True)

    report = {"category": a.category, "archive": os.path.basename(a.archive), "archive_md5": None, "excluded": []}
    h = hashlib.md5()
    with open(a.archive, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 22), b""):
            h.update(chunk)
    report["archive_md5"] = h.hexdigest()
    if not a.skip_extract:
        report["archive_entries"] = safe_extract(a.archive, ext_dir)

    md = load_metadata()
    md = md[md["video_path"].str.startswith(a.category + "/")]
    report["metadata_rows"] = int(len(md))
    # paths listed under more than one label cannot be trusted: drop ALL their rows
    conflict = md.groupby("video_path")["label"].nunique()
    conflict = set(conflict[conflict > 1].index)
    exact_dup = md.duplicated(["video_path", "label"], keep="first")
    keep, rows = md[~exact_dup & ~md["video_path"].isin(conflict)], []
    for p in sorted(conflict):
        report["excluded"].append({"video_path": p, "reason": "metadata lists this path under more than one label", "labels": sorted(md[md.video_path == p]["label"].unique().tolist())})
    if a.max_videos:
        keep = keep.head(a.max_videos)

    for _, r in keep.iterrows():
        path = os.path.join(ext_dir, *r["video_path"].split("/"))
        if not os.path.isfile(path):
            # the archive may unpack under a folder named after the zip; look one level down
            alt = [os.path.join(dp, fn) for dp, _, fns in os.walk(ext_dir) for fn in fns if fn == os.path.basename(path) and os.path.basename(os.path.dirname(os.path.join(dp, fn))) == os.path.basename(os.path.dirname(path))]
            path = alt[0] if alt else None
        if not path:
            report["excluded"].append({"video_path": r["video_path"], "reason": "file not found after extraction"}); continue
        cap = cv2.VideoCapture(path)
        if not cap.isOpened():
            report["excluded"].append({"video_path": r["video_path"], "reason": "OpenCV could not open the video"}); continue
        fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
        vid = hashlib.md5(r["video_path"].encode()).hexdigest()[:12]
        out = os.path.join(frames_dir, vid); os.makedirs(out, exist_ok=True)
        t_ms, i, w0, h0 = [], 0, 0, 0
        while True:
            ok, fr = cap.read()
            if not ok:
                break
            h0, w0 = fr.shape[:2]
            fr = cv2.resize(fr, (1280, 720), interpolation=cv2.INTER_AREA)
            cv2.imwrite(os.path.join(out, f"{i:06d}.jpg"), fr, [cv2.IMWRITE_JPEG_QUALITY, 92])
            ms = cap.get(cv2.CAP_PROP_POS_MSEC)
            t_ms.append(round(ms if ms and (i == 0 or ms > t_ms[-1]) else (i * 1000.0 / fps if fps else i * 40.0), 2)); i += 1
        cap.release()
        if i < 8:
            report["excluded"].append({"video_path": r["video_path"], "reason": f"only {i} decodable frames"}); continue
        json.dump({"id": vid, "n": i, "fps": fps, "t_ms": t_ms, "src_size": [w0, h0]}, open(os.path.join(out, "frames.json"), "w"))
        rows.append({"id": vid, "video_path": r["video_path"], "label": r["label"], "category": r["parent_label"], "split": r["split"], "hf_split": r["hf_split"],
                     "fps": round(fps, 3), "frames": i, "seconds": round(i / fps, 2) if fps else None, "src_w": w0, "src_h": h0})
        print(f"{len(rows):4d} {r['split']:5s} {r['label']:16s} {i:4d}f @{fps:.1f}  {r['video_path']}", flush=True)

    man = pd.DataFrame(rows)
    man.to_csv(os.path.join(REPORTS, f"manifest_{a.category}.csv"), index=False)
    report.update({"kept_videos": int(len(man)), "excluded_count": len(report["excluded"]),
                   "classes": int(man["label"].nunique()) if len(man) else 0,
                   "per_class_split": man.groupby(["label", "split"]).size().unstack(fill_value=0).to_dict("index") if len(man) else {},
                   "fps_values": sorted(man["fps"].unique().tolist()) if len(man) else [], "source_sizes": sorted({f"{a_}x{b_}" for a_, b_ in zip(man["src_w"], man["src_h"])}) if len(man) else []})
    json.dump(report, open(os.path.join(REPORTS, f"validation_{a.category}.json"), "w"), indent=1)
    print(json.dumps({k: v for k, v in report.items() if k not in ("per_class_split", "excluded")}, indent=1))
    print("excluded:", len(report["excluded"]))


if __name__ == "__main__":
    sys.exit(main())
