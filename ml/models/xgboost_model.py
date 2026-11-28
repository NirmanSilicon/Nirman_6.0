from pathlib import Path
import joblib


class XGBoostModel:
    """XGBoost binary and multiclass fault classifier."""

    def __init__(
        self,
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        random_state=42,
    ):
        try:
            from xgboost import XGBClassifier
        except ImportError as exc:
            raise ImportError(
                "Install XGBoost using: pip install xgboost"
            ) from exc

        self.XGBClassifier = XGBClassifier
        self.params = {
            "n_estimators": n_estimators,
            "max_depth": max_depth,
            "learning_rate": learning_rate,
            "random_state": random_state,
            "n_jobs": -1,
        }
        self.model = None
        self.classes_ = None

    def fit(self, X, y):
        import numpy as np

        classes = np.unique(y)

        if len(classes) < 2:
            raise ValueError(
                "Training requires at least two distinct classes."
            )

        self.classes_ = classes

        params = self.params.copy()

        if len(classes) == 2:
            params["objective"] = "binary:logistic"
            params["eval_metric"] = "logloss"
        else:
            params["objective"] = "multi:softprob"
            params["eval_metric"] = "mlogloss"
            params["num_class"] = len(classes)

        self.model = self.XGBClassifier(**params)
        self.model.fit(X, y)

        return self

    def predict(self, X):
        if self.model is None:
            raise RuntimeError("Model must be trained first.")

        return self.model.predict(X)

    def predict_proba(self, X):
        if self.model is None:
            raise RuntimeError("Model must be trained first.")

        return self.model.predict_proba(X)

    def feature_importance(self):
        if self.model is None:
            raise RuntimeError("Model must be trained first.")

        return self.model.feature_importances_

    def save(self, path):
        if self.model is None:
            raise RuntimeError("Train the model before saving.")

        Path(path).parent.mkdir(parents=True, exist_ok=True)

        joblib.dump(
            {
                "model": self.model,
                "classes": self.classes_,
            },
            path,
        )

    @classmethod
    def load(cls, path):
        saved = joblib.load(path)

        instance = cls.__new__(cls)
        instance.model = saved["model"]
        instance.classes_ = saved["classes"]
        instance.params = None
        instance.XGBClassifier = None

        return instance