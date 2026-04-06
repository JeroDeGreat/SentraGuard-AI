# SentraGuard AI

SentraGuard AI is an employee behavior risk analysis system with a premium monitoring dashboard, a desktop app, realistic simulation mode, real monitoring mode, live alerts, and an operations workspace for controlled demo interactions.

This README is now organized around the simplest way to use the product first. If you are preparing for a hackathon or handing this to a friend, start with the sections below and ignore the advanced scripts unless you actually need them.

If you want the full operator walkthrough for installs, the scenario launcher, real monitoring, refresh behavior, and friend-computer demos, open:

- [OPERATIONS_GUIDE.md](./OPERATIONS_GUIDE.md)

## 1. Use These 4 Files

For almost everyone, these are the only files that matter:

- [Start SentraGuard AI.bat](./Start%20SentraGuard%20AI.bat)
- [Install SentraGuard Desktop App.bat](./Install%20SentraGuard%20Desktop%20App.bat)
- [Launch SentraGuard Network Demo.bat](./Launch%20SentraGuard%20Network%20Demo.bat)
- [Send SentraGuard Interaction.ps1](./Send%20SentraGuard%20Interaction.ps1)

What each one is for:

- `Start SentraGuard AI.bat`: the main file to run. Use this first.
- `Install SentraGuard Desktop App.bat`: first-time setup or rebuild of the desktop `.exe`.
- `Launch SentraGuard Network Demo.bat`: use this only when another PC needs to send events into your app.
- `Send SentraGuard Interaction.ps1`: sends demo or real-mode interactions from this PC or another PC.

## 2. Recommended First-Time Setup

If this is the first time you are running SentraGuard AI on a Windows machine:

1. Open the project folder.
2. Double-click [Install SentraGuard Desktop App.bat](./Install%20SentraGuard%20Desktop%20App.bat).
3. Wait for setup to finish.
4. A desktop shortcut named `SentraGuard AI` will be created or refreshed.
5. After that, use the desktop shortcut or [Start SentraGuard AI.bat](./Start%20SentraGuard%20AI.bat).

What this install does:

1. creates `.venv` if needed
2. repairs `pip` if needed
3. installs the app requirements
4. installs the desktop packaging requirements
5. builds the Windows desktop app
6. creates the desktop shortcut

## 3. Recommended Everyday Use

After setup is done, the normal way to run the project is:

1. Double-click the desktop shortcut, or run [Start SentraGuard AI.bat](./Start%20SentraGuard%20AI.bat).
2. Sign in with the default admin account:

```text
Email: admin@sentraguard.local
Password: ChangeMe123!
```

3. Use the app tabs like this:

- `Overview`: risk posture, priority queue, active escalations, and recommended actions
- `Investigations`: search employees, review risk, and inspect one person in detail
- `Activity`: live event stream, signal mix, department heat, and response cues
- `Operations`: scenario launcher, real monitoring controls, connection targets, helper commands, and admin audit

## 4. Browser Version

The browser version uses the same frontend as the desktop app.

If you want the browser version on purpose, use:

- [Launch SentraGuard AI.bat](./Launch%20SentraGuard%20AI.bat)

What it does:

1. prepares `.venv`
2. installs dependencies if needed
3. starts the FastAPI app
4. opens the browser

Important:

- the browser version is no longer supposed to show the old layout
- frontend caching is disabled so updates should load properly
- if a browser still shows an old version, hard refresh with `Ctrl + F5`

## 5. Simulation Mode

Simulation mode is for demos.

What it does now:

- keeps the interface active with normal workplace behavior
- occasionally creates realistic suspicious stories
- avoids showing a security incident every few seconds
- still stays lively enough for a hackathon demo

Best use:

- keep the system in simulation mode while presenting the dashboard
- use the `Scenario launcher` inside `Operations` whenever you want to force a specific incident on screen

## 6. Scenario Launcher

The scenario launcher inside `Operations` is the easiest way to control the demo from the same PC.

In the app:

1. open the `Operations` tab
2. choose an employee
3. choose a scenario
4. choose `Current mode`, `Simulation mode`, or `Real mode`
5. click `Launch Scenario`

Good presets for demos:

- `credential_stuffing`
- `download_burst`
- `usb_exfiltration`
- `external_transfer`

## 7. Real Monitoring Mode

Real monitoring mode is for live ingestion instead of background simulation.

To use it correctly:

1. open the `Operations` tab
2. switch from `Simulation` to `Real Monitoring`
3. send events into the system using the helper script, the live ingestion console, or the ingestion API
4. watch `Overview`, `Activity`, and `Investigations` update live

When `Real Monitoring` is active:

- simulation pauses
- the app waits for incoming events
- the scenario launcher can still inject events into real mode if you choose that mode

## 8. Send Interactions From This PC

Use [Send SentraGuard Interaction.ps1](./Send%20SentraGuard%20Interaction.ps1).

Example: send a full scenario from this PC

```powershell
powershell -ExecutionPolicy Bypass -File ".\Send SentraGuard Interaction.ps1" -Channel control -Mode current -Preset credential_stuffing
```

Example: send raw real-mode style events from this PC

```powershell
powershell -ExecutionPolicy Bypass -File ".\Send SentraGuard Interaction.ps1" -Channel ingest -Mode real -Preset usb_exfiltration
```

