from .metrics import calculate_metrics


class ModelEvaluator:
    """Evaluate supervised classification models."""

    @staticmethod
    def evaluate(model, X_test, y_test):
        predictions = model.predict(X_test)

        return calculate_metrics(
            y_test,
            predictions,
        )