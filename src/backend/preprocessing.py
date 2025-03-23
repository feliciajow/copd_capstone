from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import pandas as pd
from datetime import datetime, timedelta
import numpy as np
import icd10
from flask import send_file
from lifelines.fitters.coxph_fitter import CoxPHFitter
import pickle 
from sksurv.ensemble import RandomSurvivalForest
from sklearn.model_selection import train_test_split
import psycopg2
import zipfile
from sksurv.util import Surv
import gzip

app = Flask(__name__)
CORS(app, resources={
    r"/fileUpload": {"origins": "http://localhost:3000"},
    r"/train": {"origins": "http://localhost:3000"},
    r"/predict": {"origins": "http://localhost:3000"}
})


UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
OUTPUT_FOLDER = "output"
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
TEMP_DIR = "temp"


DB_CONFIG = {
    "database": "cghdb",
    "user": "postgres",
    "password": "cghrespi",
    "host": "localhost",
    "port": "5432",
}


@app.route("/fileUpload", methods=["POST"])
def death_upload_file():
    
    if "file" not in request.files or request.files["file"].filename == "":
        return jsonify({"message": "No file part in request"}), 400

    file = request.files["file"]
    diagnostic_interest = request.form.get("diagnostic_interest", "J44") 

    print(diagnostic_interest)

    if file.filename == "":
        return jsonify({"message": "No selected file"}), 400

    # Save the file
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    # Read the Excel file into a DataFrame
    raw_df = pd.read_excel(file_path, engine='openpyxl')
    print(raw_df)
    # Function to get description from ICD-10 code
    def get_icd10_description(code):
        node = icd10.find(code)  # Find the ICD-10 code in the hierarchy
        return node.description if node else "Unknown Diagnosis"
    
    today_date = datetime.now()

    # converting Columns related to Time to a Datetime Dtype
    raw_df['Admit/Visit Date/Time'] = pd.to_datetime(raw_df['Admit/Visit Date/Time'])
    raw_df['Discharge Date/Time'] = pd.to_datetime(raw_df['Discharge Date/Time'])
    raw_df['Death Date'] = pd.to_datetime(raw_df['Death Date'])
    raw_df['Date of Birth'] = pd.to_datetime(raw_df['Date of Birth'])

    # we are only looking at Data from 1st Oct 2017 to 1st June 2023
    start_date = pd.Timestamp('2017-10-01')
    # end_date = pd.Timestamp('2023-06-01')
    raw_df = raw_df[(raw_df['Admit/Visit Date/Time'] >= start_date) & (raw_df['Admit/Visit Date/Time'] <= today_date)]

    # ensure Patient ID is a string and filter for 8-character IDs
    raw_df = raw_df[raw_df['Patient ID'].astype(str).str.len() == 8]

    # Look at Unique patients as a group, followed by Admit Time ranking
    raw_df = raw_df.sort_values(by=['Patient ID', 'Admit/Visit Date/Time'])

    # filter out rows where Date of Birth is greater than Admit/Visit Date/Time
    raw_df =raw_df[raw_df['Date of Birth'] <=raw_df['Admit/Visit Date/Time']]

    # FOR SURVIVAL DURATION (DAYS)
    raw_df['Survival Duration (Days)'] = np.where(
        raw_df['Death Date'].isna(), 
        (today_date - raw_df['Admit/Visit Date/Time']).dt.days,  # If 'death' is NaT, use today_date
        (raw_df['Death Date'] - raw_df['Admit/Visit Date/Time']).dt.days)  # If 'death' has a value, use death date

    raw_df = raw_df[raw_df['Survival Duration (Days)'] >0]

    # FOR AGE
    raw_df['Age'] = np.where(
        raw_df['Death Date'].isna(), 
        round((today_date - raw_df['Date of Birth']).dt.days/365),  # If 'death' is NaT, use today_date
        round((raw_df['Death Date'] - raw_df['Date of Birth']).dt.days/365)
        )  # If 'death' has a value, use death date

    # FOR GENDER
    raw_df['Gender'] = raw_df['Gender'].map({'MALE': 1, 'FEMALE': 0})

    # FOR DEAD (BINARY)
    raw_df["Dead Event"] = raw_df["Death Date"].notna().astype(int)

    # Fill missing secondary diagnosis codes with empty strings for consistency
    raw_df["Secondary Diagnosis Code Concat (Mediclaim)"].fillna("", inplace=True)

    # Combine primary and secondary diagnosis codes into a single column for processing
    raw_df["Combined Diagnoses"] = raw_df["Primary Diagnosis Code (Mediclaim)"] + "," + raw_df["Secondary Diagnosis Code Concat (Mediclaim)"]

    # First, replace any instances of '||' with ',' for consistent splitting.
    raw_df["Combined Diagnoses"] = raw_df["Combined Diagnoses"].str.replace('||', ',', regex=False)

    # Function to accumulate diagnoses over time while keeping any code containing diagnostic_interest at the front
    def accumulate_diagnoses(patient_df, diagnostic_interest):
        accumulated_diagnoses = []
        combined_diagnosis_list = []  # Using a list to maintain order

        for index, row in patient_df.iterrows():
            primary_code = row['Primary Diagnosis Code (Mediclaim)']
            secondary_codes = row['Secondary Diagnosis Code Concat (Mediclaim)']

            # Check if primary diagnosis contains diagnostic_interest
            if pd.notna(primary_code) and diagnostic_interest in primary_code:
                if primary_code in combined_diagnosis_list:
                    combined_diagnosis_list.remove(primary_code)
                combined_diagnosis_list.insert(0, primary_code)  # Move to front

            # Add primary diagnosis if it's not already in the list
            elif pd.notna(primary_code) and primary_code not in combined_diagnosis_list:
                combined_diagnosis_list.append(primary_code)

            # Add secondary diagnoses if present and not already in the list
            if pd.notna(secondary_codes):
                for sec_code in secondary_codes.split('||'):
                    if diagnostic_interest in sec_code:  # Check if it contains diagnostic_interest
                        if sec_code in combined_diagnosis_list:
                            combined_diagnosis_list.remove(sec_code)
                        combined_diagnosis_list.insert(0, sec_code)  # Move to front
                    elif sec_code not in combined_diagnosis_list:
                        combined_diagnosis_list.append(sec_code)

            # Store accumulated diagnoses for this row
            accumulated_diagnoses.append("||".join(combined_diagnosis_list))

        patient_df['Combined Diagnoses'] = accumulated_diagnoses
        return patient_df

    # Apply the function to each patient group
    processed_df = raw_df.groupby('Patient ID', group_keys=False).apply(accumulate_diagnoses, diagnostic_interest)

    # Replace '||' and ',||' with ',' in the 'Combined Diagnoses' column to ensure consistent separation
    processed_df['Combined Diagnoses'] = processed_df['Combined Diagnoses'].replace({'\|\|': ',', ',\|\|': ','}, regex=True)
    processed_df['Combined Diagnoses'] = processed_df['Combined Diagnoses'].replace({',,': ','}, regex=True)

    # Remove trailing commas
    processed_df['Combined Diagnoses'] = processed_df['Combined Diagnoses'].str.rstrip(',')

    # Function to process the "Combined Diagnoses" column to keep only first 3 characters of each diagnosis code
    def process_diagnoses(diagnosis_str):
        diagnoses = diagnosis_str.split(',')
        processed_diagnoses = list(dict.fromkeys([diag[:3] for diag in diagnoses]))  # Remove duplicates while preserving order
        return ','.join(processed_diagnoses)

    # Apply the function to the "Combined Diagnoses" column
    processed_df['Processed Diagnoses'] = processed_df['Combined Diagnoses'].apply(process_diagnoses)
    processed_df = processed_df.drop(columns="Combined Diagnoses")

    # Clean up leading and trailing commas in "Processed Diagnoses"
    processed_df['Processed Diagnoses'] = processed_df['Processed Diagnoses'].str.strip(',')

    processed_df = processed_df[processed_df['Processed Diagnoses'].str.startswith(diagnostic_interest)]

    processed_df = processed_df.drop(columns=["Primary Diagnosis Code (Mediclaim)", "Secondary Diagnosis Code Concat (Mediclaim)"])

    # Filter only inpatient cases
    processed_df = processed_df[processed_df["Case Type Description"] == "Inpatient"]

    # Count readmissions per patient
    readmission_counts = processed_df.groupby("Patient ID").size()

    # Compute time to next admission
    processed_df = processed_df.sort_values(by=["Patient ID", "Admit/Visit Date/Time"])

    death_df = processed_df

    # Add cumulative readmission count per patient
    death_df["Readmission Count"] = death_df.groupby("Patient ID").cumcount() + 1

    # Keep only the last row for each unique Patient ID
    death_df = death_df.groupby("Patient ID").tail(1)

    # Split the truncated diagnosis codes into one-hot encoded columns
    death_diagnosis_dummies_expanded = death_df["Processed Diagnoses"].str.get_dummies(sep=",")

    # Combine 'Patient ID', 'Dead', and the one-hot encoded diagnosis codes
    death_df = pd.concat([death_df[["Gender", "Age", "Dead Event", "Race", "Survival Duration (Days)", "Readmission Count"]], death_diagnosis_dummies_expanded], axis=1)

    # Perform one-hot encoding for the "Race" column
    death_race_dummies_expanded = death_df["Race"].str.get_dummies()

    # Combine 'Patient ID', 'Dead', and the one-hot encoded race columns
    death_df = pd.concat([death_df, death_race_dummies_expanded], axis=1)

    # If you want to drop the original "Race" column (optional)
    death_df = death_df.drop(columns=["Race"])

    # Convert all columns to numeric, forcing errors to NaN if conversion fails
    death_df.iloc[:, 1:] = death_df.iloc[:, 1:].apply(pd.to_numeric, errors='coerce')

    # Summing the values in each column to get the total count of each diagnostic code
    death_diagnostic_code_counts = death_df.iloc[:, 1:].sum(axis=0)

    # Sorting by count in ascending order
    death_diagnostic_code_counts_sorted = death_diagnostic_code_counts.astype(float).sort_values(ascending=True)

    # Ensure diagnostic_interest exists before retrieving count
    if diagnostic_interest in death_diagnostic_code_counts_sorted.index:
        code_count = death_diagnostic_code_counts_sorted[diagnostic_interest]
    else:
        code_count = 0

    # Define a list of columns to preserve
    preserved_columns = ["Race"]

    # Filter the columns based on the threshold, but always include "Race" and "Gender"
    death_valid_codes = death_diagnostic_code_counts_sorted[
        (death_diagnostic_code_counts_sorted >= code_count/100) | 
        (death_diagnostic_code_counts_sorted.index.isin(preserved_columns))
    ].index


    # Define columns to retain
    death_retain_columns = ["Gender", "Age", "Dead Event", "Survival Duration (Days)", "Readmission Count"]

    # Combine valid_codes and retain_columns, ensuring uniqueness with a set
    death_columns_to_keep = list(set(death_valid_codes).union(death_retain_columns))

    # Filter the DataFrame with unique columns
    death_df = death_df[death_columns_to_keep]

    death_diagnostic_drop_df = death_df.drop(columns=["Gender", "Age", "Readmission Count", diagnostic_interest, "EXP"], errors= "ignore")

    # Initialize variables
    death_diagnostic_drop_df_cox = death_diagnostic_drop_df.reset_index(drop=True)  # Reset index
    death_cph_drop = CoxPHFitter(penalizer=0.1)  # Initialize Cox model

    death_cindex_values = []  # Store C-index values
    death_removed_variables = []  # Track removed variables

    death_prev_cindex = 0  # Initial C-index
    death_best_cindex = 0  # Best C-index
    death_best_model = None  # Store best model
    death_best_data = death_diagnostic_drop_df_cox.copy()  # Best dataset

    death_iteration = 1

    while True:
        print(f"\n🔄 **death_Iteration {death_iteration}**")
        
        # Fit the Cox model
        death_cph_drop.fit(death_diagnostic_drop_df_cox, 'Survival Duration (Days)', 'Dead Event')
        
        # Get current C-index
        death_current_cindex = death_cph_drop.concordance_index_
        print(f"C-Index: {death_current_cindex:.4f}")
        
        # Store C-index
        death_cindex_values.append(death_current_cindex)

        # If C-index improves, save model
        if death_current_cindex > death_best_cindex:
            death_best_cindex = death_current_cindex
            death_best_model = death_cph_drop
            death_best_data = death_diagnostic_drop_df_cox.copy()
        else:
            print("⚠️ Stopping: C-index has decreased")
            break  # Stop if C-index drops

        # Identify insignificant variables (p > 0.05)
        death_insignificant_vars = death_cph_drop.summary[death_cph_drop.summary['p'] > 0.05]
        
        if death_insignificant_vars.empty:
            print("No more insignificant variables left. Stopping.")
            break  # Stop if no more variables to remove
        
        # Remove insignificant variables
        insignificant_codes = death_insignificant_vars.index.tolist()
        death_removed_variables.extend(insignificant_codes)
        death_diagnostic_drop_df_cox = death_diagnostic_drop_df_cox.drop(columns=insignificant_codes, errors="ignore")
        
        print(f"Dropped variables: {insignificant_codes}")
        death_iteration += 1

    # Return the best dataset and best model
    death_best_data, death_best_model

    # Store the dropped columns separately
    death_removed_columns = ["Gender", "Age", "Readmission Count"]

    removed_data = death_df[death_removed_columns]  # Store the removed columns

    # Merge back the removed columns into the final dataset
    death_df = pd.concat([removed_data.reset_index(drop=True), death_diagnostic_drop_df_cox.reset_index(drop=True)], axis=1)


    ''' FOR READMISSION '''
    readmission_df = processed_df

    # FOR TIME TO READMISSION (DAYS)
    readmission_df["Next Admit Date"] = readmission_df.groupby("Patient ID")["Admit/Visit Date/Time"].shift(-1)
    readmission_df["Time to Readmission"] = (readmission_df["Next Admit Date"] - readmission_df["Discharge Date/Time"]).dt.days

    # FOR READMISSION (BINARY)
    readmission_df["Readmission Event"] = readmission_df["Time to Readmission"].notna().astype(int)

    readmission_df["Time to Readmission"] = readmission_df["Time to Readmission"].fillna(0)

    # Remove rows where Time to Readmission is negative
    readmission_df = readmission_df[readmission_df["Time to Readmission"] >= 0]

    # Add cumulative readmission count per patient
    readmission_df["Readmission Count"] = readmission_df.groupby("Patient ID").cumcount() + 1

    # Split the truncated diagnosis codes into one-hot encoded columns
    readmission_diagnosis_dummies_expanded = readmission_df["Processed Diagnoses"].str.get_dummies(sep=",")

    # Combine 'Patient ID', 'Dead', and the one-hot encoded diagnosis codes
    readmission_df = pd.concat([readmission_df[["Gender", "Age", "Time to Readmission", "Readmission Event", "Readmission Count"]], readmission_diagnosis_dummies_expanded], axis=1)

    # Store the dropped columns separately
    readmission_removed_columns = ["Gender", "Age", "Readmission Count", "Time to Readmission", "Readmission Event"]

    removed_data = readmission_df[readmission_removed_columns]  # Store the removed columns

    # Identify common columns between readmission_df and death_diagnostic_drop_df_cox
    common_columns = readmission_df.columns.intersection(death_diagnostic_drop_df_cox.columns)

    # Select only these columns from death_diagnostic_drop_df_cox
    matched_death_data = readmission_df[common_columns]

    # Merge back the removed columns into the final dataset, ensuring original values from readmission_df are kept
    readmission_df = pd.concat([removed_data.reset_index(drop=True), matched_death_data.reset_index(drop=True)], axis=1).fillna(0)

    # Process diagnosis codes
    death_output_file = os.path.join(OUTPUT_FOLDER, "death_processed_data.csv")
    read_output_file = os.path.join(OUTPUT_FOLDER, "read_processed_data.csv")

    death_df.to_csv(death_output_file, index=False)
    readmission_df.to_csv(read_output_file, index=False)

    # Create ZIP file path
    zip_output_file = os.path.join(OUTPUT_FOLDER, "processed_data.zip")

    # Create a ZIP archive
    with zipfile.ZipFile(zip_output_file, 'w') as zipf:
        zipf.write(death_output_file, arcname="death_processed_data.csv")
        zipf.write(read_output_file, arcname="read_processed_data.csv")

    # Send the ZIP file as a response
    return send_file(zip_output_file, as_attachment=True)

