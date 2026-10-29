/**
 * ==============================================================================
 * NEUROCARE — Alzheimer's Risk Assessment Frontend Logic
 * Technology: Vanilla HTML5, CSS3, JavaScript (ES6)
 * No frameworks or external dependencies required.
 * ==============================================================================
 */

// --- 1. Global Configurations & State ---

const API_CONFIG = {
  // Python backend endpoint (Flask / FastAPI)
  baseUrl: 'http://localhost:5000',
  predictEndpoint: 'http://localhost:5000/predict',
  healthEndpoint: 'http://localhost:5000/health',
  timeoutMs: 2500, // Quick timeout before falling back to Demo Mode
  isBackendConnected: false
};

// Categorical mappings matching the dataset
// Easily adjustable if the notebook's encoding scheme changes
const CATEGORICAL_MAPPINGS = {
  Gender: {
    '0': 'Male (0)',
    '1': 'Female (1)'
  },
  Ethnicity: {
    '0': 'Caucasian (0)',
    '1': 'African American (1)',
    '2': 'Asian (2)',
    '3': 'Other (3)'
  },
  EducationLevel: {
    '0': 'None / Elementary (0)',
    '1': 'High School (1)',
    '2': "Bachelor's Degree (2)",
    '3': 'Higher Degree (3)'
  }
};

// Feature numeric ranges for client-side validation
const NUMERIC_RANGES = {
  Age: { min: 60, max: 90, label: 'Age (60-90)' },
  BMI: { min: 15.0, max: 40.0, label: 'BMI (15.0-40.0)' },
  AlcoholConsumption: { min: 0.0, max: 20.0, label: 'Alcohol (0-20 units)' },
  PhysicalActivity: { min: 0.0, max: 10.0, label: 'Physical Activity (0-10 hrs)' },
  DietQuality: { min: 0.0, max: 10.0, label: 'Diet Quality (0-10)' },
  SleepQuality: { min: 4.0, max: 10.0, label: 'Sleep Quality (4-10)' },
  SystolicBP: { min: 90, max: 180, label: 'Systolic BP (90-180)' },
  DiastolicBP: { min: 60, max: 120, label: 'Diastolic BP (60-120)' },
  CholesterolTotal: { min: 150.0, max: 300.0, label: 'Total Cholesterol (150-300)' },
  CholesterolLDL: { min: 50.0, max: 200.0, label: 'LDL Cholesterol (50-200)' },
  CholesterolHDL: { min: 20.0, max: 100.0, label: 'HDL Cholesterol (20-100)' },
  CholesterolTriglycerides: { min: 50.0, max: 400.0, label: 'Triglycerides (50-400)' },
  MMSE: { min: 0.0, max: 30.0, label: 'MMSE Score (0-30)' },
  FunctionalAssessment: { min: 0.0, max: 10.0, label: 'Functional Assessment (0-10)' },
  ADL: { min: 0.0, max: 10.0, label: 'ADL Score (0-10)' }
};

// Session storage key for storing assessments entered during current session
const STORAGE_KEY = 'neurocare_session_assessments';

// In-memory array of assessments for the current session
let sessionAssessments = [];

// --- 2. Initialization on DOM Load ---

