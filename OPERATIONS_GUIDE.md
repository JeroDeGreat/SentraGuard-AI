# SentraGuard AI - Operations Guide

This is the full working guide for SentraGuard AI.

Use this file when you want to know:

- how to install everything from zero
- which launcher to use and when
- how to use each tab
- how to use the scenario launcher
- how to run real monitoring mode
- how to send events from this PC
- how to send events from a friend's PC
- how to refresh the desktop app or browser version
- how to rebuild the desktop `.exe`

## 1. The Simplest Mental Model

SentraGuard AI has two ways to view the app:

1. Desktop app
2. Browser app

It also has two data modes:

1. Simulation
2. Real Monitoring

And it has one command helper:

1. `Send SentraGuard Interaction.ps1`

If you only remember one normal startup file, remember this:

- [Start SentraGuard AI.bat](./Start%20SentraGuard%20AI.bat)

## 2. Which File Should I Use?

Use this section first when you are unsure.

- Normal everyday startup: [Start SentraGuard AI.bat](./Start%20SentraGuard%20AI.bat)
- First-time install or rebuild the desktop app: [Install SentraGuard Desktop App.bat](./Install%20SentraGuard%20Desktop%20App.bat)
- Browser-only launch: [Launch SentraGuard AI.bat](./Launch%20SentraGuard%20AI.bat)
- Allow another PC to send events to your app: [Launch SentraGuard Network Demo.bat](./Launch%20SentraGuard%20Network%20Demo.bat)
- Send demo or real-mode interactions by command: [Send SentraGuard Interaction.ps1](./Send%20SentraGuard%20Interaction.ps1)
- Rebuild the packaged desktop app manually: [Build SentraGuard Desktop App.bat](./Build%20SentraGuard%20Desktop%20App.bat)

## 3. First-Time Setup For A New Windows Machine

If this is the first time SentraGuard AI is being used on a machine, do this:

1. Open the project folder.
2. Double-click [Install SentraGuard Desktop App.bat](./Install%20SentraGuard%20Desktop%20App.bat).
3. Wait until the build finishes.
4. Confirm that the desktop shortcut named `SentraGuard AI` was created.
5. From then on, use the desktop shortcut or [Start SentraGuard AI.bat](./Start%20SentraGuard%20AI.bat).

What the installer does:

1. Creates `.venv` if it does not exist.
2. Repairs `pip` if Python created a broken virtual environment.
3. Installs backend and frontend runtime dependencies.
4. Installs desktop packaging dependencies.
5. Builds the Windows `.exe`.
6. Creates or refreshes the desktop shortcut.

## 4. Full Manual Setup From Zero

Use this only if you want to install manually.

### Check Python

Open PowerShell in the project folder:

```powershell
cd "C:\Users\Jero Grabo\Documents\Playground"
```

Check Python:

```powershell
python --version
```

If `python` does not work, try:

```powershell
py --version
```

### Create the virtual environment

```powershell
python -m venv .venv
```

If your machine uses `py`:

```powershell
py -3 -m venv .venv
```

### Activate the virtual environment

```powershell
.venv\Scripts\Activate.ps1
```

### Repair or upgrade pip

```powershell
python -m ensurepip --upgrade
python -m pip install --upgrade pip
```

### Install dependencies

```powershell
python -m pip install -r requirements.txt
python -m pip install -r requirements-desktop.txt
```

### Create the environment file

```powershell
Copy-Item .env.example .env
```

### Run the browser version manually

