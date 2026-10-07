# Verification scope

No F04 implementation exists. Every application acceptance gate remains
**UNRUN**. The check below tests a browser prerequisite, not a completed app.

## Fresh native-file capability control

Exact executed command, from the repository root:

```sh
python3 jobs/F04-3d-table-kit/tools/preflight.py start/win-screens/index.html --query view=tv --chromium /usr/bin/chromium --output jobs/F04-3d-table-kit/evidence/native-file-preflight.json
```

Result: **FAIL / TOOL BLOCKED**, exit **2**, `native_file_policy_blocked`,
`ERR_BLOCKED_BY_ADMINISTRATOR`, `standaloneFileOpened=false`.
UTC: `2026-10-07T18:56:15.237851+00:00`. Evidence: [evidence/native-file-preflight.json](evidence/native-file-preflight.json).

```text
Page.goto: net::ERR_BLOCKED_BY_ADMINISTRATOR at file:///workspace/partybox-fx-lab/start/win-screens/index.html?view=tv
Call log:
  - navigating to "file:///workspace/partybox-fx-lab/start/win-screens/index.html?view=tv", waiting until "domcontentloaded"

```

The source is F03’s existing research page, a shared browser capability control; no F04 page exists and no F04 behavior was tested.

What this catches: whether the available managed system browser can directly
open the supplied genuine disk document. No alternate transport or policy
change was used. The report records source/helper SHA256, tool versions,
ordinary launch defaults and redacted existing-policy summary. Current source
and shipped helper hashes were independently checked against that report before
this handoff was updated. It does not validate app assets, behavior or 60 fps.

## Evidence integrity

SHA256SUMS.txt was generated over all 1 current data/media/evidence files
using Python hashlib.sha256. The following exact integrity command ran from
`jobs/F04-3d-table-kit`:

```sh
sha256sum --check SHA256SUMS.txt
```

Result: **PASS**, all 1 entries match current bytes. This catches changed
evidence/data/media bytes; it does not validate their conclusions. Every later
data/media file must be added and this check rerun.

## Application and delivery checks — all UNRUN

- All four real standalone cards/dominoes/tiles/dice pages open from disk;
  original felt-table art, pinned library provenance, no unexpected runtime
  requests, tracking, missing assets, page errors or console errors.
- Rounded cards with physical thickness and distinct canvas front/back faces;
  required domino/mahjong-style/numbered tiles, dice and chips.
- Deal, fan, draw, centre play, riffle+bridge shuffle and stacks settle; every
  object remains separated through animation extrema and randomized sequences.
  Use independent geometric collision/separation oracles plus rendered checks.
- Phone 3D hand fan: actual pointer/touch flick browsing and tap lift/play;
  interrupted/repeated actions, resize, invalid API inputs and lifecycle cleanup.
- API.md describes actual callable behavior; query TV 1920×1080/phone 390×844;
  initial/live reduced motion provides valid static results for every action.
- Native frame timing on every demo at TV and phone Chrome CPU throttle 4×;
  meet 60 fps. Optional Rapier must show a measured advantage before selection.
- Original <10 MB milestone captures and all data/media SHA256SUMS.txt entries.
- Meaningful `.github/workflows/F04.yml`: PR path filter, ubuntu-latest,
  30-minute timeout, read-only permissions and actions/* only. Green PR before
  KEEP GOING; three consecutive rounds with no player-noticeable gain.

No F04 capture, functional harness, workflow, PR or KEEP GOING round exists.
