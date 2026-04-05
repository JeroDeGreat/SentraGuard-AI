# SentraGuard AI

SentraGuard AI is a full-stack Employee Behavior Risk Analysis and Alert System built for hackathon demos and future real-world expansion. It monitors employee activity, scores suspicious behavior, shows the results in a live dashboard, and triggers alerts when a user becomes high risk.

This README is intentionally very detailed. It is written for two kinds of people:

- someone who wants the fastest possible one-click hackathon demo
- someone who wants the full setup from zero, including creating a virtual environment

---

## 1. What This Project Does

SentraGuard AI helps organizations detect risky employee behavior faster by:

- monitoring employee activity
- calculating risk scores
- grouping behavior into low, medium, and high risk
- surfacing a watchlist of employees who need attention
- showing activity trends and alerts in a professional dashboard
- sending alert-ready notifications when thresholds are crossed

The current version includes:

- `Simulation Mode` for demos and testing
- `Real Monitoring Mode` for live log ingestion
- `Rule-based Risk Scoring`
- `Watchlist + Alert Queue`
- `Admin Audit Log`
- `WebSocket Live Updates`
- `Telegram-ready Alerts`
- `Docker Support`
- `One-click Windows launcher + desktop shortcut`

---

## 2. What Is New In This Version

This project was upgraded to feel more like a real product instead of a classroom mockup.

### Better dashboard UX

- clear navigation tabs for `Overview`, `Employees`, `Activity`, `Alerts`, and `Integrations`
- less clutter on screen
- more focused workflows by tab
- more professional visual design

### Better simulation realism

- not every tick becomes a security incident
- most simulation activity is normal workplace behavior
- risky activity happens in short realistic stories like:
  - credential stuffing
  - staged download bursts
  - USB exfiltration attempts
  - after-hours access
- employees cool down after risky bursts instead of acting suspicious all the time

### Better operations feel

- watchlist for priority users
- top trigger breakdown
- recommended actions for the operator
- admin audit log for login and system mode changes

### Better hackathon launch flow

- one-click launcher
- desktop shortcut creation script
- custom icon for the shortcut
- `.venv` creation and package install handled automatically by the launcher

---

## 3. Tech Stack

- `Backend`: FastAPI, SQLAlchemy, WebSockets
- `Frontend`: HTML, CSS, JavaScript modules
- `Database`: SQLite by default, PostgreSQL-ready
- `Testing`: Pytest + FastAPI TestClient
- `Deployment`: Docker / docker-compose

---

## 4. Project Structure

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
      auth.py
      dashboard.py
      ingest.py
      system.py
    services/
      alert_service.py
      audit_service.py
      monitoring.py
      risk_engine.py
      simulation_engine.py
    schemas.py
    utils.py
  data/
  tests/

frontend/
  assets/
    favicon.svg
    sentraguard-mark.svg
    sentraguard-launcher.ico
  modules/
    api.js
    render.js
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

---

## 5. Quickest Hackathon Route

If you only care about getting the demo running fast on Windows, do this:

### Option A: double-click the desktop shortcut

If the shortcut already exists on your desktop, double-click:

- `SentraGuard AI`

### Option B: double-click the launcher file

Use:

[`Launch SentraGuard AI.bat`](./Launch%20SentraGuard%20AI.bat)

### Option C: run the launcher from PowerShell

If Windows blocks the double-click path:

```powershell
cd "C:\Users\Jero Grabo\Documents\Playground"
cmd /c ".\Launch SentraGuard AI.bat"
```

### What the launcher does automatically

When you run the launcher, it:

1. checks if Python exists
2. creates `.venv` if it is missing
3. installs or updates project dependencies
4. creates `.env` from `.env.example` if needed
5. starts the FastAPI server
6. waits for the app to be ready
7. opens the browser automatically

This is the fastest recommended path for a hackathon demo.

---

## 6. Full Setup From Zero

This section is for someone starting from scratch.

## Step 1: Confirm Python is installed

Open PowerShell and run:

```powershell
python --version
```

If that does not work, try:

```powershell
py --version
```

You should have Python `3.11+`.

If Python is not installed:

1. install Python from the official Python website
2. during install, make sure `Add Python to PATH` is enabled
3. close and reopen PowerShell
4. rerun `python --version`

## Step 2: Open the project folder

```powershell
cd "C:\Users\Jero Grabo\Documents\Playground"
```

If you want to verify the files are there:

```powershell
Get-ChildItem
```

You should see files like:

- `README.md`
- `requirements.txt`
- `Launch SentraGuard AI.bat`
- `backend`
- `frontend`

## Step 3: Create the virtual environment

Using `python`:

```powershell
python -m venv .venv
```

If that fails, use:

