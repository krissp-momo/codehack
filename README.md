# MCP Agentic Gateway — Prototype

**Tic Tech Toe '26 · PS-6 · Team: Coders**

An AI-powered Agentic MCP Gateway prototype that orchestrates multiple APIs to automate business workflows.

## Features
- ✉️ **Email Extractor** — paste email body → AI maps it to Google Sheet headers → verify & sync
- 🎙️ **Transcript Extractor** — paste Otter.ai transcript → extract client data → verify & sync  
- 🎤 **Voice Input** — Hindi & English (Web Speech API)
- 📅 **Calendar & Notes** — schedule online/offline meetings with reminders
- 📊 **Cost Dashboard** — live token usage, cost tracking, Outbox Buffer retries
- 🛡️ **Outbox Buffer** — zero data loss via SQLite buffer + fallback API switching

## Stack
- **Frontend**: Next.js 16 (TypeScript + Tailwind CSS) — `localhost:3000`
- **Backend**: Python FastAPI — `localhost:8000`

## Run Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Add Real API Keys (optional, for production)
Copy `backend/.env.example` → `backend/.env` and fill in:
- `OPENAI_API_KEY`
- `GOOGLE_SHEETS_ID`
