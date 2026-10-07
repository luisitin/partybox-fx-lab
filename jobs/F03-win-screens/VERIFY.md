# Verification scope

No F03 implementation exists. Every application acceptance gate remains
**UNRUN**. The check below tests a browser prerequisite, not a completed app.

## Fresh native-file capability control

Exact executed command, from the repository root:

```sh
python3 jobs/F03-win-screens/tools/preflight.py start/win-screens/index.html --query view=tv --chromium /usr/bin/chromium --output jobs/F03-win-screens/evidence/native-file-preflight.json
```

Result: **FAIL / TOOL BLOCKED**, exit **2**, `native_file_policy_blocked`,
`ERR_BLOCKED_BY_ADMINISTRATOR`, `standaloneFileOpened=false`.
UTC: `2026-10-07T18:51:31.283074+00:00`. Evidence: [evidence/native-file-preflight.json](evidence/native-file-preflight.json).

```text
Page.goto: net::ERR_BLOCKED_BY_ADMINISTRATOR at file:///workspace/partybox-fx-lab/start/win-screens/index.html?view=tv
Call log:
  - navigating to "file:///workspace/partybox-fx-lab/start/win-screens/index.html?view=tv", waiting until "domcontentloaded"

```

The source is the existing F03 research page, not an implemented winner-screen deliverable. No ending behavior was tested.

What this catches: whether the available managed system browser can directly
open the supplied genuine disk document. No alternate transport or policy
change was used. The report records source/helper SHA256, tool versions,
ordinary launch defaults and redacted existing-policy summary. Current source
and shipped helper hashes were independently checked against that report before
this handoff was updated. It does not validate app assets, behavior or 60 fps.

## Evidence integrity

SHA256SUMS.txt was generated over all 1 current data/media/evidence files
using Python hashlib.sha256. The following exact integrity command ran from
`jobs/F03-win-screens`:

```sh
sha256sum --check SHA256SUMS.txt
```

Result: **PASS**, all 1 entries match current bytes. This catches changed
evidence/data/media bytes; it does not validate their conclusions. Every later
data/media file must be added and this check rerun.

## Application and delivery checks — all UNRUN

- Native disk opening of the future complete `index.html`; zero runtime
  requests, page errors, console errors, missing assets and tracking.
- Default name/score/confetti and second/third podium; all eight required
  themed endings. Strict motion/audio deadlines: default <4 s, each theme <6 s.
- Real playback plus arbitrary-time fixtures; early/middle/late skip converges
  on the same static result; no particles, callbacks or audio after completion.
- Initial/live reduced motion, visibility changes, restart/cancel/destroy,
  repeated shows, resize, unsupported queries, long/Unicode/RTL/injection names,
  zero/negative/formatted scores, ties and missing podium entrants.
- Seeded finite-state confetti and independent motion oracle; TV 1920×1080 and
  phone 390×844 at Chrome CPU throttle 4×, measured native frame intervals.
- Original artwork/asset-license audit; milestone captures <10 MB each;
  every data/media file in SHA256SUMS.txt.
- Meaningful `.github/workflows/F03.yml`: job path filter, pull_request,
  ubuntu-latest, 30-minute timeout, read-only permissions, actions/* only.
  Green PR before KEEP GOING; three consecutive rounds with no noticeable gain.

No F03 capture, functional harness, workflow, PR or KEEP GOING round exists yet.
