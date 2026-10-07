# F02 final-file-policy results

Frozen HTML SHA-256: `1cd4d48254672b0ac5ac1342585551354fe571822065b92b1c68d63d10c1f810`.
Source unchanged during this run: `True`; measurement helper unchanged: `True`.
Measurement helper SHA-256: `983c3252204e6f35cb2f67bf76b499a3f7b1bfe1a5a306521f78f4fc5eb82dd6`.
Exit status: `1`. Transport: `file`; standalone file opened: `False`.

Exact executed command:

```bash
python3 /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/tools/measure.py /workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/index.html --output /workspace/.partybox-tools/fx-validation/F02/1cd4d4825467-final-file-policy --chromium /usr/bin/chromium --motion no-preference --require-performance --views phone --events idle --seconds 2 --warmup 0 --capture 0 --transport file
```

Native rAF arrival intervals were measured without video recording. Phone is 390 × 844 with CDP CPU throttling ×4; TV is 1920 × 1080. Frame criterion: mean ≤17.5 ms, p95 ≤20 ms, missed 60-Hz refreshes ≤1%.

Observed renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver-5.0.0)`. Hardware GPU device nodes: `[]`. These observations do not isolate a cause of a slow frame.

Direct file transport was tested without a fallback or browser-policy change.

```json
[
  {
    "stage": "load_document",
    "type": "Error",
    "message": "Page.goto: net::ERR_BLOCKED_BY_ADMINISTRATOR at file:///workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/index.html?view=phone&event=idle\nCall log:\n  - navigating to \"file:///workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/index.html?view=phone&event=idle\", waiting until \"load\"\n",
    "url": "file:///workspace/partybox-fx-lab/jobs/F02-wind-sand-paper/index.html?view=phone&event=idle"
  }
]
```

A policy-blocked load provides no native-page functional or frame-rate result. Local-byte routed measurements below are explicitly a separate diagnostic harness.