## 9. Send Interactions From Another PC

This is the correct flow if your friend wants to send activity into your running app.

### On the host machine

Run:

```powershell
cmd /c ".\Launch SentraGuard Network Demo.bat"
```

That starts SentraGuard on `0.0.0.0:8000` so another PC can reach it.

Then:

1. log in
2. go to the `Operations` tab
3. switch to `Real Monitoring`

### On the second machine

Run the helper script against the host IP:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Send SentraGuard Interaction.ps1" -Server http://YOUR-PC-IP:8000 -Channel ingest -Mode real -Preset credential_stuffing
```

Replace `YOUR-PC-IP` with the IP address of the host machine.

Example:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Send SentraGuard Interaction.ps1" -Server http://192.168.1.50:8000 -Channel ingest -Mode real -Preset external_transfer
```

If it does not connect:

- make sure both PCs are on the same network
- make sure Windows Firewall allows the host machine to accept connections on port `8000`

## 10. Which File Should I Use?

Use this table when you are unsure.

- I just want the app to start normally: [Start SentraGuard AI.bat](./Start%20SentraGuard%20AI.bat)
- I am setting up this machine for the first time: [Install SentraGuard Desktop App.bat](./Install%20SentraGuard%20Desktop%20App.bat)
- I want the browser version: [Launch SentraGuard AI.bat](./Launch%20SentraGuard%20AI.bat)
- I want another PC to send events into this one: [Launch SentraGuard Network Demo.bat](./Launch%20SentraGuard%20Network%20Demo.bat)
- I want to trigger interactions by command: [Send SentraGuard Interaction.ps1](./Send%20SentraGuard%20Interaction.ps1)
- I want to rebuild the desktop app manually: [Build SentraGuard Desktop App.bat](./Build%20SentraGuard%20Desktop%20App.bat)

## 11. Full Manual Setup From Zero

If you want to do everything manually:

1. Open PowerShell in the project folder:

```powershell
cd "C:\Users\Jero Grabo\Documents\Playground"
```

2. Check Python:

```powershell
python --version
```

If that fails:

```powershell
py --version
```

3. Create the virtual environment:

```powershell
python -m venv .venv
```

or

```powershell
py -3 -m venv .venv
```

4. Activate it:

```powershell
.venv\Scripts\Activate.ps1
```

5. Upgrade pip:

```powershell
python -m pip install --upgrade pip
```

6. Install dependencies:

```powershell
python -m pip install -r requirements.txt
```

7. Create `.env`:

```powershell
Copy-Item .env.example .env
```

8. Start the server:

```powershell
python -m uvicorn backend.app.main:app --reload
```

9. Open:

- [http://127.0.0.1:8000](http://127.0.0.1:8000)
- [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## 12. Desktop App Build Output

The packaged Windows app is built to:

- `dist\SentraGuard AI\SentraGuard AI.exe`

The build source files are:

- [desktop_app.py](./desktop_app.py)
- [SentraGuard AI.spec](./SentraGuard%20AI.spec)
- [requirements-desktop.txt](./requirements-desktop.txt)

## 13. Configuration

Main settings come from `.env`.

Key values:

```text
SENTRAGUARD_ADMIN_EMAIL=admin@sentraguard.local
SENTRAGUARD_ADMIN_PASSWORD=ChangeMe123!
SENTRAGUARD_INGEST_API_KEY=sentra-ingest-key
SENTRAGUARD_DEFAULT_MODE=simulation
SENTRAGUARD_SIM_EMPLOYEE_COUNT=120
SENTRAGUARD_SIM_TICK_SECONDS=3.0
SENTRAGUARD_HIGH_RISK_THRESHOLD=70
```

## 14. Testing

Run:

```powershell
python -m pytest backend/tests/test_api.py
```

## 15. Troubleshooting

### Smart App Control blocked a script

Run:

```powershell
Unblock-File -Path ".\Start SentraGuard AI.bat"
Unblock-File -Path ".\Install SentraGuard Desktop App.bat"
Unblock-File -Path ".\Create Desktop Shortcut.ps1"
```

Then rerun the file.

### The browser shows an old version

Use:

```text
Ctrl + F5
```

Caching is disabled now, so the newest version should load after a refresh.

### Another PC cannot connect

Check:

1. the host is running [Launch SentraGuard Network Demo.bat](./Launch%20SentraGuard%20Network%20Demo.bat)
2. the host app is in `Real Monitoring`
3. the host IP is correct
4. firewall rules are not blocking port `8000`

### I only want the browser version

Use:

- [Launch SentraGuard AI.bat](./Launch%20SentraGuard%20AI.bat)

### I only want the desktop version

Use:

1. [Install SentraGuard Desktop App.bat](./Install%20SentraGuard%20Desktop%20App.bat)
2. [Start SentraGuard AI.bat](./Start%20SentraGuard%20AI.bat)

## 16. Extra Quick Guide For Friends

There is also a simpler handoff guide here:

- [START_HERE.md](./START_HERE.md)
- [OPERATIONS_GUIDE.md](./OPERATIONS_GUIDE.md)

## 17. GitHub

Repository:

- [JeroDeGreat/SentraGuard-AI](https://github.com/JeroDeGreat/SentraGuard-AI)
