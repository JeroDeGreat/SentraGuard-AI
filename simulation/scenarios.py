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
