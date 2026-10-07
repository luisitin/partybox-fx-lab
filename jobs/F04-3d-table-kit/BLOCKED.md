# Native disk-browser prerequisite

At 2026-10-07T18:56:15.237851+00:00, the shared browser capability control returned exit **2**, status `native_file_policy_blocked` and `ERR_BLOCKED_BY_ADMINISTRATOR`; `standaloneFileOpened=false`.

Evidence: [evidence/native-file-preflight.json](evidence/native-file-preflight.json). Exact command from the repository root:

```sh
python3 jobs/F04-3d-table-kit/tools/preflight.py start/win-screens/index.html --query view=tv --chromium /usr/bin/chromium --output jobs/F04-3d-table-kit/evidence/native-file-preflight.json
```

Observed error, unchanged from the actual report:

```text
Page.goto: net::ERR_BLOCKED_BY_ADMINISTRATOR at file:///workspace/partybox-fx-lab/start/win-screens/index.html?view=tv
Call log:
  - navigating to "file:///workspace/partybox-fx-lab/start/win-screens/index.html?view=tv", waiting until "domcontentloaded"

```

The source is F03’s existing research page, a shared browser capability control; no F04 page exists and no F04 behavior was tested.

System browser: `/usr/bin/chromium`, Chromium
`151.0.7922.173`; Playwright `1.62.0`.
Control source `start/win-screens/index.html` SHA256:
`36c992ff7bcf33a026834a96e691a3f818919b336aca10b0bdc348caabe8b9b6`.
Shipped helper SHA256: `7748fcb469e145878accb44ba686f72ef73a143608bdde9ed048fe3f3235b43d`.

The direct-file attempt used ordinary Playwright headless defaults with no
additional launch arguments, routing, web server, document replacement,
downloads, TLS changes or policy changes. The report contains the existing
managed-policy hashes/keys and redacted URL-rule summary. This actual failure
blocks RULES.md's required native disk-open acceptance gate. An approved
browser/environment permitting genuine file navigation is needed to resume.

This is a tool prerequisite; source-site 403 alone cannot block research under
RULES.md. Implementation, application acceptance, reduced motion, runtime-network
acceptance, TV/phone frame timing and captures remain **UNRUN**. No performance
failure is inferred from F01/F02, software rendering or absent GPU devices.
No PR, green CI or KEEP GOING completion exists.

Push the actual evidence and handoff branch before marking main
`F04 BLOCKED`, then move on under the user's queue rule. Resume with NEXT.md.
