# AI-Powered Root Cause Analysis (RCA) Module – API Manufacturing

Workflow: **Deviation intake → AI extraction → RCA (5 Whys + Fishbone) → root cause suggestions → CAPA → human review → save.**

| Layer    | Tech |
|----------|------|
| Frontend | React 18 + Redux Toolkit (Vite) |
| Backend  | Python + FastAPI |
| AI       | LangGraph + Groq (`llama-3.3-70b-versatile`) |
| Database | PostgreSQL (or MySQL) via SQLAlchemy |

## Run in PyCharm

### 1. Database
```sql
CREATE DATABASE rca_db;
```
(MySQL: change `DATABASE_URL` to `mysql+pymysql://user:pass@localhost:3306/rca_db`.
For a quick local try-out you may set `DATABASE_URL=sqlite:///./rca.db`.) Tables are created automatically on start.

### 2. Backend
1. Open the `rca-module` folder in PyCharm. Create a venv: *Settings → Python Interpreter → Add → Virtualenv* (Python 3.10–3.12).
2. Terminal:
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env      # then edit: GROQ_API_KEY and DATABASE_URL
python run.py             # http://127.0.0.1:8000  (Swagger: /docs)
```
Or right-click `backend/run.py` → Run.

### 3. Frontend (needs Node 18+)
```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

### 4. Try it
Upload or paste `sample_docs/sample_deviation.txt` → **1 · Extract and fill the form** → review → **2 · Investigate** → edit → tick *Confirm* on each root cause, name the reviewer → **Save confirmed investigation**.

## API
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/documents/extract-text` | PDF / EML / TXT → text |
| POST | `/api/ai/extract` | LangGraph `extract` node → RCA form fields |
| POST | `/api/ai/investigate` | LangGraph `investigate → capa` nodes |
| GET/POST/DELETE | `/api/investigations[/{id}]` | list, save (create/update), open, delete |

## Design decisions
- **AI fills the form, humans decide.** Auto-filled fields are highlighted ("AI filled") and clear when edited.
- Root causes start as **AI Suggestion**; the server refuses status *Confirmed* unless every root cause is confirmed and a reviewer is named.
- Prompts forbid invented facts; missing evidence is listed explicitly.
- Do **not** push this project, sample docs or videos to a public repository (assignment rule).
