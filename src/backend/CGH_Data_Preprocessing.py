from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import pandas as pd
from datetime import datetime
import numpy as np
import icd10
from flask import send_file
from lifelines.fitters.coxph_fitter import CoxPHFitter
import pickle 
from sksurv.ensemble import RandomSurvivalForest
from sklearn.model_selection import train_test_split
import psycopg2

app = Flask(__name__)
CORS(app, resources={
    r"/fileUpload": {"origins": "http://localhost:3000"},
    r"/train": {"origins": "http://localhost:3000"} 
})


UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
OUTPUT_FOLDER = "output"
os.makedirs(OUTPUT_FOLDER, exist_ok=True)


@app.route("/fileUpload", methods=["POST"])
def upload_file():
    if "file" not in request.files or request.files["file"].filename == "":
        return jsonify({"message": "No file part in request"}), 400

    file = request.files["file"]

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

    # What Diagnosis are you interested in?
    diagnostic_interest = "J44"

    # Convert columns to datetime format and keep only the year, month, and day
    date_columns = ['Admit/Visit Date/Time', 'Date of Birth', 'Death Date', 'Discharge Date/Time']

    for col in date_columns:
        raw_df[col] = pd.to_datetime(raw_df[col]).dt.date  # Extracts the date part (year-month-day)

    # converting Columns related to Time to a Datetime Dtype
    raw_df['Admit/Visit Date/Time'] = pd.to_datetime(raw_df['Admit/Visit Date/Time'], errors='coerce')
    raw_df['Discharge Date/Time'] = pd.to_datetime(raw_df['Discharge Date/Time'], errors='coerce')
    raw_df['Death Date'] = pd.to_datetime(raw_df['Death Date'], errors='coerce')
    raw_df['Date of Birth'] = pd.to_datetime(raw_df['Date of Birth'], errors='coerce')

    # # we are only looking at Data from 1st Oct 2017 to 1st June 2023
    start_date = pd.Timestamp('2017-10-01')
    end_date = pd.Timestamp('2023-06-01')
    datefiltered_df = raw_df[(raw_df['Admit/Visit Date/Time'] >= start_date) & (raw_df['Admit/Visit Date/Time'] <= end_date)]
    datefiltered_df_df = datefiltered_df.sort_values(by=['Patient ID', 'Admit/Visit Date/Time'])

    # only keep a&e and inpatient
    casetype_df = datefiltered_df_df[
        (datefiltered_df_df['Case Type Description'] == 'A&E') |
        (datefiltered_df_df['Case Type Description'] == 'Inpatient')
    ]

    # Filter out rows where Date of Birth is greater than Admit/Visit Date/Time
    df_filtered = casetype_df[casetype_df['Date of Birth'] <= casetype_df['Admit/Visit Date/Time']]

    today_date = datetime.now()

    # FOR SURVIVAL DURATION (DAYS)
    df_filtered['Survival Duration (Days)'] = np.where(
        df_filtered['Death Date'].isna(),
        (today_date - df_filtered['Admit/Visit Date/Time']).dt.days,  # If 'death' is NaT, use today_date
        (df_filtered['Death Date'] - df_filtered['Admit/Visit Date/Time']).dt.days)  # If 'death' has a value, use death date

    # FOR AGE
    df_filtered['Age'] = np.where(
        df_filtered['Death Date'].isna(),
        round((today_date - df_filtered['Date of Birth']).dt.days/365),  # If 'death' is NaT, use today_date
        round((df_filtered['Death Date'] - df_filtered['Date of Birth']).dt.days/365)
        )  # If 'death' has a value, use death date

    # FOR GENDER
    df_filtered['Gender'] = df_filtered['Gender'].map({'MALE': 1, 'FEMALE': 0})

    # FOR DEAD
    df_filtered["Dead"] = df_filtered["Death Date"].notna().astype(int)

    #Step 1: Filter rows with diagnosis
    patients_of_interest = df_filtered[df_filtered['Primary Diagnosis Code (Mediclaim)'].str.contains(diagnostic_interest, na=False)]

    # Step 2: Initialize readmission column as a count
    df_filtered['Readmission'] = 0  # Default to 0

    # Step 3: Check for inpatient readmissions
    for patient_id, patient_visits in patients_of_interest.groupby('Patient ID'):
        # Sort visits by date for the patient
        patient_visits = patient_visits.sort_values(by='Admit/Visit Date/Time')
        readmission_date = None

        for index, row in patient_visits.iterrows():
            visit_date = row['Admit/Visit Date/Time']
            case_type = row['Case Type Description']

            # If this is the first visit, set the baseline and continue
            if readmission_date is None:
                readmission_date = visit_date
                continue

            # Find subsequent admissions that are inpatient
            if (visit_date > readmission_date) and (case_type == 'Inpatient'):
                df_filtered.loc[index, 'Readmission'] += 1
                readmission_date = visit_date  # Update the baseline date to this readmission

    # Step 4: Aggregate the maximum values for each patient
    patient_max_values = df_filtered.groupby('Patient ID')[['Readmission']].max()

    # Step 5: Map the maximum values back to all rows for each patient
    df_filtered['Readmission'] = df_filtered['Patient ID'].map(patient_max_values['Readmission'])

    # Continuously remove rows with the minimum survival duration until the minimum is at least 0
    while df_filtered['Survival Duration (Days)'].min() < 0:
        min_survival_duration = df_filtered['Survival Duration (Days)'].min()
        df_filtered = df_filtered[df_filtered['Survival Duration (Days)'] != min_survival_duration]

    #Confirm the new minimum survival duration
    new_min_survival_duration = df_filtered['Survival Duration (Days)'].min()

    # Create a new column: 1 if death occurs within 6 months (180 days), 0 otherwise
    df_filtered['Death in 6 Months'] = df_filtered['Survival Duration (Days)'].apply(
        lambda x: 1 if pd.notnull(x) and x <= 180 else 0
    )

    df_filtered['Death in 12 Months'] = df_filtered['Survival Duration (Days)'].apply(
        lambda x: 1 if pd.notnull(x) and x <= 365 else 0
    )

    # Step 1: Identify patients with Death in 6 Months
    patients_death_6_months = set(df_filtered[df_filtered['Death in 6 Months'] == 1]['Patient ID'])

    # Step 2: Mark all rows for those patients as 1 for Death in 6 Months
    df_filtered.loc[df_filtered['Patient ID'].isin(patients_death_6_months), 'Death in 6 Months'] = 1

    # Step 3: Identify patients with Death in 12 Months
    patients_death_12_months = set(df_filtered[df_filtered['Death in 12 Months'] == 1]['Patient ID'])

    # Step 4: Mark all rows for those patients as 1 for Death in 12 Months
    df_filtered.loc[df_filtered['Patient ID'].isin(patients_death_12_months), 'Death in 12 Months'] = 1

    # Step 1: Filter rows with diagnosis
    patients_of_interet = df_filtered[df_filtered['Primary Diagnosis Code (Mediclaim)'].str.contains(diagnostic_interest, na=False)]

    # Step 2: Initialize readmission column and count column
    df_filtered['Readmission in 6 Months'] = 0  # Default to 0
    df_filtered['Readmission Count in 6 Months'] = 0  # Count of readmissions

    # Step 3: Iterate through patients to track readmissions
    for patient_id, patient_visits in patients_of_interet.groupby('Patient ID'):
        # Sort visits by date for each patient
        patient_visits = patient_visits.sort_values(by='Admit/Visit Date/Time')
        readmission_date = None
        readmission_count = 0

        # Iterate through each visit for the patient
        for _, visit in patient_visits.iterrows():
            visit_date = visit['Admit/Visit Date/Time']
            case_type = visit['Case Type Description']

            # For the first admission, only set the baseline date
            if readmission_date is None:
                readmission_date = visit_date  # Set the new baseline for readmission
            else:
                # Check if the visit qualifies as a readmission
                if (
                    visit_date > readmission_date and
                    visit_date <= readmission_date + pd.Timedelta(days=180) and
                    case_type == 'Inpatient'  # Subsequent visits must be Inpatient
                ):
                    # Increment the readmission count
                    readmission_count += 1

                    # Update the DataFrame for this visit
                    df_filtered.loc[
                        (df_filtered['Patient ID'] == patient_id) &
                        (df_filtered['Admit/Visit Date/Time'] == visit_date),
                        'Readmission Count in 6 Months'
                    ] = readmission_count

                    df_filtered.loc[
                        (df_filtered['Patient ID'] == patient_id) &
                        (df_filtered['Admit/Visit Date/Time'] == visit_date),
                        'Readmission in 6 Months'
                    ] = 1

                    # Update the baseline to this readmission date
                    readmission_date = visit_date
                elif visit_date > readmission_date + pd.Timedelta(days=180):
                    # Reset the baseline date if it's outside the 6-month window
                    readmission_date = visit_date

    # Step 4: Aggregate the maximum values for each patient
    patient_max_values = df_filtered.groupby('Patient ID')[['Readmission Count in 6 Months', 'Readmission in 6 Months']].max()

    # Step 5: Map the maximum values back to all rows for each patient
    df_filtered['Readmission Count in 6 Months'] = df_filtered['Patient ID'].map(patient_max_values['Readmission Count in 6 Months'])
    df_filtered['Readmission in 6 Months'] = df_filtered['Patient ID'].map(patient_max_values['Readmission in 6 Months'])

    # Step 1: Filter rows with diagnosis
    patients_of_interest = df_filtered[df_filtered['Primary Diagnosis Code (Mediclaim)'].str.contains(diagnostic_interest, na=False)]

    # Step 2: Initialize readmission column and count column
    df_filtered['Readmission in 12 Months'] = 0  # Default to 0
    df_filtered['Readmission Count in 12 Months'] = 0  # Count of readmissions

    # Step 3: Iterate through patients to track readmissions
    for patient_id, patient_visits in patients_of_interest.groupby('Patient ID'):
        # Sort visits by date for each patient
        patient_visits = patient_visits.sort_values(by='Admit/Visit Date/Time')
        readmission_date = None
        readmission_count = 0

        # Iterate through each visit for the patient
        for _, visit in patient_visits.iterrows():
            visit_date = visit['Admit/Visit Date/Time']
            case_type = visit['Case Type Description']

            # For the first admission, only set the baseline date
            if readmission_date is None:
                readmission_date = visit_date  # Set the new baseline for readmission
            else:
                # Check if the visit qualifies as a readmission
                if (
                    visit_date > readmission_date and
                    visit_date <= readmission_date + pd.Timedelta(days=365) and
                    case_type == 'Inpatient'  # Subsequent visits must be Inpatient
                ):
                    # Increment the readmission count
                    readmission_count += 1

                    # Update the DataFrame for this visit
                    df_filtered.loc[
                        (df_filtered['Patient ID'] == patient_id) &
                        (df_filtered['Admit/Visit Date/Time'] == visit_date),
                        'Readmission Count in 12 Months'
                    ] = readmission_count

                    df_filtered.loc[
                        (df_filtered['Patient ID'] == patient_id) &
                        (df_filtered['Admit/Visit Date/Time'] == visit_date),
                        'Readmission in 12 Months'
                    ] = 1

                    # Update the baseline to this readmission date
                    readmission_date = visit_date
                elif visit_date > readmission_date + pd.Timedelta(days=365):
                    # Reset the baseline date if it's outside the 6-month window
                    readmission_date = visit_date

    # Step 4: Aggregate the maximum values for each patient
    patient_max_values = df_filtered.groupby('Patient ID')[['Readmission Count in 12 Months', 'Readmission in 12 Months']].max()

    # Step 5: Map the maximum values back to all rows for each patient
    df_filtered['Readmission Count in 12 Months'] = df_filtered['Patient ID'].map(patient_max_values['Readmission Count in 12 Months'])
    df_filtered['Readmission in 12 Months'] = df_filtered['Patient ID'].map(patient_max_values['Readmission in 12 Months'])

    # Fill missing secondary diagnosis codes with empty strings for consistency
    df_filtered["Secondary Diagnosis Code Concat (Mediclaim)"].fillna("", inplace=True)

    # Combine primary and secondary diagnosis codes into a single column for processing
    df_filtered["Combined Diagnoses"] = df_filtered["Primary Diagnosis Code (Mediclaim)"] + "," + df_filtered["Secondary Diagnosis Code Concat (Mediclaim)"]

    # First, replace any instances of '||' with ',' for consistent splitting.
    df_filtered["Combined Diagnoses"] = df_filtered["Combined Diagnoses"].str.replace('||', ',', regex=False)
    print(df_filtered["Combined Diagnoses"])
    # Group the DataFrame by 'Patient ID' to get all diagnosis codes for each patient
    grouped_df = df_filtered.groupby('Patient ID').agg({
        'Primary Diagnosis Code (Mediclaim)': lambda x: ','.join(x.unique()),
        'Secondary Diagnosis Code Concat (Mediclaim)': lambda x: '||'.join(filter(pd.notna, x.unique()))
    }).reset_index()

    # Function to apply the combined diagnosis codes for all rows, keeping primary code as first
    def apply_combined_diagnoses(row):
        patient_id = row['Patient ID']
        primary_code = row['Primary Diagnosis Code (Mediclaim)']

        # Get combined primary and secondary diagnosis codes for the patient
        combined_data = grouped_df[grouped_df['Patient ID'] == patient_id]
        combined_secondary = combined_data['Secondary Diagnosis Code Concat (Mediclaim)'].values[0]

        # Ensure primary code comes first in the combined diagnosis column
        if pd.notna(combined_secondary):
            combined_diagnosis = f"{primary_code},{combined_secondary}"
        else:
            combined_diagnosis = primary_code

        return combined_diagnosis

    # Apply the function to each row
    df_filtered['Combined Diagnoses'] = df_filtered.apply(apply_combined_diagnoses, axis=1)
    # Replace '||' and ',||' with ',' in the 'Combined Diagnoses' column to ensure consistent separation
    df_filtered['Combined Diagnoses'] = df_filtered['Combined Diagnoses'].replace({'\|\|': ',', ',\|\|': ','}, regex=True)
    df_filtered['Combined Diagnoses'] = df_filtered['Combined Diagnoses'].replace({',,': ','}, regex=True)

    def remove_trailing_comma(diagnosis_str):
        # Remove trailing commas from the string
        return diagnosis_str.rstrip(',')

    # Apply the function to the "Processed Diagnoses" column
    df_filtered['Combined Diagnoses'] = df_filtered['Combined Diagnoses'].apply(remove_trailing_comma)

    # Define a function to process the "Combined Diagnoses" column as per the requirements
    def process_diagnoses(diagnosis_str):
        # Split the diagnoses by comma
        diagnoses = diagnosis_str.split(',')
        # Take the first 3 characters of each diagnosis code and remove duplicates
        processed_diagnoses = list(dict.fromkeys([diag[:3] for diag in diagnoses]))
        # Join back to a comma-separated string
        return ','.join(processed_diagnoses)

    # Apply the function to the "Combined Diagnoses" column
    df_filtered['Processed Diagnoses'] = df_filtered['Combined Diagnoses'].apply(process_diagnoses)
    df_filtered = df_filtered.drop(columns="Combined Diagnoses")

    """### 2.2.6 Filtering for Patients of Interest"""

    df_filtered = df_filtered[df_filtered['Processed Diagnoses'].str.startswith(diagnostic_interest)]

    # Remove duplicate Patient IDs, keeping the first occurrence
    df_filtered = df_filtered.drop_duplicates(subset='Patient ID')

    """### 2.2.7 One Hot Encoding on Diagnostic Codes"""

    # Split the truncated diagnosis codes into one-hot encoded columns
    diagnosis_dummies_expanded = df_filtered["Processed Diagnoses"].str.get_dummies(sep=",")

    # Combine 'Patient ID', 'Dead', and the one-hot encoded diagnosis codes
    overview_df = pd.concat([df_filtered[["Patient ID", "Gender", "Age", "Dead", "Death in 12 Months", "Readmission", "Readmission in 6 Months", "Readmission in 12 Months", "Survival Duration (Days)"]], diagnosis_dummies_expanded], axis=1)

    """### 2.2.8 Dimension Reduction Techniques"""

    # Summing the values in each column to get the total count of each diagnostic code
    diagnostic_code_counts = overview_df.iloc[:, 1:]
    diagnostic_code_counts = diagnostic_code_counts.sum(axis=0)

    # Sorting by count in descending order
    diagnostic_code_counts_sorted = diagnostic_code_counts.sort_values(ascending=True)

    code_count = diagnostic_code_counts_sorted.get(diagnostic_interest, 0)

    """#### Keeping only Counts that are >= 1% of Diagnostic Code Count"""

    valid_codes = diagnostic_code_counts_sorted[diagnostic_code_counts_sorted >= code_count/100].index

    # Define columns to retain
    retain_columns = [
        "Patient ID", "Gender", "Age", "Dead", "Death in 12 Months",
        "Readmission", "Readmission in 6 Months", "Readmission in 12 Months"
    ]

    # Combine valid_codes and retain_columns, ensuring uniqueness with a set
    columns_to_keep = list(set(valid_codes).union(retain_columns))

    # Filter the DataFrame with unique columns
    overview_df = overview_df[columns_to_keep]

    overview_df = overview_df.drop(columns=[diagnostic_interest], errors="ignore")

    diagnostic_drop_df = overview_df.drop(columns=["Patient ID", "Gender", "Age", "Death in 6 Months", "Death in 12 Months", "Readmission", "Readmission in 6 Months", "Readmission in 12 Months"], errors="ignore")
   
    diagnostic_drop_df_cox = diagnostic_drop_df.reset_index(drop=True)

    # # Fit the model
    cph = CoxPHFitter(alpha=0.05)
    print(diagnostic_drop_df_cox)
    cph.fit(diagnostic_drop_df_cox, 'Survival Duration (Days)', 'Dead')
    insignificant_vars = cph.summary[cph.summary['p'] > 0.05]
    insignificant_codes = insignificant_vars.index.tolist()
    working_df = overview_df.drop(columns=insignificant_codes)

    # Process diagnosis codes
    output_file = os.path.join(OUTPUT_FOLDER, "processed_data.csv")
    working_df.to_csv(output_file, index=False)
    return send_file(output_file, as_attachment=True)

