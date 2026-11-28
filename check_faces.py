# check_faces.py - diagnose face matching without the camera
#   python check_faces.py                -> shows which reference photos loaded + similarity between them
#   python check_faces.py some_photo.jpg -> shows how close that photo is to every enrolled person
import sys
import cv2
import numpy as np
from ai_triggered.recognizer import BorderTriggeredRecognizer

r = BorderTriggeredRecognizer()
everyone = {f"accepted:{n}": v[0] for n, v in r.accepted_db.items()}
everyone.update({f"watchlist:{n}": v[0] for n, v in r.watchlist_db.items()})

if len(sys.argv) > 1:
    emb = r.embed(cv2.imread(sys.argv[1]), reference=True)
    if emb is None:
        print("No face found in that image.")
    else:
        for k, v in sorted(everyone.items(), key=lambda kv: -float(np.dot(emb, kv[1]))):
            print(f"{k:30s} similarity {float(np.dot(emb, v)):.2f}")
        print(f"\nthresholds: accepted >= {r.accept_threshold}, watchlist >= {r.watch_threshold}")
else:
    names = list(everyone)
    for a in names:
        print(a.ljust(30), " ".join(f"{float(np.dot(everyone[a], everyone[b])):.2f}" for b in names))
    print("\nDifferent people should score below ~0.3. Same person usually 0.5+.")
