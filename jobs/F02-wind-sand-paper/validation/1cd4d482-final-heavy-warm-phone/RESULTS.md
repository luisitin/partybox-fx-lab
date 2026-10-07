# F02 final-heavy-warm-phone results

Frozen HTML SHA-256: `1cd4d48254672b0ac5ac1342585551354fe571822065b92b1c68d63d10c1f810`.
Source unchanged during this run: `True`; measurement helper unchanged: `True`.
Measurement helper SHA-256: `983c3252204e6f35cb2f67bf76b499a3f7b1bfe1a5a306521f78f4fc5eb82dd6`.
Exit status: `1`. Transport: `routed`; standalone file opened: `False`.

Exact executed command:

```bash
python3 /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/tools/measure.py /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/index.html --output /workspace/.partybox-tools/fx-validation/F02/1cd4d4825467-final-heavy-warm-phone --chromium /usr/bin/chromium --motion no-preference --require-performance --views phone --events idle --seconds 18 --warmup 0 --capture 0 --transport routed --query 'theme=gouache&mat=paper&paper=tear&seed=1' --hitch-fire fakeout --hitch-repeats 3 --hitch-gap 6 --hitch-window 3
```

Native rAF arrival intervals were measured without video recording. Phone is 390 × 844 with CDP CPU throttling ×4; TV is 1920 × 1080. Frame criterion: mean ≤17.5 ms, p95 ≤20 ms, missed 60-Hz refreshes ≤1%.

Observed renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver-5.0.0)`. Hardware GPU device nodes: `[]`. These observations do not isolate a cause of a slow frame.

| View/event | Native rAF fps | Arrival p95 ms | Arrival p99 ms | Arrival maximum ms | Missed refresh % | 60-fps criterion | Video bytes |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| phone/idle | 6.93 | 287.22 | 332.65 | 367.00 | 88.26 | FAIL | none |

Runtime requests: `none`. Page/console errors: `none`. Trigger errors: `none`. Every hitch window complete: `True`.

The first explicit fakeout is scheduled 300 ms after measurement begins; repeats are scheduled at 6300 and 12300 ms on the same page. Cold disables scene prewarming with `warm=0`; warm retains the default four-scene prewarming. Document/browser startup is outside this frame sample.

| Fire | Actual fire time ms | Fire call ms | Window arrival p95 ms | Window arrival p99 ms | Window maximum ms | Over 100 ms | Over 250 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| cold-fire | 309.30 | 87.90 | 263.40 | 347.18 | 367.00 | 15 | 2 |
| warm-fire-1 | 6375.90 | 71.50 | 214.24 | 256.52 | 270.90 | 18 | 1 |
| warm-fire-2 | 12334.30 | 39.80 | 184.49 | 231.93 | 246.20 | 18 | 0 |
