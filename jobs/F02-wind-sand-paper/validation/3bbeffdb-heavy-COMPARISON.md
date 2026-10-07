# F02 matching heavy-scene comparison

Case: Gouache / paper tear / fake-out, seed 1, TV 1920×1080 and phone 390×844 with CPU4. Each run samples real native-rAF arrival times for 18 seconds, with first explicit fire at 300 ms and repeats at 6.3/12.3 seconds. Captures are separate fresh-context six-second runs. The starter and new build differ in rendering and scene geometry; this compares whole builds and does not isolate a single optimization.

| Build | View | fps | p95 ms | p99 ms | max ms | First-fire CPU ms |
|---|---|---:|---:|---:|---:|---:|
| baseline-gouache-tear-fakeout | tv | 0.87 | 4100.47 | 5028.98 | 5261.10 | 53.20 |
| baseline-gouache-tear-fakeout | phone | 7.57 | 257.56 | 1028.99 | 1365.10 | 304.50 |
| 3bbeffdb7c94-heavy-cold | tv | 1.33 | 2797.92 | 3148.55 | 3235.40 | 97.80 |
| 3bbeffdb7c94-heavy-cold | phone | 5.20 | 393.26 | 934.59 | 1054.00 | 169.00 |
| 3bbeffdb7c94-heavy-warm | tv | 1.50 | 2119.47 | 4613.11 | 5428.00 | 60.90 |
| 3bbeffdb7c94-heavy-warm | phone | 5.83 | 310.87 | 802.37 | 949.10 | 37.90 |

New build cold profile sets warm=0 and reports zero warmups; default-warm reports four warmups. On phone, first-fire CPU call fell from 169.0 to 37.9 ms with default prewarm (single fresh page per configuration). Overall p95 fell from 393.26 to 310.87 ms, but the first-fire window p95 rose from 305.40 to 438.18 ms. On TV, overall p95 fell from 2797.92 to 2119.47 ms while p99 rose from 3148.55 to 4613.11 ms and max rose from 3235.40 to 5428.00 ms. This does not establish that visible hitches are fixed.

Every required case fails the 60-Hz tolerance on this software host. The new phone heavy-scene rate (cold 5.20 / default-warm 5.83 fps) is below the starter 7.57 fps; no overall phone-speed improvement is claimed. Sparse TV samples and large intervals make tail comparisons noisy; results do not identify GC or shader compilation as the cause.

Frozen new source SHA: 3bbeffdb7c9482b9c1974f56e4973799b81378c590c8089a184ade99cec9d2a6. Starter SHA: e7353f2b3c0ac7881337e6ea46fcd8399b6d02ae19fec69c57641d96e1127098. See each provenance.json for exact command, source/helper/capture hashes and strict exit1. Zero runtime requests and page errors in every measurement/capture context. Direct file navigation and hardware throughput remain unverified.
