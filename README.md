# KhedutMitra Rural Intelligence Platform README v2

KhedutMitra is a full-stack rural intelligence platform for farmer-centric risk monitoring, advisory delivery, scheme intelligence, and operational dashboards for institutions and field teams.

## Version 2 Highlights
- End-to-end farmer lifecycle: create, view, update, delete, recalculate score.
- Extended farmer profiles: identity, location, agronomy, irrigation, household, loan, insurance, and PM-KISAN attributes.
- Unified risk intelligence: weather + soil + financial + crop market factors in one vulnerability score.
- Scheme and alert operations integrated into the same workflow.
- WhatsApp capability for communication and conversation tracking.
- Detailed module-level function documentation generated in a dedicated folder.

## Core Features
- Farmer Vulnerability Index (FVI)
    - Weighted score computation using climate risk, soil suitability, social-financial risk, and market risk.
    - Historical score tracking and high-risk farmer identification.
    - District heatmap-ready aggregates.
- Farmer Profile Management
    - Full CRUD with robust mapping between API payloads and DB fields.
    - Support for extended fields: aadhaar_last4, taluka, primary/secondary crop, irrigation type, family size, loan and insurance details, PM-KISAN, bank account.
- Alerts Engine
    - Alert generation, listing, status updates, and bulk generation flows.
    - Dashboard activity integration for operational visibility.
- Scheme Intelligence
    - Farmer-scheme matching and status management.
    - Scheme catalog with eligibility workflows.
- Weather Intelligence
    - District weather fetch with cache refresh and expiry handling.
    - Weather usage in vulnerability calculations and UI cards.
- Dashboard Analytics
    - Summary KPIs, risk distribution, reason breakdown, upcoming expiries, and recent activity feed.
- Multilingual Support
    - Gujarati, Hindi, English support paths with translation module integration.
- Auth and Security
    - JWT auth with refresh flow.
    - Role-aware access controls for superadmin, org_admin, field_officer.
    - Validation and standardized API responses.
- WhatsApp Integration
    - Conversation/message support and assisted response flow for farmer engagement.

## What Makes This Project Unique
- Domain-specific farmer intelligence model rather than generic CRM behavior.
- Practical field-ready profile model that combines agronomy and finance in one entity.
- Hybrid advisory approach combining weather cache, risk scoring, and alerting.
- Operationally actionable dashboards designed for institutions, not just individual users.
- Modular backend architecture where each domain is isolated into controller/routes/service layers.

## Architecture
- Frontend: React + Vite, TanStack Query, Zustand, Tailwind, chart components.
- Backend: Express (modular), PostgreSQL, JWT, Joi, utility layer for responses/logging.
- External integrations: weather provider, translation service, WhatsApp channel.

## Project Structure
```text
Rural_Intelligence_Plateform/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   ├── migrate.js
│   │   │   ├── seed.js
│   │   │   └── setup.js
│   │   ├── middleware/
│   │   ├── modules/
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
│   │   └── utils/
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── router/
│   │   ├── store/
│   │   └── utils/
│   └── vite.config.js
└── README.md
```

## Setup and Run

### Prerequisites
- Node.js 20+
- PostgreSQL

### Backend
1. Go to backend folder.
2. Install dependencies: npm install
3. Configure environment variables.
4. Initialize DB (schema + seed): npm run db:setup
5. Start server: npm run dev

### Frontend
1. Go to frontend folder.
2. Install dependencies: npm install
3. Configure VITE API URL.
4. Start app: npm run dev

## Database and Seed Notes
- Migrations include base schema, WhatsApp support, farmer code sequence, and extended farmer profile fields.
- Seed script populates farmers with both core and extended profile data so edit forms display complete values for seeded records.

## Function Documentation (Per Function)
- Generated folder: backend/src/modules/function-docs
- Index file: backend/src/modules/function-docs/README.md
- One markdown file per named function across module controller/service/schema files.

## API Domains
- /auth
- /farmers
- /alerts
- /schemes
- /dashboard
- /vulnerability
- /users
- /institutions
- /locations
- /translation
- /whatsapp

## Security and Reliability
- JWT + refresh session flow.
- Input validation in request schemas.
- Centralized error handling and response shape.
- Weather cache refresh strategy to avoid stale advisory context.

## Maintenance Notes
- To regenerate per-function docs, rerun the documentation generation workflow used for backend modules.
- Keep migrations forward-only and idempotent where possible.

## License
Internal project. Update this section with your organization license policy if needed.
