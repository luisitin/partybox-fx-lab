#!/usr/bin/env python3
"""Offline Chromium validation for a standalone PartyBox visual HTML page.

Performance runs deliberately do not record video. Playwright's recorder costs
CPU and records at its own rate, so a capture is never evidence of 60 fps.
"""
from __future__ import annotations

import argparse
import asyncio
import base64
import glob
import json
import math
import shutil
import statistics
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import parse_qsl, urlencode

from playwright.async_api import Error as PlaywrightError, async_playwright


INSTRUMENT = r"""(() => {
  const nativeRAF = window.requestAnimationFrame.bind(window);
  const frameWork = new Map();
  const longTasks = [];
  let observing = false;
  window.requestAnimationFrame = callback => nativeRAF(timestamp => {
    const start = performance.now();
    try { callback(timestamp); }
    finally {
      if (observing) frameWork.set(timestamp,
        (frameWork.get(timestamp) || 0) + performance.now() - start);
    }
  });
  try { new PerformanceObserver(list => {
    if (observing) for (const e of list.getEntries())
      longTasks.push({start: e.startTime, duration: e.duration});
  }).observe({type: 'longtask', buffered: false}); } catch (_) {}
  window.__fxMeasure = (durationMs, triggers = []) => new Promise(resolve => {
    const timestamps = [], arrivals = [];
    const markers = [], pending = triggers.map(t => ({...t, fired: false}));
    frameWork.clear(); longTasks.length = 0; observing = true;
    let started = 0;
    function sample(timestamp) {
      const arrived = performance.now();
      if (!started) started = arrived;
      timestamps.push(timestamp); arrivals.push(arrived);
      for (const trigger of pending) if (!trigger.fired && arrived - started >= trigger.atMs) {
        trigger.fired = true;
        const before = performance.now();
        let error = null;
        try { Function(trigger.expression)(); } catch (e) { error = String(e); }
        markers.push({label: trigger.label, scheduledAtMs: trigger.atMs,
          firedAt: before, firedAtMs: before - started,
          callDurationMs: performance.now() - before, error});
      }
      if (arrived - started < durationMs) nativeRAF(sample);
      else {
        observing = false;
        resolve({timestamps, arrivals, frameWork: [...frameWork.values()],
          longTasks, elapsed: arrived - started, markers});
      }
    }
    nativeRAF(sample);
  });
})();"""


