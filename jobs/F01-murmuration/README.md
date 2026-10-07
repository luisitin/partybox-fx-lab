# F01 — Murmuration round 5

Blocked functional milestone; performance, disk navigation and CI are unsigned.
See VERIFY.md and NEXT.md for measured results and the current handoff.

## Run

Open index.html in a browser permitting local files. No build, dependencies,
server, assets, tracking or runtime network are needed by the page.
- `?view=tv|phone`: 20,736 / 3,136 birds.
- `?event=idle|tick|win`: open flock, travelling ripple, heart then reformation.
- `?theme=pop|gouache&look=ink|rainbow|players|shimmer`.
- `?shape=bird|dart|petal|comet&style=0..3&seed=1`.
- `?join=ANA&join=BEN&code=ERVY`, or use the keyboard/touch controls.
- `?kiosk` hides controls. Escape/Skip ends the current event.

Reduced motion uses one static pose per interaction and stops ongoing RAF.
The dynamic GPU simulation selects seven nearest among 32 initially local
candidates, with an artistic guide; it is not global kNN or validated biology.
An approximately 3k canvas fallback handles unavailable/lost WebGL contexts.

Integration: `window.__murm.win('ANA')`, `.join('BEN')`, `.code('ERVY')`, `.tick()`.
Diagnostics: `.state()`, `.pause()`, `.reset(1)`, `.step(0.25)`, `.positions()`.
Readback/stepping are diagnostic operations that pause real-time animation.

## Check

Test tooling: Python + Playwright 1.62.0, Chromium; FFmpeg for captures.

```sh
python3 check.py --report /tmp/F01-functional.json
python3 tools/measure.py index.html --output /tmp/F01-perf --views tv,phone --events idle,win,tick --motion no-preference --seconds 8 --warmup 2 --capture 6 --require-performance
sha256sum --strict --check SHA256SUMS.txt
```

On the managed cloud browser, add `--chromium /usr/bin/chromium
--allow-policy-harness` to the functional command: enterprise policy blocks
file://. The test logs that disk opening remains blocked; routed local bytes
are used for functional validation. The measurement harness defaults to the
same routed transport. Run strict disk checks on a browser permitting file://.

media/ contains six original six-second milestone captures, each under 10 MB.
validation/ records exact commands, source hashes and failed frame acceptance.
The 25-fps encoded clips are not evidence that the scene meets 60 fps.
