# F05 — party-board camera handoff

Status: **BLOCKED** by native disk-browser policy; no party-board-camera implementation exists.
Fresh control: 2026-10-07T19:00:27.053585+00:00, exit 2,
`ERR_BLOCKED_BY_ADMINISTRATOR`; evidence and exact CLI are in VERIFY.md.

Required delivery: one standalone three.js page and CAMERA.md based on camera
research. A code-made floating island carries a looping path of exactly 40
spaces. The token hops with squash-and-stretch; the camera follows smoothly,
flies out to a board overview, then returns. Document and implement derived
framing, easing curves and timings; original geometry throughout.

There is no F05 starter. The existing F03 research page is only a shared browser
capability-control document; probing it does not test a party-board camera.

From the repository root, rerun the genuine disk control:

```sh
python3 jobs/F05-party-board-camera/tools/preflight.py start/win-screens/index.html --query view=tv --chromium /usr/bin/chromium --output jobs/F05-party-board-camera/evidence/native-file-preflight.json
```

Exit 0 clears native navigation only; exit 2 records administrator-blocked disk
navigation. The helper uses the existing system browser with ordinary Playwright
defaults, no replacement document, routing, web server or policy changes.

Camera research, geometry/path/token/camera implementation, CAMERA.md, behavior,
reduced motion, TV/phone frame timing, capture and CI/PR remain unrun or missing.
No application pass or F05 performance failure is claimed.

Actual evidence is hashed and SHA256SUMS.txt checks pass. Follow NEXT.md
to complete the missing implementation and all application acceptance gates.
