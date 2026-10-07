#!/usr/bin/env python3
"""Independent offline checks for the F02 wind, sand and paper page.

Install playwright==1.62.0 and its pinned Chromium. Functional software-GPU
checks are separate from the required TV / 4x-phone frame measurements.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import math
import random
import re
import statistics
import time
from pathlib import Path
from urllib.parse import urlencode

from playwright.async_api import async_playwright


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def rms(a, b):
    require(len(a) == len(b) and bool(a), "readback lengths differ or are empty")
    return math.sqrt(sum(sum((x-y)**2 for x,y in zip(p,q)) for p,q in zip(a,b)) / len(a))


def percentile(values, fraction):
    ordered = sorted(values)
    return ordered[round((len(ordered)-1)*fraction)]


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

    async def open(self, view="tv", event="idle", reduced=False, extra=None, no_webgl=False, manual_frames=False, dpr=1):
        require(self.source.read_bytes() == self.html_bytes,
                "HTML changed during checks; freeze one revision and rerun")
        width, height = (1920, 1080) if view == "tv" else (390, 844)
        context = await self.browser.new_context(viewport={"width": width, "height": height},
            device_scale_factor=dpr, reduced_motion="reduce" if reduced else "no-preference",
            service_workers="block")
        await context.add_init_script("""(() => {
          const original = requestAnimationFrame.bind(window); window.__f02RAFcount = 0;
          window.requestAnimationFrame = callback => original(time => {
            window.__f02RAFcount++; callback(time);
          });
        })();""")
        if manual_frames:
            await context.add_init_script("""(() => {
              let next=0;const pending=new Map();
              window.requestAnimationFrame=callback=>{pending.set(++next,callback);return next;};
              window.cancelAnimationFrame=id=>pending.delete(id);
              window.__f02Frame=time=>{const callbacks=[...pending.values()];pending.clear();
                for(const callback of callbacks){window.__f02RAFcount++;callback(time);}
                return callbacks.length;};
            })();""")
        page = await context.new_page()
        page.set_default_timeout(180000)
        record = {"view": view, "event": event, "reducedMotion": reduced,
                  "htmlSha256": self.html_sha256,
                  "extraQuery":dict(extra or {}),"deviceScaleFactor":dpr,
                  "loaded":False,"harnessDocumentLoads":[],
                  "runtimeNetworkAttempts": [], "pageErrors": [], "consoleErrors": []}
        self.records.append(record)
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
        query = urlencode({"view": view, "seed": 123456,
                           **({"event": event} if event is not None else {}), **(extra or {})})
        file_uri = self.source.as_uri() + "?" + query
        harness_uri = "https://partybox-offline.invalid/F02/index.html?" + query
        delivered = False

        async def route(request_route):
            nonlocal delivered
            request = request_route.request
            if (self.transport == "policy-harness" and not delivered and
                    request.url == harness_uri and request.is_navigation_request() and
                    request.frame == page.main_frame):
                delivered = True
                record["harnessDocumentLoads"].append(request.url)
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
        load_started=time.monotonic()
        record["transport"]=self.transport
        try:
            await page.goto(file_uri if self.transport == "file"
                            else harness_uri, wait_until="load", timeout=30000)
        except Exception as exc:
            if (self.transport == "file" and "ERR_BLOCKED_BY_ADMINISTRATOR" in str(exc)
                    and self.allow_policy_harness):
                self.file_block = str(exc).split("Call log:")[0].strip()
                self.transport = "policy-harness"
                record["transport"]=self.transport
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
        await page.wait_for_function("!!window.__sand", timeout=30000)
        await page.evaluate("document.fonts.ready")
        await page.evaluate("window.__sand.pause()")
        record["transport"] = self.transport
        record["loaded"]=True
        record["loadWallSeconds"]=round(time.monotonic()-load_started,3)
        return context, page, record

    async def close(self, context, record):
        require(not record["runtimeNetworkAttempts"],
                f"runtime network requests: {record['runtimeNetworkAttempts']}")
        require(not record["pageErrors"], f"page errors: {record['pageErrors']}")
        require(not record["consoleErrors"], f"console errors: {record['consoleErrors']}")
        await context.close()

async def state(page):
    return await page.evaluate("window.__sand.state()")


async def reset(page, seed=123456):
    await page.evaluate("seed => window.__sand.reset(seed)", seed)


async def step(page, seconds):
    await asyncio.wait_for(page.evaluate("seconds => window.__sand.step(seconds)", seconds), timeout=180)


async def resize(page, width, height):
    # Playwright's viewport command can return before the browser resize event.
    await page.set_viewport_size({"width":width,"height":height})
    await page.wait_for_function("__sand.state().width===innerWidth && __sand.state().height===innerHeight")


async def sand_read(page):
    data = await page.evaluate("""() => {
      const p = window.__sand.particles();
      return {positions:Array.from(p.positions), velocities:Array.from(p.velocities), count:p.count};
    }""")
    count = data["count"]
    require(len(data["positions"]) == count*4, "position texture size disagrees with particle count")
    require(len(data["velocities"]) == count*4, "velocity texture size disagrees with particle count")
    require(all(math.isfinite(v) for v in data["positions"]+data["velocities"]),
            "nonfinite actual particle readback")
    data["xy"] = [tuple(data["positions"][i:i+2]) for i in range(0,count*4,4)]
    data["rows"] = [tuple(data["positions"][i:i+4]) for i in range(0,count*4,4)]
    data["velocityRows"] = [tuple(data["velocities"][i:i+4]) for i in range(0,count*4,4)]
    return data


async def layout(page):
    result = await page.evaluate("""() => ({
      width:innerWidth,height:innerHeight,
      scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,
      canvases:[...document.querySelectorAll('canvas')].filter(c=>c.isConnected).map(c=>({
        id:c.id,width:c.width,height:c.height,bounds:c.getBoundingClientRect().toJSON()})),
      controls:[...document.querySelectorAll('#hud button,#hud input')].filter(e=>e.getClientRects().length).map(e=>({
        text:e.textContent,id:e.id,bounds:e.getBoundingClientRect().toJSON()}))
    })""")
    require(result["scrollWidth"] <= result["width"]+1 and result["scrollHeight"] <= result["height"]+1,
            "document overflows viewport")
    require(any(c["bounds"]["width"] >= result["width"]-1 and
                c["bounds"]["height"] >= result["height"]-1 for c in result["canvases"]),
            "no full viewport drawing canvas")
    for control in result["controls"]:
        r=control["bounds"]
        require(r["left"] >= -1 and r["right"] <= result["width"]+1 and
                r["top"] >= -1 and r["bottom"] <= result["height"]+1,
                f"offscreen control {control['id'] or control['text']}")
        if result["width"] < 500:
            require(r["width"] >= 43 and r["height"] >= 43,
                    f"small phone touch target {control['id'] or control['text']}")
    return result


async def wind_samples(page, probes, gpu=False):
    return await page.evaluate("""({probes,gpu}) => probes.map(p =>
      Array.from(window.__sand[gpu?'windGPU':'wind'](...p)))""", {"probes":probes,"gpu":gpu})


def simpson(values, span):
    require(len(values) >= 3 and len(values) % 2 == 1, "Simpson quadrature needs odd sample count")
    return span/(len(values)-1)/3 * (values[0]+values[-1] +
        4*sum(values[1:-1:2])+2*sum(values[2:-1:2]))


async def check_wind(harness):
    context,page,record = await harness.open(view="phone")
    require("webgl" in (await state(page))["renderer"], "wind probe did not start on actual GPU")
    generator = random.Random(90210)
    locations = [(generator.uniform(.08,.92),generator.uniform(.12,.72)) for _ in range(96)]
    results=[]
    record["completedWindCases"]=results
    for seed in (1,2,3):
        await reset(page,seed)
        for t,event in ((.37,{"kind":"idle","age":0}),
                        (1.41,{"kind":"tick","age":.71}),
                        (3.27,{"kind":"win","age":1.17})):
            strength=.42
            residuals=[]
            for h in (.002,.001):
                probes=[]
                for x,y in locations:
                    probes.extend([[x+h,y,t,strength,event],[x-h,y,t,strength,event],
                                   [x,y+h,t,strength,event],[x,y-h,t,strength,event]])
                values=await wind_samples(page,probes)
                divergence,jacobian=[],[]
                for i in range(0,len(values),4):
                    east,west,south,north=values[i:i+4]
                    ux=(east[0]-west[0])/(2*h);vx=(east[1]-west[1])/(2*h)
                    uy=(south[0]-north[0])/(2*h);vy=(south[1]-north[1])/(2*h)
                    divergence.append(ux+vy);jacobian.extend([ux,vx,uy,vy])
                full=math.sqrt(statistics.mean(v*v for v in jacobian))
                require(full > .002, "constant wind trivially passed divergence oracle")
                residual=math.sqrt(statistics.mean(v*v for v in divergence))/full
                require(residual < .02, f"curl field divergence residual {residual}")
                residuals.append(residual)
            require(residuals[1] <= residuals[0]*1.2+1e-6,
                    "central-difference divergence does not converge with spacing")
            # Independent closed-boundary flux rather than a second local derivative.
            a,b,c,d=.12,.88,.18,.69;n=64
            boundaries=[]
            for i in range(n+1):
                u=a+(b-a)*i/n;v=c+(d-c)*i/n
                boundaries.extend([[u,c,t,strength,event],[u,d,t,strength,event],
                                   [a,v,t,strength,event],[b,v,t,strength,event]])
            values=await wind_samples(page,boundaries)
            top=[-values[i*4][1] for i in range(n+1)]
            bottom=[values[i*4+1][1] for i in range(n+1)]
            left=[-values[i*4+2][0] for i in range(n+1)]
            right=[values[i*4+3][0] for i in range(n+1)]
            signed=simpson(top,b-a)+simpson(bottom,b-a)+simpson(left,d-c)+simpson(right,d-c)
            absolute=simpson(list(map(abs,top)),b-a)+simpson(list(map(abs,bottom)),b-a)+simpson(list(map(abs,left)),d-c)+simpson(list(map(abs,right)),d-c)
            flux=abs(signed)/max(absolute,1e-12)
            require(flux < .01, f"nonzero closed-boundary wind flux: {flux}")
            probes=[[x,y,t,strength,event] for x,y in locations[:12]]
            cpu=await wind_samples(page,probes);gpu=await wind_samples(page,probes,True)
            error=max(abs(x-y) for a1,b1 in zip(cpu,gpu) for x,y in zip(a1,b1[:2]))
            # Isolated SwiftShader highp sin observed up to4.73e-5 UV/s.
            require(error <= 1e-4, f"GPU field disagrees with shared CPU wind: {error}")
            require(all(len(v)==4 and all(math.isfinite(x) for x in v) for v in gpu),
                    "GPU wind/potential/ground probe is invalid")
            later=await wind_samples(page,[[x,y,t+.25,strength,event] for x,y in locations[:12]])
            temporal=rms(cpu,later)
            require(temporal > 1e-4, "wind potential is frozen in time")
            results.append({"seed":seed,"time":t,"event":event["kind"],
                            "divergenceResidual":residuals,"boundaryFluxRatio":flux,
                            "gpuCpuMaxError":error,"temporalRms":temporal})
    # At fixed time and strength, tick must add an annular disturbance rather
    # than merely changing the scene's global gust strength or caption.
    aspect=(await state(page))["width"]/(await state(page))["height"]
    age=.71;t=1.41;ring=age*.35;probe=[]
    for radius in (ring-.06,ring+.06,ring+.30):
        for i in range(24):
            theta=2*math.pi*i/24;u=.5+radius*math.cos(theta)/aspect;v=.43+radius*math.sin(theta)
            probe.extend([[u,v,t,.42,{"kind":"idle","age":0}],
                          [u,v,t,.42,{"kind":"tick","age":age}]])
    values=await wind_samples(page,probe);bands=[];radial=[]
    for band in range(3):
        magnitudes=[]
        for i in range(24):
            j=(band*24+i)*2;du=(values[j+1][0]-values[j][0])*aspect;dv=values[j+1][1]-values[j][1]
            theta=2*math.pi*i/24;m=math.hypot(du,dv);magnitudes.append(m)
            if band<2:radial.append(abs(du*math.cos(theta)+dv*math.sin(theta))/max(m,1e-12))
        bands.append(statistics.mean(magnitudes))
    require(min(bands[:2])>.004 and min(bands[:2])>bands[2]*10,
            f"tick disturbance does not occupy a moving annulus: {bands}")
    require(max(radial)<.01,"tick curl ripple points radially rather than along its circular front")
    record["tickAnnulus"]={"bandMeanSpeeds":bands,"maxRadialFraction":max(radial)}
    await harness.close(context,record)
    return results


HEART=[(16*math.sin(t)**3/18,(13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t))/18)
       for t in [2*math.pi*i/256 for i in range(256)]]


def heart_fraction(points, aspect):
    scale=min(.34,aspect*.44)
    inside=0
    sample=points[::max(1,len(points)//2000)]
    for u,v in sample:
        x=(u-.5)*aspect/scale/1.10;y=(.43-v)/scale/1.10
        crossed=False;previous=HEART[-1]
        for bx,by in HEART:
            ax,ay=previous
            if (ay>y)!=(by>y) and x<(bx-ax)*(y-ay)/(by-ay)+ax: crossed=not crossed
            previous=(bx,by)
        inside+=crossed
    return inside/len(sample)


async def check_sand(harness,view):
    context,page,record = await harness.open(view=view)
    info=await state(page)
    partial={};record["partialEvidence"]=partial
    require("webgl" in info["renderer"], "actual GPU particle path unavailable")
    await reset(page);initial=await sand_read(page);count=initial["count"]
    require(count>=20000 if view=="tv" else 3000<=count<=3200,
            f"wrong GPU particle count: {count}")
    drawn=await page.evaluate("""() => {
      const a=window.__sand;a.step(0);const c=document.getElementById('gpu'),gl=c.getContext('webgl2');
      const d=new Uint8Array(c.width*c.height*4);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,d);let nonzero=0;
      for(let i=3;i<d.length;i+=4)if(d[i]>0)nonzero++;
      const ctx=document.getElementById('c').getContext('2d'),surface=[];
      for(let i=1;i<=12;i++){const u=i/13,x=Math.round(u*innerWidth),expected=a.ground(u)*innerHeight;
        const col=ctx.getImageData(x,0,1,innerHeight).data;let y=0;
        while(y<innerHeight&&col[y*4+3]<8)y++;surface.push({u,expected,rendered:y,error:Math.abs(y-expected)});}
      return {gpuOpaquePixels:nonzero,surface};
    }""")
    require(drawn["gpuOpaquePixels"]>500,"GPU computes positions but draws no visible grain pixels")
    require(max(p["error"] for p in drawn["surface"])<4,
            f"settled particle ground disagrees with the independently sampled visible dune: {drawn['surface']}")
    partial["renderedPixels"]=drawn
    # Verify the *simulation* consumes the same field as paper, rather than
    # merely exposing a correct wind-probe shader alongside another force.
    acceleration=await page.evaluate("""() => {
      const a=window.__sand,dt=1/60; a.reset(123456);a.windStrength(.42);
      const before=a.particles(),p=Array.from(before.positions),v=Array.from(before.velocities);
      a.step(dt);const after=a.particles(),q=Array.from(after.positions),z=Array.from(after.velocities);
      const aspect=innerWidth/innerHeight;let n=0,ve=0,pe=0;
      for(let i=0;i<p.length;i+=4){if(p[i+2]>.5||q[i+2]>.5||v[i+3]!==z[i+3]||p[i+1]>a.ground(p[i])-.05)continue;
        const w=a.wind(p[i],p[i+1],dt,.42,{kind:'idle',age:0}),rx=w[0]-v[i],ry=w[1]-v[i+1];
        const drag=8+4*v[i+2]+1.8*Math.hypot(rx*aspect,ry);
        const vx=v[i]+dt*drag*rx,vy=v[i+1]+dt*(drag*ry+.20);
        ve=Math.max(ve,Math.abs(z[i]-vx),Math.abs(z[i+1]-vy));
        pe=Math.max(pe,Math.abs(q[i]-p[i]-dt*vx),Math.abs(q[i+1]-p[i+1]-dt*vy));n++;
      }return {samples:n,maxVelocityError:ve,maxPositionError:pe};
    }""")
    require(acceleration["samples"]>count*.25,"too few safe airborne slots for independent acceleration oracle")
    require(acceleration["maxVelocityError"]<1e-4 and acceleration["maxPositionError"]<3e-6,
            f"GPU acceleration is inconsistent with shared CPU wind: {acceleration}")
    partial["acceleration"]=acceleration
    await reset(page);initial=await sand_read(page)
    await step(page,.25);moved=await sand_read(page)
    displacement=rms(initial["xy"],moved["xy"])
    require(displacement>.002, "sand GPU texture does not advance")
    require(all(-.25<=x<=1.25 and -.25<=y<=1.25 for x,y in moved["xy"]),
            "unbounded GPU grain position")
    require(all(abs(p[2]-round(p[2]))<1e-6 and round(p[2]) in (0,1) for p in moved["rows"]),
            "GPU grain lifecycle state is invalid")
    await reset(page);await step(page,.75);reference=await sand_read(page)
    await reset(page);await step(page,.75);repeat=await sand_read(page)
    require(reference["positions"]==repeat["positions"] and reference["velocities"]==repeat["velocities"],
            "fixed-step seeded GPU replay is not bit-identical")
    await reset(page);await page.evaluate("window.__sand.tick()");await step(page,.75)
    ripple=await sand_read(page);tick_delta=rms(reference["xy"],ripple["xy"])
    require(tick_delta>.002, "tick only changes a caption, not GPU sand")
    partial.update({"idleRms":displacement,"seedReplay":"bit-identical","tickRms":tick_delta})
    await reset(page);await page.evaluate("window.__sand.win()");await step(page,2.4)
    heart=await sand_read(page);aspect=info["width"]/info["height"]
    formed=heart_fraction(heart["xy"],aspect)
    require(formed>.85,f"GPU win particles did not form a heart: {formed}")
    partial["heartFraction"]=formed
    scale=min(.34,aspect*.44)
    canonical=[((u-.5)*aspect/scale,(.43-v)/scale) for u,v in heart["xy"]]
    require(statistics.pstdev(x for x,y in canonical)>.22 and statistics.pstdev(y for x,y in canonical)>.22,
            "heart containment passed a collapsed particle cluster")
    require(sum(x<-.2 and y>.05 for x,y in canonical)>count*.06 and
            sum(x>.2 and y>.05 for x,y in canonical)>count*.06,"heart lacks two separated upper lobes")
    await step(page,4.2);released=await sand_read(page)
    reform=heart_fraction(released["xy"],aspect)
    require(formed-reform>.15 and rms(heart["xy"],released["xy"])>.10,
            "winner sand stays trapped in the heart")
    # Follow actual persistent texture slots, not aggregate settled counters.
    await reset(page);calm_initial=await sand_read(page)
    await page.evaluate("window.__sand.windStrength(0)");await step(page,3)
    bed=await sand_read(page);settled=[i for i,p in enumerate(bed["rows"]) if p[2]>.5]
    require(len(settled)>count*.20,"grains do not physically settle at low wind")
    newly_settled=[i for i in settled if calm_initial["rows"][i][2]<.5 and
                   calm_initial["velocityRows"][i][3]==bed["velocityRows"][i][3]]
    require(len(newly_settled)>count*.02,"initially airborne grains never make real ground contact")
    require(all(abs(bed["velocityRows"][i][0])+abs(bed["velocityRows"][i][1])<1e-7 for i in newly_settled),
            "new settled grains retain airborne velocity")
    await step(page,.8);still=await sand_read(page)
    stable=[i for i in settled if still["rows"][i][2]>.5 and bed["velocityRows"][i][3]==still["velocityRows"][i][3]]
    require(len(stable)>len(settled)*.90,"settled grain identities disappear during calm")
    require(max(math.dist(bed["xy"][i],still["xy"][i]) for i in stable)<5e-5,
            "settled grains hover or move during calm")
    await page.evaluate("window.__sand.windStrength(1);window.__sand.tick()")
    await step(page,.35);gust=await sand_read(page)
    lifted=[i for i in stable if gust["rows"][i][2]<.5 and
            math.dist(still["xy"][i],gust["xy"][i])>.002]
    require(len(lifted)>len(stable)*.30,"gust does not re-entrain settled grains")
    await layout(page)
    await harness.close(context,record)
    return {"view":view,"count":count,"idleRms":displacement,"seedReplay":"bit-identical",
            "tickRms":tick_delta,"heartFraction":formed,"reformedHeartFraction":reform,
            "renderedGrainPixels":drawn["gpuOpaquePixels"],"surfacePixels":drawn["surface"],
            "accelerationOracle":acceleration,"settled":len(settled),"newlySettled":len(newly_settled),
            "stableSettled":len(stable),"liftedByGust":len(lifted)}


async def check_paper_physics(harness):
    context,page,record=await harness.open(view="phone",extra={"nogpu":"1"})
    results=await page.evaluate("""() => {
      const base={x:100,y:120,vx:0,vy:0,theta:0,omega:0,roll:0,rollVelocity:0,flake:true};
      const dt=1/60,wind=[.5,-.1],advance=window.__sand.advancePaper;
      const plus=advance({...base,omega:3},dt,wind),minus=advance({...base,omega:-3},dt,wind);
      const tangent=advance(base,dt,[.5,0]),normal=advance({...base,theta:Math.PI/2},dt,[.5,0]);
      const incidence=advance(base,dt,[0,.3]);
      const boost=[50,-20],original=advance({...base,vx:12,vy:-7},dt,wind);
      const shifted=advance({...base,vx:12+boost[0],vy:-7+boost[1]},dt,
        [wind[0]+boost[0]/innerWidth,wind[1]+boost[1]/innerHeight]);
      return {base,dt,plus,minus,tangent,normal,incidence,original,shifted,boost};
    }""")
    a,b=results["plus"],results["minus"]
    coupled=math.hypot(a["vx"]-b["vx"],a["vy"]-b["vy"])
    require(coupled>.05,"angular velocity does not influence paper translation")
    require(abs(a["theta"]-a["omega"]*results["dt"])<1e-9,
            "orientation is a time cosine rather than integrated angular velocity")
    require(results["normal"]["vx"]>results["tangent"]["vx"]*1.2,
            "paper drag ignores sheet incidence")
    require(abs(results["incidence"]["omega"]-results["tangent"]["omega"])>.001,
            "relative wind does not influence angular acceleration")
    o,s,boost=results["original"],results["shifted"],results["boost"]
    invariant=max(abs(s[axis]-o[axis]-boost[i]) for i,axis in enumerate(("vx","vy")))
    require(invariant<1e-9,"aerodynamic force depends on absolute rather than relative velocity")
    require(abs(o["omega"]-s["omega"])<1e-9,"angular force violates relative-wind invariance")
    await harness.close(context,record)
    return {"angularTranslationDifference":coupled,"galileanVelocityError":invariant,
            "normalTangentDragRatio":results["normal"]["vx"]/results["tangent"]["vx"]}


async def pixels(page, rectangle=None, canvas="c"):
    """Independent foreground pixels, including alpha and color diversity."""
    return await page.evaluate("""({rectangle,canvas}) => {
      const c=document.getElementById(canvas),ctx=c.getContext('2d');
      const scale=c.width/innerWidth,r=rectangle||[0,0,innerWidth,innerHeight];
      const x=Math.max(0,Math.floor(r[0]*scale)),y=Math.max(0,Math.floor(r[1]*scale));
      const w=Math.max(1,Math.min(c.width-x,Math.ceil(r[2]*scale))),h=Math.max(1,Math.min(c.height-y,Math.ceil(r[3]*scale)));
      const d=ctx.getImageData(x,y,w,h).data,colors=new Set();let alpha=0,ink=0,hash=2166136261;
      for(let i=0;i<d.length;i+=4){if(d[i+3]>8){alpha++;colors.add((d[i]<<16)|(d[i+1]<<8)|d[i+2]);if(Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2])>20)ink++;}
        for(let j=0;j<4;j++)hash=Math.imul(hash^d[i+j],16777619)>>>0;}
      return {width:w,height:h,alpha,ink,colors:colors.size,hash};
    }""", {"rectangle":rectangle,"canvas":canvas})


async def cover_alpha(page):
    return await page.evaluate("""() => {
      const c=window.__sand.coverPixels();if(!c)return null;
      const card=window.__sand.state().cast;
      const dpr=document.getElementById('c').width/innerWidth;
      // Infer the symmetric bitmap overfill from actual pixels and card width;
      // omit only the submerged foot, as in the independent scene raster oracle.
      const overfill=(c.width/dpr-card.w)/2;
      const exposedRows=Math.min(c.height,Math.round((card.h+overfill-1)*dpr));
      let opaque=0,exposedOpaque=0;const exposedResiduals=[];
      for(let i=0;i<c.pixels.length;i+=4)if(c.pixels[i+3]>8){
        opaque++;const pixel=i/4,y=Math.floor(pixel/c.width);
        if(y<exposedRows){exposedOpaque++;if(exposedResiduals.length<8)
          exposedResiduals.push({x:pixel%c.width,y,rgba:Array.from(c.pixels.slice(i,i+4))});}
      }
      return {width:c.width,height:c.height,dpr,opaque,exposedRows,exposedOpaque,exposedResiduals};
    }""")


async def scene_alpha(page, cards):
    """Count actual pixels and retain the first residuals independently."""
    return await page.evaluate("""cards=>{
      const dpr=document.getElementById('c').width/innerWidth;
      const images=window.__sand.scenePixels();
      return images.map(image=>{
        const card=cards.find(c=>c.kind===image.kind);if(!card)throw Error('unmapped scene bitmap');
        const count=bitmap=>{const exposed=Math.round((card.h+(bitmap.width/dpr-card.w)/2-1)*dpr);
          let count=0;const residuals=[];for(let y=0;y<Math.min(exposed,bitmap.height);y++)for(let x=0;x<bitmap.width;x++){
            const i=(y*bitmap.width+x)*4;if(bitmap.pixels[i+3]>8){count++;if(residuals.length<8)residuals.push({x,y,rgba:Array.from(bitmap.pixels.slice(i,i+4))});}}
          return{count,residuals,width:bitmap.width,height:bitmap.height,exposedRows:exposed};};
        return {kind:image.kind,base:count(image.base),rel:count(image.rel)};
      });
    }""",cards)


async def check_scene_matrix(harness,view,direction):
    context,page,record=await harness.open(view=view,extra={"nogpu":"1","dir":str(direction)})
    record["windDirection"]=direction
    outcomes=[]
    record["completedSceneCases"]=outcomes
    for theme in ("pop","gouache"):
        await page.evaluate("t=>window.__sand.theme(t)",theme)
        for material,paper in (("sand","tear"),("paper","tear"),("paper","shred")):
            await page.evaluate("([m,p])=>window.__sand.material(m,p)",[material,paper])
            for mode in ("truth","sh","night","imp","door","fakeout","round","dawn","drawing"):
                record["currentSceneCase"]={"view":view,"direction":direction,"theme":theme,"material":material,"paper":paper,"mode":mode}
                await reset(page)
                await page.evaluate("k=>window.__sand.fire(k)",mode)
                await step(page,1.7)
                info=await state(page);shown=await pixels(page)
                require(shown["alpha"]>10000 and shown["colors"]>15,
                        f"blank card rendering: {theme}/{material}/{paper}/{mode}")
                if info["cast"]:
                    c=info["cast"];face=await pixels(page,[c["x"]+c["w"]*.25,c["y"]+c["h"]*.25,c["w"]*.5,c["h"]*.4])
                    require(face["alpha"]>face["width"]*face["height"]*.90 and face["colors"]>10,
                            f"no rasterized single-card face: {theme}/{material}/{paper}/{mode}")
                if mode in ("fakeout","dawn"):
                    cards=info["scene"]["cards"]
                    xs=sorted(set(c["x"] for c in cards));ys=sorted(set(c["y"] for c in cards))
                    require((len(xs)==2 and len(ys)==2) if view=="phone" else (len(xs)==4 and len(ys)==1),
                            "answer layout does not fit the viewport")
                    require(all(c["w"]>=(160 if view=="phone" else 350) and c["fontSize"]>=20 for c in cards),
                            "answer cards or their actual font sizes remain tiny")
                    for c in cards:
                        sample=await pixels(page,[c["x"]+8,c["y"]+8,c["w"]-16,c["h"]-16])
                        require(sample["alpha"]>sample["width"]*sample["height"]*.65 and sample["colors"]>10,
                                "a phone answer rectangle has no readable rasterized face")
                if mode=="round":
                    a,b=info["scene"]["cards"]
                    overlap=max(0,min(a["x"]+a["w"],b["x"]+b["w"])-max(a["x"],b["x"]))*max(0,min(a["y"]+a["h"],b["y"]+b["h"])-max(a["y"],b["y"]))
                    require(overlap==0,"round transition still overlays the old and new slots")
                    # Foreground alpha in this region is the banner itself;
                    # stars and dunes are drawn on a different opaque canvas.
                    banner_ink=[]
                    for _ in range(16):
                        await step(page,.15)
                        banner=await pixels(page,[0,info["height"]*.06,info["width"],info["height"]*.21])
                        banner_ink.append(banner["alpha"])
                    require(min(banner_ink)>300,"round banner goes blank while the new question arrives")
                before=await cover_alpha(page) if info["cast"] else None
                await step(page,1.2 if mode=="round" else 3.6)  # S=5.3, before terminal sinking.
                info=await state(page)
                if info["cast"]:
                    after=await cover_alpha(page)
                    record["lastCoverAlpha"]=after
                    require(after["exposedOpaque"]==0,
                            f"single-card exposed cover alpha: {record['currentSceneCase']}; counts={after}")
                    # The foot is intentionally retained below the exposed face.
                    require(after["opaque"]<before["opaque"]*.12,
                            f"cover bitmap retains visible debris before cleanup: {mode}")
                else:
                    bitmap_alpha=await scene_alpha(page,info["scene"]["cards"])
                    record["lastBitmapAlpha"]=bitmap_alpha
                    targets={c["kind"] for c in info["scene"]["cards"] if c["ws"] is not None}
                    removed=[c for c in bitmap_alpha if c["kind"] in targets]
                    require(len(removed)==len(targets) and bool(removed),f"wrong-card bitmap missing: {mode}")
                    require(all(c["base"]["count"]==0 and c["rel"]["count"]==0 for c in removed),
                            f"erased scene bitmap alpha: {record['currentSceneCase']}; counts={removed}")
                    survivors=[c for c in info["scene"]["cards"] if c["ws"] is None]
                    require(survivors,"scene removed every answer including the truth")
                    for c in survivors:
                        roi=[c["x"]+c["w"]*.25,c["y"]+c["h"]*.25,c["w"]*.5,c["h"]*.4]
                        sample=await pixels(page,roi)
                        require(sample["alpha"]>sample["width"]*sample["height"]*.8 and sample["colors"]>8,
                                "surviving answer is missing or covered by transparent debris")
                    if mode=="fakeout":
                        stamp=survivors[0]["stamp"]
                        require(stamp["h"]>=20 and stamp["w"]>=130,"truth stamp remains tiny")
                        sample=await pixels(page,[stamp["x"],stamp["y"],stamp["w"],stamp["h"]])
                        require(sample["colors"]>15,"truth stamp has no rasterized ink")
                outcomes.append({"view":view,"windDirection":direction,"theme":theme,"requestedMaterial":material,"material":info["material"],"requestedPaper":paper,"paper":info["paper"],"mode":mode,
                                 "shownPixelColors":shown["colors"],"checkedAtSeconds":5.3})
    await layout(page)
    await harness.close(context,record)
    return outcomes


async def check_scenes(harness):
    results=[]
    for view in ("phone","tv"):
        for direction in (1,-1):
            print(f"  scene matrix {view} direction={direction}",flush=True)
            result=await check_scene_matrix(harness,view,direction);results.extend(result)
            print(f"  PASS {len(result)} scene cases {view} direction={direction}",flush=True)
    return results


async def check_paper_geometry(harness):
    context,page,record=await harness.open(view="phone",extra={"nogpu":"1","mat":"paper","paper":"shred"})
    await reset(page);await page.evaluate("window.__sand.fire('drawing')")
    await step(page,1.75);info=await state(page);k=info["cast"]
    # Compare a fixed corner before and during the actual pre-tear crease.
    corner=[k["x"]-4,k["y"]-8,min(60,k["w"]*.25),min(75,k["h"]*.3)]
    plain=await pixels(page,corner);await step(page,.28);curled=await pixels(page,corner)
    require(plain["hash"]!=curled["hash"],"pre-tear corner has no visible curl/crumple/fray change")
    # Drawing forces tear; then exercise segmented ribbons on a separate face.
    await reset(page);await page.evaluate("window.__sand.material('paper','shred');window.__sand.fire('truth')")
    await step(page,2.45)
    snapshots=[];missing=[];seen_front=False;seen_back=False;edge=False;segmented=0;curvature=[];releases=[]
    previous={}
    for _ in range(35):
        debris=await page.evaluate("window.__sand.debris()")
        require(all(math.isfinite(g[a]) for g in debris for a in ("x","y","vx","vy","theta","omega","roll")),
                "nonfinite live CPU paper state")
        current={g["uid"]:g for g in debris}
        for uid,g in previous.items():
            if uid not in current and not g["settled"]:
                # A frame can legitimately cross an edge before the next readback.
                margin=max(80,g["size"]*30)
                exits=g["x"]<margin or g["x"]>info["width"]-margin or g["y"]<margin or g["y"]>info["height"]-margin
                require(exits,f"airborne paper uid={uid} vanishes in the interior")
                missing.append(uid)
        geometry=await page.evaluate("window.__sand.paperGeometry()")
        for piece in geometry:
            segments=piece["segments"]
            require(all(math.isfinite(v) for s in segments for point in s["vertices"] for v in point),
                    "paper mesh has invalid vertices")
            for s in segments:
                check_atlas_crop(s)
                require(abs(s["f"]-max(.035,abs(s["normal"])))<1e-9,"projected sheet width ignores signed normal")
                require(s["front"]==(s["normal"]>=0),"front/back atlas ignores sheet orientation")
                seen_front|=s["front"];seen_back|=not s["front"];edge|=s["f"]<.18
                if s["f"]<.18: require(s["shade"]<.60,"edge-on paper lacks darker shading")
            if len(segments)>1:
                segmented+=1
                angles=[math.atan2(s["sa"],s["ca"]) for s in segments]
                curvature.append(max(angles)-min(angles))
        releases.extend(g["releaseTime"] for g in debris if g["flake"])
        snapshots.append({"flakes":sum(g["flake"] for g in debris),"settled":sum(g["settled"] for g in debris)})
        previous=current
        await step(page,.10)
    require(segmented>20 and max(curvature,default=0)>.05,"shredded ribbons remain flat rigid quads")
    require(seen_front and seen_back and edge,"paper never exposes both faces and edge-on geometry")
    require(max(releases,default=0)-min(releases,default=0)>.20,"paper release remains a simultaneous clump")
    # Re-entrainment must move an actual settled persistent CPU identity.
    settled={g["uid"]:g for g in (await page.evaluate("window.__sand.debris()")) if g["flake"] and g["settled"]}
    if settled:
        await step(page,.65);await page.evaluate("window.__sand.tick()");await step(page,.15)
        live={g["uid"]:g for g in await page.evaluate("window.__sand.debris()")}
        lifted=[uid for uid,g in settled.items() if uid in live and not live[uid]["settled"] and math.dist((g["x"],g["y"]),(live[uid]["x"],live[uid]["y"]))>1]
        require(lifted,"settled far-dune paper does not re-entrain on next gust")
    else:
        raise AssertionError("no actual paper landed for far-dune re-entrainment check")
    # A drawing leaves its real spiral stub after its page has torn away.
    await reset(page);await page.evaluate("window.__sand.fire('drawing')");await step(page,5.5)
    k=(await state(page))["cast"];stub=await pixels(page,[k["x"]-11,k["y"]+8,20,k["h"]-16])
    require(stub["alpha"]>stub["width"]*stub["height"]*.75 and stub["colors"]>10,
            "notebook stub or spiral-hole pixels disappear with the drawing")
    holes=await page.evaluate("""k=>{
      const canvas=document.getElementById('c'),ctx=canvas.getContext('2d'),d=canvas.width/innerWidth;
      const color=(x,y)=>Array.from(ctx.getImageData(Math.round(x*d),Math.round(y*d),1,1).data).slice(0,3);
      const contrasts=[];for(let y=k.y+15;y<k.y+k.h-30;y+=24){const a=color(k.x+3,y),b=color(k.x+3,y+12);
        contrasts.push(Math.hypot(...a.map((v,i)=>v-b[i])));}return contrasts;
    }""",k)
    require(len(holes)>=8 and sum(x>20 for x in holes)>len(holes)*.75,
            "notebook stub is a solid strip without retained periodic spiral holes")
    await harness.close(context,record)
    return {"pretearPixelChange":True,"segmentedSamples":segmented,"maxRibbonCurvature":max(curvature),
            "frontBackAndEdge":True,"releaseSpan":max(releases)-min(releases),"offscreenExits":len(missing),
            "reentrainedPaper":len(lifted),"stubPixels":stub,"spiralHoleContrasts":holes}


def check_atlas_crop(segment):
    s=segment
    require(s["sourceWidth"]>0 and s["sourceHeight"]>0,"airborne paper crop becomes empty")
    require(s["sourceX"]>=0 and s["sourceY"]>=0 and
            s["sourceX"]+s["sourceWidth"]<=s["atlasWidth"]+1e-7 and
            s["sourceY"]+s["sourceHeight"]<=s["atlasHeight"]+1e-7,
            "airborne paper samples outside its retained source atlas")
    require(abs(s["sourceWidth"]/s["atlasDPR"]-s["destinationWidth"])<1e-7 and
            abs(s["sourceHeight"]/s["atlasDPR"]-s["destinationHeight"])<1e-7,
            "paper crop uses the new display DPR instead of its original atlas DPR")


async def check_responsive(harness):
    context,page,record=await harness.open(view="tv",extra={"view":"auto","warm":"0","mat":"paper","paper":"shred"},dpr=2)
    await reset(page);await page.evaluate("__sand.fire('truth')");await step(page,2.8)
    before=await sand_read(page);require(before["count"]>=20000,"unforced TV starts with too few GPU grains")
    old={g["uid"]:g for g in await page.evaluate("__sand.debris()")}
    old_geometry={p["uid"]:p for p in await page.evaluate("__sand.paperGeometry()")}
    require(old_geometry,"no live paper crosses the DPR change")
    await resize(page,390,844)
    after=await sand_read(page);require(3000<=after["count"]<=3200,"responsive TV-to-phone keeps20k instead of graceful3k")
    # Documented count reduction retains evenly spaced source-bin centers.
    # This independently reconstructs the map; no reported slot labels used.
    mapped=[(j,math.floor((j+.5)*before["count"]/after["count"])) for j in range(after["count"])]
    require(all(before["rows"][i][2:]==after["rows"][j][2:] for j,i in mapped),
            "responsive count reduction changes mapped lifecycle attributes")
    survivors=[(j,i) for j,i in mapped if before["rows"][i][2]<.5]
    require(len(survivors)>100 and max(math.dist(before["xy"][i],after["xy"][j]) for j,i in survivors)<2e-6,
            "responsive count change resets surviving airborne GPU identities")
    require(max(abs(before["velocityRows"][i][k]-after["velocityRows"][j][k]) for j,i in survivors for k in range(4))<1e-6,
            "responsive count change resets mapped velocity/response/generation")
    live={g["uid"]:g for g in await page.evaluate("__sand.debris()")}
    require(old.keys()==live.keys(),"viewport resize deletes live paper fragments")
    require(all(abs(live[uid]["x"]/390-g["x"]/1920)<1e-8 and
                abs(live[uid]["y"]/844-g["y"]/1080)<1e-8 for uid,g in old.items() if not g["settled"]),
            "airborne paper positions jump rather than resize in screen space")
    geometry=await page.evaluate("__sand.paperGeometry()")
    crops=0
    for piece in geometry:
        for s in piece["segments"]:
            check_atlas_crop(s);crops+=1
            require(abs(s["atlasDPR"]-1.5)<1e-9,"retained atlas loses its original TV DPR")
    require(crops>10,"too few live atlas samples after responsive resize")
    await resize(page,1920,1080)
    restored=await sand_read(page);require(restored["count"]>=20000,"responsive phone-to-TV does not restore20k")
    original_air=[i for i in range(after["count"]) if after["rows"][i][2]<.5]
    require(max(math.dist(after["xy"][i],restored["xy"][i]) for i in original_air)<2e-6,
            "count enlargement resets original retained airborne slots")
    require(all(after["rows"][i][2:]==restored["rows"][i][2:] for i in range(after["count"])),
            "count enlargement changes retained lifecycle attributes")
    require(max(abs(after["velocityRows"][i][k]-restored["velocityRows"][i][k])
                for i in original_air for k in range(4))<1e-6,
            "count enlargement changes original airborne velocity/response/generation")
    new_air=[(j,j%after["count"]) for j in range(after["count"],restored["count"])
             if after["rows"][j%after["count"]][2]<.5]
    require(bool(new_air) and all(restored["rows"][j][2:]==after["rows"][i][2:]
            and abs(restored["xy"][j][0]-after["xy"][i][0])<=.35/1920+1e-7
            and abs(restored["xy"][j][1]-after["xy"][i][1])<=.35/1080+1e-7
            and abs(restored["velocityRows"][j][2]-after["velocityRows"][i][2])<=.025+1e-7
            and all(restored["velocityRows"][j][k]==after["velocityRows"][i][k] for k in (0,1,3))
            for j,i in new_air),"new GPU slots do not remain bounded perturbed copies")
    await step(page,.1);await sand_read(page)
    await layout(page);await harness.close(context,record)
    return {"initialCount":before["count"],"phoneCount":after["count"],"restoredCount":restored["count"],
            "retainedAirborneGPUIdentities":len(survivors),"retainedPaperIdentities":len(live),
            "boundedNewAirborneGPUCopies":len(new_air),
            "originalDprAtlasCrops":crops,
            "scope":"Eager warm-up disabled to isolate responsive count/atlas behavior; default DPR2 warm startup separately timed out at30s on revision00230a9b."}


async def check_faces_reduced(harness):
    outcomes=[]
    for initial in (False,True):
        context,page,record=await harness.open(view="phone",reduced=initial)
        await reset(page)
        await page.evaluate("""() => {
          window.__faceCalls={cover:0,hidden:0};
          window.__sand.faces((c,{width,height})=>{__faceCalls.cover++;c.fillStyle='#21d4fd';c.fillRect(0,0,width,height);});
          window.__sand.fire('truth',false);
        }""")
        await step(page,5)
        await resize(page,412,915)
        await page.evaluate("window.__sand.theme('gouache');window.__sand.skip()")
        await page.emulate_media(reduced_motion="reduce")
        await page.wait_for_function("__sand.state().reduced===true")
        require(await page.evaluate("__faceCalls.hidden") == 0,"hidden painter ran before reveal authorization")
        info=await state(page);require(info["held"] and not info["hiddenReady"],"held custom cover was implicitly revealed")
        k=info["cast"];roi=[k["x"]+k["w"]*.35,k["y"]+k["h"]*.35,k["w"]*.3,k["h"]*.3]
        cover=await pixels(page,roi)
        require(cover["alpha"]>cover["width"]*cover["height"]*.95,"live reduced motion makes held cover transparent")
        raf=await page.evaluate("__f02RAFcount");clock=info["clock"];frame=await pixels(page)
        positions=await sand_read(page)
        await page.evaluate("window.__sand.resume()");await page.wait_for_timeout(250)
        require(await page.evaluate("__f02RAFcount")==raf,"reduced motion keeps requesting animation frames")
        require((await state(page))["clock"]==clock,"reduced motion advances physics")
        require((await pixels(page))["hash"]==frame["hash"],"reduced motion changes actual canvas pixels")
        # Explicit diagnostic step repaints the canvas, which may choose a
        # different antialias cache. It must still leave actual physics intact.
        await step(page,1);after=await sand_read(page)
        require(positions["positions"]==after["positions"] and positions["velocities"]==after["velocities"] and
                (await state(page))["clock"]==clock,"diagnostic step advances reduced-motion physics")
        require(await page.evaluate("getComputedStyle(document.getElementById('gpu')).visibility==='hidden'"),
                "GPU grains remain visibly rendered under reduced motion")
        await page.evaluate("""() => window.__sand.reveal((c,{width,height})=>{
          __faceCalls.hidden++;c.fillStyle='#ff00aa';c.fillRect(0,0,width,height);
        })""")
        require(await page.evaluate("__faceCalls.hidden")==1,"explicit reveal did not paint the delivered face exactly once")
        revealed=await pixels(page,roi);require(revealed["hash"]!=cover["hash"],"explicit reveal has no real pixel change")
        await page.evaluate("window.__sand.theme('pop');window.__sand.skip()")
        await resize(page,390,844)
        require(await page.evaluate("__faceCalls.hidden")==1,"cached hidden bitmap repaints on theme/resize/skip")
        await page.evaluate("window.__sand.win()")
        staticwin=await pixels(page,[80,200,230,350]);require(staticwin["alpha"]>2000,"reduced win has no static heart raster")
        await page.evaluate("window.__sand.tick()")
        statictick=await pixels(page,[80,200,230,350]);require(statictick["hash"]!=staticwin["hash"],"reduced tick and win are indistinguishable pixels")
        # Also exercise the compatibility API where the hidden provider exists
        # up front: merely having it must never authorize invocation.
        await page.evaluate("""() => {
          window.__legacyHiddenCalls=0;
          window.__sand.faces((c,{width,height})=>{c.fillStyle='#21d4fd';c.fillRect(0,0,width,height);},
            (c,{width,height})=>{__legacyHiddenCalls++;c.fillStyle='#ff00aa';c.fillRect(0,0,width,height);});
          window.__sand.fire('truth',false);window.__sand.skip();window.__sand.theme('gouache');
        }""")
        await resize(page,412,915)
        require(await page.evaluate("__legacyHiddenCalls")==0,"legacy hidden painter runs before explicit reveal")
        await page.evaluate("window.__sand.reveal();window.__sand.reveal()")
        require(await page.evaluate("__legacyHiddenCalls")==1,"legacy hidden face is not cached exactly once")
        await layout(page);await harness.close(context,record)
        outcomes.append({"initialReduced":initial,"hiddenCalls":1,"stoppedRaf":True,"gpuCanvasHidden":True})
    return outcomes


async def check_queries_fallback(harness):
    outcomes=[]
    for view in ("phone","tv"):
        context,page,record=await harness.open(view=view,event=None,extra={"nogpu":"1","fire":"round","dir":"-1","theme":"gouache","mat":"paper","paper":"shred","role":"liberal","seed":"27"})
        info=await state(page)
        require(info["renderer"]=="canvas2d" and info["dir"]==-1 and info["paper"]=="shred" and info["material"]=="paper" and info["scene"]["type"]=="round" and info["seed"]==27,
                "legacy query controls are ignored")
        await step(page,3.2);require((await pixels(page))["colors"]>20,"fallback has no real rendered cards")
        reverse=await wind_samples(page,[[.2,.3,.4,.5,{"kind":"idle","age":0}], [.8,.5,.4,.5,{"kind":"idle","age":0}]])
        require(all(w[0]<-.15 for w in reverse),"reverse-direction query changes a flag but not physical wind")
        await page.click("#bMat");require((await state(page))["material"]=="sand","material button is inert")
        await page.click("#bMat");await page.click("#bPaper");require((await state(page))["paper"]=="tear","paper button is inert")
        await page.click("#bTheme");await page.click("#bSkip")
        await layout(page)
        await resize(page,844,390)
        await layout(page);info=await state(page)
        require(info["width"]==844 and info["height"]==390,"fallback resize leaves stale viewport")
        await harness.close(context,record);outcomes.append({"view":view,"legacyQueries":True,"controls":True,"rotation":True})
    context,page,record=await harness.open(view="phone",no_webgl=True)
    require((await state(page))["renderer"]=="canvas2d","unavailable WebGL does not select graceful CPU fallback")
    await step(page,.5);await sand_read(page);await harness.close(context,record)
    return outcomes


async def check_refresh_warm(harness):
    context,page,record=await harness.open(view="phone",extra={"nogpu":"1","mat":"paper","paper":"shred"},manual_frames=True)
    schedules=[];reference=None
    record["refreshSchedules"]=schedules
    for hz in (60,120,144):
        await reset(page)
        await page.evaluate("window.__sand.fire('truth');window.__sand.step(2.5);window.__sand.resume();window.__f02Frame(1000)")
        # End a tiny epsilon after exactly one second to avoid floating-point
        # representation choosing 59 rather than60 ticks at a boundary.
        result=await page.evaluate("""hz => {
          for(let i=1;i<=hz;i++)window.__f02Frame(1000+1000*i/hz+(i===hz?.001:0));
          window.__sand.pause();return {clock:window.__sand.state().clock,
            debris:window.__sand.debris().map(g=>[g.uid,g.x,g.y,g.vx,g.vy,g.theta,g.omega,g.roll])};
        }""",hz)
        if reference is None:reference=result
        require(abs(result["clock"]-3.5)<1e-9 and bool(result["debris"]),
                f"{hz} Hz scheduler does not perform exactly60 simulation ticks")
        require(abs(result["clock"]-reference["clock"])<1e-10 and len(result["debris"])==len(reference["debris"]),
                f"{hz} Hz refresh changes fixed simulation ticks or particle identities")
        error=max((abs(a-b) for p,q in zip(reference["debris"],result["debris"]) for a,b in zip(p,q)),default=0)
        require(error<1e-8,f"paper state depends on refresh rate: {hz} Hz error={error}")
        schedules.append({"hz":hz,"clock":result["clock"],"maxStateDifference":error})
    # A half-tick render must move actual vertices, without another physics tick.
    await reset(page);await page.evaluate("window.__sand.fire('truth');window.__sand.step(2.55);window.__sand.resume();window.__f02Frame(1000)")
    before=await page.evaluate("window.__sand.paperGeometry()")
    bodies=await page.evaluate("window.__sand.debris()")
    await page.evaluate("window.__f02Frame(1000+1000/120)")
    middle=await page.evaluate("window.__sand.paperGeometry()")
    require(bodies==await page.evaluate("window.__sand.debris()"),"half-tick rendering advances paper physics")
    a={p["uid"]:p for p in before};b={p["uid"]:p for p in middle}
    movement=[math.dist(a[uid]["segments"][0]["vertices"][0],b[uid]["segments"][0]["vertices"][0]) for uid in a.keys()&b.keys()]
    require(movement and max(movement)>.05,"120 Hz rendering repeats identical mesh positions between ticks")
    record["halfTickVertexMovement"]=max(movement)
    await harness.close(context,record)
    # Cold and pooled construction must yield the same face and physics.
    records=[]
    for warm in ("0","1"):
        c,p,r=await harness.open(view="phone",extra={"nogpu":"1","mat":"paper","paper":"shred","warm":warm})
        await reset(p);await p.evaluate("window.__sand.fire('fakeout')");await step(p,2.7)
        info=await state(p);body=await p.evaluate("window.__sand.debris()")
        records.append({"warm":warm,"scene":info["scene"],"debris":body,"pixels":await pixels(p)})
        await harness.close(c,r)
    record["coldWarmComparisons"]={"sceneEqual":records[0]["scene"]==records[1]["scene"],
        "debrisEqual":records[0]["debris"]==records[1]["debris"],
        "pixels":[r["pixels"] for r in records]}
    require(records[0]["scene"]==records[1]["scene"] and records[0]["debris"]==records[1]["debris"] and records[0]["pixels"]["hash"]==records[1]["pixels"]["hash"],
            "warm-up alters seeded scene physics or rendered face")
    return {"schedules":schedules,"halfTickVertexMovement":max(movement),"coldWarmEquivalent":True,
            "scope":"Functional state/interpolation equivalence; cold and gouache CPU4 frame costs require separate performance evidence."}


GROUPS={"wind":check_wind,"sandTV":lambda h:check_sand(h,"tv"),
        "sandPhone":lambda h:check_sand(h,"phone"),"paperPhysics":check_paper_physics,
        "scenes":check_scenes,"paperGeometry":check_paper_geometry,
        "facesReduced":check_faces_reduced,"queriesFallback":check_queries_fallback,
        "refreshWarm":check_refresh_warm,"responsive":check_responsive}


async def run(args):
    source=Path(args.html).resolve();started=time.monotonic()
    report={"html":str(source),"htmlSha256":hashlib.sha256(source.read_bytes()).hexdigest(),
            "checkSha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            "requestedGroups":args.groups,"completedGroups":[],"results":{},"failures":{},
            "standaloneFileOpened":False,"performanceAccepted":False,
            "performanceScope":"Functional checks do not establish 60 fps TV or CPU-throttled phone performance.",
            "records":[]}
    def save():
        report["wallSeconds"]=round(time.monotonic()-started,3)
        Path(args.report).write_text(json.dumps(report,indent=2)+"\n")
    save()
    async with async_playwright() as pw:
        options={"headless":True,"args":["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking",
            "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}
        if args.chromium:options["executable_path"]=args.chromium
        browser=await pw.chromium.launch(**options)
        report["browserVersion"]=browser.version
        harness=Harness(browser,source,args.allow_policy_harness)
        try:
            for name in args.groups:
                begin=time.monotonic();print(f"RUN {name}",flush=True)
                try:
                    result=await GROUPS[name](harness)
                    report["results"][name]={"wallSeconds":round(time.monotonic()-begin,3),"evidence":result}
                    report["completedGroups"].append(name);print(f"PASS {name}",flush=True)
                except Exception as exc:
                    report["failures"][name]={"type":type(exc).__name__,"message":str(exc),"wallSeconds":round(time.monotonic()-begin,3)}
                    print(f"FAIL {name}: {type(exc).__name__}: {exc}",flush=True)
                finally:
                    for context in list(browser.contexts):await context.close()
                    report["records"]=harness.records
                    report["transport"]=harness.transport
                    report["standaloneFileOpened"]=any(r.get("loaded") and r.get("transport")=="file" for r in harness.records)
                    report["standaloneFileBlocker"]=harness.file_block
                    report["harnessDisclosure"]="Exact top-document bytes fulfilled by test route; disk opening remains unverified." if harness.transport=="policy-harness" else None
                    save()
        finally:await browser.close()
    report["functionalPassed"]=not report["failures"] and len(report["completedGroups"])==len(args.groups)
    save();print(json.dumps({"functionalPassed":report["functionalPassed"],"completedGroups":report["completedGroups"],"failures":report["failures"],"wallSeconds":report["wallSeconds"],"htmlSha256":report["htmlSha256"]}),flush=True)
    return 0 if report["functionalPassed"] else 1


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--html",default=str(Path(__file__).with_name("index.html")))
    parser.add_argument("--chromium",help="explicit Chromium executable; defaults to pinned Playwright browser")
    parser.add_argument("--allow-policy-harness",action="store_true",help="allow byte-route harness only after managed ERR_BLOCKED_BY_ADMINISTRATOR; never verifies disk opening")
    parser.add_argument("--groups",default=",".join(GROUPS),help="comma-separated independent groups")
    parser.add_argument("--report",default="/tmp/F02-functional.json")
    args=parser.parse_args();args.groups=[g.strip() for g in args.groups.split(",") if g.strip()]
    require(bool(args.groups) and len(set(args.groups))==len(args.groups),"groups must be nonempty and unique")
    require(all(g in GROUPS for g in args.groups),f"unknown groups; available: {','.join(GROUPS)}")
    raise SystemExit(asyncio.run(run(args)))


if __name__=="__main__":main()
