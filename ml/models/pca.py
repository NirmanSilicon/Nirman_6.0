from pathlib import Path
import joblib
import numpy as np
from sklearn.decomposition import PCA


class PCAModel:
    """PCA-based dimensionality reduction and anomaly analysis."""

    def __init__(
        self,
        n_components: float = 0.95,
    ):
        self.model = PCA(
            n_components=n_components,
            random_state=42,
        )

        self.error_threshold = None

    def fit(self, X):
        self.model.fit(X)

        reconstructed = self.model.inverse_transform(
            self.model.transform(X)
        )

        errors = np.mean(
            np.square(np.asarray(X) - reconstructed),
            axis=1,
        )

        self.error_threshold = float(np.percentile(errors, 99))

        return self

    def transform(self, X):
        return self.model.transform(X)

    def reconstruction_error(self, X):
        values = np.asarray(X)

        reconstructed = self.model.inverse_transform(
            self.model.transform(values)
        )

        return np.mean(
            np.square(values - reconstructed),
            axis=1,
        )

    def predict_anomaly(self, X):
        if self.error_threshold is None:
            raise RuntimeError("PCA model must be fitted first.")

        errors = self.reconstruction_error(X)

        return (errors > self.error_threshold).astype(int)

    def save(self, path: str):
        Path(path).parent.mkdir(parents=True, exist_ok=True)

        joblib.dump(
            {
                "model": self.model,
                "error_threshold": self.error_threshold,
            },
            path,
        )

    @classmethod
    def load(cls, path: str):
        saved = joblib.load(path)

        instance = cls.__new__(cls)
        instance.model = saved["model"]
        instance.error_threshold = saved["error_threshold"]

        return instance