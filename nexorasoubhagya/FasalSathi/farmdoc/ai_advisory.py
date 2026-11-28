import json
import urllib.request
import urllib.error


OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "qwen2.5:0.5b"


def generate_advisory(disease_result, crop_name="Unknown"):

    disease = disease_result["disease"]
    confidence = disease_result["confidence_percent"]

    prompt = f"""
You are an agricultural advisory assistant for Indian farmers.

Prepare a practical plant disease advisory using these prediction details:

Crop: {crop_name}
Predicted disease: {disease}
Model confidence: {confidence}%

Write the report using these sections:

1. Disease Overview
2. Common Symptoms
3. Possible Causes
4. Immediate Actions for the Farmer
5. Treatment and Management
6. Organic Management Options
7. Prevention Methods
8. Recovery and Monitoring

Important instructions:
- Use simple English that farmers can understand.
- Give practical and safe recommendations.
- Do not invent pesticide names, chemical dosages or application rates.
- Recommend consulting local agricultural experts before chemical treatment.
- Do not claim that the prediction is certainly correct.
- If the crop and disease combination appears unusual, clearly mention that it needs verification.
- If information is uncertain, say so instead of guessing.
- Do not generate a chatbot conversation.
- Return only the advisory report.
"""

    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False
    }

    data = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        OLLAMA_URL,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            result = json.loads(response.read().decode("utf-8"))

        advisory = result.get("response", "").strip()

        if not advisory:
            raise ValueError("Ollama returned an empty advisory.")

        return advisory

    except urllib.error.URLError as error:
        raise RuntimeError(
            "Could not connect to Ollama. Check whether its server is running."
        ) from error


# Test the advisory generator
if __name__ == "__main__":

    test_result = {
        "disease": "Apple___Black_rot",
        "confidence_percent": 93.47
    }

    print("\nGenerating AI disease advisory...\n")

    report = generate_advisory(
        test_result,
        crop_name="Apple"
    )

    print("=" * 55)
    print("             FARMDOC AI DISEASE REPORT")
    print("=" * 55)
    print(report)