@app.route("/train", methods=["POST"])
def train():    
    data = request.get_json()
    model_name = data.get("modelName", "default_model")
    print(f"Model Name: {model_name}")

    # Connect to database 
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    # Fetch userid and email from users table
    cur.execute("SELECT userid, email FROM users")
    users = cur.fetchall()

    if not users:
        raise Exception("User not found in the database.")

    for userid, email in users:
        print(f"User Found - ID: {userid}, Email: {email}")

     # Load dataset
    # Define paths
    zip_file_path = "output/processed_data.zip"
    extract_folder = "output/extracted_files"

    # Ensure the extraction folder exists
    os.makedirs(extract_folder, exist_ok=True)

    # Unzip the file
    with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
        zip_ref.extractall(extract_folder)  # Extract all files

    # Load the extracted CSV files into DataFrames
    death_df = pd.read_csv(os.path.join(extract_folder, "death_processed_data.csv"))
    readmission_df = pd.read_csv(os.path.join(extract_folder, "read_processed_data.csv"))

    # Print DataFrames
    print(f"Death DataFrame:\n{death_df}")
    print(f"Readmission DataFrame:\n{readmission_df}")

    # Convert event and time columns into a structured survival array
    # data_y = df.apply(lambda row: (row["Dead"] == 1, row["Survival Duration (Days)"]), axis=1).to_numpy(dtype=[("Dead", "?"), ("Survival Duration (Days)", "<f8")])

    death_y = Surv.from_arrays(event=death_df["Dead Event"].values, time=death_df["Survival Duration (Days)"].values)

    # # Define predictor variables
    exclude_columns = ["Dead Event", "Survival Duration (Days)", "Gender", "Age", "Readmission Count"]
    diagnostic_codes = [col for col in death_df.columns if col not in exclude_columns]
    death_X = death_df.drop(columns=["Dead Event", "Survival Duration (Days)"])

    #Save the diagnostic codes in database 
    # Clearing existing codes to avoid duplicates
    cur.execute("DELETE FROM diagnostic_codes")
    for code in diagnostic_codes:
        cur.execute("INSERT INTO diagnostic_codes (code_name) VALUES (%s) ON CONFLICT DO NOTHING;", (code,))
    conn.commit()

    # Split into training and testing sets
    death_X_train, death_X_test, death_y_train, death_y_test = train_test_split(death_X, death_y, test_size=0.2, random_state=42)

    #Train Random Survival Forest model
    death_rsf = RandomSurvivalForest(n_estimators=100, min_samples_split=10, min_samples_leaf=15, max_features="sqrt", n_jobs=-1, random_state=42)
    death_rsf.fit(death_X_train, death_y_train)

    # Model evaluation
    death_c_index = death_rsf.score(death_X_test, death_y_test)
    print(f"Concordance Index: {death_c_index:.3f}")
    death_c_index = round(float(death_c_index),3)

    read_y = Surv.from_arrays(event=readmission_df["Readmission Event"].values, time=readmission_df["Time to Readmission"].values)

    # Define your covariates (predictor variables)
    # X = death_df.drop(columns=['Dead', 'Death in 6 Months', 'Death in 12 Months', 'Survival Duration (Days)', "Readmission in 60 Days"])
    read_X = readmission_df.drop(columns=["Readmission Event", "Time to Readmission"])

    # Split into training and testing sets
    read_X_train, read_X_test, read_y_train, read_y_test = train_test_split(read_X, read_y, test_size=0.3, random_state=42)

    #Train Random Survival Forest model
    readmission_rsf = RandomSurvivalForest(n_estimators=100, min_samples_split=10, min_samples_leaf=15, max_features="sqrt", n_jobs=-1, random_state=42)
    readmission_rsf.fit(read_X_train, read_y_train)

    # Model evaluation
    read_c_index = readmission_rsf.score(read_X_test, read_y_test)
    print(f"Concordance Index: {read_c_index:.3f}")
    read_c_index = round(float(read_c_index),3)

    # Serialize both models together as a dictionary
    combined_models_binary = pickle.dumps({
        "death_model": death_rsf,
        "read_model": readmission_rsf
    })

    expire_date = datetime.now() + timedelta(days=30)

    compressed_models_binary = gzip.compress(combined_models_binary)  # Compress the data
    

    # Insert into PostgreSQL
    cur.execute("""
        INSERT INTO models (model_name, timestamp, model_data, c_index, expire_date)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING modelid;
    """, (model_name, datetime.now(), compressed_models_binary, death_c_index, expire_date))

    #Retrieve the new modelid
    modelid = cur.fetchone()[0]
    print(modelid)
    model_path = os.path.join(TEMP_DIR, f"model_{modelid}.pkl")
    with open(model_path, "wb") as f:
        f.write(compressed_models_binary)
    print(f"Model saved to {model_path}")
    conn.commit()
    return f"Model Training Successful! Model ID: {modelid} {expire_date}", 200

