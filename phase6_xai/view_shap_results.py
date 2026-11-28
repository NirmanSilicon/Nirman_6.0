
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt

OUTPUT_DIR = Path(__file__).resolve().parent / "outputs"

def show_image(filename, title):
    image_path = OUTPUT_DIR / filename

    if not image_path.exists():
        print(f"File not found: {image_path}")
        return

    image = plt.imread(image_path)
    plt.figure(figsize=(14, 8))
    plt.imshow(image)
    plt.axis("off")
    plt.title(title)
    plt.tight_layout()
    plt.show()


def show_feature_importance():
    csv_path = OUTPUT_DIR / "shap_global_feature_importance.csv"

    if not csv_path.exists():
        print("SHAP importance CSV not found.")
        return

    df = pd.read_csv(csv_path)

    print("\nTOP 15 SHAP FEATURES")
    print(df.head(15).to_string(index=False))


def main():
    print("===================================")
    print(" AEROSENTRY - PHASE 6 SHAP RESULTS")
    print("===================================")

    show_feature_importance()

    show_image(
        "shap_summary_beeswarm.png",
        "AEROSENTRY - SHAP Summary Plot"
    )

    show_image(
        "shap_global_bar.png",
        "AEROSENTRY - Global SHAP Importance"
    )

    show_image(
        "shap_engine_3_lowest_rul_in_sample.png",
        "Engine 3 - SHAP Explanation"
    )

    show_image(
        "shap_engine_6_lowest_rul_in_sample.png",
        "Engine 6 - SHAP Explanation"
    )


if __name__ == "__main__":
    main()
