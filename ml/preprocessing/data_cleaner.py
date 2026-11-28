import numpy as np
import pandas as pd


class DataCleaner:
    """Clean industrial sensor data."""

    @staticmethod
    def remove_duplicates(data: pd.DataFrame) -> pd.DataFrame:
        return data.drop_duplicates().copy()

    @staticmethod
    def replace_invalid_values(data: pd.DataFrame) -> pd.DataFrame:
        result = data.copy()
        return result.replace([np.inf, -np.inf], np.nan)

    @staticmethod
    def fill_missing_values(
        data: pd.DataFrame,
        strategy: str = "median",
    ) -> pd.DataFrame:
        result = data.copy()

        numeric_columns = result.select_dtypes(
            include=np.number
        ).columns

        if strategy == "median":
            result[numeric_columns] = result[numeric_columns].fillna(
                result[numeric_columns].median()
            )
        elif strategy == "mean":
            result[numeric_columns] = result[numeric_columns].fillna(
                result[numeric_columns].mean()
            )
        else:
            raise ValueError("Strategy must be 'median' or 'mean'.")

        return result

    @classmethod
    def clean(cls, data: pd.DataFrame) -> pd.DataFrame:
        result = cls.remove_duplicates(data)
        result = cls.replace_invalid_values(result)
        result = cls.fill_missing_values(result)

        return result