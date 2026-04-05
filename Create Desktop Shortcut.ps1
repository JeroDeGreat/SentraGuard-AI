$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$startPath = Join-Path $projectRoot "Start SentraGuard AI.bat"
$iconPath = Join-Path $projectRoot "frontend\assets\sentraguard-launcher.ico"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "SentraGuard AI.lnk"

if (-not (Test-Path -LiteralPath $startPath)) {
    Write-Error "Start file not found: $startPath"
    exit 1
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "$env:SystemRoot\System32\cmd.exe"
$shortcut.Arguments = "/c `"$startPath`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.WindowStyle = 7
$shortcut.Description = "Launch SentraGuard AI"
if (Test-Path -LiteralPath $iconPath) {
    $shortcut.IconLocation = "$iconPath,0"
} else {
    $shortcut.IconLocation = "$env:SystemRoot\System32\SHELL32.dll,70"
}

$shortcut.Save()

Write-Output "Desktop shortcut created at: $shortcutPath"
