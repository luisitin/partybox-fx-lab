# F02 final phone fakeout observations

Final source SHA-256: `1cd4d48254672b0ac5ac1342585551354fe571822065b92b1c68d63d10c1f810`. Each row is one observed 18-second run, rather than a statistically repeated performance estimate.

The frozen starter and previous F02 reports used matching phone dimensions, CPU throttling, Gouache/paper-tear/fakeout, seed 1 and fire times. Earlier videos were recorded separately from timing. Different source/helper revisions and separate runs limit direct attribution; no GC, renderer or backend cause is inferred.

| Source/run | Native rAF fps | Overall arrival p95 ms | Overall p99 ms | Overall max ms | First fire call ms | First fire window p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| starter/cold | 7.57 | 257.56 | 1028.99 | 1365.10 | 304.50 | 426.19 |
| 3bbeffdb/cold | 5.20 | 393.26 | 934.59 | 1054.00 | 169.00 | 305.40 |
| 3bbeffdb/warm | 5.83 | 310.87 | 802.37 | 949.10 | 37.90 | 438.18 |
| 1cd4d4825467/cold | 5.82 | 399.38 | 609.54 | 611.00 | 162.10 | 378.43 |
| 1cd4d4825467/warm | 6.93 | 287.22 | 332.65 | 367.00 | 87.90 | 263.40 |

No row meeting only one metric establishes a removed perceptible hitch. The strict frame-rate result and actual frame tails remain the acceptance evidence.
