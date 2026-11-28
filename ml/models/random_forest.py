from pathlib import Path
import joblib
from sklearn.ensemble import RandomForestClassifier


class RandomForestModel:
    """Supervised industrial fault classification."""

    def __init__(
        self,
        n_estimators: int = 300,
        random_state: int = 42,
    ):
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            class_weight="balanced",
            random_state=random_state,
            n_jobs=-1,
        )

    def fit(self, X, y):
        self.model.fit(X, y)
        return self

    def predict(self, X):
        return self.model.predict(X)

    def predict_proba(self, X):
        return self.model.predict_proba(X)

    def feature_importance(self):
        return self.model.feature_importances_

    def save(self, path: str):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, path)

    @classmethod
    def load(cls, path: str):
        instance = cls.__new__(cls)
        instance.model = joblib.load(path)
        return instance