@app.route("/predict", methods=["POST"])
def predict():

    # Connect to database  
    conn = psycopg2.connect(**DB_CONFIG) 
    cur = conn.cursor()

    try:
        # Get request data
        data = request.get_json()

        print("\n Received request data:", data)

        model_id = data.get("modelid")  # Model path from cache
        gender = data.get("gender")
        age = data.get("age")
        readmissions = data.get("readmissions")
        diagnostic_codes = data.get("diagnosticCodes", [])

        print(f"Model ID: {model_id}")
        print(f"Gender: {gender}")
        print(f"Age: {age}")
        print(f"Readmissions: {readmissions}")
        print(f"Raw Diagnostic Codes: {diagnostic_codes}")

        # Check if required fields are missing
        if model_id is None or gender is None or age is None or readmissions is None or not diagnostic_codes:
            return jsonify({"error": "Missing required fields"}), 400

        # Convert to correct types
        gender = int(gender)
        age = int(age)
        readmissions = int(readmissions)
        # Handle diagnostic codes (convert from string if necessary)
        if isinstance(diagnostic_codes, str):  # If it's a string, split it
            diagnostic_codes = diagnostic_codes.split(",")

        # Convert each code to an integer safely
        try:
            diagnostic_codes = [code.strip() for code in diagnostic_codes if code.strip()]
        except ValueError:
            return jsonify({"error": "Invalid diagnostic codes format"}), 400
        
        print(f"Processed Diagnostic Codes: {diagnostic_codes}")

        model_path = os.path.join(TEMP_DIR, f"model_{model_id}.pkl")
        print(f"Searching for Model in: {model_path}")

        # Cached model file path
        if not os.path.exists(model_path):
            return jsonify({"error": "Model file not found"}), 404
        
        # try:
        #     with open(model_path, "rb") as f:
        #         model = pickle.load(f)
        #     print("Model successfully loaded!")
        # except Exception as e:
        #     return jsonify({"error": f"Model loading failed: {str(e)}"}), 500
        
        # Retrieve and decompress model from database
        try:
            cur.execute("SELECT model_data FROM models WHERE modelid = %s", (model_id,))
            result = cur.fetchone()

            if result is None:
                return jsonify({"error": "Model ID not found in database"}), 404

            compressed_models_binary = result[0]
            cur.close()
            conn.close()
        except Exception as e:
            return jsonify({"error": f"Database retrieval failed: {str(e)}"}), 500
        
        # Decompress and Deserialize Model
        try:
            decompressed_data = gzip.decompress(compressed_models_binary)
            models_dict = pickle.loads(decompressed_data)

            # Extract models
            death_model = models_dict.get("death_model")
            read_model = models_dict.get("read_model")

            if death_model is None or read_model is None:
                return jsonify({"error": "Model data is corrupted or incomplete"}), 500

        except Exception as e:
            return jsonify({"error": f"Model loading failed: {str(e)}"}), 500

        print("Model successfully loaded!")

        # Prepare input data for prediction

        #Names of features seen during fit. Defined only when X has feature names that are all strings
        death_features = death_model.feature_names_in_
        read_features = read_model.feature_names_in_
        print('Death Features',death_features)
        print('Read Features',read_features)
        #features = [gender, age, readmissions] + diagnostic_codes
        death_input_df = pd.DataFrame(0, index=[0], columns=death_features)
        read_input_df = pd.DataFrame(0, index=[0], columns=read_features)
        if 'Readmission Count' in death_features:
            print('Readmission in features')
            death_input_df['Readmission Count'] = readmissions
            read_input_df['Readmission Count'] = readmissions
        if 'Gender' in death_features:
            print('Gender in features')
            death_input_df['Gender'] = gender
            read_input_df['Gender'] = gender
        if 'Age' in death_features:
            print('Age in features')
            death_input_df['Age'] = age
            read_input_df['Age'] = age
        
        for code in diagnostic_codes:
            code_str = str(code)
            if code_str in death_features:
                death_input_df[code_str] = 1
                read_input_df[code_str] = 1

        print('Death Input df',death_input_df)
        print('Readmission Input df',read_input_df)
        # Predict survival function
        death_funcs = death_model.predict_survival_function(death_input_df)
        read_funcs = read_model.predict_survival_function(read_input_df)

        # Extract survival probabilities
        death_time_points = death_funcs[0].x.tolist()
        death_probs = death_funcs[0].y.tolist()

        # Extract survival probabilities
        read_time_points = read_funcs[0].x.tolist()
        read_probs = read_funcs[0].y.tolist()

        # Compute survival and readmission probabilities
        death_6_month = float(death_funcs[0](180))
        death_12_month = float(death_funcs[0](360))  
        readmission_30_day = 1 - float(read_funcs[0](30))
        readmission_60_day = 1 - float(read_funcs[0](60))

        response_data = {
            "death_curve": {
                "time": death_time_points,
                "probability": death_probs
            },

            "readmission_curve": {
                "time": read_time_points,
                "probability": read_probs
            },

            "death_6_month": death_6_month,
            "death_12_month": death_12_month,
            "readmission_30_day": readmission_30_day,
            "readmission_60_day": readmission_60_day
        }

        return jsonify(response_data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5002)