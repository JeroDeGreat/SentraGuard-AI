# SentraGuard AI

SentraGuard AI is a full-stack Employee Behavior Risk Analysis and Alert System built for hackathon demos and future real-world expansion. It monitors employee activity, scores suspicious behavior, shows the results in a live dashboard, and triggers alerts when a user becomes high risk.

This README is intentionally detailed so anyone can set the project up from zero, even if they have never created a Python virtual environment before.

## 1. Project Summary

SentraGuard AI solves the problem of slow and manual insider-threat monitoring by:

- collecting employee activity events
- detecting risky patterns with rule-based logic
- assigning live risk scores
- showing high-risk users in a dashboard
- sending alerts when risk crosses a threshold

The system currently supports:

- `Simulation Mode` for hackathon demos and testing
- `Real Monitoring Mode` for external log ingestion
- `Rule-based Risk Engine`
- `Live Dashboard`
- `Alert Feed`
- `Telegram-ready alert delivery`
- `API tests`
- `Docker support`

## 2. Tech Stack

- `Backend`: FastAPI, SQLAlchemy, WebSockets
- `Frontend`: HTML, CSS, JavaScript modules
- `Database`: SQLite by default, PostgreSQL-ready
- `Testing`: Pytest + FastAPI TestClient
- `Deployment Ready`: Docker / docker-compose

## 3. Folder Structure

```text
backend/
  app/
    auth.py
    bootstrap.py
    config.py
    database.py
    deps.py
    main.py
    models.py
    realtime.py
    routers/
    schemas.py
    services/
    utils.py
  data/
  tests/

frontend/
  assets/
  modules/
  app.js
  index.html
  styles.css

simulation/
  profiles.py
  scenarios.py

.env.example
.gitignore
Dockerfile
docker-compose.yml
requirements.txt
Launch SentraGuard AI.bat
Create Desktop Shortcut.ps1
README.md
```

## 4. What Each Main Part Does

### Backend

- Handles authentication
- Stores employees, activities, and alerts
- Calculates risk scores
- Exposes APIs for the dashboard
- Accepts real log ingestion
- Streams live updates through WebSockets

### Frontend

- Shows the security dashboard
- Displays risk metrics and charts
- Lists employees and alerts
- Lets the admin switch between simulation and real mode

### Simulation

- Creates realistic employee behavior
- Produces both safe and risky activity
- Helps demonstrate the product during presentations

## 5. Features Included

### Simulation Mode

- Seeds 120 employees
- Simulates:
  - login success
  - failed logins
  - file downloads
  - USB insertion
  - data transfer
  - sensitive resource access

### Real Monitoring Mode

- Accepts JSON events from external systems
- Supports:
  - employee code
  - name
  - department
  - event type
  - metadata/details

### Risk Rules

Current scoring examples:

- unusual login time
- repeated failed logins
- excessive downloads
- USB activity
- external data transfer
- restricted resource access
- multi-vector suspicious bursts

### Alerts

- Dashboard alert feed
- Telegram-ready integration
- Cooldown logic to avoid alert spam

## 6. Prerequisites

Before running the project manually, make sure you have:

- `Python 3.11+` installed
- `pip` available
- internet access for dependency installation
- Windows PowerShell or Command Prompt

To verify Python:

```powershell
python --version
```

If that fails, try:

```powershell
py --version
```

## 7. Full Manual Setup From Zero

This section shows every setup step in order.

### Step 1: Open the project folder

Open PowerShell in the project folder:

```powershell
cd "C:\Users\Jero Grabo\Documents\Playground"
```

### Step 2: Create a virtual environment

This creates an isolated Python environment so the project dependencies do not mix with other projects.

Using `python`:

```powershell
python -m venv .venv
```

If that does not work, use:

```powershell
py -3 -m venv .venv
```

### Step 3: Activate the virtual environment

In PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

In Command Prompt:

```cmd
.venv\Scripts\activate.bat
```

When activated, your terminal usually shows `(.venv)` at the beginning of the line.

### Step 4: Upgrade pip

```powershell
python -m pip install --upgrade pip
```

### Step 5: Install dependencies

```powershell
python -m pip install -r requirements.txt
```

### Step 6: Create your local environment file

If `.env` does not exist yet:

```powershell
Copy-Item .env.example .env
```

### Step 7: Start the application

```powershell
python -m uvicorn backend.app.main:app --reload
```

### Step 8: Open the application

Open:

