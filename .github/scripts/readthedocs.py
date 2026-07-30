"""Trigger and optionally monitor a Read the Docs API v3 build."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://app.readthedocs.org/api/v3"
SAFE_SLUG = re.compile(r"^[A-Za-z0-9._-]+$")


def request(method: str, path: str, token: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{API}{path}", data=data, method=method,
        headers={"Authorization": f"Token {token}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            payload = response.read()
            return json.loads(payload) if payload else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")[:1000]
        raise RuntimeError(f"Read the Docs API returned HTTP {error.code}: {detail}") from error


def wait_for_version(project: str, version: str, token: str, timeout: int) -> dict:
    path = f"/projects/{urllib.parse.quote(project)}/versions/{urllib.parse.quote(version)}/"
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            return request("GET", path, token)
        except RuntimeError as error:
            if "HTTP 404" not in str(error):
                raise
        time.sleep(10)
    raise RuntimeError(f"version {version!r} did not appear after sync within {timeout} seconds")


def state_code(build: dict) -> str:
    state = build.get("state", "")
    return str(state.get("code", "") if isinstance(state, dict) else state).lower()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--sync", action="store_true")
    parser.add_argument("--wait", action="store_true")
    parser.add_argument("--timeout", type=int, default=1200)
    args = parser.parse_args()
    token = os.environ.get("RTD_API_TOKEN", "")
    if not token:
        raise RuntimeError("RTD_API_TOKEN is not configured")
    if not SAFE_SLUG.fullmatch(args.project):
        raise RuntimeError("RTD_PROJECT_SLUG contains unsupported characters")
    if not SAFE_SLUG.fullmatch(args.version):
        raise RuntimeError("Read the Docs version slug contains unsupported characters")

    project = urllib.parse.quote(args.project)
    version = urllib.parse.quote(args.version)
    if args.sync:
        request("POST", f"/projects/{project}/sync-versions/", token, {})
        version_data = wait_for_version(args.project, args.version, token, min(args.timeout, 300))
        if not version_data.get("active", False):
            request("PATCH", f"/projects/{project}/versions/{version}/", token, {"active": True})

    build = request("POST", f"/projects/{project}/versions/{version}/builds/", token, {})
    # The trigger response normally identifies the build with an API URL in
    # ``build``. Accept an embedded numeric ID as well to remain compatible
    # with API responses that include the expanded build object.
    build_reference = build.get("build", "")
    build_id = build.get("id")
    if not build_id and isinstance(build_reference, str):
        match = re.search(r"/builds/(\d+)/?$", build_reference)
        build_id = match.group(1) if match else None
    build_url = (
        build_reference
        or build.get("urls", {}).get("view")
        or build.get("_links", {}).get("_self")
    )
    print(f"Triggered Read the Docs build id={build_id} url={build_url}")
    if not args.wait:
        return 0
    if not build_id:
        raise RuntimeError("Read the Docs accepted the build but returned no build ID")

    deadline = time.monotonic() + args.timeout
    while time.monotonic() < deadline:
        current = request("GET", f"/projects/{project}/builds/{build_id}/", token)
        state = state_code(current)
        print(f"Build {build_id}: {state or 'unknown'}")
        if state in {"finished", "successful", "success"} and current.get("success", True):
            return 0
        if state in {"failed", "cancelled", "canceled"} or current.get("success") is False:
            return 1
        time.sleep(15)
    raise RuntimeError(f"Read the Docs build {build_id} did not finish within {args.timeout} seconds")


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(f"error: {error}", file=sys.stderr)
        sys.exit(2)
