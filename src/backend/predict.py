import sys
import pickle
import json
import numpy as np
from sksurv.ensemble import RandomSurvivalForest

# Load model from file
try:
    with open(sys.argv[1], 'rb') as f:
        model = pickle.load(f)
except Exception as e:
    print(json.dumps({"error": f"Model loading failed: {str(e)}"}))
    sys.exit(1)

# Process input parameters
try:
    gender = int(sys.argv[2])
    age = int(sys.argv[3])
    readmissions = int(sys.argv[4])
    diagnostic_codes = sys.argv[5].split(',')
    
    diagnostic_codes = [int(code) for code in diagnostic_codes]

    # Combine all features
    features = [gender, age, readmissions] + diagnostic_codes
    input_data = np.array([features])

    # Predict survival function
    survival_funcs = model.predict_survival_function(input_data)
    
    # Convert survival function to lists
    time_points = survival_funcs[0].x.tolist()
    survival_probs = survival_funcs[0].y.tolist()

    # Survival and readmission probabilities at 6 months, 12 months, 1 year, 5 year
    survival_6_month = float(survival_funcs[0](180))
    survival_12_month = float(survival_funcs[0](360))  
    readmission_1_year = 1 - float(survival_funcs[0](365))
    readmission_5_year = 1 - float(survival_funcs[0](1825))

    response_data = {
    "survival_curve": {
            "time": time_points,
            "probability": survival_probs
        },
    "survival_6_month": survival_6_month,
    "survival_12_month": survival_12_month,
    "readmission_1_year": readmission_1_year,
    "readmission_5_year": readmission_5_year
    }

    print(json.dumps(response_data))  # Print JSON output

except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)