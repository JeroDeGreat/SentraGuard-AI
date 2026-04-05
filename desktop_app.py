from __future__ import annotations

import argparse
import os
import socket
import sys
import threading
import time
import urllib.request
from pathlib import Path


def _usable_data_root() -> Path:
    configured_root = os.getenv("SENTRAGUARD_DATA_ROOT")
    if configured_root:
        target = Path(configured_root)
        target.mkdir(parents=True, exist_ok=True)
        return target

    candidates = [
        Path(os.getenv("LOCALAPPDATA", Path.home() / "AppData/Local")) / "SentraGuardAI" / "data",
        Path.home() / "SentraGuardAI" / "data",
        Path.cwd() / ".desktop-data",
    ]

    for candidate in candidates:
        try:
            candidate.mkdir(parents=True, exist_ok=True)
            return candidate
        except OSError:
            continue

    raise RuntimeError("SentraGuard AI could not create a writable data directory for the desktop app.")


def prepare_environment() -> None:
    os.environ.setdefault("SENTRAGUARD_ENV", "desktop")
    os.environ.setdefault("SENTRAGUARD_DATA_ROOT", str(_usable_data_root()))
    os.environ.setdefault("SENTRAGUARD_ENABLE_SIMULATION", "true")


prepare_environment()

import uvicorn  # noqa: E402
import webview  # noqa: E402

from backend.app.main import app  # noqa: E402


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


class EmbeddedServer:
    def __init__(self, bind_host: str, port: int) -> None:
        self.bind_host = bind_host
        self.port = port
        self.url = f"http://127.0.0.1:{port}"
        self.config = uvicorn.Config(app=app, host=bind_host, port=port, log_level="warning")
        self.server = uvicorn.Server(self.config)
        self.thread = threading.Thread(target=self.server.run, daemon=True)

    def start(self) -> None:
        self.thread.start()

    def wait_until_ready(self, timeout_seconds: float = 25.0) -> bool:
        started = time.time()
        while time.time() - started < timeout_seconds:
            try:
                with urllib.request.urlopen(self.url, timeout=1):
                    return True
            except Exception:
                time.sleep(0.25)
        return False

    def stop(self) -> None:
        self.server.should_exit = True
        if self.thread.is_alive():
            self.thread.join(timeout=8)


def run_app(smoke_test: bool = False) -> int:
    port = free_port()
    server = EmbeddedServer("127.0.0.1", port)
    server.start()

    if not server.wait_until_ready():
        server.stop()
        raise RuntimeError("SentraGuard desktop shell could not start the embedded server.")

    if smoke_test:
        print(server.url)
        server.stop()
        return 0

    window = webview.create_window(
        "SentraGuard AI",
        server.url,
        width=1560,
        height=980,
        min_size=(1220, 780),
        background_color="#090d19",
    )
    window.events.closed += lambda: server.stop()

    try:
        webview.start(debug=False)
    finally:
        server.stop()

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Launch SentraGuard AI as a native desktop app.")
    parser.add_argument("--smoke-test", action="store_true", help="Start the embedded server and exit after it responds.")
    args = parser.parse_args()

    try:
        return run_app(smoke_test=args.smoke_test)
    except Exception as error:
        print(f"SentraGuard desktop failed to start: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
