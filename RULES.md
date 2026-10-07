# RULES (binding for every job)

Be extremely aggressive about quality and verification: belt and suspenders. Do deep research first, then build, then try hard to break what you built.

## Public repo hygiene
- Public repo. Never commit personal info, trademarked logos or art, ripped game assets, or paid content. Rules, mechanics and facts are fine; art must be original or carry a CC0 / CC-BY / public-domain licence recorded in SOURCES.md.
- Zero secrets, zero tracking, zero network calls at runtime.

## Every job folder (jobs/<ID>-<slug>/) contains
- README.md: what it is, how to run it, how to check it, in under 60 lines.
- VERIFY.md: every check you ran, the exact command, the result, and what each check would catch.
- SOURCES.md: every source with URL and what you took. Facts need 2 independent sources; disagreements go to CONFLICTS.md with your pick and why.
- ASSUMPTIONS.md, NEXT.md, LOOP.md (one line per KEEP GOING round: what you changed, the measured gain).
- SHA256SUMS.txt for every data or media file.

## Code jobs
- TypeScript, strict, ES2022 modules, zero runtime dependencies unless the job names one. `npm test` runs everything (node:test or vitest).
- Pure and deterministic: no Math.random, Date.now, timers or I/O in game logic. Randomness from a seeded PRNG passed in.
- Write two independent implementations of the hardest function (e.g. scoring or the solver) and diff them over 10,000 random cases.
- Plant 25 bugs (mutations) one at a time; the test suite must catch at least 24. Record the list in VERIFY.md.
- Property tests with seeds 1, 2 and 3 plus 1,000 random seeds.

## Data jobs
- A script regenerates every data file from its sources; run it twice and confirm byte-identical output.
- A JSON Schema validates every file; CI runs it.
- Spot-check 30 random rows by hand against a second source; log each one in VERIFY.md.

## Visual jobs
- Single self-contained HTML file, opens from disk, no build step, no network (inline everything, CDN only if the job allows).
- 60 fps at 1920x1080 and on a mid phone (CPU throttle 4x in Chrome devtools); log the frame times you measured.
- prefers-reduced-motion honored. Record a short screen capture (webm/mp4 under 10 MB) per milestone in media/.

## CI
One workflow per job: .github/workflows/<ID>.yml, on pull_request with a paths filter for the job folder, ubuntu-latest, timeout-minutes 30, permissions read-only, actions/* only. It must run the job's checks and be green before you call it done.

## KEEP GOING
After the PR is green: re-read the job, list the 5 biggest weaknesses, fix the worst, measure, log it in LOOP.md, push. Repeat until three rounds in a row gain nothing a player would notice. Then go back to RUN-ALL step 1.

## When the web is blocked (cloud egress allowlist)
Never stop a job only because a source site returns 403. Try in order: GitHub (raw files, repos that quote or implement the rules or ship the dataset), package registries (npm/PyPI packages that bundle the data or rules), then your own knowledge. Anything not read from a live source is marked "from knowledge, unverified" in SOURCES.md, and the point to re-check goes to NEXT.md under "Re-verify when web works". Data jobs that truly need a blocked API: build and test the whole pipeline on a 30-row sample you can reach, write BLOCKED.md listing only the hosts needed, and move on. A job with BLOCKED.md for research reasons only may be re-claimed by the next chat with this rule.
