# SentraGuard AI - Start Here

If you are helping run the demo, use this file.

If you need the full setup and operator walkthrough instead of the short version, open:

- [OPERATIONS_GUIDE.md](./OPERATIONS_GUIDE.md)

## Normal startup

Use:

- [Start SentraGuard AI.bat](./Start%20SentraGuard%20AI.bat)

If the desktop app is not built yet, it will try to set it up first. If that still is not available, it will fall back to the browser version.

## First-time setup

Use:

- [Install SentraGuard Desktop App.bat](./Install%20SentraGuard%20Desktop%20App.bat)

## Login

```text
Email: admin@sentraguard.local
Password: ChangeMe123!
```

## Best demo flow

1. Start the app.
2. Sign in.
3. Show `Command`.
4. Show `People`.
5. Show `Signals`.
6. Open `Studio`.
7. Launch `credential_stuffing` or `usb_exfiltration`.
8. Show `Response`.

## If you want real monitoring

1. Open `Platform`.
2. Switch to `Real Monitoring`.
3. Send a helper command using:

- [Send SentraGuard Interaction.ps1](./Send%20SentraGuard%20Interaction.ps1)

Example:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Send SentraGuard Interaction.ps1" -Channel ingest -Mode real -Preset usb_exfiltration
```

## If another PC needs to send events

On the main host machine:

- [Launch SentraGuard Network Demo.bat](./Launch%20SentraGuard%20Network%20Demo.bat)

Then switch the app to `Real Monitoring`.

On the second machine:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Send SentraGuard Interaction.ps1" -Server http://YOUR-PC-IP:8000 -Channel ingest -Mode real -Preset credential_stuffing
```

## If you only want the browser version

Use:

- [Launch SentraGuard AI.bat](./Launch%20SentraGuard%20AI.bat)
