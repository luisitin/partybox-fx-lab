# F04 — 3D table-kit handoff

Status: **BLOCKED** by native disk-browser policy; no table-kit implementation exists.
Fresh control: 2026-10-07T18:56:15.237851+00:00, exit 2,
`ERR_BLOCKED_BY_ADMINISTRATOR`; evidence and exact CLI are in VERIFY.md.

Required delivery: standalone cards, dominoes, tiles and dice demo pages plus
API.md. The three.js felt table needs rounded thick cards, canvas front/back
faces, domino/mahjong-style/numbered tiles, dice and chips. Required actions:
deal, fan, draw, centre play, riffle+bridge shuffle and settling stacks, with no
interpenetration. Phone hands support flick browsing and tap-to-lift/play.

There is no F04 starter. The existing F03 research page is only a shared browser
capability-control document; probing it does not test a table kit.

From the repository root, rerun the genuine disk control:

```sh
python3 jobs/F04-3d-table-kit/tools/preflight.py start/win-screens/index.html --query view=tv --chromium /usr/bin/chromium --output jobs/F04-3d-table-kit/evidence/native-file-preflight.json
```

Exit 0 clears native navigation only; exit 2 records administrator-blocked disk
navigation. The helper uses normal Playwright defaults and the existing system
browser, with no replacement document, web server, routing or policy edits.

Job research, implementation, four demo pages, API, collision/interaction tests,
reduced motion, TV/phone frame timing, captures and CI/PR remain unrun or missing.
No application pass or F04 performance failure is claimed.

Actual evidence is hashed and SHA256SUMS.txt checks pass. Follow NEXT.md
to complete the missing implementation and all application acceptance gates.