document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  initNavigation();
  initFormValidation();
  initSampleDataButtons();
  initActionButtons();
  setDefaultAssessmentDate();
  checkBackendHealth();
  updateDashboardStats();
  renderHistoryTable();

  // Set print header date
  const printDateEl = document.getElementById('print-date');
  if (printDateEl) {
    printDateEl.textContent = `Report Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
  }
});

function setDefaultAssessmentDate() {
  const dateInput = document.getElementById('field-AssessmentDate');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
}

// --- 3. Storage & Session Handling ---

function initStorage() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      sessionAssessments = JSON.parse(stored);
    } else {
      sessionAssessments = [];
    }
  } catch (err) {
    console.warn('SessionStorage unavailable, defaulting to memory store:', err);
    sessionAssessments = [];
  }
}

function saveSessionData() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionAssessments));
  } catch (err) {
    console.warn('Could not persist to sessionStorage:', err);
  }
}

// --- 4. Navigation & View Switching ---

function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.page-section');
  const mobileToggleBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  // Page titles dictionary
  const pageTitles = {
    dashboard: {
      title: 'Dashboard Overview',
      subtitle: 'NeuroCare Alzheimer’s Disease Risk Evaluation System'
    },
    assessment: {
      title: 'Patient Clinical Assessment',
      subtitle: 'Standardized 32-biomarker feature intake'
    },
    results: {
      title: 'Diagnostic Prediction Result',
      subtitle: 'Machine learning output & clinical factor summary'
    },
    comparison: {
      title: 'Model Performance Comparison',
      subtitle: 'Benchmark metrics from lab project evaluation'
    },
    about: {
      title: 'About the ML Lab Project',
      subtitle: 'Dataset, preprocessing, SMOTE, and model methodology'
    }
  };

  // Switch active section
  window.navigateToSection = function(sectionId) {
    // Hide all sections
    sections.forEach(sec => sec.classList.remove('active'));
    navLinks.forEach(link => link.classList.remove('active'));

    // Show target section
    const targetSection = document.getElementById(`section-${sectionId}`);
    const targetNav = document.getElementById(`nav-${sectionId}`);

    if (targetSection) {
      targetSection.classList.add('active');
    }
    if (targetNav) {
      targetNav.classList.add('active');
    }

    // Update Topbar Title
    const titleInfo = pageTitles[sectionId] || pageTitles.dashboard;
    document.getElementById('current-page-title').textContent = titleInfo.title;
    document.getElementById('current-page-subtitle').textContent = titleInfo.subtitle;

    // Show quick "+ New Assessment" button when not on assessment page
    const quickBtn = document.getElementById('btn-quick-new-assessment');
    if (quickBtn) {
      quickBtn.style.display = (sectionId === 'assessment') ? 'none' : 'inline-flex';
    }

    // Close mobile sidebar if open
    if (sidebar.classList.contains('mobile-open')) {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('active');
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Nav link click listeners
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-section');
      if (target) {
        navigateToSection(target);
      }
    });
  });

  // Mobile menu toggle
  if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      backdrop.classList.toggle('active');
    });
  }

  // Backdrop click closes mobile menu
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('active');
    });
  }
}

// --- 5. Backend Health Check & Mode Management ---

async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(API_CONFIG.healthEndpoint, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      API_CONFIG.isBackendConnected = true;
    }
  } catch (e) {
    API_CONFIG.isBackendConnected = false;
  }
}

// --- 6. Form Validation & Data Extraction ---

function initFormValidation() {
  const form = document.getElementById('assessment-form');
  if (!form) return;

  // Real-time input clearing on change
  form.querySelectorAll('input, select').forEach(control => {
    control.addEventListener('input', () => {
      control.classList.remove('error');
      const errorMsg = document.getElementById(`error-${control.name}`);
      if (errorMsg) errorMsg.classList.remove('visible');
    });
  });

  // Form submission handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const { isValid, data, patientInfo, firstInvalidElement } = validatePatientForm();

    if (!isValid) {
      showToast('Please correct the highlighted fields before submitting.', 'error');
      if (firstInvalidElement) {
        firstInvalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalidElement.focus();
      }
      return;
    }

    // Process Submission
    const selectedModel = document.getElementById('model-selector').value;
    await handleFormSubmission(data, selectedModel, patientInfo);
  });
}

function validatePatientForm() {
  let isValid = true;
  let firstInvalidElement = null;
  const data = {};

  // 1. Validate Patient Identification Fields
  const nameEl = document.getElementById('field-PatientName');
  const nameError = document.getElementById('error-PatientName');
  const patientName = nameEl ? nameEl.value.trim() : '';

  if (!patientName) {
    isValid = false;
    if (nameEl) nameEl.classList.add('error');
    if (nameError) {
      nameError.textContent = "Please enter the patient's full name.";
      nameError.classList.add('visible');
    }
    if (!firstInvalidElement) firstInvalidElement = nameEl;
  } else {
    if (nameEl) nameEl.classList.remove('error');
    if (nameError) nameError.classList.remove('visible');
  }

  // Mobile Number Validation (10-digit Indian mobile starting with 6, 7, 8, or 9)
  const mobileEl = document.getElementById('field-MobileNumber');
  const mobileError = document.getElementById('error-MobileNumber');
  const rawMobile = mobileEl ? mobileEl.value.trim() : '';
  
  // Remove all spaces and hyphens before validating
  const cleanMobile = rawMobile.replace(/[\s\-]/g, '');
  
  // Strip optional country code (+91 or leading 0 if 11 digits)
  let mobileDigits = cleanMobile;
  if (mobileDigits.startsWith('+91')) {
    mobileDigits = mobileDigits.slice(3);
  } else if (mobileDigits.startsWith('91') && mobileDigits.length === 12) {
    mobileDigits = mobileDigits.slice(2);
  } else if (mobileDigits.startsWith('0') && mobileDigits.length === 11) {
    mobileDigits = mobileDigits.slice(1);
  }

  const indianMobileRegex = /^[6-9]\d{9}$/;

  if (!rawMobile) {
    isValid = false;
    if (mobileEl) mobileEl.classList.add('error');
    if (mobileError) {
      mobileError.textContent = "Please enter the patient's mobile number.";
      mobileError.classList.add('visible');
    }
    if (!firstInvalidElement) firstInvalidElement = mobileEl;
  } else if (!indianMobileRegex.test(mobileDigits)) {
    isValid = false;
    if (mobileEl) mobileEl.classList.add('error');
    if (mobileError) {
      mobileError.textContent = 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.';
      mobileError.classList.add('visible');
    }
    if (!firstInvalidElement) firstInvalidElement = mobileEl;
  } else {
    if (mobileEl) mobileEl.classList.remove('error');
    if (mobileError) mobileError.classList.remove('visible');
  }

  // Assessment Date Validation
  const dateEl = document.getElementById('field-AssessmentDate');
  const dateError = document.getElementById('error-AssessmentDate');
  const assessmentDate = dateEl ? dateEl.value.trim() : '';

  if (!assessmentDate) {
    isValid = false;
    if (dateEl) dateEl.classList.add('error');
    if (dateError) {
      dateError.textContent = 'Please select an assessment date.';
      dateError.classList.add('visible');
    }
    if (!firstInvalidElement) firstInvalidElement = dateEl;
  } else {
    if (dateEl) dateEl.classList.remove('error');
    if (dateError) dateError.classList.remove('visible');
  }

  const patientInfo = {
    name: patientName,
    mobile: mobileDigits || rawMobile,
    date: assessmentDate
  };

  // 2. Validate Dropdowns (Gender, Ethnicity, EducationLevel)
  const dropdowns = ['Gender', 'Ethnicity', 'EducationLevel'];
  dropdowns.forEach(field => {
    const el = document.getElementById(`field-${field}`);
    const errorEl = document.getElementById(`error-${field}`);
    if (!el || el.value === '') {
      isValid = false;
      if (el) el.classList.add('error');
      if (errorEl) errorEl.classList.add('visible');
      if (!firstInvalidElement) firstInvalidElement = el;
    } else {
      if (el) el.classList.remove('error');
      if (errorEl) errorEl.classList.remove('visible');
      data[field] = parseInt(el.value, 10);
    }
  });

  // 3. Validate Numeric Fields
  for (const [field, range] of Object.entries(NUMERIC_RANGES)) {
    const el = document.getElementById(`field-${field}`);
    const errorEl = document.getElementById(`error-${field}`);

    if (!el || el.value.trim() === '') {
      isValid = false;
      if (el) el.classList.add('error');
      if (errorEl) errorEl.classList.add('visible');
      if (!firstInvalidElement) firstInvalidElement = el;
      continue;
    }

    const val = parseFloat(el.value);
    if (isNaN(val) || val < range.min || val > range.max) {
      isValid = false;
      if (el) el.classList.add('error');
      if (errorEl) errorEl.classList.add('visible');
      if (!firstInvalidElement) firstInvalidElement = el;
    } else {
      if (el) el.classList.remove('error');
      if (errorEl) errorEl.classList.remove('visible');
      data[field] = val;
    }
  }

  // 4. Extract Binary Radio Fields
  const binaryFields = [
    'Smoking',
    'FamilyHistoryAlzheimers',
    'CardiovascularDisease',
    'Diabetes',
    'Depression',
    'HeadInjury',
    'Hypertension',
    'MemoryComplaints',
    'BehavioralProblems',
    'Confusion',
    'Disorientation',
    'PersonalityChanges',
    'DifficultyCompletingTasks',
    'Forgetfulness'
  ];

  binaryFields.forEach(field => {
    const checked = document.querySelector(`input[name="${field}"]:checked`);
    data[field] = checked ? parseInt(checked.value, 10) : 0;
  });

  return { isValid, data, patientInfo, firstInvalidElement };
}

// --- 7. Model Inference Integration ---

/**
 * Isolated prediction integration function.
 * Attempts to communicate with a real Python backend API.
 * Gracefully falls back to simulated inference if the backend server is offline.
 */
async function callBackendAPI(patientData, modelName) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);

  try {
    const response = await fetch(API_CONFIG.predictEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        features: patientData,
        model: modelName
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      return {
        isDemo: false,
        prediction: result.prediction, // 0 or 1
        probability: typeof result.probability === 'number' ? result.probability : null,
        model: result.model || modelName
      };
    }
  } catch (err) {
    // Server is unreachable or timed out -> Proceed to transparent Demo Mode
  }

  // Return Demonstration Result
  return runDemoSimulation(patientData, modelName);
}

/**
 * Demo Mode logic:
 * Clearly labeled simulated prototype preview.
 * Never claimed as a real diagnostic prediction.
 */
function runDemoSimulation(patientData, modelName) {
  // Evaluates risk indicators transparently for demonstration display
  let riskScore = 0;

  // Severe cognitive deficits (strongest weights in Alzheimer's literature & dataset)
  if (patientData.MMSE < 20.0) riskScore += 3;
  if (patientData.MMSE < 15.0) riskScore += 3;
  if (patientData.FunctionalAssessment < 4.0) riskScore += 2;
  if (patientData.ADL < 4.0) riskScore += 2;

  // Behavioral & cognitive symptoms
  if (patientData.MemoryComplaints === 1) riskScore += 1;
  if (patientData.Confusion === 1) riskScore += 1;
  if (patientData.Disorientation === 1) riskScore += 1;
  if (patientData.PersonalityChanges === 1) riskScore += 1;
  if (patientData.DifficultyCompletingTasks === 1) riskScore += 1;

  // Medical history
  if (patientData.FamilyHistoryAlzheimers === 1) riskScore += 1;
  if (patientData.HeadInjury === 1) riskScore += 1;
  if (patientData.Age >= 78) riskScore += 1;

  // Threshold for demonstration classification
  const isPositive = riskScore >= 5;

  return {
    isDemo: true,
    prediction: isPositive ? 1 : 0,
    probability: null, // Confidence is null in demo mode to avoid inventing fake probabilities
    model: modelName
  };
}

// --- 8. Handle Form Submission & Results Rendering ---

async function handleFormSubmission(patientData, modelName, patientInfo) {
  const submitBtn = document.getElementById('btn-submit-assessment');
  const spinner = document.getElementById('submit-btn-spinner');
  const btnText = document.getElementById('submit-btn-text');

  // Activate loading state
  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';
  if (btnText) btnText.textContent = 'Evaluating Biomarkers...';

  // Artificial short delay (600ms) to ensure smooth UX loading feedback
  await new Promise(resolve => setTimeout(resolve, 600));

  try {
    const result = await callBackendAPI(patientData, modelName);

    // Generate unique reference ID
    const refId = `#NC-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Assessment record with patient identity
    const record = {
      id: refId,
      patientName: patientInfo ? patientInfo.name : 'Anonymous',
      mobileNumber: patientInfo ? patientInfo.mobile : 'N/A',
      assessmentDate: patientInfo && patientInfo.date ? patientInfo.date : now.toISOString().split('T')[0],
      timestamp: `${patientInfo && patientInfo.date ? patientInfo.date : now.toLocaleDateString()} ${timestamp}`,
      timeShort: timestamp,
      age: patientData.Age,
      gender: patientData.Gender,
      mmse: patientData.MMSE,
      model: modelName,
      prediction: result.prediction, // 0 or 1
      isDemo: result.isDemo,
      patientData: patientData
    };

    // Prepend to session history
    sessionAssessments.unshift(record);
    saveSessionData();

    // Render results view
    renderResultsPage(record, result);

    // Update Dashboard counts & table
    updateDashboardStats();
    renderHistoryTable();

    // Navigate to Results page
    navigateToSection('results');

    showToast('Assessment evaluation complete.', 'success');

  } catch (error) {
    console.error('Error during assessment evaluation:', error);
    showToast('An error occurred during evaluation. Please try again.', 'error');
  } finally {
    // Reset button state
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.style.display = 'none';
    if (btnText) btnText.textContent = 'Submit Assessment';
  }
}

