# Gemini Fullstack Monorepo

A modern monorepo template combining a React frontend, Express TypeScript backend, and a FastAPI Python data pipeline backend, fully integrated with Google Gemini (`@google/genai`) and MongoDB.

## 🚀 Stack Overview

- **Frontend (`/frontend`)**: Vite, React 18, Tailwind CSS, TypeScript, Lucide Icons.
- **Backend (`/backend`)**: Express.js with TypeScript, `@google/genai` SDK, `mongodb` driver.
- **Data Pipeline (`/data-pipeline`)**: FastAPI (Python), `google-genai`, `pymongo`, Uvicorn.
- **Environment Variables**: Centralized `.env` handling for `GEMINI_API_KEY`, `MONGODB_URI`, `PORT`, and `FASTAPI_PORT`.

---

## 🛠️ Getting Started

### 1. Configure Environment Variables
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Update `.env` with your credentials:
```env
GEMINI_API_KEY=your_actual_gemini_api_key
MONGODB_URI=mongodb://localhost:27017/my_database
```

---

### 2. Install Node Dependencies
From the monorepo root:
```bash
npm install
```

---

### 3. (Optional) Set Up Python FastAPI Data Pipeline
Create virtual environment and install dependencies:
```bash
cd data-pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

---

### 4. Running the Development Servers

- **Start Frontend + Express Backend:**
  ```bash
  npm run dev
  ```
  - Frontend runs on [http://localhost:3000](http://localhost:3000)
  - Express Backend runs on [http://localhost:5000](http://localhost:5000)

- **Start Frontend + Express Backend + Python FastAPI Pipeline:**
  ```bash
  npm run dev:all
  ```
  - FastAPI Data Pipeline runs on [http://localhost:8000](http://localhost:8000) (Interactive docs at [http://localhost:8000/docs](http://localhost:8000/docs))

---

## 📁 Project Structure

```
gemini-fullstack-monorepo/
├── .env.example            # Environment variable template
├── .env                    # Local environment config (git-ignored)
├── package.json            # Monorepo root scripts & npm workspace config
├── frontend/               # React 18 + Vite + Tailwind CSS app
│   ├── src/
│   │   ├── App.tsx         # Interactive Dashboard & Gemini Playground
│   │   ├── main.tsx        # React 18 root entry point
│   │   └── index.css       # Tailwind CSS configuration
│   ├── vite.config.ts      # Vite dev server & proxy settings
│   └── package.json
├── backend/                # Express.js + TypeScript server
│   ├── src/
│   │   ├── config/env.ts   # Env variable validation
│   │   ├── config/db.ts    # MongoDB connection manager
│   │   ├── services/gemini.ts # @google/genai SDK wrapper
│   │   ├── routes/api.ts   # Express routes (/health, /generate, /db-status)
│   │   └── index.ts        # Express server entry point
│   └── package.json
└── data-pipeline/          # FastAPI Python backend for data processing
    ├── main.py             # FastAPI entry point
    ├── requirements.txt    # Python dependencies
    └── app/
        ├── config.py       # Python env loader
        └── routers/pipeline.py # Data pipeline API routes
```
