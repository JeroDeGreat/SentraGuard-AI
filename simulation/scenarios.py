SAFE_EVENT_TYPES = [
    "login_success",
    "file_download",
    "sensitive_access",
]

RISK_SCENARIOS = {
    "after_hours_access": {
        "event_type": "login_success",
        "details": {"location": "Unknown VPN", "network_trust": "low"},
    },
    "credential_stuffing": {
        "event_type": "login_failed",
        "details": {"location": "External IP", "network_trust": "low"},
    },
    "download_burst": {
        "event_type": "file_download",
        "details": {"classification": "restricted", "bytes_mb": 820},
    },
    "usb_exfiltration": {
        "event_type": "usb_inserted",
        "details": {"device_label": "Unmanaged USB", "device_type": "usb"},
    },
    "external_transfer": {
        "event_type": "data_transfer",
        "details": {"channel": "usb", "bytes_mb": 960, "destination": "external"},
    },
}
