import os

# Get absolute path
file_path = os.path.join(os.getcwd(), "temp", "model_9.pkl")

try:
    os.remove(file_path)
    print("File deleted successfully")
except Exception as e:
    print("Error:", e)