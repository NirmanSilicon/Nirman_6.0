import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, StackingClassifier
from xgboost import XGBClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score, f1_score

class WaferStackingClassifier:
    """
    Primary Classification Engine implementing the specified architecture:
    - Base Model 1: Random Forest
    - Base Model 2: XGBoost
    - Base Model 3: Extra Trees
    - Meta-Learner: Logistic Regression (Stacking Ensemble via cross-validated predict_proba)
    """
    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        
        # 1. Base Model 1: Random Forest
        self.rf_base = RandomForestClassifier(
            n_estimators=120,
            max_depth=10,
            min_samples_split=4,
            class_weight="balanced",
            random_state=self.random_state,
            n_jobs=-1
        )
        
        # 2. Base Model 2: XGBoost
        self.xgb_base = XGBClassifier(
            n_estimators=120,
            max_depth=5,
            learning_rate=0.08,
            subsample=0.85,
            colsample_bytree=0.85,
            eval_metric="mlogloss",
            random_state=self.random_state,
            n_jobs=-1
        )
        
        # 3. Base Model 3: Extra Trees
        self.et_base = ExtraTreesClassifier(
            n_estimators=120,
            max_depth=10,
            min_samples_split=4,
            class_weight="balanced",
            random_state=self.random_state,
            n_jobs=-1
        )
        
        # Final Estimator (Meta-Learner)
        self.meta_learner = LogisticRegression(
            C=1.0,
            max_iter=1000,
            random_state=self.random_state
        )
        
        # Full Stacking Classifier
        self.ensemble = StackingClassifier(
            estimators=[
                ("rf", self.rf_base),
                ("xgb", self.xgb_base),
                ("et", self.et_base)
            ],
            final_estimator=self.meta_learner,
            cv=5,
            stack_method="predict_proba",
            n_jobs=-1
        )
        
        self.scaler = StandardScaler()
        self.feature_names: List[str] = []
        self.classes_: Optional[np.ndarray] = None

    def fit(self, X: pd.DataFrame, y: pd.Series, feature_cols: List[str]):
        """Fits scaler and Stacking Classifier on wafer feature matrix."""
        self.feature_names = feature_cols
        X_mat = X[feature_cols].values
        X_scaled = self.scaler.fit_transform(X_mat)
        
        self.ensemble.fit(X_scaled, y)
        self.classes_ = self.ensemble.classes_
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Predicts class labels (0=Normal, 1=Chamber_Drift, 2=Process_Fault)."""
        X_mat = X[self.feature_names].values
        X_scaled = self.scaler.transform(X_mat)
        return self.ensemble.predict(X_scaled)

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Predicts class probabilities across all classes."""
        X_mat = X[self.feature_names].values
        X_scaled = self.scaler.transform(X_mat)
        return self.ensemble.predict_proba(X_scaled)

    def get_base_model_predictions(self, X: pd.DataFrame) -> Dict[str, np.ndarray]:
        """Returns predictions from each individual base model for comparison & auditability."""
        X_mat = X[self.feature_names].values
        X_scaled = self.scaler.transform(X_mat)
        
        base_preds = {}
        for name, model in self.ensemble.named_estimators_.items():
            base_preds[name] = {
                "pred": model.predict(X_scaled),
                "proba": model.predict_proba(X_scaled)
            }
        return base_preds

    def evaluate(self, X: pd.DataFrame, y: pd.Series, target_names: Optional[List[str]] = None) -> Dict:
        """Evaluates ensemble and returns metrics dict & classification report."""
        y_pred = self.predict(X)
        acc = accuracy_score(y, y_pred)
        f1_macro = f1_score(y, y_pred, average="macro")
        f1_weighted = f1_score(y, y_pred, average="weighted")
        report = classification_report(y, y_pred, target_names=target_names, output_dict=True)
        report_text = classification_report(y, y_pred, target_names=target_names)
        
        return {
            "accuracy": acc,
            "f1_macro": f1_macro,
            "f1_weighted": f1_weighted,
            "classification_report": report,
            "classification_report_text": report_text
        }
