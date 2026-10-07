#!/usr/bin/env python3
"""Exercise the actual offline page and GPU readbacks, not its status labels.

Python 3.12 and playwright==1.62.0 are the only test dependencies. Performance
acceptance is deliberately separate: SwiftShader functional CI does not establish
60 fps on a TV GPU or a mid-range phone.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import math
import re
import time
from pathlib import Path
from urllib.parse import urlencode

from playwright.async_api import async_playwright


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def points(values: list[float], count: int) -> list[tuple[float, float]]:
    require(len(values) >= 4 * count, f"GPU readback has {len(values)} values for {count} birds")
    require(all(math.isfinite(v) for v in values), "non-finite GPU position component")
    return [(values[4 * i], values[4 * i + 1]) for i in range(count)]


def rms(a: list[tuple[float, float]], b: list[tuple[float, float]]) -> float:
    require(len(a) == len(b), "position counts differ")
    return math.sqrt(sum((x - u) ** 2 + (y - v) ** 2
                         for (x, y), (u, v) in zip(a, b)) / len(a))


def spread(a: list[tuple[float, float]]) -> float:
    cx = sum(x for x, _ in a) / len(a)
    cy = sum(y for _, y in a) / len(a)
    return math.sqrt(sum((x - cx) ** 2 + (y - cy) ** 2 for x, y in a) / len(a))


# Independent geometric oracle: ray intersections against a sampled outline.
# It does not read the application's target texture, event state or captions.
HEART = [(.68 * 16 * math.sin(t) ** 3 / 18,
          .11 + .68 * (13 * math.cos(t) - 5 * math.cos(2 * t)
                        - 2 * math.cos(3 * t) - math.cos(4 * t)) / 18)
         for t in [2 * math.pi * i / 256 for i in range(256)]]


def in_heart(point: tuple[float, float]) -> bool:
    # Allow a narrow rim for bird depth, separation and convergence error.
    x, y = point[0] / 1.10, .11 + (point[1] - .11) / 1.10
    inside = False
    previous = HEART[-1]
    for current in HEART:
        ax, ay = previous
        bx, by = current
        if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
            inside = not inside
        previous = current
    return inside


def heart_metrics(a: list[tuple[float, float]], scale: float = 1.0) -> dict:
    # Evenly sample all texture slots, rather than selecting a favourable subset.
    sample = [(x / scale, .11 + (y - .11) / scale)
              for x, y in a[::max(1, len(a) // 2500)]]
    return {"insideFraction": sum(in_heart(p) for p in sample) / len(sample),
            "leftLobe": sum(x < -.08 and y > .34 for x, y in sample) / len(sample),
            "rightLobe": sum(x > .08 and y > .34 for x, y in sample) / len(sample),
            "notch": sum(abs(x) < .04 and y > .40 for x, y in sample) / len(sample),
            "spread": spread(a)}


class Harness:
    def __init__(self, browser, source: Path, allow_policy_harness: bool):
        self.browser = browser
        self.source = source
        self.html_bytes = source.read_bytes()
        self.html_sha256 = hashlib.sha256(self.html_bytes).hexdigest()
        self.allow_policy_harness = allow_policy_harness
        self.transport = "file"
        self.file_block = None
        self.records = []

    async def open(self, view="tv", event="idle", reduced=False, extra=None, no_webgl=False):
        require(self.source.read_bytes() == self.html_bytes,
                "HTML changed during checks; freeze one revision and rerun")
        width, height = (1920, 1080) if view == "tv" else (390, 844)
        context = await self.browser.new_context(viewport={"width": width, "height": height},
            device_scale_factor=1, reduced_motion="reduce" if reduced else "no-preference",
            service_workers="block")
        page = await context.new_page()
        page.set_default_timeout(180000)
        record = {"view": view, "event": event, "reducedMotion": reduced,
                  "htmlSha256": self.html_sha256,
                  "runtimeNetworkAttempts": [], "pageErrors": [], "consoleErrors": []}
        page.on("pageerror", lambda error: record["pageErrors"].append(str(error)))
        page.on("console", lambda msg: record["consoleErrors"].append(msg.text)
                if msg.type == "error" else None)
        if no_webgl:
            await context.add_init_script("""(() => {
              const original = HTMLCanvasElement.prototype.getContext;
              HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
                return /^webgl/.test(kind) ? null : original.call(this, kind, ...args);
              };
            })();""")
        query = urlencode({"view": view, "event": event, "seed": 123456, **(extra or {})})
        file_uri = self.source.as_uri() + "?" + query
        harness_uri = "https://partybox-offline.invalid/F01/index.html?" + query
        delivered = False

        async def route(request_route):
            nonlocal delivered
            request = request_route.request
            if (self.transport == "policy-harness" and not delivered and
                    request.url == harness_uri and request.is_navigation_request() and
                    request.frame == page.main_frame):
                delivered = True
                await request_route.fulfill(status=200, content_type="text/html",
                                            body=self.html_bytes)
            elif (self.transport == "file" and not delivered and request.url == file_uri
                  and request.is_navigation_request() and request.frame == page.main_frame):
                delivered = True
                await request_route.continue_()
            elif request.url.startswith(("data:", "blob:", "about:")):
                await request_route.continue_()
            else:
                record["runtimeNetworkAttempts"].append(request.url)
                await request_route.abort("blockedbyclient")

        await context.route("**/*", route)

        async def socket_route(socket):
            record["runtimeNetworkAttempts"].append(socket.url)
            await socket.close(code=1008, reason="offline visual check")

        await context.route_web_socket("**/*", socket_route)
        try:
            await page.goto(file_uri if self.transport == "file"
                            else harness_uri, wait_until="load", timeout=30000)
        except Exception as exc:
            if (self.transport == "file" and "ERR_BLOCKED_BY_ADMINISTRATOR" in str(exc)
                    and self.allow_policy_harness):
                self.file_block = str(exc).split("Call log:")[0].strip()
                self.transport = "policy-harness"
                delivered = False
                record["pageErrors"].clear()
                record["consoleErrors"].clear()
                # Chromium may still be committing its chrome-error document.
                # A fresh page avoids racing that navigation with the harness.
                await page.close()
                page = await context.new_page()
                page.set_default_timeout(180000)
                page.on("pageerror", lambda error: record["pageErrors"].append(str(error)))
                page.on("console", lambda msg: record["consoleErrors"].append(msg.text)
                        if msg.type == "error" else None)
                await page.goto(harness_uri, wait_until="load", timeout=30000)
            else:
                await context.close()
                raise
        await page.wait_for_function("!!window.__murm", timeout=30000)
        await page.evaluate("document.fonts.ready")
        await page.evaluate("window.__murm.pause()")
        record["transport"] = self.transport
        self.records.append(record)
        return context, page, record

    async def close(self, context, record):
        require(not record["runtimeNetworkAttempts"],
                f"runtime network requests: {record['runtimeNetworkAttempts']}")
        require(not record["pageErrors"], f"page errors: {record['pageErrors']}")
        require(not record["consoleErrors"], f"console errors: {record['consoleErrors']}")
        await context.close()


async def state(page):
    return await page.evaluate("window.__murm.state()")


async def read_positions(page, count):
    values = await page.evaluate("Array.from(window.__murm.positions())")
    return points(values, count)


async def reset(page, seed=123456):
    await page.evaluate("seed => window.__murm.reset(seed)", seed)


async def step(page, seconds):
    # Browser evaluate is otherwise unbounded. This is a fixed amount of
    # diagnostic work, with a hard wall-time cap for a wedged shader/driver.
    await asyncio.wait_for(page.evaluate("seconds => window.__murm.step(seconds)", seconds),
                           timeout=180)


async def layout(page):
    result = await page.evaluate("""() => ({
      width: innerWidth, height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      canvas: document.querySelector('#c').getBoundingClientRect().toJSON(),
      buttons: [...document.querySelectorAll('button')].map(b => ({
        id: b.id, text: b.textContent.trim(), rect: b.getBoundingClientRect().toJSON()
      }))
    })""")
    require(result["scrollWidth"] <= result["width"] + 1, "horizontal viewport overflow")
    require(result["scrollHeight"] <= result["height"] + 1, "vertical viewport overflow")
    require(result["canvas"]["width"] >= result["width"] - 1, "canvas does not fill viewport")
    require(result["canvas"]["height"] >= result["height"] - 1, "canvas does not fill viewport")
    view = await page.evaluate("document.body.dataset.view")
    for button in result["buttons"]:
        rect = button["rect"]
        if view == "phone":
            require(rect["width"] >= 43 and rect["height"] >= 43,
                    f"small phone touch target: {button['id']}")
        require(rect["left"] >= -1 and rect["right"] <= result["width"] + 1 and
                rect["top"] >= -1 and rect["bottom"] <= result["height"] + 1,
                f"offscreen control: {button['id']}")
    return result


async def check_gpu(harness, view):
    context, page, record = await harness.open(view=view)
    initial = await state(page)
    count = initial["birds"]
    require("webgl2" in str(initial.get("renderer", "")).lower(),
            f"GPU path unavailable: {initial}")
    require(count >= 20000 if view == "tv" else 3000 <= count <= 3200,
            f"wrong bird count: {count}")
    require(initial["textureSize"] ** 2 >= count, "GPU texture cannot contain every bird")
    await reset(page)
    live_before = await read_positions(page, count)
    live_state = await state(page)
    await page.evaluate("window.__murm.resume()")
    await page.wait_for_function("frame => window.__murm.state().frames >= frame + 3",
                                 arg=live_state["frames"], timeout=10000)
    await page.evaluate("window.__murm.pause()")
    live_after = await read_positions(page, count)
    live_displacement = rms(live_before, live_after)
    require(live_displacement > 1e-7 and
            sum(a != b for a, b in zip(live_before, live_after)) >= count * .5,
            "real-time rAF loop does not advance GPU bird positions")
    await reset(page)
    before = await read_positions(page, count)
    await step(page, .25)
    after = await read_positions(page, count)
    displacement = rms(before, after)
    require(displacement > .0001, "GPU positions do not move")
    require(spread(after) > .1, "flock collapsed to a point")
    require(max(abs(v) for xy in after for v in xy) < 20, "escaped flock coordinates")
    require((await state(page))["computePasses"] > 0, "no compute passes executed")

    await reset(page)
    await step(page, .75)
    control = await read_positions(page, count)
    await reset(page)
    await step(page, .75)
    repeat = await read_positions(page, count)
    deterministic_error = rms(control, repeat)
    require(deterministic_error < 1e-6, "seeded replay is not deterministic")
    await reset(page)
    await page.evaluate("window.__murm.tick()")
    await step(page, .75)
    ripple = await read_positions(page, count)
    tick_difference = rms(control, ripple)
    require(tick_difference > .015, "tick has no material effect on GPU bird positions")

    await reset(page)
    await step(page, 2.4)
    idle = await read_positions(page, count)
    await reset(page)
    await page.evaluate("window.__murm.win('ANA')")
    await step(page, 2.4)
    heart = await read_positions(page, count)
    scale = min(1, page.viewport_size["width"] / page.viewport_size["height"] / .80)
    idle_metrics, heart_result = heart_metrics(idle, scale), heart_metrics(heart, scale)
    require(heart_result["insideFraction"] >= .80,
            f"winner birds did not form a heart: {heart_result}")
    require(heart_result["leftLobe"] > .01 and heart_result["rightLobe"] > .01,
            f"winner heart lacks two lobes: {heart_result}")
    require(heart_result["notch"] < .025, f"winner heart notch filled: {heart_result}")
    require(heart_result["insideFraction"] - idle_metrics["insideFraction"] > .10,
            f"heart geometry indistinguishable from idle: {idle_metrics}, {heart_result}")
    require(rms(idle, heart) > .1, "win only changes caption")
    await step(page, 2.8)
    hold = await read_positions(page, count)
    aspect = page.viewport_size["width"] / page.viewport_size["height"]
    visible_fraction = sum(abs(x) <= aspect * 1.03 and abs(y) <= 1.03
                           for x, y in hold) / count
    require(visible_fraction >= .97, f"winner hold clips a material part of the flock: {visible_fraction}")
    before_layout = await layout(page)
    for identifier in ("bTheme", "bLook", "bShape"):
        # Hide text overlays while capturing the central flock: a control must
        # affect bird pixels, not merely update its own button label.
        viewport = page.viewport_size
        clip = {"x": viewport["width"] * .10, "y": viewport["height"] * .30,
                "width": viewport["width"] * .80, "height": viewport["height"] * .35}
        screenshot_style = "#mast,#cap,#caption-label,#edition,#hud,#status{visibility:hidden!important}"
        old_frame = hashlib.sha256(await page.screenshot(clip=clip, style=screenshot_style)).hexdigest()
        await page.locator("#" + identifier).click()
        new_frame = hashlib.sha256(await page.screenshot(clip=clip, style=screenshot_style)).hexdigest()
        require(old_frame != new_frame, f"{identifier} has no visible effect")
    await step(page, 5.4)
    reformed = await read_positions(page, count)
    reformed_metrics = heart_metrics(reformed, scale)
    require((await state(page))["event"]["kind"] == "idle", "win does not finish")
    require(heart_result["insideFraction"] - reformed_metrics["insideFraction"] > .10,
            f"flock remains trapped in heart: {reformed_metrics}")
    require(rms(heart, reformed) > .15, "winner flock does not reform")
    for identifier, expected in (("bJoin", "join"), ("bCode", "code"),
                                 ("bWin", "win"), ("bTick", "tick")):
        await reset(page)
        await page.locator("#" + identifier).click()
        require((await state(page))["event"]["kind"] == expected,
                f"{identifier} does not trigger {expected}")
    await page.locator("#bSkip").click()
    require((await state(page))["event"]["kind"] == "idle", "skip does not dismiss event")
    # Actual host resize, including a viewport unlike either documented preset.
    await page.set_viewport_size({"width": 844, "height": 390})
    await layout(page)
    await step(page, .1)
    await read_positions(page, count)
    await harness.close(context, record)
    return {"view": view, "birds": count, "renderer": initial["renderer"],
            "idleDisplacementRms": displacement, "deterministicReplayRms": deterministic_error,
            "liveDisplacementRms": live_displacement,
            "tickDifferenceRms": tick_difference, "idleGeometry": idle_metrics,
            "heartGeometry": heart_result, "reformedGeometry": reformed_metrics,
            "holdVisibleFraction": visible_fraction,
            "controls": [b["id"] for b in before_layout["buttons"]]}


async def check_reduced_motion(harness):
    context, page, record = await harness.open(view="phone", event="win", reduced=True)
    count = (await state(page))["birds"]
    require((await state(page))["reduced"], "initial reduced-motion preference ignored")
    before = await read_positions(page, count)
    await step(page, 1)
    require(rms(before, await read_positions(page, count)) == 0,
            "reduced-motion diagnostic step animates")
    await page.evaluate("window.__murm.resume()")
    await page.wait_for_timeout(200)
    require(rms(before, await read_positions(page, count)) == 0,
            "reduced-motion real-time loop animates")
    await page.emulate_media(reduced_motion="no-preference")
    await page.wait_for_function("!window.__murm.state().reduced")
    await page.evaluate("window.__murm.pause()")
    await step(page, .2)
    require(rms(before, await read_positions(page, count)) > .001,
            "live normal-motion change does not resume simulation")
    await page.emulate_media(reduced_motion="reduce")
    await page.wait_for_function("window.__murm.state().reduced")
    frozen = await read_positions(page, count)
    await step(page, .2)
    require(rms(frozen, await read_positions(page, count)) == 0,
            "live reduced-motion change does not stop simulation")
    await page.evaluate("window.__murm.win('<img src=x onerror=alert(1)>')")
    require(await page.locator("img").count() == 0, "player name interpreted as HTML")
    require((await page.locator("body").inner_text()).strip(), "reduced-motion page is blank")
    await layout(page)
    await harness.close(context, record)
    return {"initialPreference": "pass", "livePreferenceChanges": "pass",
            "staticGpuPositions": "pass", "nameEscaping": "pass"}


async def check_queries(harness):
    results = []
    for event in ("win", "tick"):
        context, page, record = await harness.open(view="phone", event=event,
            extra={"theme": "gouache", "look": "ink", "shape": "petal",
                   "winner": "MAYA", "kiosk": "1"})
        current = await state(page)
        require(current["event"]["kind"] == event, f"?event={event} ignored")
        require(current["theme"] == "gouache" and current["look"] == "ink" and
                current["shape"] == "petal", "URL appearance parameters ignored")
        require(not await page.locator("#hud").is_visible(), "?kiosk does not hide controls")
        if event == "win":
            require("MAYA" in await page.locator("#announce").inner_text(),
                    "URL winner name is lost")
        await read_positions(page, current["birds"])
        await harness.close(context, record)
        results.append({"event": event, "theme": current["theme"],
                        "look": current["look"], "shape": current["shape"], "kiosk": "pass"})
    return results


async def check_words(harness):
    results = []
    names = ["سارة", "מיכל", "ANA 👩🏽‍🚀", "東京", "W" * 32, "👩🏽‍🚀" * 32 + "X"]
    for view in ("tv", "phone"):
        context, page, record = await harness.open(view=view, reduced=True)
        for name in names:
            await page.evaluate("name => window.__murm.join(name)", name)
            geometry = await page.evaluate("""() => {
              const caption = document.querySelector('#cap'), text = caption.textContent;
              const style = getComputedStyle(caption), lines = text.split('\\n');
              const c = document.createElement('canvas'); c.width = innerWidth; c.height = innerHeight;
              const ctx = c.getContext('2d', {willReadFrequently:true});
              ctx.font = style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
              if ('letterSpacing' in ctx) ctx.letterSpacing = style.letterSpacing;
              ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              const lineHeight = parseFloat(style.lineHeight);
              lines.forEach((line, i) => ctx.fillText(line, innerWidth/2,
                innerHeight*.445 + (i-(lines.length-1)/2)*lineHeight));
              const pixels = ctx.getImageData(0,0,c.width,c.height).data;
              const state = window.__murm.state(), positions = window.__murm.positions();
              let hit = 0, visible = 0;
              for (let i=0;i<state.wordBirds;i++) {
                const x = innerWidth/2 + positions[i*4]*innerHeight/2;
                const y = innerHeight/2 - positions[i*4+1]*innerHeight/2;
                if(x>=0 && x<innerWidth && y>=0 && y<innerHeight) visible++;
                let found=false;
                for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) {
                  const px=Math.round(x)+dx,py=Math.round(y)+dy;
                  if(px>=0&&px<c.width&&py>=0&&py<c.height&&pixels[(py*c.width+px)*4+3]>30) found=true;
                }
                if(found) hit++;
              }
              let loneSurrogate=false;
              for(let i=0;i<text.length;i++) {
                const code=text.charCodeAt(i);
                if(code>=0xD800&&code<=0xDBFF) {
                  const next=text.charCodeAt(++i);
                  if(!(next>=0xDC00&&next<=0xDFFF)) loneSurrogate=true;
                } else if(code>=0xDC00&&code<=0xDFFF) loneSurrogate=true;
              }
              return {text, maskCoverage:hit/state.wordBirds, visibleFraction:visible/state.wordBirds,
                loneSurrogate, bounds:caption.getBoundingClientRect().toJSON()};
            }""")
            require(not geometry["loneSurrogate"], f"emoji split into lone surrogate: {view}")
            require(geometry["maskCoverage"] >= .90,
                    f"word particles disagree with browser's independently shaped text: {view}, {name}, {geometry}")
            require(geometry["visibleFraction"] == 1, f"word particles clipped: {view}, {name}")
            bounds = geometry["bounds"]
            require(bounds["left"] >= 0 and bounds["right"] <= page.viewport_size["width"] and
                    bounds["top"] >= 0 and bounds["bottom"] <= page.viewport_size["height"],
                    f"caption clipped: {view}, {name}")
            expected = "👩🏽‍🚀" * 32 if name.endswith("X") else name
            require(geometry["text"].replace("\n", "") == expected,
                    f"name graphemes lost while wrapping/truncating: {view}, {name}")
            results.append({"view": view, "name": name, "maskCoverage": geometry["maskCoverage"],
                            "visibleFraction": geometry["visibleFraction"]})
        await layout(page)
        await harness.close(context, record)
    return results


async def check_fallback(harness, forced):
    context, page, record = await harness.open(view="phone", no_webgl=not forced,
        extra={"renderer": "canvas"} if forced else {})
    current = await state(page)
    require("canvas" in str(current["renderer"]).lower(),
            f"WebGL failure does not select canvas fallback: {current}")
    count = current["birds"]
    require(3000 <= count <= 3200, "fallback is not the graceful 3k path")
    await reset(page)
    before = await read_positions(page, count)
    await step(page, .25)
    after = await read_positions(page, count)
    displacement = rms(before, after)
    require(displacement > .0001 and
            sum(a != b for a, b in zip(before, after)) >= count * .5,
            "canvas fallback does not animate")
    await page.evaluate("window.__murm.win('ANA')")
    await step(page, 2.4)
    values = await read_positions(page, count)
    scale = min(1, page.viewport_size["width"] / page.viewport_size["height"] / .80)
    require(heart_metrics(values, scale)["insideFraction"] >= .80,
            "fallback loses winner heart")
    await layout(page)
    await harness.close(context, record)
    return {"forced": forced, "renderer": current["renderer"], "birds": current["birds"],
            "idleDisplacementRms": displacement}


async def check_context_loss(harness):
    context, page, record = await harness.open(view="tv", event="win")
    require("webgl2" in (await state(page))["renderer"], "context-loss case did not start on GPU")
    await page.evaluate("""() => {
      const gl = document.querySelector('#c').getContext('webgl2');
      const extension = gl.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('Test browser lacks WEBGL_lose_context');
      extension.loseContext();
    }""")
    await page.wait_for_function("window.__murm.state().renderer.includes('canvas')", timeout=10000)
    fallback = await state(page)
    require(3000 <= fallback["birds"] <= 3200, "context-loss fallback count is wrong")
    require(fallback["event"]["kind"] == "win", "context loss discards current winner")
    await step(page, 5.2)
    positions = await read_positions(page, fallback["birds"])
    word_count = fallback["wordBirds"]
    require(300 <= word_count <= 1500, "invalid fallback word role count")
    word = positions[:word_count]
    # After a GPU->CPU role-count change, targets must still span the complete
    # word. Keeping only the top prefix of the original raster destroys this.
    ys = sorted(y for _, y in word)
    word_height = ys[math.floor(.95 * (len(ys) - 1))] - ys[math.floor(.05 * (len(ys) - 1))]
    font_size = await page.locator("#cap").evaluate("e => parseFloat(getComputedStyle(e).fontSize)")
    expected_height = font_size * 2 / page.viewport_size["height"]
    require(word_height >= expected_height * .50,
            f"context-loss word has partial vertical strokes: {word_height} vs {expected_height}")
    require(abs(sum(y for _, y in word) / word_count - .11) < expected_height * .25,
            "context-loss word is vertically displaced")
    await layout(page)
    await harness.close(context, record)
    return {"renderer": fallback["renderer"], "birds": fallback["birds"],
            "wordBirds": word_count, "wordHeight": word_height,
            "fontWorldHeight": expected_height}


async def run(args):
    started = time.perf_counter()
    source = Path(args.html).resolve(strict=True)
    text = source.read_text()
    require(not re.search(r"<(?:script|link|img|iframe)\b[^>]*(?:src|href)\s*=\s*[\"'](?:https?:)?//",
                          text, re.I), "external markup dependency in standalone HTML")
    report = {"source": str(source), "htmlSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
              "functionalPassed": False, "standaloneFileOpened": False,
              "performanceAccepted": False,
              "performanceNote": "Functional checks do not establish the mandatory 60 fps target. "
                                 "Measure actual frame arrivals separately on suitable hardware.",
              "checks": {}, "checkWallSeconds": {}, "attemptedChecks": [],
              "completedChecks": [], "errors": []}
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=args.chromium, headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle",
                  "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        harness = Harness(browser, source, args.allow_policy_harness)
        try:
            tasks = [("contextLoss", lambda: check_context_loss(harness)),
                     ("tv", lambda: check_gpu(harness, "tv")),
                     ("phone", lambda: check_gpu(harness, "phone")),
                     ("queryParameters", lambda: check_queries(harness)),
                     ("words", lambda: check_words(harness)),
                     ("reducedMotion", lambda: check_reduced_motion(harness)),
                     ("fallbackForced", lambda: check_fallback(harness, True)),
                     ("fallbackNoWebGL", lambda: check_fallback(harness, False))]
            if args.checks:
                requested = args.checks.split(",")
                known = {name for name, _ in tasks}
                require(set(requested) <= known, f"unknown check names: {set(requested) - known}")
                tasks = [(name, check) for name, check in tasks if name in requested]
            report["requestedChecks"] = [name for name, _ in tasks]
            for name, check in tasks:
                report["attemptedChecks"].append(name)
                case_started = time.perf_counter()
                report["checks"][name] = await check()
                report["checkWallSeconds"][name] = time.perf_counter() - case_started
                report["completedChecks"].append(name)
                print(json.dumps({"check": name, "result": "pass",
                                  "metrics": report["checks"][name]}), flush=True)
            require(source.read_bytes() == harness.html_bytes,
                    "HTML changed during checks; freeze one revision and rerun")
            report["functionalPassed"] = True
        except Exception as exc:
            report["errors"].append(f"{report['attemptedChecks'][-1] if report['attemptedChecks'] else 'startup'}: "
                                    f"{type(exc).__name__}: {exc}")
        finally:
            report["transport"] = harness.transport
            report["standaloneFileOpened"] = harness.transport == "file" and bool(harness.records)
            report["standaloneFileBlocker"] = harness.file_block
            report["pages"] = harness.records
            await browser.close()
    report["wallSeconds"] = time.perf_counter() - started
    if args.report:
        destination = Path(args.report).resolve()
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2), flush=True)
    return report["functionalPassed"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--html", default=str(Path(__file__).with_name("index.html")))
    parser.add_argument("--chromium", help="optional system Chromium executable; default is Playwright's pinned browser")
    parser.add_argument("--report", help="optional machine-readable report path")
    parser.add_argument("--checks", help="optional comma-separated checks for a documented selective rerun; "
                        "default runs every check (CI always uses the default)")
    parser.add_argument("--allow-policy-harness", action="store_true",
        help="only after explicit enterprise file:// policy failure, fulfill top document from local bytes; "
             "report the disk-opening requirement as blocked, not passed")
    args = parser.parse_args()
    started = time.perf_counter()
    success = asyncio.run(run(args))
    print(f"Functional checks {'passed' if success else 'failed'} in {time.perf_counter() - started:.2f}s.")
    raise SystemExit(0 if success else 1)


if __name__ == "__main__":
    main()
