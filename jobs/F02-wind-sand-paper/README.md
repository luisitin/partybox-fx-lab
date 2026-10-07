# F02 — Wind, sand and paper round 5

Implementation milestone; functional and required performance acceptance pending.
See VERIFY.md/NEXT.md for tested revisions, measured failures and handoff.

Open index.html in a browser permitting local files. One offline file, no build,
server, dependency, assets, tracking or runtime requests are required by the page.

- ?view=tv|phone: 20,736 / 3,136 GPU sand grains.
- ?event=idle|tick|win: shared wind, transient ripple, heart then return to dunes.
- ?fire=truth|sh|night|imp|door|fakeout|round|dawn|drawing.
- ?mat=sand|paper&paper=tear|shred&theme=pop|gouache&dir=-1&seed=1.
- ?hold keeps a cover until reveal; ?kiosk hides controls; Escape/Skip ends a demo.
- ?warm=0 disables isolated scene warmup for cold/warm profiling.

Paper and sand sample the same seeded curl field, with artistic inertia/drag,
gravity and coupled angular dynamics. This is not a calibrated fluid solver.
Reduced motion stops ongoing simulation/RAF and preserves static reveal outcomes.
A CPU fallback handles unavailable/lost WebGL. Both directions and themes remain.

Integration: window.__sand.fire('night', false), .reveal(), .event('tick'),
.material('paper','shred'), .theme('gouache'), .skip(). Custom cover/hidden drawing
callbacks are registered with .faces(cover); only .reveal(hidden) authorizes the
hidden face. Demo Skip cannot authorize a custom held face. See source signatures.
Diagnostics: .state(), .reset(1), .pause(), .step(0.25), .particles(), .wind().
Stepping/readback are test operations, separate from real-time throughput.

## Check

Tools: isolated Python/Playwright1.62.0, Chromium, FFmpeg for captures.

```sh
python3 check.py --report /tmp/F02-functional.json
python3 tools/measure.py index.html --output /tmp/F02-perf --views tv,phone --events idle,win,tick --motion no-preference --seconds 8 --warmup 2 --capture 6 --require-performance
sha256sum --strict --check SHA256SUMS.txt
```

Managed Chromium blocks file://. Add --chromium /usr/bin/chromium
--allow-policy-harness to functional checks for explicitly logged local-byte
fulfillment; disk opening remains unverified. Measurement defaults to the same
routed transport. Hardware performance and green CI remain separate requirements.

media/baseline-* and validation/baseline/ describe the unchanged starter, not this
page. New-page artifacts name their source SHA. Video encoding is separate from
measured animation fps. All captures must stay below10MB; data/media are hashed.
No PR/KEEP GOING round is claimed before mandatory checks and green CI pass.
