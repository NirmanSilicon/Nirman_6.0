import pandas as pd


class FeatureEngineer:
    """Generate features from industrial sensor readings."""

    @staticmethod
    def add_rolling_features(
        data: pd.DataFrame,
        columns: list[str],
        window: int = 5,
    ) -> pd.DataFrame:
        if window < 1:
            raise ValueError("Window must be at least 1.")

        result = data.copy()

        for column in columns:
            if column not in result.columns:
                raise ValueError(f"Column not found: {column}")

            result[f"{column}_rolling_mean"] = (
                result[column]
                .rolling(window=window, min_periods=1)
                .mean()
            )

            result[f"{column}_rolling_std"] = (
                result[column]
                .rolling(window=window, min_periods=1)
                .std()
                .fillna(0)
            )

        return result

    @staticmethod
    def add_difference_features(
        data: pd.DataFrame,
        columns: list[str],
    ) -> pd.DataFrame:
        result = data.copy()

        for column in columns:
            if column not in result.columns:
                raise ValueError(f"Column not found: {column}")

            result[f"{column}_change"] = result[column].diff().fillna(0)

        return result