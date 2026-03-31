# SentraGuard AI

SentraGuard AI is a full-stack employee behavior risk analysis and alert system built for demo mode and real log ingestion. It monitors employee activity, scores behavioral risk, streams live updates into a security dashboard, and raises alerts when risk crosses a threshold.

## What It Includes

- `Simulation mode` with 120 seeded employees whose behavior evolves over time
- `Real monitoring mode` with a JSON ingestion API for external logs
- `Rule-based risk engine` for login anomalies, failed logins, excessive downloads, USB activity, and data transfer risk
- `Live dashboard` with risk distribution, trends, employee queue, activity feed, and alert feed
- `Alert pipeline` with Telegram delivery support when bot credentials are configured
- `FastAPI docs` at `/docs`
- `Docker-ready` setup plus API tests

## Stack

- `Backend`: FastAPI, SQLAlchemy, WebSockets
- `Frontend`: modular HTML, CSS, and ES modules served by FastAPI
- `Database`: SQLite by default, PostgreSQL-ready through `SENTRAGUARD_DATABASE_URL`
- `Testing`: Pytest + FastAPI TestClient

## Project Structure

```text
backend/
  app/
    config.py
    database.py
    auth.py
    models.py
    schemas.py
    services/
    routers/
    main.py
  tests/
frontend/
  index.html
  styles.css
  app.js
  modules/
  assets/
simulation/
  profiles.py
  scenarios.py
```

## Quick Start

1. Create and activate a virtual environment.
2. Install dependencies:

```powershell
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env` if you want to customize configuration.
4. Start the app:

```powershell
uvicorn backend.app.main:app --reload
```

5. Open [http://localhost:8000](http://localhost:8000)
6. Use the seeded admin credentials unless you changed them:

```text
Email: admin@sentraguard.local
Password: ChangeMe123!
```

## Real Log Ingestion

Post JSON events to:

```text
POST /api/v1/logs/ingest
```

Use either:

- `Authorization: Bearer <admin-token>`
- `X-Ingest-Token: <SENTRAGUARD_INGEST_API_KEY>`

Example payload:

```json
{
  "events": [
    {
      "employee_code": "EMP-401",
      "employee_name": "A. Mensah",
      "department": "Finance",
      "event_type": "login_failed",
      "details": {
        "location": "External IP"
      }
    }
  ]
}
```

## Telegram Alerts

Set these environment variables to enable Telegram delivery:

```text
SENTRAGUARD_TELEGRAM_BOT_TOKEN=...
SENTRAGUARD_TELEGRAM_CHAT_ID=...
```

Without them, alerts still appear in the dashboard.

## API Docs

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/api/v1/system/health](http://localhost:8000/api/v1/system/health)

## Tests

```powershell
python -m pytest backend/tests/test_api.py
```

## Docker

```powershell
docker compose up --build
```

For PostgreSQL in Docker, point `SENTRAGUARD_DATABASE_URL` in `.env` to:

```text
postgresql+psycopg://sentraguard:sentraguard@postgres:5432/sentraguard
```

## Suggested Git Steps

```powershell
git checkout -b codex/sentraguard-ai
git add .
git commit -m "Build SentraGuard AI risk analysis platform"
```
