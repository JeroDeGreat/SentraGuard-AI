$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcherPath = Join-Path $projectRoot "Launch SentraGuard AI.bat"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "SentraGuard AI.lnk"

if (-not (Test-Path -LiteralPath $launcherPath)) {
    Write-Error "Launcher file not found: $launcherPath"
    exit 1
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "$env:SystemRoot\System32\cmd.exe"
$shortcut.Arguments = "/c `"$launcherPath`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = "Launch SentraGuard AI"
$shortcut.IconLocation = "$env:SystemRoot\System32\SHELL32.dll,70"
$shortcut.Save()

Write-Output "Desktop shortcut created at: $shortcutPath"
