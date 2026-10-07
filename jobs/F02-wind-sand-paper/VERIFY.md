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

## Heavy-scene cold/warm comparison on3bbeffdb (FAIL)

```sh
python3 /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/tools/measure.py /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/index.html --output /workspace/.partybox-tools/fx-validation/F02/3bbeffdb7c94-heavy-cold --views tv,phone --motion no-preference --capture 6 --transport routed --require-performance --events idle --query 'warm=0&theme=gouache&mat=paper&paper=tear&seed=1' --seconds 18 --warmup 0 --capture-script /workspace/.partybox-tools/fx-validation/F02/baseline-capture.js --hitch-fire fakeout --hitch-repeats 3 --hitch-gap 6 --hitch-window 3
```

```sh
python3 /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/tools/measure.py /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/index.html --output /workspace/.partybox-tools/fx-validation/F02/3bbeffdb7c94-heavy-warm --views tv,phone --motion no-preference --capture 6 --transport routed --require-performance --events idle --query 'theme=gouache&mat=paper&paper=tear&seed=1' --seconds 18 --warmup 0 --capture-script /workspace/.partybox-tools/fx-validation/F02/baseline-capture.js --hitch-fire fakeout --hitch-repeats 3 --hitch-gap 6 --hitch-window 3
```

Both strict runs exit1 for performance. First phone fire CPUcall169.0→37.9ms with four warmups, but first-windowp95305.40→438.18ms worsens. TVp99/max also worsen; new heavy phone5.20/5.83fps is below starter7.57fps. No visible-hitch or whole-phone-speed fix is claimed. Zero runtime requests/errors. Four six-second captures under1.58MB. Raw frame arrivals/provenance and full mixed comparison are committed; encoding25fps does not measure application fps. These checks catch cold/warm stalls rather than infer their cause.

## First full-page functional run and diagnosis (3bbeffdb)

```sh
python jobs/F02-wind-sand-paper/check.py --chromium /usr/bin/chromium --allow-policy-harness --report /tmp/F02-functional-3bbeffdb.json
python /tmp/F02-diagnose.py
python /tmp/F02-diagnose-details.py
python /tmp/F02-diagnose-reduced.py
```

Full suite:FAIL, exit1,123.710s. Four groups pass (wind,sandTV,sandPhone,paperPhysics); five fail (scenes,paperGeometry,facesReduced,queriesFallback,refreshWarm). This was54 phone scene cases, not the later216-case suite. Diagnoses all exit0 and preserve observations in validation/3bbeffdb-functional-failed/. Actual shared GPU/CPU field agrees within Float32 tolerance; sand readback proves20,736/3,136 finite moving particles, heart/reform, tick and re-entrainment.

Three real defects: one residual cover pixel in dawn/shred; zero paper backs among48,345 sampled segments; reset history changes CPU fragment PRNG state through stale river state. Two harness defects: querying before resize completes; comparing antialias-edge pixels after an explicitly requested diagnostic redraw instead of measuring idle reduced-motion freezing. The corrected suite waits for actual viewport state, demands exact static pixels during idle, separately demands unchanged simulation state on manual reduced step, and keeps strict zero remaining-cover pixels. Final source fixes and expanded suite remain pending. These checks catch actual buffer/model, force-coupling, cleanup, authorization, reduced-motion, responsive sizing and deterministic scheduling failures; they do not prove60-fps throughput.

## Grouped fixes and second full-page run (00230a9b)

FrozenHTML SHA00230a9ba0f07630bae339c4f175870038acb5f8a1d626e499eb9f004ed8f4a5.
The source adds resetRV=null, wind-derived paper release moment, opaque per-owned-piece seam erasure, preserved atlasDPR, settled resize reanchor and state-preserving20k/3k GPU remap.

```sh
node /tmp/f02_dom_smoke.cjs
node /workspace/.partybox-tools/fx_tools/F02-pending/reset-probe.cjs /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/index.html
node /workspace/.partybox-tools/fx_tools/F02-pending/roll-probe.cjs /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/index.html
node --check /workspace/.partybox-tools/fx_tools/F02-gpu/wind-gpu-resize.js
node /workspace/.partybox-tools/fx_tools/F02-gpu/check-field.js /workspace/.partybox-tools/fx_tools/F02-gpu/wind-gpu-resize.js
node /workspace/.partybox-tools/fx_tools/F02-gpu/check-resize.js
```

All PASS within mock/static scopes. Reset155/155/155 fragments with identical state; roll41,355 samples/21,958backs/3,381edges. Current moduleSHA5b52497a4c9fffe1e6341f5761e0271320f8f171951b9fcaccde8e14368850a7: reproducible3,000 cases against independent central differences of potential/divergence, max5.29e-9/2.27e-7 with2e-6 tolerance. FakeGL remap verifies preserved slots/clock/event, deterministic new jitter, ping-pong identity and allocation rollback. These are not graphical/GPU performance tests. Reports in validation/00230a9b-static/. The earlier unretained3,000-case diagnostic is informal and not used as required acceptance. An earlier isolated browser smoke preceded the blend fix and lacked contemporaneous source hashing; final-page actual browser readback checks supersede that historical scope.

```sh
python jobs/F02-wind-sand-paper/check.py --chromium /usr/bin/chromium --allow-policy-harness --report /tmp/F02-functional-00230a9b.json
python /tmp/F02-diagnose-00230a9b.py
python /tmp/F02-diagnose-paper-history.py
```

Full suiteFAIL,225.785s, six groups pass: wind,sandTV,sandPhone,paperPhysics,facesReduced,queriesFallback. New annular tick oracle and actual front/back/edge/curvature/lifecycle tests pass;60/120/144 states and absolute3.5s clock agree before cold/warm raster fails. The configured216-scene matrix stops after23 completed cases at phone/forward/Pop/shred/fakeout: ansB retains1 base pixel from3.3s through5.3s, A/D0 and everyrel0. No full216-case pass is claimed. Notebook holes pass fresh but fail after the exact suite history (firstcontrast316, then0), matching a retained canvas-context state issue. Cold/warm scene/debris/geometry are byte-identical; raster alpha260,281vs260,331 differs. TVauto DPR2 with default four-scene warmup times out30s; warm0 starts0.67s. Responsive remap was not reached in that run.

Diagnoses exit0; raw results in validation/00230a9b-functional-failed/. The next revisions must reset complete pooled drawing context and fix natural cleanup. Responsive functional checks may isolate warm0, but default high-DPR startup remains failed/unresolved. Required60-Hz performance and strictdiskopening are still separate failed/unverified gates. These checks catch render history, cleanup, load stalls and responsive preservation without treating declared mechanisms as visible acceptance.

##00230a9b milestone capture (idle timingFAIL)

```sh
python3 /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/tools/measure.py /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/index.html --output /workspace/.partybox-tools/fx-validation/F02/00230a9b-milestone --views phone --events idle --motion no-preference --query 'warm=0&mat=paper&paper=shred' --seconds 2 --warmup 0 --capture 6 --capture-script /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/tools/paper-capture.js --transport routed --require-performance
```

Exit1: phoneCPU4 idle-only2s26.44fps,p9569.34ms. Separate six-second390×844VP8/25fps clip1,197,382bytes starts after explicit fixed2.7s paper step, then resumes actual animation; not a paper throughput measurement. Zeroerrors/runtimeattempts. Sourcebefore/after00230a9b matches. Exact helper/script/capture hashes retained. This exercises revised helper normal capture; strict-file failure reporting is not yet rerun.
