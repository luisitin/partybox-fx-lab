#!/usr/bin/env python3
"""Probe genuine disk navigation; this is not an application acceptance suite."""
from __future__ import annotations

import argparse
import asyncio
from datetime import datetime, timezone
import glob
import hashlib
import importlib.metadata
import json
from pathlib import Path
import shutil
from urllib.parse import parse_qsl, urlencode, urlsplit, unquote


def policy_snapshot() -> list[dict]:
    snapshots = []
    for root in (Path('/etc/chromium/policies/managed'),
                 Path('/etc/opt/chrome/policies/managed')):
        for path in sorted(root.glob('*.json')):
            try:
                values = json.loads(path.read_text())
                snapshots.append({
                    'path': str(path),
                    'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                    'keys': sorted(values),
                    'urlRuleSummary': {
                        'blocklistContainsWildcard': '*' in values.get('URLBlocklist', []),
                        'allowlistEntryCount': len(values.get('URLAllowlist', [])),
                        'allowlistHasFileScheme': any(str(rule).startswith('file:')
                            for rule in values.get('URLAllowlist', [])),
                    },
                })
            except (OSError, ValueError, TypeError) as exc:
                snapshots.append({'path': str(path), 'readError': str(exc)})
    return snapshots


async def probe(args, report: dict) -> int:
    try:
        source = Path(args.html).resolve(strict=True)
        if not source.is_file():
            raise ValueError('The supplied HTML path is not a regular file')
        report['source'] = str(source)
        report['sourceSha256'] = hashlib.sha256(source.read_bytes()).hexdigest()
        uri = source.as_uri()
        if args.query:
            uri += '?' + urlencode(parse_qsl(args.query, keep_blank_values=True))
        report['requestedUri'] = uri
        chromium = args.chromium or shutil.which('chromium')
        if not chromium:
            raise FileNotFoundError('No existing system Chromium executable found')
        report['chromiumExecutable'] = str(Path(chromium).resolve(strict=True))
        report['playwrightVersion'] = importlib.metadata.version('playwright')
        from playwright.async_api import async_playwright
    except (OSError, ValueError, ImportError, importlib.metadata.PackageNotFoundError) as exc:
        report.update(status='prerequisite_unavailable', error=str(exc), stage='prerequisites')
        return 3

    stage = 'launch'
    try:
        async with async_playwright() as playwright:
            # Use normal Playwright defaults. No additional command-line flags,
            # route interception, content replacement, local server or policy edits.
            browser = await playwright.chromium.launch(
                executable_path=report['chromiumExecutable'], headless=True)
            try:
                report['browserVersion'] = browser.version
                context = await browser.new_context(viewport={'width': 1920, 'height': 1080})
                page = await context.new_page()
                stage = 'direct_file_navigation'
                try:
                    response = await page.goto(uri, wait_until='domcontentloaded',
                                               timeout=args.timeout_ms)
                    report['responseStatus'] = response.status if response else None
                    report['finalUri'] = page.url
                    report['document'] = await page.evaluate(
                        '({title:document.title, url:document.URL, protocol:location.protocol})')
                    actual = urlsplit(report['document']['url'])
                    requested = urlsplit(uri)
                    opened = (actual.scheme == 'file' and
                              unquote(actual.path) == unquote(requested.path))
                    report['standaloneFileOpened'] = opened
                    report['status'] = ('native_file_navigation_passed' if opened
                                        else 'navigation_did_not_open_supplied_file')
                    return 0 if opened else 4
                except Exception as exc:
                    report.update(error=str(exc), errorType=type(exc).__name__,
                                  finalUri=page.url, stage=stage)
                    blocked = 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(exc)
                    report['status'] = ('native_file_policy_blocked' if blocked
                                        else 'native_file_navigation_failed')
                    return 2 if blocked else 4
            finally:
                await browser.close()
    except Exception as exc:
        report.update(status='browser_tool_unavailable', stage=stage,
                      error=str(exc), errorType=type(exc).__name__)
        return 3


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('html', help='Existing real HTML file; not an HTTP or synthetic URL')
    parser.add_argument('--output', required=True, help='Destination JSON evidence path')
    parser.add_argument('--chromium', help='Existing approved system executable; no download')
    parser.add_argument('--query', default='', help='Optional query, for example view=tv')
    parser.add_argument('--timeout-ms', type=int, default=15000)
    args = parser.parse_args()
    if args.timeout_ms < 1 or args.timeout_ms > 60000:
        parser.error('--timeout-ms must be between 1 and 60000')
    report = {
        'helperSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'timestampUtc': datetime.now(timezone.utc).isoformat(),
        'status': 'not_run', 'standaloneFileOpened': False,
        'transport': 'native_file', 'additionalLaunchArgs': [],
        'launchDefaults': 'Unmodified Playwright headless Chromium defaults',
        'managedPolicySnapshot': policy_snapshot(),
        'hardwareGpuNodes': glob.glob('/dev/dri/renderD*') + glob.glob('/dev/nvidia[0-9]*'),
        'checksNotRun': ['application behavior', 'runtime-network acceptance',
                         'reduced motion', 'TV frame timing', 'phone 4x CPU frame timing',
                         'screen capture', 'job-specific acceptance'],
        'scope': 'Navigation prerequisite only. A successful probe does not pass a job.',
    }
    code = asyncio.run(probe(args, report))
    report['exitCode'] = code
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'status': report['status'], 'output': str(output), 'exitCode': code}))
    return code


if __name__ == '__main__':
    raise SystemExit(main())
