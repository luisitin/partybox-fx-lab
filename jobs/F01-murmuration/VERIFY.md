# F01 verification — blocked, not complete

Checks ran on 2026-10-07 UTC. This is a visual job; code-job solver/mutation
requirements do not apply. No green CI, successful disk opening or 60-fps outcome
is claimed. validation/ preserves measured data and source provenance.

## Functional checks

From the repository root:

```sh
python jobs/F01-murmuration/check.py --chromium /usr/bin/chromium --allow-policy-harness --report /tmp/F01-functional-final.json
python jobs/F01-murmuration/check.py --chromium /usr/bin/chromium --allow-policy-harness --checks contextLoss,words,queryParameters,reducedMotion,fallbackForced,fallbackNoWebGL --report /tmp/F01-functional-text-c2897277.json
```

First command: PASS, seven groups, 163.59 s, source SHA e27caf2c775737af6dc367746cdff454cf1bb9420955ea3189867aa88d7ae742.
Report: validation/F01-functional-core-e27caf2c.json. Tests exercise 20,736 TV /
3,136 phone GPU positions, finite values, actual motion, seed replay, independent
heart polygon and release oracles, ring viewport containment, tick difference,
pixel changes, resize, phone touch controls, URL events, unsafe names, initial/live
reduced motion, context loss and both Canvas fallbacks. Seed replay was identical;
heart containment was 99.96% TV / 100% phone; ring viewport containment was 100%.
These checks catch static/NaN simulations, broken event geometry, clipping,
inert controls, injection, fallback and accessibility regressions.

Second command: PASS, six affected groups, 36.95 s, final source SHA
c2897277e34f8b30401880545f11545b6cc93a04652cf67ed63e3e85796ff2bc.
Twelve TV/phone Arabic, Hebrew, CJK, emoji and maximum-length cases had 100% mask
coverage and visibility, with no split surrogate. This catches dropped glyphs,
bidi/layout errors and context-loss resampling. The six dynamic shader strings
and compute/step functions are unchanged from e27caf2c. Reports have distinct
provenance; a full eight-group run on c289 is still unrun. Both runs observed
zero page errors and application network requests.

An earlier full command with the same arguments failed the Canvas-fallback
movement assertion: RMS displacement 0.004016 was below an arbitrary 0.005.
All particles actually moved. The corrected check requires RMS >0.0001 AND at
least half the population moving; reruns passed. The failed report is retained
as validation/F01-functional-pre-threshold-fix.json.

Chromium 151 rejects file:// with ERR_BLOCKED_BY_ADMINISTRATOR. Only after that
failure does the explicitly enabled harness fulfill one document with frozen
local bytes and deny all application network requests/WebSockets. No server or
policy change is used. Functional PASS does not satisfy the disk-opening rule.

## Performance, captures and integrity

Exact measured command:

```sh
python3 /workspace/.partybox-tools/fx_tools/validate_visual.py /workspace/partybox-fx-lab/jobs/F01-murmuration/index.html --output /workspace/.partybox-tools/fx-validation/F01 --views tv,phone --events idle,win,tick --motion no-preference --seconds 8 --warmup 2 --capture 6 --transport routed --require-performance
```

FAIL, exit 1: TV 0.74–1.17 fps; phone CPU4x 5.40–6.41 fps. Every case fails
the documented 60-Hz tolerance. Actual RAF arrivals, not JavaScript callback
cost or video timestamps, determine results. Source SHA before/after matches
c289. No page errors or runtime requests occurred. See validation/PERFORMANCE.md,
validation.json and six raw frame reports. The helper ships as tools/measure.py.

Six original VP8 WebMs are 6 s, correctly sized, and below 1.5 MB. System FFmpeg
encoded CDP screenshots at 25 fps in a separate context; that encoding does not
establish animation throughput. The host has no GPU device and uses SwiftShader.
Real hardware and real-time review of all twelve ranked leftovers are unrun;
low-throughput captures cannot sign them off.

```sh
cd /workspace/partybox-fx-lab/jobs/F01-murmuration
sha256sum --strict --check SHA256SUMS.txt
```

PASS after correcting a collection path that initially produced an empty list.
The final list covers every committed data/media file, including the failed
functional report. This catches missing, changed or wrongly collected artifacts.

## Access, delivery and setup checks

- cat README.md RULES.md JOBS.md and cat start/murmuration/REPORT.md: read all
  binding instructions and twelve ranked leftovers.
- git ls-remote https://github.com/luisitin/partybox-fx-lab.git HEAD: PASS;
  establishes Git read access only.
- git push origin main: PASS for claim F01. Later milestone writes initially
  returned remote Internal Server Error. git push --dry-run origin
  job/F01-murmuration passed but was not treated as publication.
- git -c http.version=HTTP/1.1 push -u origin job/F01-murmuration: PASS for
  b4e1b91 and 744abf9 after those errors. This does not establish their cause.
- python3 /workspace/.partybox-tools/fx_tools/update_claim.py F01 refresh: PASS,
  refreshed main without changing other claims or the job checkout.
- gh api repos/luisitin/partybox-fx-lab --jq '{default_branch: .default_branch}':
  initially Forbidden; retry PASS (main). Live papers also loaded on retry.
  Source URLs, read scope and remaining film limits are in SOURCES.md.
- bash /workspace/.partybox-tools/install.sh: PASS, frozen tooling installation
  and strict ES2022 contract check; original three checkouts stay clean.
- Static shader review caught duplicate clamped candidate indices and negative
  GLSL pow inputs; both were corrected before the passing GPU checks.

The PR workflow exists with strict disk checks and integrity verification.
It has not run: mandatory local performance still fails. No PR is opened and
LOOP.md is empty because the required green-PR gate has not been reached.

## One shader-storage experiment (not promoted)

```sh
python3 /workspace/.partybox-tools/fx_tools/validate_visual.py /workspace/.partybox-tools/fx_tools/F01-optimization/index.html --output /workspace/.partybox-tools/fx_tools/F01-optimization/performance --views tv --events idle --motion no-preference --seconds 8 --warmup 2 --capture 0
python3 /workspace/.partybox-tools/fx_tools/F01-optimization/compare.py
```

Benchmark command exited 0 because it did not request performance enforcement;
the report still records meets60FpsTolerance=false. Candidate TV idle: 0.856 fps,
p95 1813 ms, seven intervals. This does not establish a reliable gain or meet
60 fps. Comparison: PASS, six serialized identical-seed TV/phone idle, tick and
heart cases, 286,464 GPU components identical and finite. Blocking readback wall
timings were mixed and are not frame rates. Reports are retained as the three
validation/optimization-*.json files. Candidate source SHA 5066b410f2896bb52be01cb59ba7fc6fd688c1fb384c5755f09fd434c3e14c3a
and script remain outside the job at the paths above; final c289 is unchanged.
The comparison catches a numerical simulation change but cannot prove visuals,
stability over long runs or hardware performance. No further experiment ran.
