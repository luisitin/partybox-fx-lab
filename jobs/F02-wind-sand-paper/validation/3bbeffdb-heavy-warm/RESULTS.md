# 3bbeffdb7c94-heavy-warm

```sh
python3 /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/tools/measure.py /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/index.html --output /workspace/.partybox-tools/fx-validation/F02/3bbeffdb7c94-heavy-warm --views tv,phone --motion no-preference --capture 6 --transport routed --require-performance --events idle --query 'theme=gouache&mat=paper&paper=tear&seed=1' --seconds 18 --warmup 0 --capture-script /workspace/.partybox-tools/fx-validation/F02/baseline-capture.js --hitch-fire fakeout --hitch-repeats 3 --hitch-gap 6 --hitch-window 3
```

Exit1 for strict frame performance; no app, runtime-network or trigger errors. Frozen SHA matches before/after: 3bbeffdb7c9482b9c1974f56e4973799b81378c590c8089a184ade99cec9d2a6

All fire windows are complete. Entire actual intervals intersecting fire−100 ms through fire+3 seconds are included; a long interval can overlap windows. Captures are VP8/25 fps, exactly six seconds at target dimensions, below 10 MB. Software ANGLE SwiftShader only; standaloneFileOpened=false, routed local bytes with no top-document socket.

| View | Fire | CPU call ms | Frame p95 ms | Frame p99 ms | Frame max ms |
|---|---|---:|---:|---:|---:|
| tv | cold-fire | 60.90 | 4426.46 | 5227.69 | 5428.00 |
| tv | warm-fire-1 | 21.70 | 4684.94 | 5279.39 | 5428.00 |
| tv | warm-fire-2 | 65.60 | 1913.82 | 2217.80 | 2293.80 |
| phone | cold-fire | 37.90 | 438.18 | 843.39 | 949.10 |
| phone | warm-fire-1 | 44.70 | 275.16 | 613.62 | 703.00 |
| phone | warm-fire-2 | 7.70 | 282.30 | 702.54 | 807.60 |