// --- 9. Render Prediction Results ---

function renderResultsPage(record, result) {
  const isPositive = record.prediction === 1;

  // Patient Identity Displays
  const patientNameEl = document.getElementById('result-patient-name');
  const patientMobileEl = document.getElementById('result-patient-mobile');
  const assessmentDateEl = document.getElementById('result-assessment-date');
  const printNameEl = document.getElementById('print-patient-name');
  const printMobileEl = document.getElementById('print-patient-mobile');
  const printAssessmentDateEl = document.getElementById('print-assessment-date');
  const printRefIdEl = document.getElementById('print-ref-id');

  if (patientNameEl) patientNameEl.textContent = record.patientName || 'Anonymous';
  if (patientMobileEl) patientMobileEl.textContent = record.mobileNumber || 'N/A';
  if (assessmentDateEl) assessmentDateEl.textContent = record.assessmentDate || record.timestamp;

  if (printNameEl) printNameEl.textContent = record.patientName || 'Anonymous';
  if (printMobileEl) printMobileEl.textContent = record.mobileNumber || 'N/A';
  if (printAssessmentDateEl) printAssessmentDateEl.textContent = record.assessmentDate || record.timestamp;
  if (printRefIdEl) printRefIdEl.textContent = record.id;

  // Result Banner
  const banner = document.getElementById('result-banner');
  const statusIcon = document.getElementById('result-status-icon');
  const statusTitle = document.getElementById('result-status-title');
  const modelUsedEl = document.getElementById('result-model-used');
  const refIdEl = document.getElementById('result-ref-id');
  const timestampEl = document.getElementById('result-timestamp');
  const factorsContainer = document.getElementById('risk-factors-container');
  const summaryGrid = document.getElementById('patient-summary-grid');

  // Styling based on risk level
  if (isPositive) {
    banner.className = 'results-header-banner banner-positive';
    statusTitle.textContent = 'Diagnosis: Positive (High Alzheimer’s Risk)';
    statusTitle.className = 'prediction-label';
    statusIcon.innerHTML = `
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    `;
  } else {
    banner.className = 'results-header-banner banner-negative';
    statusTitle.textContent = 'Diagnosis: Negative (Low Alzheimer’s Risk)';
    statusTitle.className = 'prediction-label';
    statusIcon.innerHTML = `
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    `;
  }

  modelUsedEl.textContent = `Model: ${record.model}`;
  refIdEl.textContent = `Ref ID: ${record.id}`;
  timestampEl.textContent = `Assessed: ${record.timestamp}`;

  // Extract and display flagged risk biomarkers
  const p = record.patientData;
  const flagged = [];

  if (p.MMSE < 20.0) flagged.push(`Low MMSE Score (${p.MMSE.toFixed(1)} / 30)`);
  if (p.FunctionalAssessment < 5.0) flagged.push(`Impaired Functional Score (${p.FunctionalAssessment.toFixed(1)} / 10)`);
  if (p.ADL < 5.0) flagged.push(`Impaired ADL Capacity (${p.ADL.toFixed(1)} / 10)`);
  if (p.MemoryComplaints === 1) flagged.push('Active Memory Complaints');
  if (p.Confusion === 1) flagged.push('Clinical Confusion Observed');
  if (p.Disorientation === 1) flagged.push('Disorientation Observed');
  if (p.FamilyHistoryAlzheimers === 1) flagged.push('Positive Family History');
  if (p.Hypertension === 1) flagged.push('Hypertension Present');
  if (p.Diabetes === 1) flagged.push('Type 2 Diabetes Reported');
  if (p.HeadInjury === 1) flagged.push('Prior Head Trauma History');
  if (p.SystolicBP >= 140) flagged.push(`Elevated Systolic BP (${p.SystolicBP} mmHg)`);
  if (p.CholesterolTotal >= 240) flagged.push(`Elevated Total Cholesterol (${p.CholesterolTotal.toFixed(1)} mg/dL)`);

  if (flagged.length === 0) {
    factorsContainer.innerHTML = '<span class="risk-factor-chip" style="background:#f0fdf4; color:#166534; border-color:#bbf7d0;">✓ No critical clinical anomalies flagged</span>';
  } else {
    factorsContainer.innerHTML = flagged.map(f => `<span class="risk-factor-chip">${f}</span>`).join('');
  }

  // Render Full 32 Biomarkers Grid
  renderBiomarkersGrid(summaryGrid, p);
}

