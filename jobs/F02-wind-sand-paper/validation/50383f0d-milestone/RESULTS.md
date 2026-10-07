# F02 50383f0d milestone checkpoint

Frozen HTML SHA-256: `50383f0d4f4eb8f7a0966aba045a18b4271a62f18cb94e1a9bd0630279f1cf85`. Source, measurement helper and capture script are unchanged before/after this run.

Exact executed command:

```bash
python3 /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/tools/measure.py /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/index.html --output /workspace/.partybox-tools/fx-validation/F02/50383f0d4f4e-final-milestone --chromium /usr/bin/chromium --motion no-preference --require-performance --views phone --events idle --seconds 2 --warmup 0 --capture 6 --transport routed --query 'warm=0&mat=paper&paper=shred' --capture-script /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/tools/paper-capture.js
```

Exit status 1: strict performance **FAIL**. Actual native rAF arrivals on a 390 × 844 phone viewport with CPU throttling ×4 yielded 26.37 fps, mean 37.92 ms, p95 60.32 ms, p99 86.32 ms, maximum 106.70 ms and missed-refresh fraction 56.20%.

The timing scope is only two seconds of phone idle with `warm=0`. Video is recorded in a separate fresh context after `paper-capture.js` explicitly advances the fixed simulation 2.7 seconds into a truth/shred scene, then resumes playback. The advance is not performance evidence. Neither the complete 216-scene functional matrix nor other final-source gates are claimed passed by this checkpoint.

Video: VP8 WebM, 6.000000 seconds, 390 × 844, encoded 25/1 fps, 1,260,246 bytes (<10 MB). Encoded frame rate does not represent application frame rate. Zero page/console errors and zero runtime network attempts were observed in timing and capture contexts. Routed transport delivers the single top document from local bytes without a socket; it is not a native `file://` pass.

Source/provenance, helper/script/capture SHA-256, raw arrival/callback frames, diagnostic inspection and FFprobe metadata are retained in the adjacent JSON reports. Browser contexts and browser closed normally before the lane was released.
