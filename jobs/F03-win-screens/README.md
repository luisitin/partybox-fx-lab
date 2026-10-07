# F03 — win-screen handoff

Status: **BLOCKED** by native disk-browser policy; no winner-screen implementation exists.
Fresh control: 2026-10-07T18:51:31.283074+00:00, exit 2,
`ERR_BLOCKED_BY_ADMINISTRATOR`; evidence and exact CLI are in VERIFY.md.

Required delivery: one self-contained HTML page with a default winner moment
strictly under 4 seconds and eight themed endings strictly under 6 seconds:
cards, dice, board/property, trivia, drawing, detective, racing and word games.
The default includes name, score, confetti physics and second/third podiums.
Every ending needs skip, reduced motion, TV/phone layouts and measured 60 fps.

The existing `../../start/win-screens/index.html` is a research page, not this
deliverable. Its missing frames/audio and eight-second loops must not be shipped.

From the repository root, rerun the genuine disk-control navigation:

```sh
python3 jobs/F03-win-screens/tools/preflight.py start/win-screens/index.html --query view=tv --chromium /usr/bin/chromium --output jobs/F03-win-screens/evidence/native-file-preflight.json
```

This probe does not test a completed F03 page. Exit 0 clears navigation only;
exit 2 records administrator-blocked disk navigation. It uses the existing
system browser with ordinary Playwright defaults and no substitute transport.

Research preparation and its limits are recorded in SOURCES.md and NEXT.md.
Application checks, frame timings, captures, workflow, PR and KEEP GOING remain
unrun or missing. No application pass or performance failure is claimed.

Actual evidence is hashed and SHA256SUMS.txt checks pass. Follow NEXT.md
to complete the missing implementation and all application acceptance gates.