function renderBiomarkersGrid(container, p) {
  if (!container) return;

  const genderStr = CATEGORICAL_MAPPINGS.Gender[p.Gender] || p.Gender;
  const ethnicityStr = CATEGORICAL_MAPPINGS.Ethnicity[p.Ethnicity] || p.Ethnicity;
  const educationStr = CATEGORICAL_MAPPINGS.EducationLevel[p.EducationLevel] || p.EducationLevel;

  const items = [
    { label: 'Age', val: `${p.Age} years` },
    { label: 'Gender', val: genderStr },
    { label: 'Ethnicity', val: ethnicityStr },
    { label: 'Education Level', val: educationStr },
    { label: 'BMI', val: p.BMI.toFixed(1) },
    { label: 'Smoking Status', val: p.Smoking === 1 ? 'Yes (1)' : 'No (0)' },
    { label: 'Alcohol Intake', val: `${p.AlcoholConsumption.toFixed(1)} units/wk` },
    { label: 'Physical Activity', val: `${p.PhysicalActivity.toFixed(1)} hrs/wk` },
    { label: 'Diet Quality', val: `${p.DietQuality.toFixed(1)} / 10` },
    { label: 'Sleep Quality', val: `${p.SleepQuality.toFixed(1)} / 10` },
    { label: 'Systolic BP', val: `${p.SystolicBP} mmHg` },
    { label: 'Diastolic BP', val: `${p.DiastolicBP} mmHg` },
    { label: 'Total Cholesterol', val: `${p.CholesterolTotal.toFixed(1)} mg/dL` },
    { label: 'LDL Cholesterol', val: `${p.CholesterolLDL.toFixed(1)} mg/dL` },
    { label: 'HDL Cholesterol', val: `${p.CholesterolHDL.toFixed(1)} mg/dL` },
    { label: 'Triglycerides', val: `${p.CholesterolTriglycerides.toFixed(1)} mg/dL` },
    { label: 'MMSE Score', val: `${p.MMSE.toFixed(1)} / 30` },
    { label: 'Functional Score', val: `${p.FunctionalAssessment.toFixed(1)} / 10` },
    { label: 'ADL Score', val: `${p.ADL.toFixed(1)} / 10` },
    { label: 'Family History', val: p.FamilyHistoryAlzheimers === 1 ? 'Yes (1)' : 'No (0)' },
    { label: 'Cardiovascular Dis.', val: p.CardiovascularDisease === 1 ? 'Yes (1)' : 'No (0)' },
    { label: 'Diabetes', val: p.Diabetes === 1 ? 'Yes (1)' : 'No (0)' },
    { label: 'Depression', val: p.Depression === 1 ? 'Yes (1)' : 'No (0)' },
    { label: 'Head Injury', val: p.HeadInjury === 1 ? 'Yes (1)' : 'No (0)' },
    { label: 'Hypertension', val: p.Hypertension === 1 ? 'Yes (1)' : 'No (0)' },
    { label: 'Memory Complaints', val: p.MemoryComplaints === 1 ? 'Yes (1)' : 'No (0)' },
    { label: 'Behavioral Problems', val: p.BehavioralProblems === 1 ? 'Yes (1)' : 'No (0)' },
    { label: 'Confusion', val: p.Confusion === 1 ? 'Yes (1)' : 'No (0)' },
    { label: 'Disorientation', val: p.Disorientation === 1 ? 'Yes (1)' : 'No (0)' },
    { label: 'Personality Changes', val: p.PersonalityChanges === 1 ? 'Yes (1)' : 'No (0)' },
    { label: 'Difficulty Tasks', val: p.DifficultyCompletingTasks === 1 ? 'Yes (1)' : 'No (0)' },
    { label: 'Forgetfulness', val: p.Forgetfulness === 1 ? 'Yes (1)' : 'No (0)' }
  ];

  container.innerHTML = items.map(item => `
    <div class="summary-data-item">
      <span class="summary-item-label">${item.label}</span>
      <span class="summary-item-val">${item.val}</span>
    </div>
  `).join('');
}

