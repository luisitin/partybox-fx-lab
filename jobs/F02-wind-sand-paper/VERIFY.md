# F02 verification — in progress

2026-10-07 UTC: root README.md, RULES.md, JOBS.md, current CLAIMS.md and all21
ranked start/wind-sand-paper/REPORT.md leftovers read before implementation.
Baseline page read in full by the page and research owners.

- git fetch origin main; git show origin/main:CLAIMS.md: PASS, F02 had no line.
- git switch main; git pull --ff-only origin main: PASS, current remote main.
- git add CLAIMS.md; git commit -m 'claim F02'; git -c http.version=HTTP/1.1 push origin main:
  PASS, claim b292be1 pushed before work.
- git switch -c job/F02-wind-sand-paper: PASS, branch created from claimed main.

No new-page checks, performance, captures, CI or KEEP GOING rounds have passed.
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
