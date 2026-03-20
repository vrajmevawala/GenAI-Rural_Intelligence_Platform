# GraamAI – Krushi Saathi 🌱

A rural AI platform prototype built with FastAPI and React.

## 🚀 Features
- **Farmer Registration & Login**: Simple phone/password based access.
- **FVI Calculation**: Farmer Vulnerability Index based on crop, soil, and location.
- **Rural Advice**: Actionable advice in Gujarati for farmers.
- **Clean UI**: Large fonts, high contrast, and card-based layout for rural usability.

## 🏗️ Tech Stack
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL (NeonDB).
- **Frontend**: React (Vite), Plain CSS.

## ⚙️ Setup

### Backend
1. Navigate to `backend/`
2. Create a `.env` file from `.env.example` and add your `DATABASE_URL`.
3. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/scripts/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
4. Seed the database with initial crops:
   ```bash
   python -m seed
   ```
5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend
1. Navigate to `frontend/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## 🧠 User Flow
Landing → Register → Login → Dashboard → Check Risk → Get Advice
