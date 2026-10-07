# Verification — work in progress

Commands were run on 2026-10-07 UTC. This is not a completed visual job. Updated main RULES.md 169aa39 permits the documented knowledge fallback, so research-only blocking was removed.

- `git ls-remote https://github.com/luisitin/partybox-fx-lab.git HEAD`: passed.
  Tests scoped Git read access, not API permissions.
- `git push origin main`: passed for commit `claim F01`; claim acquired before work.
- `cat README.md RULES.md JOBS.md`: read all binding queue instructions.
- `cat start/murmuration/REPORT.md`: read all 12 ranked leftovers.
- `gh api repos/luisitin/partybox-fx-lab --jq '{permissions: .permissions, default_branch: .default_branch}'`:
  failed, Forbidden at api.github.com. Detects a separate API destination block.
- Source probe commands and outcomes are in SOURCES.md and BLOCKED.md.

Unrun: new GPU implementation, 20k/3k simulation, visual/event/reduced-motion checks,
TV and 4x-phone frame timings, capture, CI and improvement rounds. No green CI or
passing visual outcome is claimed. LOOP.md has no completed rounds.

- Main refresh retrieved RULES.md commit `169aa39`; read the new fallback rule.
- `git push -u origin job/F01-murmuration`: remote rejected with Internal Server Error. Read-only `git ls-remote` still worked; revised-main push also returned server error. No subsequent milestone push is yet confirmed.
- `chromium --version`: Chromium 151.0.7922.173.
- Current GPU hardware nodes: none. Browser calibration uses SwiftShader; hardware validation is unrun.
