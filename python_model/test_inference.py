import requests
import os

url = "http://127.0.0.1:8000/predict"
file_path = r"e:\GenAI-Rural_Intelligence_Platform\backend\cottonDisease.jpeg"

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
else:
    with open(file_path, "rb") as f:
        files = {"file": f}
        try:
            response = requests.post(url, files=files)
            print("Status Code:", response.status_code)
            print("Response JSON:", response.json())
        except Exception as e:
            print("Error connecting to Python API:", str(e))
