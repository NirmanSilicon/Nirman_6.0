from pathlib import Path
import joblib
import pandas as pd
from sklearn.preprocessing import StandardScaler


class FeatureScaler:
    """Scale sensor features without data leakage."""

    def __init__(self):
        self.scaler = StandardScaler()
        self.is_fitted = False
        self.columns = None

    def fit(self, data: pd.DataFrame):
        self.columns = list(data.columns)
        self.scaler.fit(data)
        self.is_fitted = True
        return self

    def transform(self, data: pd.DataFrame) -> pd.DataFrame:
        if not self.is_fitted:
            raise RuntimeError("Scaler must be fitted first.")

        if list(data.columns) != self.columns:
            raise ValueError("Input columns do not match fitted columns.")

        values = self.scaler.transform(data)

        return pd.DataFrame(
            values,
            columns=self.columns,
            index=data.index,
        )

    def fit_transform(self, data: pd.DataFrame) -> pd.DataFrame:
        return self.fit(data).transform(data)

    def save(self, path: str):
        Path(path).parent.mkdir(parents=True, exist_ok=True)

        joblib.dump(
            {
                "scaler": self.scaler,
                "columns": self.columns,
            },
            path,
        )

    @classmethod
    def load(cls, path: str):
        saved = joblib.load(path)

        instance = cls()
        instance.scaler = saved["scaler"]
        instance.columns = saved["columns"]
        instance.is_fitted = True

        return instance