def percentile(values: list[float], fraction: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    pos = fraction * (len(ordered) - 1)
    lo, hi = math.floor(pos), math.ceil(pos)
    return ordered[lo] * (hi - pos) + ordered[hi] * (pos - lo) if hi != lo else ordered[lo]


def stats(values: list[float]) -> dict:
    return {"count": len(values), "meanMs": statistics.mean(values) if values else None,
            "p50Ms": percentile(values, .50), "p95Ms": percentile(values, .95),
            "p99Ms": percentile(values, .99), "maxMs": max(values) if values else None}


def summarize(sample: dict) -> dict:
    arrivals = sample["arrivals"]
    intervals = [b - a for a, b in zip(arrivals, arrivals[1:])]
    scheduled = [b - a for a, b in zip(sample["timestamps"], sample["timestamps"][1:])]
    budget = 1000 / 60
    missed = sum(max(0, round(v / budget) - 1) for v in scheduled)
    expected = max(1, round(sample["elapsed"] / budget))
    interval_stats = stats(intervals)
    fraction = missed / expected
    return {"elapsedMs": sample["elapsed"], "fps": 1000 / statistics.mean(intervals),
            "arrivalIntervals": interval_stats, "scheduledIntervals": stats(scheduled),
            "callbackWork": stats(sample["frameWork"]), "missedRefreshes": missed,
            "missedRefreshFraction": fraction, "longTasks": sample["longTasks"],
            "meets60FpsTolerance": interval_stats["meanMs"] <= 17.5 and
                interval_stats["p95Ms"] <= 20 and fraction <= .01,
            "criterion": "mean arrival <=17.5 ms; p95 <=20 ms; missed 60-Hz refreshes <=1%"}


def hitch_summary(sample: dict, window: float) -> list[dict]:
    arrivals = sample["arrivals"]
    profiles = []
    for marker in sample.get("markers", []):
        intervals = [b-a for a,b in zip(arrivals, arrivals[1:])
                     if b >= marker["firedAt"] - 100 and a <= marker["firedAt"] + window*1000]
        profiles.append({**marker, "windowSeconds": window,
                         "windowComplete": arrivals[-1] >= marker["firedAt"] + window*1000,
                         "availableAfterFireMs": arrivals[-1] - marker["firedAt"],
                         "intervalPolicy": "include entire actual intervals intersecting fire-100ms to fire+window; long intervals can overlap windows",
                         "arrivalIntervals": stats(intervals),
                         "over33ms": sum(v>33 for v in intervals),
                         "over50ms": sum(v>50 for v in intervals),
                         "over100ms": sum(v>100 for v in intervals),
                         "over250ms": sum(v>250 for v in intervals)})
    return profiles


async def new_context(browser, case: dict, output: Path, record: bool,
                      uri: str, source: Path, transport: str):
    width, height = (1920, 1080) if case["view"] == "tv" else (390, 844)
    options = {"viewport": {"width": width, "height": height},
               "device_scale_factor": 1, "reduced_motion": case["motion"],
               "color_scheme": "dark", "service_workers": "block"}
    context = await browser.new_context(**options)
    errors, network, harness_loads = [], [], []
    harness_pending = True

    async def intercept(route):
        nonlocal harness_pending
        url = route.request.url
        if transport == "routed" and harness_pending and url == uri and route.request.is_navigation_request():
            harness_pending = False
            harness_loads.append({"url": url, "source": str(source),
                                  "delivery": "route.fulfill local bytes; no socket"})
            await route.fulfill(status=200, content_type="text/html; charset=utf-8",
                                body=source.read_bytes())
        elif url.startswith(("file:", "data:", "blob:", "about:")):
            await route.continue_()
        else:
            network.append({"url": url, "method": route.request.method})
            await route.abort("blockedbyclient")
    await context.route("**/*", intercept)
    async def block_websocket(route):
        network.append({"url": route.url, "method": "WEBSOCKET"})
        await route.close(code=1008, reason="Offline validation")
    await context.route_web_socket("**/*", block_websocket)
    await context.add_init_script(INSTRUMENT)
    page = await context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda msg: errors.append("console: " + msg.text)
            if msg.type == "error" else None)
    cdp = await context.new_cdp_session(page)
    await cdp.send("Emulation.setCPUThrottlingRate", {"rate": case["cpuThrottle"]})
    return context, page, errors, network, harness_loads


async def prepare_page(page, uri: str, script: str | None, evidence: dict | None = None):
    await page.goto(uri, wait_until="load", timeout=30000)
    if evidence is not None and await page.evaluate("location.protocol === 'file:'"):
        evidence["standaloneFileOpened"] = True
        evidence.setdefault("fileDocumentLoads", []).append({"url": uri, "waitUntil": "load"})
    await page.evaluate("document.fonts.ready")
    if script:
        await page.evaluate(script)


async def inspect_page(page) -> dict:
    return await page.evaluate("""() => {
      const canvases = [...document.querySelectorAll('canvas')].map(c => ({
        width: c.width, height: c.height, clientWidth: c.clientWidth,
        clientHeight: c.clientHeight, bounds: c.getBoundingClientRect().toJSON()}));
      const external = [...document.querySelectorAll('[src],[href]')].map(e =>
        e.getAttribute('src') || e.getAttribute('href')).filter(v => /^https?:/i.test(v));
      return {title: document.title, viewport: {width: innerWidth, height: innerHeight},
        document: {scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight},
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        canvases, externalReferences: external,
        appDiagnostics: window.__FX_DIAGNOSTICS__ || window.__fxDiagnostics ||
          (window.__sand && typeof window.__sand.diagnostics === 'function' ? window.__sand.diagnostics() : null) ||
          (window.__sand && typeof window.__sand.state === 'function' ? window.__sand.state() : null)};
    }""")


