import io
import json
import os
import numpy as np
import tensorflow as tf
from PIL import Image, UnidentifiedImageError
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="KrushiDrishti AI Backend",
    description="Multi-Crop (Tomato & Brinjal) Disease Detection API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.getenv("MODEL_PATH", "krushidrishti_model.keras")
CLASS_NAMES_TXT = os.getenv("CLASS_NAMES_TXT", "class_names.txt")
CLASS_NAMES_JSON = os.getenv("CLASS_NAMES_JSON", "class_names.json")
CONFIDENCE_THRESHOLD = 60.0

model = tf.keras.models.load_model(MODEL_PATH) if os.path.exists(MODEL_PATH) else None
class_names = []

if os.path.exists(CLASS_NAMES_TXT):
    with open(CLASS_NAMES_TXT, "r", encoding="utf-8") as f:
        class_names = [line.strip() for line in f if line.strip()]
elif os.path.exists(CLASS_NAMES_JSON):
    with open(CLASS_NAMES_JSON, "r", encoding="utf-8") as f:
        class_names = json.load(f)


@app.get("/")
def health_check():
    return {
        "status": "running",
        "project": "KrushiDrishti AI (Tomato + Brinjal)",
        "model_loaded": model is not None,
        "classes_loaded": len(class_names),
        "classes": class_names,
    }


@app.post("/predict")
async def predict_disease(file: UploadFile = File(...)):
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Upload a JPG/PNG image.")

    if model is None or not class_names:
        raise HTTPException(status_code=503, detail="krushidrishti_model.keras or class_names.txt missing.")

    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        img = img.resize((224, 224))
        img_array = np.expand_dims(np.array(img, dtype=np.float32), axis=0)

        scores = model.predict(img_array, verbose=0)[0]
        best_idx = int(np.argmax(scores))
        predicted_class = class_names[best_idx]
        confidence = round(float(scores[best_idx]) * 100, 2)

        is_reliable = confidence >= CONFIDENCE_THRESHOLD
        message = (
            "Disease classified successfully."
            if is_reliable
            else "Low confidence (<60%). Please upload a clearer leaf photo."
        )

        all_probabilities = {
            class_names[i]: round(float(scores[i]) * 100, 2)
            for i in range(len(class_names))
        }

        return {
            "predicted_class": predicted_class,
            "confidence": confidence,
            "is_reliable": is_reliable,
            "message": message,
            "all_probabilities": all_probabilities,
        }
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Invalid or corrupted image file.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