```powershell
py -3 -m venv .venv
```

This creates a local folder named `.venv`.

## Step 4: Activate the virtual environment

### PowerShell

```powershell
.venv\Scripts\Activate.ps1
```

### Command Prompt

```cmd
.venv\Scripts\activate.bat
```

When the virtual environment is active, your prompt usually starts with:

```text
(.venv)
```

## Step 5: Upgrade pip

```powershell
python -m pip install --upgrade pip
```

## Step 6: Install project dependencies

```powershell
python -m pip install -r requirements.txt
```

Wait for the install to finish completely before moving on.

## Step 7: Create the environment file

If `.env` does not already exist, run:

```powershell
Copy-Item .env.example .env
```

## Step 8: Start the application manually

```powershell
python -m uvicorn backend.app.main:app --reload
```

## Step 9: Open the application in your browser

Open:

- Dashboard: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Swagger API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## Step 10: Log in

Default seeded admin account:

```text
Email: admin@sentraguard.local
Password: ChangeMe123!
```

## Step 11: Stop the application

Go back to the terminal window where the server is running and press:

```text
Ctrl + C
```

---

## 7. One-Click Launcher And Desktop Shortcut

This project includes a hackathon-friendly launcher:

- [`Launch SentraGuard AI.bat`](./Launch%20SentraGuard%20AI.bat)

It also includes a shortcut creation script:

- [`Create Desktop Shortcut.ps1`](./Create%20Desktop%20Shortcut.ps1)

### How to create the desktop shortcut

Open PowerShell in the project folder and run:

```powershell
cd "C:\Users\Jero Grabo\Documents\Playground"
powershell -ExecutionPolicy Bypass -File ".\Create Desktop Shortcut.ps1"
```

### What the shortcut does

The desktop shortcut:

- points to `cmd.exe`
- launches the SentraGuard batch launcher
- uses the custom SentraGuard icon
- starts minimized for a cleaner demo feel

### Best hackathon usage

For a live presentation:

1. double-click the desktop shortcut
2. wait for the browser to open
3. log in
4. demo the dashboard

---

## 8. Configuration Reference

Main configuration comes from `.env`.

### Core app settings

```text
SENTRAGUARD_APP_NAME=SentraGuard AI
SENTRAGUARD_ENV=development
SENTRAGUARD_SECRET_KEY=change-this-in-production
```

### Database

```text
SENTRAGUARD_DATABASE_URL=sqlite:///backend/data/sentraguard.db
```

Default behavior:

- uses local SQLite
- stores the database in `backend/data/sentraguard.db`

### Admin account

```text
SENTRAGUARD_ADMIN_EMAIL=admin@sentraguard.local
SENTRAGUARD_ADMIN_PASSWORD=ChangeMe123!
SENTRAGUARD_ADMIN_ROLE=admin
```

These values control the seeded administrator account.

### Simulation settings

```text
SENTRAGUARD_ENABLE_SIMULATION=true
SENTRAGUARD_DEFAULT_MODE=simulation
SENTRAGUARD_SIM_EMPLOYEE_COUNT=120
SENTRAGUARD_SIM_TICK_SECONDS=4.0
```

Notes:

- `SENTRAGUARD_ENABLE_SIMULATION=true` keeps demo mode available
- `SENTRAGUARD_DEFAULT_MODE=simulation` means the app starts in simulation mode
- `SENTRAGUARD_SIM_EMPLOYEE_COUNT=120` seeds 120 employees
- `SENTRAGUARD_SIM_TICK_SECONDS=4.0` slows the simulation to a calmer cadence

### Risk and alert settings

```text
SENTRAGUARD_HIGH_RISK_THRESHOLD=70
SENTRAGUARD_ALERT_COOLDOWN_MINUTES=20
SENTRAGUARD_RISK_WINDOW_HOURS=24
SENTRAGUARD_TELEMETRY_WINDOW_HOURS=12
```

### Ingestion settings

```text
SENTRAGUARD_INGEST_API_KEY=sentra-ingest-key
```

### Telegram settings

```text
SENTRAGUARD_TELEGRAM_BOT_TOKEN=
SENTRAGUARD_TELEGRAM_CHAT_ID=
```

Leave them blank if you only want dashboard alerts.

---

## 9. Understanding The Two Modes

### Simulation Mode

Simulation mode is meant for demos and testing.

It now behaves more realistically:

- most activity is normal
- low-risk noise is limited
- risky behavior appears occasionally
- risky behavior happens in short realistic chains
- employees do not trigger security issues constantly

### Real Monitoring Mode

Real mode pauses the simulation engine and expects real events through the ingestion API.

Use real mode when you want to:

- feed authentication logs
- feed file access logs
- feed system events from external tooling

---

## 10. Real Log Ingestion API

Send events to:

```text
POST /api/v1/logs/ingest
```

### Authentication choices

You can use either:

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

---

## 11. Telegram Alert Setup

If you want Telegram alerts:

1. create a Telegram bot using BotFather
2. copy the bot token
3. get the chat ID you want to send to
4. add both values to `.env`

Example:

```text
SENTRAGUARD_TELEGRAM_BOT_TOKEN=your_bot_token_here
SENTRAGUARD_TELEGRAM_CHAT_ID=your_chat_id_here
```

If these are empty, dashboard alerts still work normally.

---

## 12. API And Admin Audit Features

### Useful endpoints

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/overview`
- `GET /api/v1/employees/{employee_id}`
- `GET /api/v1/rules`
- `GET /api/v1/system/mode`
- `POST /api/v1/system/mode`
- `GET /api/v1/system/audit`
- `POST /api/v1/logs/ingest`

### Audit log

This version includes a lightweight admin audit trail for:

- administrator login
- monitoring mode changes

This gives the system a stronger operational foundation for future:

- multi-admin support
- role-based workflows
- persistent alert handling

---

## 13. Running Tests

Run:

```powershell
python -m pytest backend/tests/test_api.py
```

What is currently tested:

- login
- overview endpoint
- ingestion pipeline
- high-risk alert creation
- mode switching
- overview payload additions

---

## 14. Docker Setup

If you want to run the project with Docker:

```powershell
docker compose up --build
```

If you want PostgreSQL inside Docker instead of SQLite, update `.env`:

```text
SENTRAGUARD_DATABASE_URL=postgresql+psycopg://sentraguard:sentraguard@postgres:5432/sentraguard
```

---

## 15. Hackathon Demo Script

If you want a simple live demo flow, use this order:

1. launch the app from the desktop shortcut
2. log in with the admin account
3. start on the `Overview` tab
4. show the watchlist, trigger breakdown, and recommended actions
5. move to the `Employees` tab and inspect one user
6. move to the `Activity` tab and show realistic normal behavior mixed with rare escalations
7. move to the `Alerts` tab and explain escalation handling
8. move to the `Integrations` tab and show:
   - simulation vs real mode
   - ingest API snippet
   - rule set
   - admin audit log
9. switch to real mode
10. show Swagger or an example ingest payload

---

## 16. Troubleshooting

### Python was not found

Install Python `3.11+` and make sure it is added to `PATH`.

Then reopen PowerShell and run:

```powershell
python --version
```

### Virtual environment activation is blocked in PowerShell

Use Command Prompt instead:

```cmd
.venv\Scripts\activate.bat
```

Or use a temporary PowerShell bypass:

```powershell
powershell -ExecutionPolicy Bypass
```

### Dependencies fail to install

Try:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### Port 8000 is already in use

Run on another port:

```powershell
python -m uvicorn backend.app.main:app --reload --port 8001
```

Then open:

- [http://127.0.0.1:8001](http://127.0.0.1:8001)

### Browser does not open automatically

Wait a few seconds and refresh manually, or open:

- [http://127.0.0.1:8000](http://127.0.0.1:8000)

### Smart App Control blocked the shortcut or launcher

If Windows blocks the clickable launcher, use this safe flow:

1. open PowerShell in the project folder
2. unblock the files
3. recreate the shortcut
4. run the launcher from the terminal if needed

Commands:

```powershell
cd "C:\Users\Jero Grabo\Documents\Playground"
Unblock-File -Path ".\Launch SentraGuard AI.bat"
Unblock-File -Path ".\Create Desktop Shortcut.ps1"
powershell -ExecutionPolicy Bypass -File ".\Create Desktop Shortcut.ps1"
cmd /c ".\Launch SentraGuard AI.bat"
```

### I want to reset the demo database

Stop the app, then delete the SQLite file:

```powershell
Remove-Item ".\backend\data\sentraguard.db"
```

When the app starts again, it will recreate the database and reseed the employees.

### The shortcut exists but has the wrong icon

Recreate it:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Create Desktop Shortcut.ps1"
```

---

## 17. GitHub

Repository:

[https://github.com/JeroDeGreat/SentraGuard-AI](https://github.com/JeroDeGreat/SentraGuard-AI)

This workspace is already connected to that repo, so future changes can be committed and pushed directly.

---

## 18. Future Roadmap

The current codebase is designed so it can grow into:

- `Isolation Forest` or other anomaly detection models
- true streaming integrations from system logs
- multi-admin management
- persistent alert workflows
- cloud deployment
- deeper role-based audit logging

The new simulation and audit foundations were added specifically to make those future upgrades easier.