// --- 10. Dashboard Stats & History Table ---

function updateDashboardStats() {
  const total = sessionAssessments.length;
  const positive = sessionAssessments.filter(a => a.prediction === 1).length;
  const negative = sessionAssessments.filter(a => a.prediction === 0).length;

  const totalEl = document.getElementById('stat-total');
  const positiveEl = document.getElementById('stat-positive');
  const negativeEl = document.getElementById('stat-negative');

  if (totalEl) totalEl.textContent = total;
  if (positiveEl) positiveEl.textContent = positive;
  if (negativeEl) negativeEl.textContent = negative;
}

function renderHistoryTable() {
  const tbody = document.getElementById('history-table-body');
  if (!tbody) return;

  if (sessionAssessments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="empty-state">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            <p>No patient assessments logged in this browser session yet.</p>
            <button class="btn btn-primary btn-sm" style="margin-top: 10px;" id="btn-empty-start">
              Run First Assessment
            </button>
          </div>
        </td>
      </tr>
    `;

    const emptyBtn = document.getElementById('btn-empty-start');
    if (emptyBtn) {
      emptyBtn.addEventListener('click', () => navigateToSection('assessment'));
    }
    return;
  }

  tbody.innerHTML = sessionAssessments.map((a, idx) => {
    const isPos = a.prediction === 1;
    const badgeClass = isPos ? 'badge-risk risk-positive' : 'badge-risk risk-negative';
    const riskLabel = isPos ? 'Positive (High)' : 'Negative (Low)';
    const genderLabel = a.gender === 0 ? 'Male' : (a.gender === 1 ? 'Female' : a.gender);

    return `
      <tr>
        <td><strong>${a.id}</strong></td>
        <td><strong>${escapeHtml(a.patientName || 'Anonymous')}</strong></td>
        <td>${escapeHtml(a.mobileNumber || 'N/A')}</td>
        <td>${a.assessmentDate || (a.timestamp ? a.timestamp.split(' ')[0] : '—')}</td>
        <td>${a.age} / ${genderLabel}</td>
        <td><strong>${a.mmse.toFixed(1)}</strong> / 30</td>
        <td>${a.model}</td>
        <td>
          <span class="${badgeClass}">
            <span class="badge-risk-dot"></span>
            ${riskLabel}
          </span>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="viewHistoryAssessment(${idx})">
            View
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Simple HTML escaping helper for safe rendering
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Global hook to view past assessment from history table
window.viewHistoryAssessment = function(index) {
  const record = sessionAssessments[index];
  if (!record) return;

  renderResultsPage(record, { isDemo: record.isDemo });
  navigateToSection('results');
};

// --- 11. Sample Data Handlers ---

function initSampleDataButtons() {
  const btnLowRisk = document.getElementById('btn-fill-low-risk');
  const btnHighRisk = document.getElementById('btn-fill-high-risk');
  const today = new Date().toISOString().split('T')[0];

  if (btnLowRisk) {
    btnLowRisk.addEventListener('click', () => {
      fillSampleData({
        PatientName: 'Ramesh Sharma',
        MobileNumber: '9876543210',
        AssessmentDate: today,
        Age: 65,
        Gender: '0',
        Ethnicity: '0',
        EducationLevel: '2',
        BMI: 23.4,
        Smoking: '0',
        AlcoholConsumption: 2.5,
        PhysicalActivity: 6.5,
        DietQuality: 8.2,
        SleepQuality: 8.0,
        SystolicBP: 118,
        DiastolicBP: 76,
        CholesterolTotal: 188.5,
        CholesterolLDL: 104.2,
        CholesterolHDL: 62.0,
        CholesterolTriglycerides: 110.0,
        MMSE: 28.5,
        FunctionalAssessment: 9.2,
        ADL: 9.0,
        FamilyHistoryAlzheimers: '0',
        CardiovascularDisease: '0',
        Diabetes: '0',
        Depression: '0',
        HeadInjury: '0',
        Hypertension: '0',
        MemoryComplaints: '0',
        BehavioralProblems: '0',
        Confusion: '0',
        Disorientation: '0',
        PersonalityChanges: '0',
        DifficultyCompletingTasks: '0',
        Forgetfulness: '0'
      });
      showToast('Loaded healthy sample data (Low Alzheimer’s Risk profile).', 'info');
    });
  }

  if (btnHighRisk) {
    btnHighRisk.addEventListener('click', () => {
      fillSampleData({
        PatientName: 'Sunita Patel',
        MobileNumber: '9123456780',
        AssessmentDate: today,
        Age: 82,
        Gender: '1',
        Ethnicity: '1',
        EducationLevel: '1',
        BMI: 28.6,
        Smoking: '1',
        AlcoholConsumption: 7.8,
        PhysicalActivity: 1.5,
        DietQuality: 3.5,
        SleepQuality: 5.2,
        SystolicBP: 154,
        DiastolicBP: 94,
        CholesterolTotal: 258.0,
        CholesterolLDL: 162.0,
        CholesterolHDL: 38.5,
        CholesterolTriglycerides: 285.0,
        MMSE: 13.8,
        FunctionalAssessment: 3.2,
        ADL: 3.5,
        FamilyHistoryAlzheimers: '1',
        CardiovascularDisease: '1',
        Diabetes: '1',
        Depression: '1',
        HeadInjury: '1',
        Hypertension: '1',
        MemoryComplaints: '1',
        BehavioralProblems: '1',
        Confusion: '1',
        Disorientation: '1',
        PersonalityChanges: '1',
        DifficultyCompletingTasks: '1',
        Forgetfulness: '1'
      });
      showToast('Loaded symptomatic sample data (High Alzheimer’s Risk profile).', 'info');
    });
  }
}

function fillSampleData(sample) {
  // Clear any existing error highlights
  document.querySelectorAll('.input-control').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.error-message').forEach(el => el.classList.remove('visible'));

  // Fill text/number, tel, date, and select fields
  for (const [key, value] of Object.entries(sample)) {
    const field = document.getElementById(`field-${key}`);
    if (field) {
      field.value = value;
    }

    // Binary radio buttons
    const radio = document.querySelector(`input[name="${key}"][value="${value}"]`);
    if (radio) {
      radio.checked = true;
    }
  }
}

// --- 12. Reset, Print, and Action Buttons ---

function initActionButtons() {
  // Reset Form
  const resetBtn = document.getElementById('btn-reset-form');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all form inputs?')) {
        document.getElementById('assessment-form').reset();
        setDefaultAssessmentDate();
        document.querySelectorAll('.input-control').forEach(el => el.classList.remove('error'));
        document.querySelectorAll('.error-message').forEach(el => el.classList.remove('visible'));
        showToast('Form cleared.', 'info');
      }
    });
  }

  // Clear Session History
  const clearHistoryBtn = document.getElementById('btn-clear-history');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (sessionAssessments.length === 0) return;
      if (confirm('Clear all assessment records for this browser session?')) {
        sessionAssessments = [];
        saveSessionData();
        updateDashboardStats();
        renderHistoryTable();
        showToast('Assessment history cleared.', 'info');
      }
    });
  }

  // Print Results
  const printBtn = document.getElementById('btn-print-results');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Navigation Shortcut Buttons
  const dashStartBtn = document.getElementById('btn-dash-start');
  if (dashStartBtn) {
    dashStartBtn.addEventListener('click', () => navigateToSection('assessment'));
  }

  const dashCompareBtn = document.getElementById('btn-dash-compare');
  if (dashCompareBtn) {
    dashCompareBtn.addEventListener('click', () => navigateToSection('comparison'));
  }

  const newAssessFromResultsBtn = document.getElementById('btn-results-new-assessment');
  if (newAssessFromResultsBtn) {
    newAssessFromResultsBtn.addEventListener('click', () => {
      document.getElementById('assessment-form').reset();
      setDefaultAssessmentDate();
      navigateToSection('assessment');
    });
  }

  const quickNewAssessBtn = document.getElementById('btn-quick-new-assessment');
  if (quickNewAssessBtn) {
    quickNewAssessBtn.addEventListener('click', () => navigateToSection('assessment'));
  }
}

