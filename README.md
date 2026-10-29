# NeuroCare — Alzheimer’s Risk Assessment

A modern, accessible, clinical-grade web frontend built for the **Alzheimer’s Disease Prediction Machine Learning Lab Project**.

This project provides an interactive interface for evaluating Alzheimer's disease risk using 32 cognitive, medical, and lifestyle biomarkers. It is built strictly with vanilla **HTML5**, **CSS3**, and **JavaScript (ES6)** and runs immediately in VS Code using **Live Server** without any build steps or npm dependencies.

---

## 1. Project Overview & Lab Notebook Alignment

The frontend is designed around the existing laboratory experiment recorded in `alzheimer_ml_lab_project_final.ipynb` and the dataset `alzheimers_disease_data.csv`:

- **Target Variable**: `Diagnosis` (0 = Negative / Low Risk, 1 = Positive / High Risk of Alzheimer's Disease).
- **Pruned Features**: `PatientID` and `DoctorInCharge` (removed to avoid data leakage).
- **Input Dimensions**: All 32 predictive features are collected via intuitive, organized clinical input sections.
- **Data Preprocessing**: Stratified 80:20 train-test split (430 test instances), `StandardScaler` (applied to 15 continuous numeric columns), and `SMOTE` (synthetic minority over-sampling on training sets).
- **5 Evaluated Models**:
  1. **XGBoost Classifier** *(Top Performer — 92.79% Accuracy, 0.9417 ROC-AUC)*
  2. **Random Forest** *(90.93% Accuracy, 0.9376 ROC-AUC)*
  3. **Decision Tree** *(84.42% Accuracy, 0.8483 ROC-AUC)*
  4. **Logistic Regression** *(81.40% Accuracy, 0.8835 ROC-AUC)*
  5. **K-Nearest Neighbors (KNN)** *(63.26% Accuracy, 0.7289 ROC-AUC)*

*All benchmark metrics displayed in the Model Comparison section are verified directly from the notebook's classification reports and ROC evaluations.*

---

## 2. File Structure

```text
ML_Project/
├── index.html                           # Semantic HTML5 single-page application structure
├── style.css                            # Modern medical CSS design system (Navy/Teal/Slate)
├── script.js                            # Modular vanilla JavaScript logic & validation
├── README.md                            # Documentation and backend integration guide
├── alzheimers_disease_data.csv          # Lab dataset
└── alzheimer_ml_lab_project_final.ipynb # Lab experiment notebook
```

---

## 3. How to Run the Website

### Option A: VS Code Live Server (Recommended)
1. Open this folder (`ML_Project`) in **Visual Studio Code**.
2. If not already installed, install the **Live Server** extension (by Ritwick Dey) from the VS Code Extensions tab.
3. Right-click `index.html` in the explorer and select **"Open with Live Server"** (or click "Go Live" in the bottom status bar).
4. The dashboard will automatically launch in your default web browser at `http://127.0.0.1:5500/index.html`.

### Option B: Direct Browser Open
- Simply double-click `index.html` or drag it into any modern web browser (Chrome, Edge, Firefox, Safari).

---

## 4. Key Features & Functionality

- **Dashboard**:
  - Live session metrics (Total Assessments, Positive Predictions, Negative Predictions) updated dynamically.
  - Recent assessment history table showing Patient Name, Mobile Number, Assessment Date, Age/Sex, MMSE, and risk status with quick report actions.
- **Patient Assessment Form**:
  - **Patient Information**: Captures Patient Full Name, 10-digit Indian Mobile Number (with automatic whitespace/hyphen stripping and `^[6-9]\d{9}$` validation), and auto-populated Assessment Date.
  - Full collection of all 32 dataset features: Demographics, Lifestyle & Vitals, Chronic Medical History, Lipid Panel, Cognitive & Functional Scores (MMSE, Functional Assessment, ADL), and Observed Symptoms.
  - Strict input validation: numeric range boundaries, required field verification, and clear error prompts.
  - **Quick Sample Fillers**: "Load Low-Risk Sample" and "Load High-Risk Sample" buttons populating realistic fictional patient details and biomarker profiles for instant, frictionless classroom or lab demonstration.
  - Model selection dropdown allowing testing across all 5 lab algorithms.
- **Prediction Results Panel**:
  - Displays Patient Full Name, Mobile Number, Assessment Date, Reference ID, and evaluation timestamp alongside the ML prediction output.
  - Visual status banner indicating classification (Negative / Low Risk vs. Positive / High Risk).
  - Key risk biomarker identification (e.g. low MMSE score, impaired ADL, memory complaints).
  - Complete 32-feature patient summary card.
  - **Print Results Button**: Formatted with print-specific CSS to output a professional clinical laboratory report with patient identification.
- **Model Comparison Table & Chart**:
  - Side-by-side performance table showing Accuracy, Precision, Recall, F1-Score, and ROC-AUC for all 5 models.
  - Pure CSS horizontal comparison chart.
- **About Project**:
  - Detailed methodology documentation covering SMOTE, StandardScaler, feature pruning, and pipeline architecture.

---

## 5. Next Steps: Connecting the Real Python ML Model

The frontend includes an isolated inference function `callBackendAPI()` in `script.js` configured to point to `http://localhost:5000/predict`.

When the backend server is offline, the interface seamlessly and transparently operates in **Demo Mode**. To connect your trained notebook model for live real-time inference:

### Step 1: Export your trained model in the notebook
In your Jupyter notebook, save your trained model and scaler using `joblib`:
```python
import joblib

# Export your best model (e.g. XGBoost or Random Forest)
joblib.dump(xgb, 'best_model.joblib')
joblib.dump(scaler, 'scaler.joblib')
```

### Step 2: Create a minimal Flask backend (`app.py`)
```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd

app = Flask(__name__)
CORS(app)  # Allow frontend requests

model = joblib.load('best_model.joblib')
scaler = joblib.load('scaler.joblib')

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'online'})

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json.get('features', {})
    
    # Feature order must match the training dataframe columns:
    cols = [
        'Age', 'Gender', 'Ethnicity', 'EducationLevel', 'BMI', 'Smoking',
        'AlcoholConsumption', 'PhysicalActivity', 'DietQuality', 'SleepQuality',
        'FamilyHistoryAlzheimers', 'CardiovascularDisease', 'Diabetes', 'Depression',
        'HeadInjury', 'Hypertension', 'SystolicBP', 'DiastolicBP', 'CholesterolTotal',
        'CholesterolLDL', 'CholesterolHDL', 'CholesterolTriglycerides', 'MMSE',
        'FunctionalAssessment', 'MemoryComplaints', 'BehavioralProblems', 'ADL',
        'Confusion', 'Disorientation', 'PersonalityChanges', 'DifficultyCompletingTasks',
        'Forgetfulness'
    ]
    
    df_input = pd.DataFrame([data])[cols]
    
    # Predict
    pred = int(model.predict(df_input)[0])
    prob = float(model.predict_proba(df_input)[0][1]) if hasattr(model, 'predict_proba') else None
    
    return jsonify({
        'prediction': pred,
        'probability': prob,
        'model': request.json.get('model', 'XGBoost')
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)
```

Once `app.py` is running, the frontend automatically detects the live API, turns the status indicator green, and uses your actual model predictions!
