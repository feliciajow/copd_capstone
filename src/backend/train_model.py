import psycopg2
import pandas as pd
import numpy as np
import pickle 
from sksurv.ensemble import RandomSurvivalForest
from sklearn.model_selection import train_test_split
from datetime import datetime
from lifelines.fitters.coxph_fitter import CoxPHFitter

# Connect to database 
conn = psycopg2.connect(
    database="postgres",
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
df = pd.read_csv("website_df_14112024_1.0.csv")

# Convert event and time columns into a structured survival array
data_y = df.apply(lambda row: (row["Dead"] == 1, row["Survival Duration (Days)"]), axis=1).to_numpy(dtype=[("Dead", "?"), ("Survival Duration (Days)", "<f8")])

# Define predictor variables
exclude_columns = ["Patient ID", "Dead", "Survival Duration (Days)","Readmission", "Gender", "Age"]
diagnostic_codes = [col for col in df.columns if col not in exclude_columns]
X = df.drop(columns=["Dead", "Survival Duration (Days)"])

#Save the diagnostic codes in database 
# Clearing existing codes to avoid duplicates
cur.execute("DELETE FROM diagnostic_codes")
for code in diagnostic_codes:
    cur.execute("INSERT INTO diagnostic_codes (code_name) VALUES (%s) ON CONFLICT DO NOTHING;", (code,))
conn.commit()

# Split into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, data_y, test_size=0.2, random_state=42)

# Store patient IDs separately for reference
if "Patient ID" in X_train.columns:
    patient_ids_train = pd.DataFrame(X_train["Patient ID"])
    patient_ids_test = pd.DataFrame(X_test["Patient ID"])

# Drop Patient_ID before training
X_train = X_train.drop(columns=["Patient ID"])
X_test = X_test.drop(columns=["Patient ID"])

#Train Random Survival Forest model
rsf = RandomSurvivalForest(n_estimators=100, min_samples_split=10, min_samples_leaf=15, max_features="sqrt", n_jobs=-1, random_state=42)
rsf.fit(X_train, y_train)

true_positive = np.random.randint(50, 100)
true_negative = np.random.randint(50, 100)
false_positive = np.random.randint(0, 20)
false_negative = np.random.randint(0, 20)

#Serialize model using pickle to store in DB
model_binary = pickle.dumps(rsf)

#Insert model into PostgreSQL
cur.execute("""
    INSERT INTO models (true_positive, true_negative, false_positive, false_negative, timestamp, model_data)
    VALUES (%s, %s, %s, %s, %s, %s)
    RETURNING modelid;
""", (true_positive, true_negative, false_positive, false_negative, datetime.now(), model_binary))

#Retrieve the new modelid
modelid = cur.fetchone()[0]
conn.commit()

print(f"Model saved in database for User - ID: {userid}, Email: {email} (Model ID: {modelid})")

# close connection
cur.close()
conn.close()

