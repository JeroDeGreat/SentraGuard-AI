param(
    [string]$Server = "http://127.0.0.1:8000",
    [ValidateSet("control", "ingest")]
    [string]$Channel = "ingest",
    [ValidateSet("simulation", "real", "current")]
    [string]$Mode = "real",
    [ValidateSet(
        "clean_shift_start",
        "routine_report_pull",
        "after_hours_access",
        "credential_stuffing",
        "download_burst",
        "usb_exfiltration",
        "external_transfer"
    )]
    [string]$Preset = "download_burst",
    [string]$EmployeeCode = "EMP-007",
    [string]$EmployeeName = "Jordan Vale",
    [string]$Department = "Finance",
    [string]$Title = "Senior Analyst",
    [string]$AdminEmail = "admin@sentraguard.local",
    [string]$AdminPassword = "ChangeMe123!",
    [string]$IngestToken = "sentra-ingest-key"
)

function New-PresetEvents {
    param(
        [string]$PresetName,
        [string]$EmployeeCodeValue,
        [string]$EmployeeNameValue,
        [string]$DepartmentValue,
        [string]$TitleValue
    )

    function New-EventRecord {
        param(
            [string]$EventType,
            [hashtable]$EventDetails
        )

        return @{
            employee_code = $EmployeeCodeValue
            employee_name = $EmployeeNameValue
            department = $DepartmentValue
            title = $TitleValue
            source = "manual-companion"
            event_type = $EventType
            details = $EventDetails
        }
    }

    switch ($PresetName) {
        "clean_shift_start" {
            return @(
                (New-EventRecord -EventType "login_success" -EventDetails @{ device = "HQ-LAP-14"; location = "HQ-West" })
            )
        }
        "routine_report_pull" {
            return @(
                (New-EventRecord -EventType "login_success" -EventDetails @{ device = "HQ-LAP-14"; location = "HQ-West" }),
                (New-EventRecord -EventType "file_download" -EventDetails @{ bytes_mb = 84; classification = "internal"; repository = "finance-reports" })
            )
        }
        "after_hours_access" {
            return @(
                (New-EventRecord -EventType "login_success" -EventDetails @{ device = "VPN-EDGE"; location = "Remote-VPN"; force_after_hours = $true }),
                (New-EventRecord -EventType "sensitive_access" -EventDetails @{ classification = "restricted"; resource = "Payroll-Q4" })
            )
        }
        "credential_stuffing" {
            return @(
                (New-EventRecord -EventType "login_failed" -EventDetails @{ source_ip = "185.77.22.91" }),
                (New-EventRecord -EventType "login_failed" -EventDetails @{ source_ip = "185.77.22.91" }),
                (New-EventRecord -EventType "login_failed" -EventDetails @{ source_ip = "185.77.22.91" }),
                (New-EventRecord -EventType "login_success" -EventDetails @{ location = "Remote-VPN"; force_after_hours = $true })
            )
        }
        "download_burst" {
            return @(
                (New-EventRecord -EventType "file_download" -EventDetails @{ bytes_mb = 310; classification = "restricted"; repository = "deal-room" }),
                (New-EventRecord -EventType "file_download" -EventDetails @{ bytes_mb = 355; classification = "restricted"; repository = "deal-room" }),
                (New-EventRecord -EventType "file_download" -EventDetails @{ bytes_mb = 415; classification = "secret"; repository = "deal-room" })
            )
        }
        "usb_exfiltration" {
            return @(
                (New-EventRecord -EventType "usb_inserted" -EventDetails @{ device = "Kingston DTMAX"; vendor = "Kingston" }),
                (New-EventRecord -EventType "data_transfer" -EventDetails @{ bytes_mb = 760; channel = "usb"; destination = "external" }),
                (New-EventRecord -EventType "sensitive_access" -EventDetails @{ classification = "secret"; resource = "Customer-Vault" })
            )
        }
        "external_transfer" {
            return @(
                (New-EventRecord -EventType "data_transfer" -EventDetails @{ bytes_mb = 520; channel = "personal-cloud"; destination = "external" }),
                (New-EventRecord -EventType "sensitive_access" -EventDetails @{ classification = "confidential"; resource = "Partner-Bids" })
            )
        }
        default {
            throw "Unsupported preset: $PresetName"
        }
    }
}

$normalizedServer = $Server.TrimEnd("/")

if ($Channel -eq "control") {
    $loginPayload = @{
        email = $AdminEmail
        password = $AdminPassword
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod `
        -Method Post `
        -Uri "$normalizedServer/api/v1/auth/login" `
        -ContentType "application/json" `
        -Body $loginPayload

    $headers = @{
        Authorization = "Bearer $($loginResponse.access_token)"
    }

    $controlPayload = @{
        scenario_id = $Preset
        employee_code = $EmployeeCode
        employee_name = $EmployeeName
        department = $Department
        title = $Title
        target_mode = $Mode
    } | ConvertTo-Json

    $response = Invoke-RestMethod `
        -Method Post `
        -Uri "$normalizedServer/api/v1/control/emit" `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $controlPayload
} else {
    $events = New-PresetEvents `
        -PresetName $Preset `
        -EmployeeCodeValue $EmployeeCode `
        -EmployeeNameValue $EmployeeName `
        -DepartmentValue $Department `
        -TitleValue $Title

    $headers = @{
        "X-Ingest-Token" = $IngestToken
    }

    $ingestPayload = @{
        events = @($events)
    } | ConvertTo-Json -Depth 6

    $response = Invoke-RestMethod `
        -Method Post `
        -Uri "$normalizedServer/api/v1/logs/ingest" `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $ingestPayload
}

$response | ConvertTo-Json -Depth 6
