# F01 blocked — required renderer/disk checks

The tested functional milestone is pushed on job/F01-murmuration.
Required performance fails on the available ANGLE SwiftShader renderer:
20,736 TV birds measure 0.74–1.17 fps; 3,136 phone birds at CPU4x measure
5.40–6.41 fps. The host has no hardware GPU device. One shader-storage
experiment measured 0.856 TV fps and was not promoted. Hardware performance
remains unverified; this page is not accepted as a 60-fps implementation.

Managed Chromium also rejects direct file:// navigation. Functional tests
passed with recorded local-byte document fulfillment and blocked application
networking; disk opening remains unverified. A GPU-capable browser permitting
local files is needed to resolve both mandatory checks, followed by full
final-source validation, real-time visual review and green CI.

This is not a research-only block. Reachable primary sources were read and
the remaining film limitation follows the RULES.md fallback. No PR, completed
job or KEEP GOING round is claimed. See NEXT.md and VERIFY.md.
