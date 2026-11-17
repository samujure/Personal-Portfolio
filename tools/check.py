#!/usr/bin/env python3
"""Open the site at three sizes, wait for every picture to finish, save screenshots, fail on errors.

    pip install playwright && playwright install chromium
    python3 tools/check.py

Screenshots land in tools/shots/ (ignored by git). Look at them: a page can be error-free and still look wrong.
"""
import functools
import http.server
import pathlib
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / "tools" / "shots"
SIZES = {"desktop": (1440, 900), "laptop": (1100, 760), "phone": (390, 844)}
FONT_HOSTS = ("fonts.googleapis.com", "fonts.gstatic.com")  # offline runs fall back to system fonts; not an error


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def serve():
    server = Server(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{server.server_address[1]}/"


def main():
    base = serve()
    SHOTS.mkdir(exist_ok=True)
    problems = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, (width, height) in SIZES.items():
            page = browser.new_context(viewport={"width": width, "height": height}).new_page()
            page.on("pageerror", lambda err, name=name: problems.append(f"{name}: {err}"))

            def on_console(msg, name=name):
                url = (msg.location or {}).get("url", "")
                if msg.type == "error" and not any(host in url for host in FONT_HOSTS):
                    problems.append(f"{name}: {msg.text}")

            page.on("console", on_console)
            page.goto(base + "?rate=4000")  # ?rate= sets shapes per second, so every picture finishes quickly
            page.wait_for_timeout(400)
            count = page.evaluate("document.querySelectorAll('.art').length")
            for i in range(count):
                page.evaluate(f"document.querySelectorAll('.art')[{i}].scrollIntoView({{block: 'center'}})")
                page.wait_for_function(f"document.querySelectorAll('.art')[{i}].piece.done", timeout=120000)
            page.evaluate("window.scrollTo(0, 0)")
            page.wait_for_timeout(300)
            page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=True)
            readouts = page.evaluate(
                "[...document.querySelectorAll('.art')].map(a => (a.dataset.photo || a.dataset.paint) + ': ' + a.piece.stat.textContent)"
            )
            for line in readouts:
                print(f"{name:8} {line}")
        browser.close()
    if problems:
        print("\nPROBLEMS")
        for line in problems:
            print("  " + line)
        sys.exit(1)
    print(f"\nno errors. screenshots in {SHOTS.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