```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

Open:

- [http://127.0.0.1:8000](http://127.0.0.1:8000)
- [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Build the desktop app manually

```powershell
cmd /c ".\Build SentraGuard Desktop App.bat"
```

The packaged app is created at:

- `dist\SentraGuard AI\SentraGuard AI.exe`

## 5. Normal Startup Flow

This is the recommended daily flow:

1. Launch [Start SentraGuard AI.bat](./Start%20SentraGuard%20AI.bat) or the desktop shortcut.
2. Sign in.
3. Use the `Overview` tab first.
4. Move to `Investigations` or `Activity` depending on what you want to show next.
5. Use the scenario launcher in `Operations` if you want to force a known story.
6. Stay in `Operations` if you want to change modes, share the app to another PC, or run helper commands.

Default login:

```text
Email: admin@sentraguard.local
Password: ChangeMe123!
```

## 6. Browser App Vs Desktop App

Both versions use the same backend and the same interface.

Desktop app:

- feels like a real native program
- opens in the packaged window
- is the best demo choice for hackathons

Browser app:

- is easier when you want to inspect API docs
- is useful when you are developing or testing quickly
- is the fallback if the `.exe` is not built yet

If you want the browser version on purpose, use:

- [Launch SentraGuard AI.bat](./Launch%20SentraGuard%20AI.bat)

## 7. What Each Tab Does

### Overview

Use `Overview` for the main story.

It shows:

- current risk posture
- watchlist
- top triggers
- department pressure
- recommended actions

### Investigations

Use `Investigations` when you want to focus on one employee.

It shows:

- search and filtering
- current risk score
- recent activity
- related alerts
- baseline profile context

### Activity

Use `Activity` when you want to show live behavior across the company.

It shows:

- recent activity feed
- trigger mix
- department heat

### Alerts

Alert review now lives in `Overview` and `Investigations`.

It shows:

- active alerts
- escalation summaries
- operator runbook items

### Operations

Use `Operations` for scenario control, live ingestion, and runtime setup.

It lets you:

- choose an employee and a scenario
- decide whether the scenario lands in simulation, real mode, or the current mode
- inject a real event directly from the app
- switch between `Simulation` and `Real Monitoring`
- change simulation tempo between `Calm`, `Balanced`, and `Demo`
- see detected connection targets
- read real-mode setup steps
- copy the helper commands you need for this PC or another PC
- review scoring rules and the admin audit feed

## 8. How Simulation Mode Works

Simulation mode is the built-in behavior generator.

It now tries to feel realistic:

- most activity is normal workplace behavior
- anomalies arrive in short believable stories
- risk is not constant
- feed volume depends on the selected simulation tempo

Simulation tempo settings:

- `Calm`: quieter, more realistic, fewer bursts
- `Balanced`: best default for normal demos
- `Demo`: livelier feed with shorter quiet periods

Use `Demo` during a hackathon if the room feels too quiet.

## 9. How To Use The Scenario Launcher

The scenario launcher inside `Operations` is the easiest way to force a story without waiting for the simulation.

### Scenario launcher in the app

1. Open `Operations`.
2. Choose an employee.
3. Choose a scenario.
4. Choose where it should write:
   `Current mode`, `Simulation mode`, or `Real mode`
5. Click `Launch Scenario`.
6. Watch `Overview`, `Activity`, and `Investigations` update.

### Best scenario presets

- `credential_stuffing`: fast security escalation
- `download_burst`: suspicious access followed by large downloads
- `usb_exfiltration`: strong insider-threat story
- `external_transfer`: sensitive work followed by outbound transfer
- `clean_shift_start`: safe example

### When to use Current mode

Use `Current mode` when you just want the scenario to land wherever the system is already running.

### When to use Real mode from the scenario launcher

Use `Real mode` when you want the system to prove that the same scoring pipeline works without the background simulation.

## 10. How To Send Interactions From This PC

You can trigger interactions without touching the UI by using:

- [Send SentraGuard Interaction.ps1](./Send%20SentraGuard%20Interaction.ps1)

### Control channel example

Use the control channel when you want a full scenario story:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Send SentraGuard Interaction.ps1" -Channel control -Mode current -Preset credential_stuffing
```

### Ingest channel example

Use the ingest channel when you want to mimic raw monitoring data:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Send SentraGuard Interaction.ps1" -Channel ingest -Mode real -Preset usb_exfiltration
```

### Good rule

- `control` = scenario storytelling
- `ingest` = realistic incoming logs

## 11. How To Use Real Monitoring Mode

Real monitoring mode pauses the simulation and waits for live or helper-driven events.

### Real monitoring on the same PC

1. Open `Operations`.
2. Switch from `Simulation` to `Real Monitoring`.
3. Copy the helper command from the `Send Real Events` panel or use the PowerShell script manually.
4. Send an interaction.
5. Watch the dashboard update live.

Example:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Send SentraGuard Interaction.ps1" -Channel ingest -Mode real -Preset credential_stuffing
```

### Real monitoring using the API docs

1. Start SentraGuard.
2. Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) or the URL shown in the app.
3. Use the `/api/v1/logs/ingest` endpoint.
4. Add the ingest header:

```text
X-Ingest-Token: sentra-ingest-key
```

5. Send a JSON body with one or more events.

Example payload:

```json
{
  "events": [
    {
      "employee_code": "EMP-014",
      "employee_name": "Jordan Vale",
      "department": "Finance",
      "title": "Senior Analyst",
      "event_type": "login_failed",
      "source": "manual-demo",
      "details": {
        "location": "External IP",
        "network_trust": "low"
      }
    }
  ]
}
```

## 12. How To Send Events From A Friend's Computer

This is the correct cross-PC flow.

### Step 1: on the host machine

Run:

```powershell
cmd /c ".\Launch SentraGuard Network Demo.bat"
```

