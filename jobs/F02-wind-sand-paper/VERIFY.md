# F02 verification — in progress

2026-10-07 UTC: root README.md, RULES.md, JOBS.md, current CLAIMS.md and all21
ranked start/wind-sand-paper/REPORT.md leftovers read before implementation.
Baseline page read in full by the page and research owners.

- git fetch origin main; git show origin/main:CLAIMS.md: PASS, F02 had no line.
- git switch main; git pull --ff-only origin main: PASS, current remote main.
- git add CLAIMS.md; git commit -m 'claim F02'; git -c http.version=HTTP/1.1 push origin main:
  PASS, claim b292be1 pushed before work.
- git switch -c job/F02-wind-sand-paper: PASS, branch created from claimed main.

At the initial research milestone, new-page checks/captures/CI were unrun.
Current new-page measurement and supplementary results follow below.
Research reads and their scope are in SOURCES.md; detailed test commands/results
will replace this work-in-progress status as each check actually runs.

## Immutable starter comparison (not new-page validation)

```sh
python3 /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/tools/measure.py /workspace/partybox-fx-lab/start/wind-sand-paper/index.html --output /workspace/.partybox-tools/fx-validation/F02/baseline-gouache-tear-fakeout --views tv,phone --events idle --motion no-preference --query 'warm=0&theme=gouache&mat=paper&paper=tear&seed=1' --seconds 18 --warmup 0 --capture 6 --capture-script /workspace/.partybox-tools/fx-validation/F02/baseline-capture.js --hitch-fire fakeout --hitch-repeats 3 --hitch-gap 6 --hitch-window 3 --transport routed --require-performance
```

FAIL, exit1: immutable starter e7353f2b3c0ac7881337e6ea46fcd8399b6d02ae19fec69c57641d96e1127098
matches before/after. TV0.87fps, p954100.47ms, p995028.98ms, max5261.10ms.
PhoneCPU4x7.57fps, p95257.56ms, p991028.99ms, max1365.10ms. First phone fire
CPUcall304.5ms; repeats31.2/76.8ms. These actual native-RAF arrivals quantify
baseline slowness and fire hitches; they do not prove causes such as GC.

Zero page errors, runtime requests and fire-trigger failures. Two separate
original six-second captures are under1.3MB, VP8 at25fps and correctTV/phone
sizes. Video encoding is separate from measured throughput. Managed Chromium
uses ANGLE SwiftShader without GPU nodes; routed local bytes deliver one document
without server/network. Disk opening and hardware performance are unverified.
Only heavy Gouache/paper-tear/fake-out was measured; other starter modes unrun.
Detailed command/data are in validation/baseline/, captures in media/baseline-*.
The capture script is also shipped as tools/baseline-capture.js for reproduction.

```sh
cd /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper
sha256sum --strict --check SHA256SUMS.txt
```

PASS for all baseline data/media after copying. Integrity detects modified or
missing evidence; it does not validate the evolving new page or21 fixes.

## New-page GPU implementation milestone (mandatory performance FAIL)

Frozen HTML SHA3bbeffdb7c9482b9c1974f56e4973799b81378c590c8089a184ade99cec9d2a6.
The exact measurement CLI was:

```sh
python3 /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/tools/measure.py /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/index.html --output /workspace/.partybox-tools/fx-validation/F02/3bbeffdb7c94-mandatory --views tv,phone --motion no-preference --capture 6 --transport routed --require-performance --events idle,win,tick --seconds 8 --warmup 2
```

FAIL, exit1 for frame performance only. All six cases fail the documented60-Hz
tolerance. TV idle/win/tick:6.79/4.33/5.94fps, p95240.00/498.85/229.38ms.
PhoneCPU4x:25.49/24.50/27.24fps, p9566.00/73.70/68.94ms. Raw native-RAF arrivals,
source/helper hashes and capture provenance are in validation/3bbeffdb-mandatory/.
The renderer started with actual20,736TV/3,136phone GPU allocation; functional
readback/physics acceptance is separate and still pending the full-page suite.

Zero errors/runtime requests in measurement and recording. Six independent
six-secondVP8 captures have correct dimensions,25-fps encoding and1.13–1.58MB
sizes. They do not establish60-fps animation. Direct disk opening and physical
hardware remain unverified. These checks catch throughput failure, application
errors, external dependency attempts and invalid/oversized capture delivery.

## Supplementary implementation checks

```sh
node -e "const fs=require('fs');const html=fs.readFileSync('jobs/F02-wind-sand-paper/index.html','utf8');for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new Function(m[1]);console.log('all inline JS syntax PASS')"
node /tmp/f02_dom_smoke.cjs
```

Syntax:PASS on3bbeff, after correcting a unary-minus exponentiation parse error
before browser checks. Mock DOM:PASS on3bbeff for initial reduced/noRAF,
staticfakeout survivor+stamp, notebook/reset42/finitewind, coveronce/hiddenzero
until explicit reveal thenonce, and all6 normalCPU truth/night/fakeout/round/
dawn/drawing modes advanced3.2s with warm0andwarm1, finiteposition/velocity/
angular state. Earlier reduced-only mock was on19c9; normalall6 added at7c768.
The mock contains no real graphics, GPU or browser-performance evidence.
These detect parse errors, NaN initialization and reveal/scheduling regressions.

Static source review found and corrected custom-cover reduced/skip authorization,
resize/theme hiddenbitmap lifecycle, initialCPU vxundefined, paper pre-release
crumple, duplicate fallback ambient initialization, partial reducedbanner,
live shimmer-canvas pooling, eventpriority and GPU interpolation/visibility.
The originalGPU blendFunc incorrectly squared outputalpha; final blendFuncSeparate
preserves premultiplied composition. Final inlineGPUmodule bytes match reviewed
f8e143586e4210c93a6417fd23ca3c81cb80044d45c3ddc719801f67a70577de exactly.
Full graphical regression checks remain pending; static fixes are not passes.