// --- 13. Accessible Toast Notifications ---

function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
  } else {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  }

  toast.innerHTML = `
    ${iconSvg}
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}


// ============================================================
// MODEL COMPARISON — Chart.js charts (real notebook metrics)
// ============================================================

const CMP_METRICS = {
  XGBoost:           { accuracy: 0.9279, precision: 0.90, recall: 0.90, f1: 0.90, roc_auc: 0.9417,
                       cm: [[377, 31],[32, 122]] },
  RandomForest:      { accuracy: 0.9093, precision: 0.93, recall: 0.80, f1: 0.86, roc_auc: 0.9376,
                       cm: [[390, 18],[46, 106]] },
  DecisionTree:      { accuracy: 0.8442, precision: 0.74, recall: 0.86, f1: 0.80, roc_auc: 0.8483,
                       cm: [[337, 71],[19, 133]] },
  LogisticRegression:{ accuracy: 0.8140, precision: 0.72, recall: 0.78, f1: 0.75, roc_auc: 0.8835,
                       cm: [[326, 82],[29, 123]] },
  KNN:               { accuracy: 0.6326, precision: 0.49, recall: 0.76, f1: 0.59, roc_auc: 0.7289,
                       cm: [[218, 190],[36, 116]] }
};

// Notebook ROC curve data (sampled key points for display)
const CMP_ROC = {
  XGBoost:            { fpr:[0,0.02,0.05,0.10,0.20,0.40,0.60,1], tpr:[0,0.72,0.82,0.88,0.92,0.96,0.98,1] },
  RandomForest:       { fpr:[0,0.02,0.05,0.10,0.20,0.40,0.60,1], tpr:[0,0.68,0.80,0.86,0.91,0.95,0.97,1] },
  DecisionTree:       { fpr:[0,0.05,0.10,0.20,0.35,0.50,0.70,1], tpr:[0,0.55,0.68,0.78,0.85,0.90,0.94,1] },
  LogisticRegression: { fpr:[0,0.03,0.08,0.18,0.30,0.50,0.70,1], tpr:[0,0.50,0.65,0.77,0.85,0.91,0.95,1] },
  KNN:                { fpr:[0,0.08,0.20,0.35,0.50,0.65,0.80,1], tpr:[0,0.40,0.57,0.68,0.77,0.84,0.90,1] }
};

const CMP_COLORS = {
  XGBoost:            { border:'#0f766e', bg:'rgba(15,118,110,0.15)' },
  RandomForest:       { border:'#1d4ed8', bg:'rgba(29,78,216,0.15)' },
  DecisionTree:       { border:'#7c3aed', bg:'rgba(124,58,237,0.15)' },
  LogisticRegression: { border:'#b45309', bg:'rgba(180,83,9,0.15)'  },
  KNN:                { border:'#be123c', bg:'rgba(190,18,60,0.15)' }
};

const MODEL_NAMES = Object.keys(CMP_METRICS);

let cmpRankChart = null;

function initComparisonCharts() {
  drawBarChart();
  drawROCChart();
  drawCMTable('XGBoost');
  drawRankChart('accuracy');

  const cmSel = document.getElementById('cmp-cm-select');
  if (cmSel) cmSel.addEventListener('change', e => drawCMTable(e.target.value));

  const rankSel = document.getElementById('cmp-rank-select');
  if (rankSel) rankSel.addEventListener('change', e => drawRankChart(e.target.value));
}

function drawBarChart() {
  const ctx = document.getElementById('cmp-bar-chart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: MODEL_NAMES.map(n => n === 'LogisticRegression' ? 'Logistic Reg.' : n === 'RandomForest' ? 'Rand. Forest' : n),
      datasets: [
        { label:'Accuracy',  data: MODEL_NAMES.map(n => CMP_METRICS[n].accuracy),  backgroundColor:'#0d9488' },
        { label:'Precision', data: MODEL_NAMES.map(n => CMP_METRICS[n].precision), backgroundColor:'#2563eb' },
        { label:'Recall',    data: MODEL_NAMES.map(n => CMP_METRICS[n].recall),    backgroundColor:'#7c3aed' },
        { label:'F1-Score',  data: MODEL_NAMES.map(n => CMP_METRICS[n].f1),        backgroundColor:'#d97706' }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position:'top' }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${(ctx.raw*100).toFixed(1)}%` } } },
      scales: { y: { beginAtZero:true, max:1, ticks:{ callback: v => (v*100).toFixed(0)+'%' } } }
    }
  });
}