async def record_screen(page, context, dest: Path, duration: float, case: dict) -> dict:
    """Record actual viewport images at 25 fps using system FFmpeg.

    CDP emits only changed frames. Repeating the latest screenshot at 25 Hz
    correctly preserves static/reduced-motion time instead of shortening it.
    This encoder is deliberately outside the measured-performance run.
    """
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("System ffmpeg is required for screen recording")
    width, height = (1920, 1080) if case["view"] == "tv" else (390, 844)
    cdp = await context.new_cdp_session(page)
    latest = await page.screenshot(type="jpeg", quality=75)
    changes = 0
    acknowledgements = set()
    def on_frame(event):
        nonlocal latest, changes
        latest = base64.b64decode(event["data"])
        changes += 1
        task = asyncio.create_task(cdp.send("Page.screencastFrameAck", {"sessionId": event["sessionId"]}))
        acknowledgements.add(task)
        task.add_done_callback(acknowledgements.discard)
    cdp.on("Page.screencastFrame", on_frame)
    await cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 75,
                    "maxWidth": width, "maxHeight": height, "everyNthFrame": 1})
    process = await asyncio.create_subprocess_exec(ffmpeg, "-hide_banner", "-loglevel", "error",
        "-y", "-f", "image2pipe", "-framerate", "25", "-vcodec", "mjpeg", "-i", "pipe:0",
        "-an", "-vf", f"scale={width}:{height}", "-c:v", "libvpx", "-b:v", "1500k",
        "-deadline", "realtime", "-cpu-used", "8", "-threads", "2", "-pix_fmt", "yuv420p",
        str(dest), stdin=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    started = time.monotonic()
    frame_count = math.ceil(duration * 25)
    try:
        for frame in range(frame_count):
            delay = started + frame / 25 - time.monotonic()
            if delay > 0:
                await asyncio.sleep(delay)
            process.stdin.write(latest)
            await process.stdin.drain()
        process.stdin.close()
        await process.stdin.wait_closed()
        error = await process.stderr.read()
        await process.wait()
        if process.returncode != 0:
            raise RuntimeError("FFmpeg failed: " + error.decode(errors="replace"))
    finally:
        await cdp.send("Page.stopScreencast")
        cdp.remove_listener("Page.screencastFrame", on_frame)
        if acknowledgements:
            await asyncio.gather(*acknowledgements, return_exceptions=True)
    return {"encoder": ffmpeg, "method": "CDP viewport JPEG frames, resampled at 25 fps; VP8 WebM",
            "frames": frame_count, "changedScreens": changes,
            "captureWallSeconds": time.monotonic() - started,
            "note": "Capture frame rate is not used as performance evidence"}


def finish_report(report: dict, output: Path) -> dict:
    report["allCasesMeetFrameTolerance"] = bool(report["cases"]) and all(
        c.get("performance", {}).get("meets60FpsTolerance", False) for c in report["cases"])
    report["noRuntimeNetworkAttempts"] = all(not c["runtimeNetworkAttempts"] and
        not c.get("capture", {}).get("runtimeNetworkAttempts") for c in report["cases"])
    report["noPageErrors"] = all(not c["errors"] and not c.get("capture", {}).get("errors") for c in report["cases"])
    report["noHitchTriggerErrors"] = all(not p["error"] for c in report["cases"] for p in c.get("hitchProfiles", []))
    report["allHitchWindowsComplete"] = all(p["windowComplete"] for c in report["cases"] for p in c.get("hitchProfiles", []))
    report["allCapturesUnder10MB"] = all(c.get("capture", {}).get("under10MB", True) for c in report["cases"])
    (output / "validation.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


async def run(args):
    source = Path(args.html).resolve(strict=True)
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    script = Path(args.script).read_text() if args.script else None
    capture_script = Path(args.capture_script).read_text() if args.capture_script else None
    triggers = [{"atMs": 300 + i*args.hitch_gap*1000,
                 "label": "cold-fire" if i == 0 else f"warm-fire-{i}",
                 "expression": "window.__sand.fire("+json.dumps(args.hitch_fire)+");"}
                for i in range(args.hitch_repeats)] if args.hitch_fire else []
    hardware_nodes = glob.glob("/dev/dri/renderD*") + glob.glob("/dev/nvidia[0-9]*")
    flags = ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required",
             "--disable-background-networking", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost"]
    if not hardware_nodes or args.software:
        flags.extend(["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    report = {"source": str(source), "chromium": args.chromium, "flags": flags,
              "hardwareGpuNodes": hardware_nodes, "transport": args.transport,
              "standaloneFileOpened": False,
              "fileDocumentLoads": [],
              "extraQuery": dict(parse_qsl(args.query)),
              "hitchConfiguration": {"fire": args.hitch_fire, "repeats": args.hitch_repeats,
                  "gapSeconds": args.hitch_gap, "windowSeconds": args.hitch_window,
                  "meaning": "cold=first explicit fire on fresh page, after initial document load; warm=repeated fire on same page; browser startup itself is not sampled"},
              "transportExplanation": "routed mode fulfills the top document from local disk bytes "
                  "without any server or socket. This environment's Chromium enterprise URL "
                  "policy blocks file://. Use --transport file in a browser with disk access.",
              "method": "Actual performance.now arrival intervals sampled with native rAF; "
                        "page rAF callback CPU time measured separately. "
                        "CPU throttling via CDP. Performance without video recording. "
                        "HTTP(S) and other nonlocal runtime requests blocked and logged.",
              "cases": []}
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=args.chromium,
                                         headless=True, args=flags)
        try:
            info = await (await browser.new_browser_cdp_session()).send("SystemInfo.getInfo")
            gpu = info["gpu"]
            report["gpu"] = {"devices": gpu.get("devices"),
                             "featureStatus": gpu.get("featureStatus"),
                             "renderer": gpu.get("auxAttributes", {}).get("glRenderer"),
                             "vendor": gpu.get("auxAttributes", {}).get("glVendor")}
        except Exception as exc:
            report["gpuInspectionError"] = str(exc)
        for view in args.views.split(","):
            for event in args.events.split(","):
                motions = ["no-preference", "reduce"] if args.motion == "both" else [args.motion]
                for motion in motions:
                    case = {"view": view, "event": event, "motion": motion,
                            "cpuThrottle": 4 if view == "phone" else 1}
                    name = f"{view}-{event}-{'reduced' if motion == 'reduce' else 'normal'}"
                    base = source.as_uri() if args.transport == "file" else "http://partybox.invalid/" + source.name
                    query = dict(parse_qsl(args.query))
                    query.update(view=view, event=event)
                    uri = base + "?" + urlencode(query)
                    context, page, errors, network, harness_loads = await new_context(browser, case, output, False, uri, source, args.transport)
                    stage = "load_document"
                    try:
                        await prepare_page(page, uri, script, report)
                        stage = "measure_frames"
                        await page.wait_for_timeout(args.warmup * 1000)
                        sample = await page.evaluate("cfg => window.__fxMeasure(cfg.durationMs, cfg.triggers)",
                            {"durationMs": args.seconds*1000, "triggers": triggers})
                        case["performance"] = summarize(sample)
                        case["hitchProfiles"] = hitch_summary(sample, args.hitch_window)
                        case["inspection"] = await inspect_page(page)
                        await page.screenshot(path=str(output / f"{name}.png"))
                        (output / f"{name}-frames.json").write_text(json.dumps(sample, indent=2) + "\n")
                    except PlaywrightError as exc:
                        case["failure"] = {"stage": stage, "type": type(exc).__name__,
                                           "message": str(exc), "url": uri}
                        errors.append(stage + ": " + str(exc))
                    finally:
                        case["errors"] = errors
                        case["runtimeNetworkAttempts"] = network
                        case["harnessDocumentLoads"] = harness_loads
                        await context.close()
                    if "failure" in case:
                        report["cases"].append(case)
                        print(json.dumps({"case": name, "failure": case["failure"],
                            "standaloneFileOpened": report["standaloneFileOpened"]}), flush=True)
                        if args.transport == "file" and "ERR_BLOCKED_BY_ADMINISTRATOR" in case["failure"]["message"]:
                            await browser.close()
                            return finish_report(report, output)
                        (output / "validation.json").write_text(json.dumps(report, indent=2) + "\n")
                        continue
                    if args.capture > 0:
                        context, page, capture_errors, capture_network, capture_loads = await new_context(browser, case, output, True, uri, source, args.transport)
                        dest = output / f"{name}.webm"
                        capture_failure = None
                        stage = "load_capture_document"
                        try:
                            await prepare_page(page, uri, script, report)
                            stage = "record_capture"
                            if capture_script:
                                await page.evaluate(capture_script)
                            recording = await record_screen(page, context, dest, args.capture, case)
                        except PlaywrightError as exc:
                            capture_failure = {"stage": stage, "type": type(exc).__name__,
                                               "message": str(exc), "url": uri}
                            capture_errors.append(stage + ": " + str(exc))
                        finally:
                            await context.close()
                        case["capture"] = {"path": str(dest), "requestedSeconds": args.capture,
                                           "errors": capture_errors,
                                           "runtimeNetworkAttempts": capture_network,
                                           "harnessDocumentLoads": capture_loads}
                        if capture_failure:
                            case["capture"].update(failure=capture_failure, under10MB=False)
                        else:
                            case["capture"].update(bytes=dest.stat().st_size,
                                under10MB=dest.stat().st_size < 10_000_000, recording=recording)
                        if not capture_failure and shutil.which("ffprobe"):
                            meta = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                                "format=duration:stream=codec_name,width,height,r_frame_rate",
                                "-of", "json", str(dest)], capture_output=True, text=True)
                            case["capture"]["metadata"] = json.loads(meta.stdout) if meta.returncode == 0 else meta.stderr
                    report["cases"].append(case)
                    (output / "validation.json").write_text(json.dumps(report, indent=2) + "\n")
                    perf = case["performance"]
                    print(json.dumps({"case": name, "fps": round(perf["fps"], 2),
                        "p95ms": round(perf["arrivalIntervals"]["p95Ms"], 2),
                        "missedFraction": round(perf["missedRefreshFraction"], 4),
                        "pageErrors": len(errors), "networkAttempts": len(network),
                        "videoBytes": case.get("capture", {}).get("bytes")}), flush=True)
        await browser.close()
    return finish_report(report, output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("html")
    parser.add_argument("--output", required=True)
    parser.add_argument("--chromium", default="/usr/bin/chromium")
    parser.add_argument("--views", default="tv,phone", help="comma separated: tv,phone")
    parser.add_argument("--events", default="idle", help="comma separated: idle,win,tick")
    parser.add_argument("--query", default="", help="extra URL query parameters, e.g. seed=1")
    parser.add_argument("--motion", choices=["no-preference", "reduce", "both"], default="both")
    parser.add_argument("--seconds", type=float, default=8)
    parser.add_argument("--warmup", type=float, default=2)
    parser.add_argument("--capture", type=float, default=6, help="capture seconds; 0 disables")
    parser.add_argument("--script", help="local JS expression evaluated after load in each run")
    parser.add_argument("--capture-script", help="local expression evaluated after load in capture contexts only")
    parser.add_argument("--hitch-fire", help="profile __sand.fire(kind): first fire at 300 ms, then repeated on the same page")
    parser.add_argument("--hitch-repeats", type=int, default=3)
    parser.add_argument("--hitch-gap", type=float, default=6)
    parser.add_argument("--hitch-window", type=float, default=3)
    parser.add_argument("--software", action="store_true", help="force SwiftShader even with device nodes")
    parser.add_argument("--transport", choices=["routed", "file"], default="routed",
                        help="routed supplies the document directly from bytes; file requires policy allowance")
    parser.add_argument("--require-performance", action="store_true",
                        help="exit nonzero if any case fails the measured frame tolerance")
    args = parser.parse_args()
    if args.seconds < 1 or args.capture < 0 or args.warmup < 0:
        parser.error("measurement must be >=1 second; capture and warmup must be nonnegative")
    if args.hitch_fire and (args.warmup != 0 or args.seconds < .3 + (args.hitch_repeats-1)*args.hitch_gap + args.hitch_window):
        parser.error("hitch profiling needs --warmup 0 and enough --seconds for every fire window")
    report = asyncio.run(run(args))
    print(json.dumps({"report": str(Path(args.output).resolve() / "validation.json"),
        "allCasesMeetFrameTolerance": report["allCasesMeetFrameTolerance"],
        "noRuntimeNetworkAttempts": report["noRuntimeNetworkAttempts"],
        "noPageErrors": report["noPageErrors"],
        "allCapturesUnder10MB": report["allCapturesUnder10MB"]}), flush=True)
    success = report["noRuntimeNetworkAttempts"] and report["noPageErrors"] and report["allCapturesUnder10MB"] and report["noHitchTriggerErrors"] and report["allHitchWindowsComplete"]
    if args.require_performance:
        success = success and report["allCasesMeetFrameTolerance"]
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
