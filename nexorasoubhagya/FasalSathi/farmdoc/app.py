
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from crop_detection import detect_crop
from disease_detection import detect_disease
from ai_advisory import generate_advisory

import os
import uuid


app = FastAPI(title="FarmDoc AI API")

# Allow the frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploaded_images"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.get("/")
def home():
    return {"message": "FarmDoc AI Backend is running!"}


@app.post("/analyze")
async def analyze_crop(file: UploadFile = File(...)):

    if file.content_type not in [
        "image/jpeg",
        "image/png",
        "image/jpg"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Please upload a JPG or PNG image."
        )

    image_path = os.path.join(
        UPLOAD_FOLDER,
        f"{uuid.uuid4().hex}_{file.filename}"
    )

    try:
        # Save the farmer's uploaded image
        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="Uploaded image is empty."
            )

        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="Image size must be below 10 MB."
            )

        with open(image_path, "wb") as image_file:
            image_file.write(contents)

        # Step 1: Detect crop
        crop_name, crop_confidence = detect_crop(image_path)

        # Step 2: Detect disease
        disease_result = detect_disease(image_path)

        # Step 3: Generate AI advisory
        report = generate_advisory(
            disease_result,
            crop_name=crop_name
        )

        # Send results to the frontend
        return {
            "success": True,
            "crop": crop_name,
            "crop_confidence": round(
                float(crop_confidence) * 100, 2
            ),
            "disease": disease_result["disease"],
            "disease_confidence": disease_result["confidence_percent"],
            "advisory": report
        }

    except HTTPException:
        raise

    except Exception as error:
        print("FarmDoc Error:", error)

        raise HTTPException(
            status_code=500,
            detail="Analysis failed. Please check the backend and AI models."
        )

    finally:
        if os.path.exists(image_path):
            os.remove(image_path)
