# Inference service

Thin HTTP wrapper around the ML models. No training happens here; weights are integrated later (see `../models/README.md`).
Contract is documented at the top of `app/main.py`. The API treats `model.mode == "mock"` as demo output and the UI shows a banner.