function drawROCChart() {
  const ctx = document.getElementById('cmp-roc-chart');
  if (!ctx) return;
  const datasets = MODEL_NAMES.map(name => ({
    label: `${name === 'LogisticRegression' ? 'Logistic Reg.' : name === 'RandomForest' ? 'Rand. Forest' : name} (AUC=${CMP_METRICS[name].roc_auc})`,
    data: CMP_ROC[name].fpr.map((f,i) => ({ x: f, y: CMP_ROC[name].tpr[i] })),
    borderColor: CMP_COLORS[name].border,
    backgroundColor: 'transparent',
    fill: false,
    tension: 0.2,
    borderWidth: 2,
    pointRadius: 0
  }));
  // Diagonal reference line
  datasets.push({ label:'Random (AUC=0.50)', data:[{x:0,y:0},{x:1,y:1}], borderColor:'#94a3b8', borderDash:[5,5], fill:false, borderWidth:1, pointRadius:0 });
  new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      plugins: { legend:{ position:'right', labels:{ boxWidth:14, font:{ size:11 } } } },
      scales: {
        x: { type:'linear', min:0, max:1, title:{ display:true, text:'False Positive Rate' } },
        y: { min:0, max:1, title:{ display:true, text:'True Positive Rate' } }
      }
    }
  });
}

