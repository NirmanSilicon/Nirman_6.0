import pandas as pd
from .metrics import calculate_metrics


def compare_models(results: dict) -> pd.DataFrame:
    """
    Compare supervised model predictions.

    results format:
    {
        "Random Forest": (y_true, y_pred),
        "XGBoost": (y_true, y_pred)
    }
    """

    comparison = []

    for model_name, values in results.items():
        y_true, y_pred = values

        metrics = calculate_metrics(y_true, y_pred)

        comparison.append({
            "model": model_name,
            **metrics,
        })

    return (
        pd.DataFrame(comparison)
        .sort_values("f1_macro", ascending=False)
        .reset_index(drop=True)
    )