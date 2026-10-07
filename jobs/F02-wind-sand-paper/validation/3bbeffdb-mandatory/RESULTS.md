# F02 required event performance and milestone captures

```sh
python3 /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/tools/measure.py /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/index.html --output /workspace/.partybox-tools/fx-validation/F02/3bbeffdb7c94-mandatory --views tv,phone --motion no-preference --capture 6 --transport routed --require-performance --events idle,win,tick --seconds 8 --warmup 2
```

Frozen source SHA-256: 3bbeffdb7c9482b9c1974f56e4973799b81378c590c8089a184ade99cec9d2a6

Exit 1: every required frame case fails the explicit 60-Hz tolerance. Measurement is real native-rAF arrival timing for eight seconds after two-second warmup. Recording uses a fresh context and is separate from performance. Phone CPU throttling is 4× via CDP.

| View | Event | Measured fps | p95 arrival ms | Capture bytes |
|---|---|---:|---:|---:|
| tv | idle | 6.79 | 240.00 | 1,435,859 |
| tv | win | 4.33 | 498.85 | 1,335,880 |
| tv | tick | 5.94 | 229.38 | 1,578,658 |
| phone | idle | 25.49 | 66.00 | 1,147,305 |
| phone | win | 24.50 | 73.70 | 1,206,423 |
| phone | tick | 27.24 | 68.94 | 1,132,112 |

All measurement and capture contexts have zero page errors and zero attempted runtime network requests. All six WebMs are VP8, 25 fps, exactly six seconds and under 10,000,000 bytes. TV captures are 1920×1080; phone captures are 390×844. Video frame rate is not evidence of scene frame rate.

App diagnostics confirm WebGL2, 20,736 TV particles / 3,136 phone particles, and four prewarm passes. Chromium renderer is ANGLE SwiftShader, with no hardware GPU nodes; hardware throughput is unverified. file:// is policy-blocked; the top document was fulfilled from local bytes without a server or socket. standaloneFileOpened=false.

Provenance records the unchanged SHA before/after, exact argv, helper SHA and every capture SHA. Raw frames and full diagnostics are in validation.json and *-frames.json.
