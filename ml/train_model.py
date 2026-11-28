from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib

# Define paths
BASE_DIR = Path(__file__).resolve().parent.parent

DATA_PATH = BASE_DIR / "dataset/bosch/decoded/cleaned_first_5000.csv"

MODEL_DIR = BASE_DIR / "models"
RESULT_DIR = BASE_DIR / "results"

MODEL_DIR.mkdir(exist_ok=True)
RESULT_DIR.mkdir(exist_ok=True)

# Load dataset
df = pd.read_csv(DATA_PATH)

print("Dataset shape:", df.shape)
print("Missing values:", df.isnull().sum().sum())

# Split dataset by wafer
wafers = df["wafer_id"].unique()

train_df = df[df["wafer_id"] == wafers[0]].copy()
test_df = df[df["wafer_id"] == wafers[1]].copy()

print("Training records:", len(train_df))
print("Testing records:", len(test_df))

# Select numerical features
X_train = train_df.drop(
    columns=["timestamp", "wafer_id"]
).select_dtypes(include=np.number)

# Remove constant columns
features = X_train.columns[
    X_train.nunique() > 1
].tolist()

X_train = X_train[features]
X_test = test_df[features]

print("Selected features:", len(features))

# Initialize model
model = IsolationForest(
    n_estimators=200,
    contamination=0.05,
    random_state=42,
    n_jobs=-1
)

# Train model
print("Training model...")
model.fit(X_train)

# Test model
predictions = model.predict(X_test)
scores = model.decision_function(X_test)

test_df["prediction"] = predictions
test_df["anomaly_score"] = scores

test_df["status"] = np.where(
    predictions == -1,
    "Anomaly",
    "Normal"
)

print("\nPrediction summary:")
print(test_df["status"].value_counts())

# Save trained model
joblib.dump(
    {"model": model, "features": features},
    MODEL_DIR / "isolation_forest.pkl"
)

# Save results
test_df.to_csv(
    RESULT_DIR / "anomaly_predictions.csv",
    index=False
)

print("\nModel training completed!")
print("Model saved successfully.")