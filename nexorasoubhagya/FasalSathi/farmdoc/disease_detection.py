import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import json
from pathlib import Path

# File paths
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "mobilenetv2_plant.pth"
LABEL_PATH = BASE_DIR / "model" / "disease_labels.json"

# Device
DEVICE = torch.device("cpu")

# Load disease labels
with open(LABEL_PATH, "r", encoding="utf-8-sig") as f:
    class_names = json.load(f)

if len(class_names) != 38:
    raise ValueError("Expected exactly 38 disease labels.")

# Build MobileNetV2 architecture
model = models.mobilenet_v2(weights=None)

# Replace classifier with the original 38-class head
model.classifier[1] = nn.Sequential(
    nn.Dropout(0.2),
    nn.Linear(model.last_channel, 38)
)

# Load your existing trained weights
state_dict = torch.load(
    MODEL_PATH,
    map_location=DEVICE,
    weights_only=True
)

model.load_state_dict(state_dict, strict=True)
model.to(DEVICE)
model.eval()

# Image preprocessing
preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


def detect_disease(image_path):

    image_path = Path(image_path)

    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    image = Image.open(image_path).convert("RGB")
    image_tensor = preprocess(image).unsqueeze(0).to(DEVICE)

    # Run prediction
    with torch.no_grad():
        outputs = model(image_tensor)
        probabilities = torch.softmax(outputs, dim=1)[0]

    # Get top prediction
    predicted_idx = int(torch.argmax(probabilities).item())
    confidence = float(probabilities[predicted_idx].item())

    disease_name = class_names[str(predicted_idx)]

    result = {
        "disease": disease_name,
        "confidence": confidence,
        "confidence_percent": round(confidence * 100, 2),
        "class_index": predicted_idx
    }

    print("\n----- DISEASE DETECTION RESULT -----")
    print("Prediction:", disease_name)
    print(f"Confidence: {confidence:.2%}")
    print("Class Index:", predicted_idx)

    return result


# Test prediction
if __name__ == "__main__":
    detect_disease("sample.jpg")
