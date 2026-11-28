
import onnxruntime as ort
import numpy as np
from PIL import Image
import json

# Model paths
MODEL_PATH = "model/01_crop_classifier/crop_classifier.onnx"
LABEL_PATH = "model/01_crop_classifier/class_names.json"

# Load trained ONNX model
session = ort.InferenceSession(MODEL_PATH)

# Load crop names
with open(LABEL_PATH, "r") as f:
    class_names = json.load(f)


def detect_crop(image_path):

    # Open image
    img = Image.open(image_path).convert("RGB")

    # Resize image
    img = img.resize((224, 224))

    # Convert image into array
    x = np.array(img, dtype=np.float32)

    # Preprocess image
    x = x.transpose(2, 0, 1)[None, ...] / 255.0

    # Run prediction
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: x})[0]

    scores = outputs.reshape(-1)

    # Calculate probabilities if output is logits
    if not (
        np.all(scores >= 0)
        and np.all(scores <= 1)
        and np.isclose(scores.sum(), 1.0, atol=0.01)
    ):
        scores = np.exp(scores - np.max(scores))
        scores = scores / scores.sum()

    # Get predicted crop
    predicted_idx = int(np.argmax(scores))
    crop_name = class_names[str(predicted_idx)]
    confidence = float(scores[predicted_idx])

    print("Predicted Crop:", crop_name)
    print(f"Confidence: {confidence:.2%}")

    return crop_name, confidence


# Test prediction
if __name__ == "__main__":
    image_path = "sample.jpg"
    detect_crop(image_path)
