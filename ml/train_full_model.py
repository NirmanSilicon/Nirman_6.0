
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.impute import SimpleImputer
import joblib

# 1. Define paths
BASE_DIR = Path(__file__).resolve().parent.parent

DATA_PATH = BASE_DIR / "dataset/bosch/decoded/complete_process_data.csv"

MODEL_DIR = BASE_DIR / "models"
RESULT_DIR = BASE_DIR / "results"

MODEL_DIR.mkdir(exist_ok=True)
RESULT_DIR.mkdir(exist_ok=True)

# 2. Load complete dataset
print("Loading dataset...")
df = pd.read_csv(DATA_PATH)

print("Original dataset shape:", df.shape)

# 3. Clean dataset
df = df.drop_duplicates()
df = df.replace([np.inf, -np.inf], np.nan)
df = df.dropna(subset=["wafer_id"])

print("Dataset after cleaning:", df.shape)

# 4. Perform 75:25 wafer-wise split
wafers = df["wafer_id"].unique()

split_index = int(len(wafers) * 0.75)

train_wafers = wafers[:split_index]
test_wafers = wafers[split_index:]

train_df = df[df["wafer_id"].isin(train_wafers)].copy()
test_df = df[df["wafer_id"].isin(test_wafers)].copy()

print("\nTraining wafers:", len(train_wafers))
print("Testing wafers:", len(test_wafers))

print("Training records:", len(train_df))
print("Testing records:", len(test_df))

# 5. Select numerical features
X_train = train_df.drop(
    columns=["timestamp", "wafer_id"]
).select_dtypes(include=np.number)

# Remove columns with more than 50% missing values
valid_columns = X_train.columns[
    X_train.isnull().mean() <= 0.50
]

X_train = X_train[valid_columns]

# Remove constant features
features = X_train.columns[
    X_train.nunique() > 1
].tolist()

X_train = X_train[features]
X_test = test_df[features]

print("\nSelected features:", len(features))

for feature in features:
    print(feature)

# 6. Handle missing values
imputer = SimpleImputer(strategy="median")

X_train = imputer.fit_transform(X_train)
X_test = imputer.transform(X_test)

# 7. Initialize Isolation Forest
model = IsolationForest(
    n_estimators=200,
    contamination=0.05,
    max_samples=1024,
    random_state=42,
    n_jobs=-1
)

# 8. Train model
print("\nTraining model...")
model.fit(X_train)

# 9. Test model
print("Testing model...")

predictions = model.predict(X_test)
scores = model.decision_function(X_test)

test_df["prediction"] = predictions
test_df["anomaly_score"] = scores

test_df["status"] = np.where(
    predictions == -1,
    "Anomaly",
    "Normal"
)

# 10. Display results
normal = (predictions == 1).sum()
anomalies = (predictions == -1).sum()

print("\n========== MODEL RESULTS ==========")

print("Total testing records:", len(test_df))
print("Normal readings:", normal)
print("Anomalous readings:", anomalies)

print("Normal percentage:",
      round(normal / len(test_df) * 100, 2))

print("Anomaly percentage:",
      round(anomalies / len(test_df) * 100, 2))

# 11. Save trained model
joblib.dump(
    {
        "model": model,
        "imputer": imputer,
        "features": features
    },
    MODEL_DIR / "full_isolation_forest.pkl"
)

# 12. Save predictions
test_df.to_csv(
    RESULT_DIR / "full_anomaly_predictions.csv",
    index=False
)

print("\nModel training completed successfully!")
print("Model and predictions saved.")