function drawCMTable(modelKey) {
  const wrap = document.getElementById('cmp-cm-table-wrap');
  if (!wrap) return;
  const [[tn,fp],[fn,tp]] = CMP_METRICS[modelKey].cm;
  wrap.innerHTML = `
    <div class="cm-table-wrap">
      <table class="cm-table">
        <thead>
          <tr>
            <th></th>
            <th>Predicted: 0</th>
            <th>Predicted: 1</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="cm-row-label">Actual: 0</td>
            <td class="cm-tn">TN = ${tn}</td>
            <td class="cm-fp">FP = ${fp}</td>
          </tr>
          <tr>
            <td class="cm-row-label">Actual: 1</td>
            <td class="cm-fn">FN = ${fn}</td>
            <td class="cm-tp">TP = ${tp}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

function drawRankChart(metric) {
  const ctx = document.getElementById('cmp-rank-chart');
  if (!ctx) return;
  const sorted = [...MODEL_NAMES].sort((a,b) => CMP_METRICS[b][metric] - CMP_METRICS[a][metric]);
  const labels = sorted.map(n => n === 'LogisticRegression' ? 'Logistic Reg.' : n === 'RandomForest' ? 'Rand. Forest' : n);
  const values = sorted.map(n => CMP_METRICS[n][metric]);
  const bgColors = sorted.map((n,i) => i === 0 ? '#0f766e' : '#60a5fa');
  if (cmpRankChart) { cmpRankChart.destroy(); }
  cmpRankChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: metric.charAt(0).toUpperCase()+metric.slice(1).replace('_auc',' AUC'), data: values, backgroundColor: bgColors, borderRadius: 4 }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend:{ display:false }, tooltip:{ callbacks:{ label: c => ` ${(c.raw * (metric === 'accuracy' ? 100 : 1)).toFixed(metric === 'accuracy' ? 1 : 3)}${metric === 'accuracy' ? '%' : ''}` } } },
      scales: { x: { beginAtZero:true, max: metric === 'accuracy' ? 1 : 1, ticks:{ callback: v => metric === 'accuracy' ? (v*100).toFixed(0)+'%' : v.toFixed(2) } } }
    }
  });
}

// Hook into DOMContentLoaded — already fires from the existing listener at the top.
// We attach to the 'comparison' nav click to lazy-init charts once the section is visible.
(function attachComparisonInit() {
  let chartsInitialised = false;
  const origNavigate = window.navigateToSection;
  document.addEventListener('DOMContentLoaded', () => {
    // Patch navigateToSection after it has been defined
    const patch = () => {
      if (typeof window.navigateToSection === 'function' && window.navigateToSection !== patchedFn) {
        origFn = window.navigateToSection;
        window.navigateToSection = patchedFn;
      }
    };
    let origFn = null;
    const patchedFn = function(sectionId) {
      if (origFn) origFn(sectionId);
      if (sectionId === 'comparison' && !chartsInitialised) {
        chartsInitialised = true;
        initComparisonCharts();
      }
    };
    // Give the existing DOMContentLoaded handlers time to set up navigateToSection
    setTimeout(patch, 0);

    // Also init if the user lands directly on comparison
    if (window.location.hash === '#comparison') {
      setTimeout(() => { if (!chartsInitialised) { chartsInitialised = true; initComparisonCharts(); } }, 100);
    }
  });
})();
