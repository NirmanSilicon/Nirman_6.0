import numpy as np

from ml.models import (
    IsolationForestModel,
    RandomForestModel,
    PCAModel,
    XGBoostModel,
)

from ml.evaluation import calculate_metrics


def main():
    rng = np.random.default_rng(42)

    X = rng.normal(size=(500, 8))
    y = np.array([0, 1] * 250)

    X_train, X_test = X[:400], X[400:]
    y_train, y_test = y[:400], y[400:]

    # Isolation Forest
    isolation = IsolationForestModel()
    isolation.fit(X_train)
    print("Isolation Forest:", isolation.predict(X_test)[:5])

    # Random Forest
    rf = RandomForestModel()
    rf.fit(X_train, y_train)
    rf_predictions = rf.predict(X_test)
    print("Random Forest:", calculate_metrics(y_test, rf_predictions))

    # PCA
    pca = PCAModel(n_components=0.95)
    pca.fit(X_train)
    print("PCA reduced shape:", pca.transform(X_test).shape)

    # XGBoost
    xgb = XGBoostModel()
    xgb.fit(X_train, y_train)
    xgb_predictions = xgb.predict(X_test)
    print("XGBoost:", calculate_metrics(y_test, xgb_predictions))

    print("\nAll four model tests completed!")


if __name__ == "__main__":
    main()