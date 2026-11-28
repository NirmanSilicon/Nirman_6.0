from pathlib import Path
import pandas as pd


class DataLoader:
    """Load industrial sensor datasets."""

    @staticmethod
    def load(path: str) -> pd.DataFrame:
        file_path = Path(path)

        if not file_path.exists():
            raise FileNotFoundError(f"Dataset not found: {path}")

        suffix = file_path.suffix.lower()

        if suffix == ".csv":
            return pd.read_csv(file_path)

        if suffix in {".parquet", ".pq"}:
            return pd.read_parquet(file_path)

        raise ValueError(f"Unsupported file format: {suffix}")

    @staticmethod
    def validate_columns(
        data: pd.DataFrame,
        required_columns: list[str],
    ) -> None:
        missing = set(required_columns) - set(data.columns)

        if missing:
            raise ValueError(
                f"Dataset is missing required columns: {sorted(missing)}"
            )