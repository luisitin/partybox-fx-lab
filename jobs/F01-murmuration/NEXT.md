# F01 handoff

Branch: job/F01-murmuration. Nickname: codex-flock. Status: active functional
milestone; mandatory performance has failed on the available SwiftShader backend.
No PR, green CI or KEEP GOING rounds are claimed.

Use the existing isolated checkout; do not create a Git worktree unless explicitly
requested. Read root README.md, RULES.md, JOBS.md and current main CLAIMS.md.
Preserve other chats' claims and refresh this claim on main at every push.

## Checked revision

index.html SHA-256: c2897277e34f8b30401880545f11545b6cc93a04652cf67ed63e3e85796ff2bc.
The dynamic six shader strings and compute/step functions are unchanged from
revision e27caf2c; its full seven-group suite passed. The affected six groups
passed on c289 after Unicode fixes, including twelve TV/phone multilingual cases.
Reports identify each tested revision; do not merge their provenance silently.

Dynamic GPU counts: 20,736 TV and 3,136 phone. Seven nearest among 32 candidates
in a fixed initially local graph is an approximation, with artistic guidance and
metric short-range separation. It is not global kNN or calibrated flight physics.
Reduced-motion interaction snapshots use analytic CPU initialization once;
normal-motion state evolves through GPU computation. Canvas fallback is separate.

## Outstanding work

1. A nonsemantic shader optimization is being investigated outside the checkout:
   /workspace/.partybox-tools/fx_tools/F01-optimization/index.html. It stores
   nearest-neighbour IDs/distances rather than copying temporary vector arrays.
   Promote it only after measured gains and relevant functional revalidation.
2. Required 60 fps failed: TV 0.74–1.17 fps; phone with CPU4x 5.40–6.41 fps.
   All six modes, raw frame arrivals, captures and source provenance are in
   validation/. The host has no GPU device and uses ANGLE SwiftShader. Investigate
   optimization and repeat on a GPU-capable browser; do not imply hardware passes.
3. Direct file:// navigation is blocked by managed Chromium policy. Functional
   checks use a single local-byte document fulfillment and block every application
   network request. CI is strict-file by default; direct disk validation is unrun.
4. Re-read all twelve ranked baseline leftovers in start/murmuration/REPORT.md.
   Their new mechanics are implemented, but visual quality and exit paths still
   need review at real-time speed; low-throughput captures cannot sign them off.
5. Run the job workflow, open a PR only after required checks pass, confirm green
   CI, then perform KEEP GOING until three consecutive rounds yield no noticeable
   gain. LOOP.md is empty because that gate has not been reached.

## Re-verify when web works

Ballerini and Young primary papers and the current RSPB article were retrieved
and read on retry. Their method/data limitations and a secondary-source conflict
are in SOURCES.md and CONFLICTS.md. Vimeo public metadata loaded, but the public
player/config at player.vimeo.com returned proxy HTTP403. No film was watched,
extracted or copied. Film-inspired choices remain marked knowledge/unverified;
watch genuine footage and revisit those choices when playback works.

## Reproduce

From this folder, use README.md commands; full functional checks are check.py.
Cloud browser needs --chromium /usr/bin/chromium --allow-policy-harness; that
explicitly records disk navigation blocked. tools/measure.py separates measured
frames from recorded video. All six original captures are under 10 MB; encoded
25-fps clips do not establish scene frame rate. SHA256SUMS.txt covers data/media.
