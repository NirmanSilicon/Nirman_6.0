
from crop_detection import detect_crop
from disease_detection import detect_disease
from ai_advisory import generate_advisory


def run_farmdoc(image_path):

    print("\n" + "=" * 55)
    print("              FARMDOC AI REPORT")
    print("=" * 55)

    # Step 1: Detect crop
    print("\n[1] Identifying crop...")

    crop_name, crop_confidence = detect_crop(image_path)

    print("Crop:", crop_name)
    print(f"Crop Confidence: {crop_confidence:.2%}")

    # Step 2: Detect disease
    print("\n[2] Detecting plant disease...")

    disease_result = detect_disease(image_path)

    print("\nDisease:", disease_result["disease"])
    print(f"Disease Confidence: {disease_result['confidence_percent']:.2f}%")

    # Step 3: Generate AI advisory
    print("\n[3] Generating AI advisory using Ollama...")
    
    report = generate_advisory(
        disease_result,
        crop_name=crop_name
    )

    print("\n" + "=" * 55)
    print("              AI-GENERATED ADVISORY")
    print("=" * 55)
    print(report)

    print("\n" + "=" * 55)
    print("             FARMDOC ANALYSIS COMPLETE")
    print("=" * 55)


if __name__ == "__main__":
    image_path = input("Enter the image path: ").strip().strip('"')
    run_farmdoc(image_path)
