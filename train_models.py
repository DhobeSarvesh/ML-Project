import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                             f1_score, confusion_matrix, roc_auc_score,
                             roc_curve)
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE
import joblib
import json
import os

# ---------- Configuration ----------
DATA_PATH = "alzheimers_disease_data.csv"
OUTPUT_DIR = "model_artifacts"
METRICS_PATH = os.path.join(OUTPUT_DIR, "metrics.json")

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ---------- Load data ----------
print("Loading data...")
df = pd.read_csv(DATA_PATH)

# Target column (assumed to be binary 0/1 in 'Diagnosis')
TARGET_COL = "Diagnosis"
# Columns to drop (identifiers not used for training)
DROP_COLS = ["PatientID", "DoctorInCharge"]

X = df.drop(columns=DROP_COLS + [TARGET_COL])
y = df[TARGET_COL]

# Optional: If any categorical columns exist, they are already encoded as numbers in the CSV.
# Ensure all data is numeric
X = X.apply(pd.to_numeric, errors='coerce')

# ---------- Train‑test split ----------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y)

# ---------- Scaling ----------
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Save the scaler
joblib.dump(scaler, os.path.join(OUTPUT_DIR, "scaler.joblib"))

# ---------- SMOTE (only on training data) ----------
print("Applying SMOTE to balance classes...")
smote = SMOTE(random_state=42)
X_train_bal, y_train_bal = smote.fit_resample(X_train_scaled, y_train)

# ---------- Model definitions ----------
models = {
    "LogisticRegression": LogisticRegression(max_iter=1000, random_state=42),
    "DecisionTree": DecisionTreeClassifier(random_state=42),
    "RandomForest": RandomForestClassifier(n_estimators=200, random_state=42),
    "KNN": KNeighborsClassifier(n_neighbors=5),
    "XGBoost": XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42)
}

# ---------- Train, evaluate and save ----------
metrics = {}
for name, model in models.items():
    print(f"Training {name}...")
    model.fit(X_train_bal, y_train_bal)
    # Save model
    joblib.dump(model, os.path.join(OUTPUT_DIR, f"{name}.joblib"))

    # Predictions on the *original* test set (scaled, not SMOTEd)
    y_pred = model.predict(X_test_scaled)
    # Some models provide probability; handle missing gracefully
    try:
        y_proba = model.predict_proba(X_test_scaled)[:, 1]
        roc_auc = roc_auc_score(y_test, y_proba)
        fpr, tpr, _ = roc_curve(y_test, y_proba)
    except AttributeError:
        y_proba = None
        roc_auc = None
        fpr, tpr = None, None

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    cm = confusion_matrix(y_test, y_pred).tolist()

    metrics[name] = {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "roc_auc": round(roc_auc, 4) if roc_auc is not None else None,
        "confusion_matrix": cm,
        "roc_curve": {
            "fpr": fpr.tolist() if fpr is not None else None,
            "tpr": tpr.tolist() if tpr is not None else None
        }
    }

# Write metrics to JSON for the frontend
with open(METRICS_PATH, "w") as fp:
    json.dump(metrics, fp, indent=2)

print(f"Training complete. Models and scaler saved to '{OUTPUT_DIR}'. Metrics written to '{METRICS_PATH}'.")
