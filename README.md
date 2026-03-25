# 🌾 KhedutMitra : Rural Intelligence Platform

KhedutMitra is a sophisticated full-stack rural intelligence platform designed for farmer-centric risk monitoring, advisory delivery, and operational excellence. It empowers institutions with real-time data, predictive analytics, and automated communication tools to support rural communities effectively.

---

## 🚀 Tech Stack

### Frontend
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TanStack Query](https://img.shields.io/badge/-TanStack%20Query-FF4154?style=for-the-badge&logo=react-query&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-443322?style=for-the-badge)
![Leaflet](https://img.shields.io/badge/Leaflet-199903?style=for-the-badge&logo=leaflet&logoColor=white)

### Backend
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=json-web-tokens&logoColor=white)
![Twilio](https://img.shields.io/badge/Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-26A69A?style=for-the-badge&logo=telegram&logoColor=white)
![Azure Speech](https://img.shields.io/badge/Azure_Speech-0078D4?style=for-the-badge&logo=microsoft-azure&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-f3d03e?style=for-the-badge&logo=groq&logoColor=black)

---

## ✨ Key Features

### 📊 Farmer Vulnerability Index (FVI)
Advanced risk scoring engine that computes vulnerability based on:
- **Climate Risk:** Real-time and historical weather patterns.
- **Soil Suitability:** Compatibility analysis for specific crops.
- **Financial Risk:** Loan status, insurance coverage, and market factors.
- **Social Risk:** Household and demographic indicators.

### 🌤️ Weather Intelligence
- Real-time weather monitoring on district levels.
- Intelligent caching strategy to prevent redundant API calls.
- Weather-aware advisories generated for specific crop cycles.

### 🗺️ Operational Dashboards
- **Dynamic Metrics:** Live tracking of average vulnerability scores and unique district reaches.
- **Heatmaps:** District-wise visualization of risk factors using Leaflet.
- **Actionable Insights:** Categorized alerts (Critical, High, Medium, Low) for field teams.

### 💬 WhatsApp Integration
- Automated advisory delivery and farmer engagement via Twilio.
- Assisted response flow for conversation tracking.
- Bulk alert generation and status management.

### 🤖 AI-Powered Telegram Bot
- **Computer Vision:** Crop disease detection from farmer-uploaded photos using Llama-3 Vision models via Groq.
- **Multilingual Support:** Instant analysis and advice in Gujarati, Hindi, and English.
- **Automatic Logging:** Detected issues are automatically logged into the central database for field officer follow-ups.

### 🎙️ Voice Assistant (TTS)
- **Rural Accessibility:** Integrated Text-to-Speech (TTS) using **Azure Speech Service** to convert agricultural advisories into spoken audio.
- **Localized Voices:** Support for natural-sounding neural voices in **Gujarati**, **Hindi**, and **English**.
- **Interactive Engagement:** Hybrid interaction model combining text, images, and audio for maximum reach.

### 🌍 Multilingual & Localization
- Native support for **English**, **Gujarati**, and **Hindi**.
- Seamless UI localization across all modules (Dashboard, Profile, Alerts).

---

## 💎 What Makes This Project Unique
- **Domain-Specific Modeling:** Tailored farmer intelligence rather than generic CRM behavior.
- **Field-Ready Profiles:** Combines agronomy and finance into a single, actionable entity.
- **Hybrid Advisory:** Merges weather data, risk scoring, and automated alerting.
- **Institutional Focus:** Dashboards designed for scale, supporting both field officers and superadmins.
- **Modular Architecture:** Clean isolation of domains into controller/route/service layers.

---





---

## 📂 Project Structure

```text
GenAI-Rural_Intelligence_Platform/
├── backend/                # Express.js Server
│   ├── src/
│   │   ├── config/         # App configuration
│   │   ├── db/             # Migrations, Seeds, and Setup
│   │   │   ├── migrations/
│   │   │   ├── migrate.js
│   │   │   ├── seed.js
│   │   │   └── setup.js
│   │   ├── middleware/     # Auth, Logging, Validation
│   │   ├── modules/        # Domain-driven modules
│   │   │   ├── alerts/
│   │   │   ├── auth/
│   │   │   ├── crops/
│   │   │   ├── dashboard/
│   │   │   ├── disease/
│   │   │   ├── farmers/
│   │   │   ├── institutions/
│   │   │   ├── locations/
│   │   │   ├── schemes/
│   │   │   ├── translation/
│   │   │   ├── users/
│   │   │   ├── vulnerability/
│   │   │   ├── weather/
│   │   │   ├── whatsapp/
│   │   │   └── function-docs/
│   │   └── utils/          # Shared Helpers
│   └── server.js           # API Entry Point
├── frontend/               # React Vite Application
│   ├── src/
│   │   ├── api/            # TanStack Query Hooks
│   │   ├── components/     # UI Design System
│   │   ├── hooks/          # Custom React Hooks
│   │   ├── pages/          # Feature Views (Dashboard, Map, Farmers)
│   │   ├── router/         # App Routing
│   │   ├── store/          # Global State (Zustand)
│   │   └── utils/          # Frontend Helpers
│   └── vite.config.js      # Build Configuration
└── README.md
```

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js** v20 or higher
- **PostgreSQL** (running locally or via cloud)

### 1. Backend Setup
1. Go to the `backend` folder.
2. Install dependencies: `npm install`
3. Configure environment variables in `.env` (DATABASE_URL, JWT_SECRET, etc.).
4. Initialize DB (schema + seed): `npm run db:setup`
5. Start server: `npm run dev`

### 2. Frontend Setup
1. Go to the `frontend` folder.
2. Install dependencies: `npm install`
3. Configure `VITE_API_BASE_URL` in `.env`.
4. Start app: `npm run dev`

---

## 🗄️ Database and Seed Notes
- **Migrations:** Include base schema, WhatsApp sessions, farmer sequences, and extended profile fields.
- **Smart Seeding:** The seed script populates farmers with complete agronomic and financial data, ensuring edit forms display realistic values immediately.

---

## 📖 Function Documentation
- **Auto-Generated:** Detailed per-function documentation is located in `backend/src/modules/function-docs`.
- **Index:** See `backend/src/modules/function-docs/README.md` for a complete overview of controller/service logic.
- **Maintenance:** To regenerate, rerun the documentation workflow assigned to backend modules.

---

## 🛣️ API Domains
- `/api/auth` - Authentication & Refresh Tokens
- `/api/users` - User Management & RBAC
- `/api/institutions` - Organization Management
- `/api/farmers` - Profile CRUD & Life-cycle
- `/api/crops` - Crop Catalog & Suitability
- `/api/vulnerability` - FVI Calculation Engine
- `/api/schemes` - Matching & Eligibility
- `/api/alerts` - Operational Monitoring
- `/api/dashboard` - Real-time Analytics
- `/api/disease` - AI Disease Detection
- `/api/locations` - District/Taluka Assets
- `/api/translate` - Multilingual Logic
- `/api/whatsapp` - Twilio Messaging & **Voice Assistant**
- `/api/telegram` - GenAI Telegram Bot

---

## 🔒 Security & Reliability
- **Stateful Sessions:** JWT with integrated refresh flow for secure, long-lived sessions.
- **Input Validation:** Strict Joi schemas for all inbound requests.
- **Error Handling:** Centralized response normalization and logging.
- **Weather Reliability:** Caching strategy with smart refresh to maintain advisory context.

---

## ⚙️ Maintenance Notes
- Keep migrations forward-only and idempotent.
- Ensure `vulnerability` weightages are updated in synchronization with institutional policies.

---

## 📄 License
This project is for internal institutional use. Contact the administrator for licensing policies.
