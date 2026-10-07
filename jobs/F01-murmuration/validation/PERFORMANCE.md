# F01 frozen-source performance and capture result

Command:

```sh
python3 /workspace/.partybox-tools/fx_tools/validate_visual.py /workspace/partybox-fx-lab/jobs/F01-murmuration/index.html --output /workspace/.partybox-tools/fx-validation/F01 --views tv,phone --events idle,win,tick --motion no-preference --seconds 8 --warmup 2 --capture 6 --transport routed --require-performance
```

Exit status: 1, because every required frame-performance case failed the explicit 60-Hz tolerance. No page errors or runtime network attempts were observed in measurement or capture contexts. Every WebM is VP8 at 25 fps, exactly 6.000000 seconds, below 10,000,000 bytes; TV files are 1920×1080 and phone files 390×844. Capture frame rate is separate from measured scene frame rate.

Normal motion only. Phone CPU throttling is 4× via CDP; TV throttling is 1×. Each case uses an 8-second measurement request after 2-second warmup, without recording, then a fresh recording context.

| View | Event | Measured fps | p95 arrival ms | Capture bytes |
|---|---|---:|---:|---:|
| tv | idle | 0.74 | 1974.55 | 1,417,856 |
| tv | win | 1.00 | 1077.98 | 1,419,369 |
| tv | tick | 1.17 | 1202.40 | 1,491,470 |
| phone | idle | 6.41 | 301.87 | 1,094,012 |
| phone | win | 5.40 | 376.03 | 1,057,431 |
| phone | tick | 5.77 | 238.98 | 1,210,868 |

Renderer: ANGLE SwiftShader Subzero Vulkan 1.3.0; no hardware GPU device nodes. These measurements establish software-renderer failure here and cannot establish hardware TV or physical-phone throughput.

Navigation transport: routed local document bytes, one logged harness-document exemption. No server/socket request delivers the page. Enterprise policy blocks file://; standaloneFileOpened=false. Direct disk navigation was not executed or claimed.

SHA-256 before and after: `c2897277e34f8b30401880545f11545b6cc93a04652cf67ed63e3e85796ff2bc` (matches parent-frozen expected SHA). See provenance.json for capture SHA-256 values and validation.json plus *-frames.json for exact metrics.