That starts SentraGuard on `0.0.0.0:8000` so another PC can reach it.

Then:

1. Sign in.
2. Open `Operations`.
3. Switch to `Real Monitoring`.
4. Check the `Connection Targets` panel.
5. Tell your friend to use the detected network URL, or your host machine's LAN IP if they need to type it manually.

### Step 2: on the second machine

The second machine needs a copy of:

- [Send SentraGuard Interaction.ps1](./Send%20SentraGuard%20Interaction.ps1)

Then run:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Send SentraGuard Interaction.ps1" -Server http://YOUR-PC-IP:8000 -Channel ingest -Mode real -Preset external_transfer
```

Replace `YOUR-PC-IP` with the host machine's local IP, for example:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Send SentraGuard Interaction.ps1" -Server http://192.168.1.50:8000 -Channel ingest -Mode real -Preset credential_stuffing
```

### What to check if it does not work

- both machines are on the same Wi-Fi or LAN
- the host is using [Launch SentraGuard Network Demo.bat](./Launch%20SentraGuard%20Network%20Demo.bat)
- the host app is in `Real Monitoring`
- the IP address is correct
- Windows Firewall is not blocking port `8000`

## 13. How Refresh Works

SentraGuard now supports refresh in both the browser and desktop shell.

### Soft refresh

Use:

- `Sync Data`

This refreshes the data shown in the app without reloading the whole interface.

### Full refresh

Use:

- `Reload UI`

This forces a full interface reload with a fresh timestamp so cached assets are less likely to stick.

### Keyboard shortcuts

These now work in the browser and the desktop shell:

- `F5`
- `Ctrl + R`

### Auto-refresh behavior

When the app regains focus, it also tries to refresh data automatically.

## 14. Environment Variables You Should Know

Main values from `.env`:

```text
SENTRAGUARD_ADMIN_EMAIL=admin@sentraguard.local
SENTRAGUARD_ADMIN_PASSWORD=ChangeMe123!
SENTRAGUARD_INGEST_API_KEY=sentra-ingest-key
SENTRAGUARD_DEFAULT_MODE=simulation
SENTRAGUARD_SIM_TEMPO=balanced
SENTRAGUARD_SIM_EMPLOYEE_COUNT=120
SENTRAGUARD_SIM_TICK_SECONDS=3.0
SENTRAGUARD_HIGH_RISK_THRESHOLD=70
```

## 15. Testing

Run the API test suite:

```powershell
python -m pytest backend/tests/test_api.py
```

Run a desktop smoke test:

```powershell
python desktop_app.py --smoke-test
```

## 16. Packaging And Rebuilds

If the packaged app needs to be rebuilt:

1. Run [Build SentraGuard Desktop App.bat](./Build%20SentraGuard%20Desktop%20App.bat).
2. Or run [Install SentraGuard Desktop App.bat](./Install%20SentraGuard%20Desktop%20App.bat) if you also want the shortcut refreshed.

The packaged executable lives here:

- `dist\SentraGuard AI\SentraGuard AI.exe`

## 17. Troubleshooting

### Smart App Control blocked a script

Run:

```powershell
Unblock-File -Path ".\Start SentraGuard AI.bat"
Unblock-File -Path ".\Install SentraGuard Desktop App.bat"
Unblock-File -Path ".\Create Desktop Shortcut.ps1"
```

Then try again.

### The desktop app is older than the browser app

Rebuild it:

```powershell
cmd /c ".\Install SentraGuard Desktop App.bat"
```

### The browser still looks old

Use:

```text
Ctrl + F5
```

Or click `Reload UI`.

### Real monitoring is active but nothing happens

Check:

1. You actually switched to `Real Monitoring`.
2. You sent an ingest or control command after switching.
3. The ingest token is correct if you are using the API directly.

### Another PC cannot connect

Check:

1. the host machine is running [Launch SentraGuard Network Demo.bat](./Launch%20SentraGuard%20Network%20Demo.bat)
2. the host app is in `Real Monitoring`
3. both PCs are on the same network
4. the host IP is correct
5. firewall rules are not blocking port `8000`

## 18. Recommended Hackathon Demo Flow

This is a good clean sequence:

1. Start the desktop app.
2. Sign in.
3. Show `Overview`.
4. Show `Investigations`.
5. Show `Activity`.
6. Open `Operations` and point out the mode switch and simulation tempo.
7. Switch simulation tempo to `Demo` if the room needs more motion.
8. Use the scenario launcher in `Operations`.
9. Launch `credential_stuffing` or `usb_exfiltration`.
10. Return to `Overview` or `Investigations` and show the escalation.
11. If needed, switch to `Real Monitoring` and send a helper command from this PC or a second PC.
