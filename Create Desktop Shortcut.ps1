$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcherPath = Join-Path $projectRoot "Launch SentraGuard AI.bat"
$desktopExePath = Join-Path $projectRoot "dist\SentraGuard AI\SentraGuard AI.exe"
$iconPath = Join-Path $projectRoot "frontend\assets\sentraguard-launcher.ico"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "SentraGuard AI.lnk"

if (-not (Test-Path -LiteralPath $launcherPath) -and -not (Test-Path -LiteralPath $desktopExePath)) {
    Write-Error "Launcher file not found: $launcherPath"
    exit 1
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)

if (Test-Path -LiteralPath $desktopExePath) {
    $shortcut.TargetPath = $desktopExePath
    $shortcut.Arguments = ""
    $shortcut.WorkingDirectory = Split-Path -Parent $desktopExePath
    $shortcut.WindowStyle = 1
    $shortcut.Description = "Launch SentraGuard AI desktop app"
    $shortcut.IconLocation = "$desktopExePath,0"
} else {
    $shortcut.TargetPath = "$env:SystemRoot\System32\cmd.exe"
    $shortcut.Arguments = "/c `"$launcherPath`""
    $shortcut.WorkingDirectory = $projectRoot
    $shortcut.WindowStyle = 7
    $shortcut.Description = "Launch SentraGuard AI"
    if (Test-Path -LiteralPath $iconPath) {
        $shortcut.IconLocation = "$iconPath,0"
    } else {
        $shortcut.IconLocation = "$env:SystemRoot\System32\SHELL32.dll,70"
    }
}

$shortcut.Save()

Write-Output "Desktop shortcut created at: $shortcutPath"