- Dashboard: [http://localhost:8000](http://localhost:8000)
- Swagger docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### Step 9: Log in

Default seeded admin account:

```text
Email: admin@sentraguard.local
Password: ChangeMe123!
```

## 8. One-Click Hackathon Launch

For speed during the hackathon, use:

[`Launch SentraGuard AI.bat`](./Launch%20SentraGuard%20AI.bat)

What it does automatically:

1. checks for Python
2. creates `.venv` if missing
3. installs requirements if needed
4. creates `.env` from `.env.example` if missing
5. starts the FastAPI server
6. opens the browser when the app is ready

This is the fastest way to demo the project.

## 9. Desktop Shortcut

There are two ways to get a clickable shortcut:

### Option A: Use the shortcut I created locally

If the desktop shortcut was created successfully on your machine, just double-click:

- `SentraGuard AI`

### Option B: Recreate it anytime

Run:

[`Create Desktop Shortcut.ps1`](./Create%20Desktop%20Shortcut.ps1)

That script creates a desktop shortcut that points to `cmd.exe`, which then launches the batch file. This is more reliable on Windows than pointing the shortcut straight at the batch file itself.

## 10. Configuration

Main config values come from `.env`.

Important variables:

```text
SENTRAGUARD_APP_NAME=SentraGuard AI
SENTRAGUARD_ENV=development
SENTRAGUARD_DATABASE_URL=sqlite:///backend/data/sentraguard.db
SENTRAGUARD_SECRET_KEY=change-this-in-production
SENTRAGUARD_ADMIN_EMAIL=admin@sentraguard.local
SENTRAGUARD_ADMIN_PASSWORD=ChangeMe123!
SENTRAGUARD_INGEST_API_KEY=sentra-ingest-key
SENTRAGUARD_ENABLE_SIMULATION=true
SENTRAGUARD_DEFAULT_MODE=simulation
SENTRAGUARD_HIGH_RISK_THRESHOLD=70
SENTRAGUARD_TELEGRAM_BOT_TOKEN=
SENTRAGUARD_TELEGRAM_CHAT_ID=
```

## 11. Real Log Ingestion API

Send events to:

```text
POST /api/v1/logs/ingest
```

Authentication options:

- `Authorization: Bearer <admin-token>`
- `X-Ingest-Token: <SENTRAGUARD_INGEST_API_KEY>`

### Example request

```json
{
  "events": [
    {
      "employee_code": "EMP-401",
      "employee_name": "A. Mensah",
      "department": "Finance",
      "title": "Risk Analyst",
      "event_type": "login_failed",
      "details": {
        "location": "External IP"
      }
    }
  ]
}
```

### Supported event types

- `login_success`
- `login_failed`
- `file_download`
- `usb_inserted`
- `data_transfer`
- `sensitive_access`

## 12. Telegram Alert Setup

If you want alerts sent to Telegram:

1. create a Telegram bot with BotFather
2. copy the bot token
3. get your chat ID
4. add both values to `.env`

```text
SENTRAGUARD_TELEGRAM_BOT_TOKEN=your_bot_token_here
SENTRAGUARD_TELEGRAM_CHAT_ID=your_chat_id_here
```

Without these values, the alert system still works inside the dashboard.

## 13. Running Tests

Run:

```powershell
python -m pytest backend/tests/test_api.py
```

What is tested:

- login
- overview endpoint
- ingestion pipeline
- high-risk alert creation
- mode switching

## 14. Docker Setup

If you want to run with Docker:

```powershell
docker compose up --build
```

If using PostgreSQL in Docker, update `.env`:

```text
SENTRAGUARD_DATABASE_URL=postgresql+psycopg://sentraguard:sentraguard@postgres:5432/sentraguard
```

## 15. How To Demo This In A Hackathon

Recommended flow:

1. double-click the desktop shortcut or `Launch SentraGuard AI.bat`
2. log in with the seeded admin account
3. show Simulation Mode producing live events
4. highlight risk scores, charts, and alert feed
5. switch to Real Monitoring Mode
6. show the ingestion API in Swagger or with a sample JSON request
7. explain that ML models can be added later

## 16. Future Improvements

- Isolation Forest or anomaly detection models
- true streaming integrations from system logs
- multi-admin support
- persistent alert workflows
- cloud deployment
- role-based audit logging

## 17. Troubleshooting

### Python not found

Install Python and make sure it is added to PATH.

### Virtual environment activation blocked

Use Command Prompt and run:

```cmd
.venv\Scripts\activate.bat
```

### Dependencies fail to install

Try:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### Port 8000 already in use

Run the app on another port:

```powershell
python -m uvicorn backend.app.main:app --reload --port 8001
```

### Browser opens before server is ready

Refresh once after a few seconds, or use the launcher again.

### Smart App Control blocked the shortcut or launcher

If Windows blocks the clickable launcher, use this safe recovery flow:

1. Open PowerShell in the project folder:

```powershell
cd "C:\Users\Jero Grabo\Documents\Playground"
```

2. Remove the downloaded-file block marker from the launcher files:

```powershell
Unblock-File -Path ".\Launch SentraGuard AI.bat"
Unblock-File -Path ".\Create Desktop Shortcut.ps1"
```

3. Recreate the desktop shortcut:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Create Desktop Shortcut.ps1"
```

4. If the desktop shortcut is still blocked, launch from the terminal instead:

```powershell
cmd /c ".\Launch SentraGuard AI.bat"
```

5. If you want the most direct manual fallback, run the server yourself:

```powershell
.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

Only use the Windows Security setting for disabling Smart App Control as a last resort. Turning it off can be hard to reverse without resetting Windows, so the command-line fallback is the safer hackathon option.

## 18. GitHub

Repository:

[https://github.com/JeroDeGreat/SentraGuard-AI](https://github.com/JeroDeGreat/SentraGuard-AI)

This local workspace is already connected to that repo, so future updates can be committed and pushed directly.
