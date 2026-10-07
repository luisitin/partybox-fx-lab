# F02 — Wind, sand and paper round 5

All 10 functional groups and 216 scene cases pass on source `1cd4d482`.
Required disk and performance gates remain blocked; see BLOCKED.md/NEXT.md.

Open index.html in a browser permitting native local files. One offline file,
no build, server, assets, tracking or runtime dependencies.

- `?view=tv|phone`: 20,736 / 3,136 GPU sand grains.
- `?event=idle|tick|win`: shared wind, ripple, heart then dunes.
- `?fire=truth|sh|night|imp|door|fakeout|round|dawn|drawing`.
- `?mat=sand|paper&paper=tear|shred&theme=pop|gouache&dir=-1&seed=1`.
- `?hold` keeps a cover until reveal; `?kiosk` hides controls; Escape/Skip ends demos.
- `?warm=0` disables isolated warmup for cold/warm profiling.

Paper and sand share seeded curl wind, gravity and coupled angular dynamics.
Force coefficients are artistic rather than calibrated fluid/cloth simulation.
Reduced motion stops ongoing simulation/RAF and preserves static outcomes.
A CPU fallback handles missing/lost WebGL. Both directions and themes remain.

Integration: `window.__sand.fire('night', false)`, `.reveal()`, `.event('tick')`,
`.material('paper','shred')`, `.theme('gouache')`, `.skip()`. `.faces(cover)`
registers custom drawing; only `.reveal(hidden)` authorizes its hidden face.
Skip cannot reveal a custom held face. See source signatures.
Diagnostics: `.state()`, `.reset(1)`, `.pause()`, `.step(0.25)`, `.particles()`.
Fixed stepping/readback are test operations, separate from throughput.

Tools: Python/Playwright 1.62.0, Chromium, FFmpeg. From this job folder:

```sh
python3 check.py --report /tmp/F02-functional.json
python3 tools/measure.py index.html --output /tmp/F02-perf --views tv,phone --events idle,win,tick --motion no-preference --seconds 8 --warmup 2 --capture 6 --transport file --require-performance
sha256sum --strict --check SHA256SUMS.txt
```

Managed Chromium currently blocks file://. Functional checks can explicitly add
`--chromium /usr/bin/chromium --allow-policy-harness` for local-byte fulfillment;
disk opening stays blocked. Measurement `--transport routed` is also disclosed.
Final TV 4.73–5.66 fps; phone CPU 4× 16.36–28.79 fps on SwiftShader: all FAIL.

Baseline artifacts describe the unchanged starter. New artifacts name source
SHA; exact commands, raw frames, limitations and earlier failures are in VERIFY.
Original captures are under 10 MB; encoding fps is separate from scene fps.
No PR, green CI or KEEP GOING completion is claimed before mandatory gates pass.
