# F02 final-mandatory results

Frozen HTML SHA-256: `1cd4d48254672b0ac5ac1342585551354fe571822065b92b1c68d63d10c1f810`.
Source unchanged during this run: `True`; measurement helper unchanged: `True`.
Measurement helper SHA-256: `983c3252204e6f35cb2f67bf76b499a3f7b1bfe1a5a306521f78f4fc5eb82dd6`.
Exit status: `1`. Transport: `routed`; standalone file opened: `False`.

Exact executed command:

```bash
python3 /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/tools/measure.py /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/index.html --output /workspace/.partybox-tools/fx-validation/F02/1cd4d4825467-final-mandatory --chromium /usr/bin/chromium --motion no-preference --require-performance --views tv,phone --events idle,win,tick --seconds 8 --warmup 2 --capture 6 --transport routed
```

Native rAF arrival intervals were measured without video recording. Phone is 390 × 844 with CDP CPU throttling ×4; TV is 1920 × 1080. Frame criterion: mean ≤17.5 ms, p95 ≤20 ms, missed 60-Hz refreshes ≤1%.

Observed renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver-5.0.0)`. Hardware GPU device nodes: `[]`. These observations do not isolate a cause of a slow frame.

| View/event | Native rAF fps | Arrival p95 ms | Arrival p99 ms | Arrival maximum ms | Missed refresh % | 60-fps criterion | Video bytes |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| tv/idle | 4.95 | 326.70 | 398.26 | 434.30 | 91.75 | FAIL | 1448710 |
| tv/win | 4.73 | 370.92 | 414.86 | 422.30 | 92.32 | FAIL | 1584884 |
| tv/tick | 5.66 | 216.05 | 286.89 | 291.30 | 90.55 | FAIL | 1454109 |
| phone/idle | 28.79 | 68.95 | 94.22 | 143.70 | 52.18 | FAIL | 1133426 |
| phone/win | 23.11 | 76.30 | 168.05 | 191.50 | 61.46 | FAIL | 1202878 |
| phone/tick | 16.36 | 190.10 | 332.32 | 476.70 | 72.56 | FAIL | 1140334 |

Runtime requests: `none`. Page/console errors: `none`. Trigger errors: `none`. Every hitch window complete: `True`.

Videos come from separate fresh browser contexts; VP8 WebM is encoded at 25 fps and is not evidence of application fps.

| View/event | Encoded duration s | Dimensions | Encoded frame rate | Under 10 MB |
| --- | ---: | --- | --- | --- |
| tv/idle | 6.000000 | 1920 × 1080 | 25/1 | True |
| tv/win | 6.000000 | 1920 × 1080 | 25/1 | True |
| tv/tick | 6.000000 | 1920 × 1080 | 25/1 | True |
| phone/idle | 6.000000 | 390 × 844 | 25/1 | True |
| phone/win | 6.000000 | 390 × 844 | 25/1 | True |
| phone/tick | 6.000000 | 390 × 844 | 25/1 | True |
