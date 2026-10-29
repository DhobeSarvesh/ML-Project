import os
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
ARTIFACT_DIR = os.path.join(BASE_DIR, "model_artifacts")
SCALER_PATH = os.path.join(ARTIFACT_DIR, "scaler.joblib")
scaler = joblib.load(SCALER_PATH)
model_names = ["LogisticRegression", "DecisionTree", "RandomForest", "KNN", "XGBoost"]
models = {}
for name in model_names:
    path = os.path.join(ARTIFACT_DIR, f"{name}.joblib")
    if os.path.exists(path):
        models[name] = joblib.load(path)
    else:
        raise FileNotFoundError(f"Model file not found: {path}")
app = FastAPI(
    title="Alzheimer’s Disease Prediction API",
    description="Serves predictions for the vanilla‑JS frontend.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
class PatientFeatures(BaseModel):
    Age: float = Field(..., description="Age in years")
    Gender: int
    Ethnicity: int
    EducationLevel: int
    BMI: float
    Smoking: int
    AlcoholConsumption: float
    PhysicalActivity: float
    DietQuality: float
    SleepQuality: float
    FamilyHistoryAlzheimers: int
    CardiovascularDisease: int
    Diabetes: int
    Depression: int
    HeadInjury: int
    Hypertension: int
    SystolicBP: float
    DiastolicBP: float
    CholesterolTotal: float
    CholesterolLDL: float
    CholesterolHDL: float
    CholesterolTriglycerides: float
    MMSE: float
    FunctionalAssessment: float
    MemoryComplaints: int
    BehavioralProblems: int
    ADL: int
    Confusion: int
    Disorientation: int
    PersonalityChanges: int
    DifficultyCompletingTasks: int
    Forgetfulness: int
class PredictionResponse(BaseModel):
    model: str
    prediction: int
    probability: Optional[float] = None
@app.get("/api/health", response_model=dict)
def health_check():
    return {"status": "ok"}
@app.post("/api/predict", response_model=PredictionResponse)
def predict(payload: PatientFeatures, model_name: str = "XGBoost"):
    if model_name not in models:
        raise HTTPException(status_code=400, detail=f"Model '{model_name}' not available.")
    feature_array = np.array([list(payload.dict().values())], dtype=float)
    scaled = scaler.transform(feature_array)
    model = models[model_name]
    pred = int(model.predict(scaled)[0])
    prob = None
    try:
        prob = float(model.predict_proba(scaled)[0, 1])
    except Exception:
        pass
    return PredictionResponse(model=model_name, prediction=pred, probability=prob)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
