# Immutable F02 starter baseline: Gouache / paper tear / fake-out

```sh
python3 /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/tools/measure.py /workspace/partybox-fx-lab/start/wind-sand-paper/index.html --output /workspace/.partybox-tools/fx-validation/F02/baseline-gouache-tear-fakeout --views tv,phone --events idle --motion no-preference --query 'warm=0&theme=gouache&mat=paper&paper=tear&seed=1' --seconds 18 --warmup 0 --capture 6 --capture-script /workspace/.partybox-tools/fx-validation/F02/baseline-capture.js --hitch-fire fakeout --hitch-repeats 3 --hitch-gap 6 --hitch-window 3 --transport routed --require-performance
```

Exit 1: strict frame tolerance failed on both views. No page errors, runtime requests or fire-trigger errors. Phone CPU throttling is 4× via CDP. Media is separate from timing: both VP8 WebMs are 25 fps and exactly six seconds, TV 1920×1080 and phone 390×844; TV 1,245,268 bytes, phone 749,789 bytes. Direct file navigation was not executed: policy blocks file://, and routed top-document bytes were used. standaloneFileOpened=false. GPU is ANGLE SwiftShader with no hardware device nodes.

|View|fps|p95ms|p99ms|maxms|
|---|---:|---:|---:|---:|
|tv|0.87|4100.47|5028.98|5261.10|
|phone|7.57|257.56|1028.99|1365.10|

First explicit fire is scheduled 300 ms after timing begins; warm repeats at 6.3/12.3 seconds on the same page. warm=0 disables hidden prewarm. This profiles first-use fire after load; browser startup itself is not sampled. Actual fire timestamps are in JSON. Entire actual frame intervals intersecting fire−100 ms through fire+3 seconds are counted; long intervals can overlap multiple windows. These measurements do not identify a cause such as GC or shader compilation.

|View|Fire|callCPUms|framep95ms|framep99ms|framemaxms|
|---|---|---:|---:|---:|---:|
|tv|cold-fire|53.20|3306.08|3632.10|3713.60|
|tv|warm-fire-1|17.50|4951.60|5199.20|5261.10|
|tv|warm-fire-2|32.00|4665.66|5142.01|5261.10|
|phone|cold-fire|304.50|426.19|1007.16|1152.40|
|phone|warm-fire-1|31.20|900.00|1272.08|1365.10|
|phone|warm-fire-2|76.80|213.51|664.55|809.60|

Baseline SHA-256 matches before/after: e7353f2b3c0ac7881337e6ea46fcd8399b6d02ae19fec69c57641d96e1127098

Only the known heavy Gouache paper-tear fake-out case was measured. This does not establish that all 21 leftovers pass. Source is unchanged. Browser lane is released. See provenance.json, validation.json and raw *-frames.json.
