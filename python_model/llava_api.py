import os
import base64
import io
from fastapi import FastAPI, File, UploadFile
from PIL import Image
from groq import Groq
import uvicorn
from dotenv import load_dotenv

# Load environment variables from backend directory
load_dotenv(dotenv_path="../backend/.env")

app = FastAPI()

# Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_ID = "meta-llama/llama-4-scout-17b-16e-instruct"

# Initialize Groq client
client = Groq(api_key=GROQ_API_KEY)

def encode_image(image_bytes):
    return base64.b64encode(image_bytes).decode('utf-8')

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    print("Running structured inference via Groq...")
    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Resize image for better compatibility
        image.thumbnail((672, 672))
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='JPEG')
        base64_image = encode_image(img_byte_arr.getvalue())
        
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": (
                                "Analyze the crop disease in this image. "
                                "Return your response in JSON format with exactly three fields: "
                                "'reasoned_text' (detailed technical analysis), "
                                "'detected_issue' (a specific 3-5 word name of the disease or issue), "
                                "'advice' (2-3 specific, actionable steps for the farmer)."
                            )
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                            },
                        },
                    ],
                }
            ],
            model=MODEL_ID,
            response_format={"type": "json_object"},
        )
        
        import json
        res_json = json.loads(chat_completion.choices[0].message.content)
        
        reasoned_text = res_json.get("reasoned_text", "No detailed reasoning provided.")
        detected_issue = res_json.get("detected_issue", "Unknown Issue")
        advice = res_json.get("advice", "Monitor the crop and consult a local expert.")
        
        print(f"Inference completed: {detected_issue}")
        return {
            "reasoned_text": reasoned_text,
            "detected_issue": detected_issue,
            "advice": advice
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        with open("error_log.txt", "w") as f:
            f.write(error_details)
        print(f"Error during Groq inference logged to error_log.txt")
        return {
            "reasoned_text": f"Error occurred during Groq inference: {str(e)}",
            "detected_issue": "System Error",
            "advice": "Possible fungal disease detected. Apply fungicide and monitor crop. (Fallback)"
        }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
