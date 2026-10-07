# Verification scope

No F05 implementation exists. Every application acceptance gate remains
**UNRUN**. The check below tests a browser prerequisite, not a completed app.

## Fresh native-file capability control

Exact executed command, from the repository root:

```sh
python3 jobs/F05-party-board-camera/tools/preflight.py start/win-screens/index.html --query view=tv --chromium /usr/bin/chromium --output jobs/F05-party-board-camera/evidence/native-file-preflight.json
```

Result: **FAIL / TOOL BLOCKED**, exit **2**, `native_file_policy_blocked`,
`ERR_BLOCKED_BY_ADMINISTRATOR`, `standaloneFileOpened=false`.
UTC: `2026-10-07T19:00:27.053585+00:00`. Evidence: [evidence/native-file-preflight.json](evidence/native-file-preflight.json).

```text
Page.goto: net::ERR_BLOCKED_BY_ADMINISTRATOR at file:///workspace/partybox-fx-lab/start/win-screens/index.html?view=tv
Call log:
  - navigating to "file:///workspace/partybox-fx-lab/start/win-screens/index.html?view=tv", waiting until "domcontentloaded"

```

The source is F03’s existing research page, a shared browser capability control; no F05 page exists and no F05 behavior was tested.

What this catches: whether the available managed system browser can directly
open the supplied genuine disk document. No alternate transport or policy
change was used. The report records source/helper SHA256, tool versions,
ordinary launch defaults and redacted existing-policy summary. Current source
and shipped helper hashes were independently checked against that report before
this handoff was updated. It does not validate app assets, behavior or 60 fps.

## Evidence integrity

SHA256SUMS.txt was generated over all 1 current data/media/evidence files
using Python hashlib.sha256. The following exact integrity command ran from
`jobs/F05-party-board-camera`:

```sh
sha256sum --check SHA256SUMS.txt
```

Result: **PASS**, all 1 entries match current bytes. This catches changed
evidence/data/media bytes; it does not validate their conclusions. Every later
data/media file must be added and this check rerun.

## Application and delivery checks — all UNRUN

- Complete standalone three.js page opens natively from disk with original
  code-made island/geometry; no runtime requests/tracking/errors/missing assets.
- Exactly 40 distinct ordered spaces form a loop; path adjacency and token
  positions independently checked at every hop, seam and interrupted sequence.
- Squash-and-stretch token hops remain above the island; no false contact or
  transforms from stale callbacks. Deterministic input/replay and finite state.
- Follow, board-overview fly-out and return match CAMERA.md's actual numeric
  framing, easing and timing rules; sampled transforms and rendered composition
  checks throughout transitions, at extrema, after resize and at path seam.
- Camera-language research uses live URLs, concrete derivations, independent
  corroboration of factual claims; no claim that unviewed game footage was seen.
- TV 1920×1080 and phone 390×844 query layouts; initial/live reduced-motion
  camera/token alternatives; input/lifecycle/visibility/resizing robustness.
- Native frame timing at TV and phone Chrome CPU throttle 4×; meet 60 fps.
  Original milestone captures <10 MB; every data/media hash in SHA256SUMS.txt.
- Meaningful `.github/workflows/F05.yml`: PR path filter, ubuntu-latest,
  30-minute timeout, read-only permissions and actions/* only. Green PR before
  KEEP GOING; three consecutive rounds with no player-noticeable gain.

No F05 capture, functional harness, workflow, PR or KEEP GOING round exists.
