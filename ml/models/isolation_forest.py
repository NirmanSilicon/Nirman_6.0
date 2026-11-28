from pathlib import Path
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest


class IsolationForestModel:
    """Unsupervised anomaly detection."""

    def __init__(
        self,
        contamination: float = 0.02,
        random_state: int = 42,
    ):
        self.model = IsolationForest(
            n_estimators=200,
            contamination=contamination,
            random_state=random_state,
            n_jobs=-1,
        )

    def fit(self, X):
        self.model.fit(X)
        return self

    def predict(self, X):
        # sklearn: 1 = normal, -1 = anomaly
        raw = self.model.predict(X)

        return np.where(raw == -1, 1, 0)

    def anomaly_scores(self, X):
        # Higher score means more anomalous.
        return -self.model.score_samples(X)

    def save(self, path: str):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, path)

    @classmethod
    def load(cls, path: str):
        instance = cls.__new__(cls)
        instance.model = joblib.load(path)
        return instance