import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv(dotenv_path="../backend/.env")
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

try:
    models = client.models.list()
    for model in models.data:
        if "llama-4" in model.id or "scout" in model.id:
            print(f"Vision Model Found: {model.id}")
except Exception as e:
    print(f"Error listing models: {e}")
