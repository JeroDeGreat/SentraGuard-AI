SAFE_EVENT_TYPES = [
    "login_success",
    "file_download",
    "data_transfer",
    "sensitive_access",
]

RISK_SCENARIOS = {
    "after_hours_access": {
        "weight": 2,
        "departments": {"Engineering", "Research", "Finance"},
        "steps": [
            {
                "event_type": "login_success",
                "details": {"location": "Untrusted VPN Node", "network_trust": "low", "force_after_hours": True},
            },
            {
                "event_type": "sensitive_access",
                "details": {"classification": "restricted", "resource": "after-hours-vault"},
            },
        ],
    },
    "credential_stuffing": {
        "weight": 1,
        "departments": {"Engineering", "Finance", "Sales", "Operations"},
        "steps": [
            {
                "event_type": "login_failed",
                "details": {"location": "External IP", "network_trust": "low", "ip_reputation": "suspicious"},
            },
            {
                "event_type": "login_failed",
                "details": {"location": "External IP", "network_trust": "low", "ip_reputation": "suspicious"},
            },
            {
                "event_type": "login_failed",
                "details": {"location": "External IP", "network_trust": "low", "ip_reputation": "suspicious"},
            },
        ],
    },
    "download_burst": {
        "weight": 2,
        "departments": {"Finance", "Legal", "Research"},
        "steps": [
            {
                "event_type": "sensitive_access",
                "details": {"classification": "confidential", "resource": "deal-room"},
            },
            {
                "event_type": "file_download",
                "details": {"classification": "restricted", "bytes_mb": 640, "resource": "restricted-archive"},
            },
            {
                "event_type": "file_download",
                "details": {"classification": "restricted", "bytes_mb": 780, "resource": "restricted-archive"},
            },
        ],
    },
    "usb_exfiltration": {
        "weight": 1,
        "departments": {"Operations", "Research", "Engineering"},
        "steps": [
            {
                "event_type": "usb_inserted",
                "details": {"device_label": "Unmanaged USB", "device_type": "usb"},
            },
            {
                "event_type": "data_transfer",
                "details": {"channel": "usb", "bytes_mb": 940, "destination": "external"},
            },
        ],
    },
    "external_transfer": {
        "weight": 1,
        "departments": {"Finance", "Legal", "Sales", "Research"},
        "steps": [
            {
                "event_type": "sensitive_access",
                "details": {"classification": "confidential", "resource": "client-dossier"},
            },
            {
                "event_type": "data_transfer",
                "details": {"channel": "personal-cloud", "bytes_mb": 860, "destination": "external"},
            },
        ],
    },
}

INTERACTION_SCENARIOS = {
    "clean_shift_start": {
        "label": "Clean Shift Start",
        "description": "A normal on-shift login followed by routine internal work.",
        "category": "normal",
        "default_mode": "simulation",
        "steps": [
            {
                "event_type": "login_success",
                "details": {"location": "HQ-West", "network_trust": "managed"},
            },
            {
                "event_type": "file_download",
                "details": {"classification": "internal", "bytes_mb": 36, "resource": "team-workspace"},
            },
        ],
    },
    "routine_report_pull": {
        "label": "Routine Report Pull",
        "description": "Normal internal report access with low-risk data movement.",
        "category": "normal",
        "default_mode": "simulation",
        "steps": [
            {
                "event_type": "sensitive_access",
                "details": {"classification": "internal", "resource": "monthly-reporting"},
            },
            {
                "event_type": "data_transfer",
                "details": {"channel": "managed-share", "bytes_mb": 24, "destination": "internal"},
            },
        ],
    },
    "after_hours_access": {
        "label": "After-Hours Access",
        "description": "Late access to sensitive resources from an unexpected location.",
        "category": "risk",
        "default_mode": "simulation",
        "steps": RISK_SCENARIOS["after_hours_access"]["steps"],
    },
    "credential_stuffing": {
        "label": "Credential Stuffing",
        "description": "Repeated failed logins from a suspicious external source.",
        "category": "risk",
        "default_mode": "real",
        "steps": RISK_SCENARIOS["credential_stuffing"]["steps"],
    },
    "download_burst": {
        "label": "Download Burst",
        "description": "A suspicious access sequence followed by large restricted downloads.",
        "category": "risk",
        "default_mode": "simulation",
        "steps": RISK_SCENARIOS["download_burst"]["steps"],
    },
    "usb_exfiltration": {
        "label": "USB Exfiltration",
        "description": "A removable media event followed by external data movement.",
        "category": "critical",
        "default_mode": "real",
        "steps": RISK_SCENARIOS["usb_exfiltration"]["steps"],
    },
    "external_transfer": {
        "label": "External Transfer",
        "description": "Sensitive work followed by a transfer to an external destination.",
        "category": "critical",
        "default_mode": "real",
        "steps": RISK_SCENARIOS["external_transfer"]["steps"],
    },
}