@app.route("/train", methods=["POST"])
def train():    
    # Connect to database 
    conn = psycopg2.connect(
        database="cghdb",
        user="postgres",
        password="cghrespi",
        host="localhost",
        port="5432"
    )
    cur = conn.cursor()

    # Fetch userid and email from users table
    cur.execute("SELECT userid, email FROM users")
    users = cur.fetchall()

    if not users:
        raise Exception("User not found in the database.")

    for userid, email in users:
        print(f"User Found - ID: {userid}, Email: {email}")

    # Load dataset
    df = pd.read_csv("output/processed_data.csv")
    print(f"Train dataframe:\n{df}")

    # Convert event and time columns into a structured survival array
    data_y = df.apply(lambda row: (row["Dead"] == 1, row["Survival Duration (Days)"]), axis=1).to_numpy(dtype=[("Dead", "?"), ("Survival Duration (Days)", "<f8")])

    # # Define predictor variables
    exclude_columns = ["Patient ID", "Dead", "Survival Duration (Days)","Readmission", "Gender", "Age", "Death in 12 Months", "Readmission in 12 Months", "Readmission in 6 Months"]
    diagnostic_codes = [col for col in df.columns if col not in exclude_columns]
    X = df.drop(columns=["Patient ID", "Dead", "Survival Duration (Days)"])

    #Save the diagnostic codes in database 
    # Clearing existing codes to avoid duplicates
    cur.execute("DELETE FROM diagnostic_codes")
    for code in diagnostic_codes:
        cur.execute("INSERT INTO diagnostic_codes (code_name) VALUES (%s) ON CONFLICT DO NOTHING;", (code,))
    conn.commit()

    # Split into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(X, data_y, test_size=0.2, random_state=42)

    # Store patient IDs separately for reference
    # if "Patient ID" in X_train.columns:
    #     patient_ids_train = pd.DataFrame(X_train["Patient ID"])
    #     patient_ids_test = pd.DataFrame(X_test["Patient ID"])

    # Drop Patient_ID before training
    # X_train = X_train.drop(columns=["Patient ID"])
    # X_test = X_test.drop(columns=["Patient ID"])

    #Train Random Survival Forest model
    rsf = RandomSurvivalForest(n_estimators=100, min_samples_split=10, min_samples_leaf=15, max_features="sqrt", n_jobs=-1, random_state=42)
    rsf.fit(X_train, y_train)

    # Model evaluation
    c_index = rsf.score(X_test, y_test)
    print(f"Concordance Index: {c_index:.3f}")
    c_index = round(float(c_index),3)

    #Serialize model using pickle to store in DB
    model_binary = pickle.dumps(rsf)

    #Insert model into PostgreSQL
    cur.execute("""
        INSERT INTO models (timestamp, model_data, c_index)
        VALUES (%s, %s, %s)
        RETURNING modelid;
    """, (datetime.now(), model_binary, c_index))

    #Retrieve the new modelid
    modelid = cur.fetchone()[0]
    conn.commit()

    # print(f"Model saved in database for User - ID: {userid}, Email: {email} (Model ID: {modelid})")
    return f"Model Training Successful! Model ID: {modelid}", 200

if __name__ == "__main__":
    app.run(debug=True, port=5002)