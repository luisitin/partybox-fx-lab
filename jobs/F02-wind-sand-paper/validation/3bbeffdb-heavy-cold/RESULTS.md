# 3bbeffdb7c94-heavy-cold

```sh
python3 /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/tools/measure.py /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/index.html --output /workspace/.partybox-tools/fx-validation/F02/3bbeffdb7c94-heavy-cold --views tv,phone --motion no-preference --capture 6 --transport routed --require-performance --events idle --query 'warm=0&theme=gouache&mat=paper&paper=tear&seed=1' --seconds 18 --warmup 0 --capture-script /workspace/.partybox-tools/fx-validation/F02/baseline-capture.js --hitch-fire fakeout --hitch-repeats 3 --hitch-gap 6 --hitch-window 3
```

Exit1 for strict frame performance; no app, runtime-network or trigger errors. Frozen SHA matches before/after: 3bbeffdb7c9482b9c1974f56e4973799b81378c590c8089a184ade99cec9d2a6

All fire windows are complete. Entire actual intervals intersecting fire−100 ms through fire+3 seconds are included; a long interval can overlap windows. Captures are VP8/25 fps, exactly six seconds at target dimensions, below 10 MB. Software ANGLE SwiftShader only; standaloneFileOpened=false, routed local bytes with no top-document socket.

| View | Fire | CPU call ms | Frame p95 ms | Frame p99 ms | Frame max ms |
|---|---|---:|---:|---:|---:|
| tv | cold-fire | 97.80 | 2729.08 | 3134.14 | 3235.40 |
| tv | warm-fire-1 | 23.70 | 2108.80 | 2388.64 | 2458.60 |
| tv | warm-fire-2 | 16.90 | 2509.36 | 2788.11 | 2857.80 |
| phone | cold-fire | 169.00 | 305.40 | 757.64 | 870.70 |
| phone | warm-fire-1 | 53.10 | 608.62 | 964.92 | 1054.00 |
| phone | warm-fire-2 | 68.40 | 580.39 | 856.56 | 925.60 |
