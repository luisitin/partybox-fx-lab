# F03 read-only research preparation

Prepared 2026-10-07 UTC. No job claim, branch, repository edits, browser/GPU launch,
or third-party assets. Read root README.md, RULES.md, JOBS.md and all 137 lines of
start/win-screens/index.html. This note is outside the checkout for a later F03
worker; timing/style choices below are proposals, not measured user-study facts.

## Binding delivery

Single self-contained offline HTML; no build step, dependencies, runtime network,
tracking, trademarks/logos/ripped art or external fonts. Use original generated
geometry. `?view=tv|phone` must demonstrate 1920x1080 and 390x844 portrait. Deliver
nine endings: universal default strictly under 4 seconds, then cards cascade,
dice roll-in, board/property deeds fan, trivia lights+buzzer, drawing gallery,
detective case-closed stamp, racing finish line, and word letters into name,
each strictly under 6 seconds. All skippable, all reduced-motion, phone 60 fps
measured with Chrome 4x CPU throttle. Duration includes the final animated
particle and any audio tail; a calm scoreboard may remain indefinitely.

Each job needs README under 60 lines, VERIFY exact checks/results/commands,
SOURCES including licence ledger, ASSUMPTIONS, NEXT, LOOP, SHA256SUMS for all
media/data, milestone recording under 10 MB, and paths-filtered read-only
pull_request CI using actions/* only, ubuntu-latest, timeout 30. Do not claim
done before real checks/green CI. KEEP GOING follows green PR and stops only
after three consecutive rounds with no player-visible improvement. Preserve
existing checkout; no unsolicited worktree.

## Exact baseline: what exists and what does not

- The only file under start/win-screens is index.html. `REPORT.md`, frame PNGs,
  audio WAVs, render.mjs and win-timeline.ts.txt mentioned in the page are absent.
- Title is “Shorter Wins.” It is a written research/proposal page with six CSS
  mockups, not a functional winner component. It explicitly says nothing shipped.
- Six sketches: property/board (coins and cash emojis, coloured deeds, cash/deeds/
  net-worth ledger), chess (checkerboard, king topple, #, CHECKMATE, name),
  detective (envelope flap plus three cards), numbered-card game (last +4 card,
  burst, opponents points), dice (five dice then score-sheet rows), shared
  default (Ana, 1200, three blank result rows, confetti pattern).
- Every mockup uses eight-second infinite CSS loops. Several themed timings in
  prose are 4–7 seconds; these do not meet new strict durations. There is no
  delivered trivia, drawing, racing or word-game ending, no real confetti physics,
  no 2nd/3rd podium, and no ?view=tv|phone handling.
- Its reduced-motion CSS removes animations and forces opacity1. Initial
  transforms are not corrected: e.g. the last-card sketch retains an offscreen
  translated starting transform when animation is removed. Do not inherit this
  as the reduced-motion implementation.
- Audio buttons create one new Audio from an absent local WAV, pause/rewind the
  previous one, toggle button outline, remove outline on end, and catch play
  rejection. No sound file is embedded. Skip is a proposal, not implemented.
- Page claims earlier “real TV” sound/confetti measurements: roughly10s audible,
  looping confetti visible32s; combined peak−1.8dBFS/RMS−18.8; shorter3.6s option.
  Those are baseline author claims, not measurements independently reproduced
  here. Do not copy them into VERIFY as checks run in this environment.
- Good design direction to retain: one short burst instead of endless rain,
  concise winner+score, readable final results, thematic beat then shared
  scoreboard, one-press skip, restrained sound. The claimed universal4s timing
  must become strictly below4s in implementation.
- Do not carry over named-brand wording, logos, emoji-dependent art or implied
  proprietary game art. Generic cards, pips, deeds, podiums and typography are
  enough to communicate the eight requested themes.

## Live-read references and scope

Origin sites MDN, W3C, Carbon, web.dev, NASA/OpenStax and all four baseline
external-reference hosts returned proxy HTTP403 on ordinary curl with inherited
proxy/TLS verification. GitHub source mirrors and npm succeeded. These are live
reads of authoritative documentation/project source, not fabricated browsing.

| Source read | URL | Taken |
|---|---|---|
| MDN reduced motion | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/css/reference/at-rules/@media/prefers-reduced-motion/index.md | Detect OS non-essential-motion preference; remove/reduce/replace animations. Large scaling/panning can be triggers. |
| W3C Understanding SC2.3.3 | https://raw.githubusercontent.com/w3c/wcag/main/understanding/21/animation-from-interactions.html | User control of non-essential interaction animations, including preference-based disablement; static result is a valid design response. It distinguishes interaction-initiated motion from automatically initiated motion. |
| MDN contrast guide | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/accessibility/guides/understanding_wcag/perceivable/color_contrast/index.md | AA guidance4.5:1 ordinary text,3:1 large text/components; large text18pt or14pt bold. |
| W3C Understanding SC1.4.3 | https://raw.githubusercontent.com/w3c/wcag/main/understanding/20/contrast-minimum.html | Primary normative explanation of text contrast, large-text threshold, and need for actual text rather than inaccessible raster-only names. |
| MDN requestAnimationFrame | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/window/requestanimationframe/index.md | One-shot callbacks, timestamp-based progression, changing refresh rates and background-tab pause. Do not use frame count as elapsed time. |
| Google web.dev performance guide | https://raw.githubusercontent.com/GoogleChrome/web.dev/main/src/site/content/en/animations/animations-guide/index.md | Prefer transform/opacity for DOM motion; avoid repeated layout/paint; measure dropped frames and expensive paints; will-change only after evidence. |
| IBM Carbon motion overview | https://raw.githubusercontent.com/carbon-design-system/carbon-website/main/src/pages/elements/motion/overview.mdx | Reserve expressive motion for occasional important moments; use consistent easing; static alternatives; prototype/test timing rather than assuming universal durations. |
| IBM Carbon choreography | https://raw.githubusercontent.com/carbon-design-system/carbon-website/main/src/pages/elements/motion/choreography.mdx | Coherent hierarchy, semantic/spatial consistency, continuity, bounded stagger. Carbon’s orthogonal-path/no-bounce brand preferences are not mandatory for a playful celebration. |
| canvas-confetti1.9.4 | https://registry.npmjs.org/canvas-confetti and https://registry.npmjs.org/canvas-confetti/-/canvas-confetti-1.9.4.tgz | Archive SHA512 verified against registry; source randomPhysics/updateFetti and README read. Decaying launch speed, downward displacement, drift, wobble/tilt, lifetime/alpha, reset, reduced-motion option. No dependency installed/code copied. |
| js-confetti0.13.1 | https://registry.npmjs.org/js-confetti and https://registry.npmjs.org/js-confetti/-/js-confetti-0.13.1.tgz | Archive SHA512 verified; source ConfettiShape/updatePosition and README read. Constant-acceleration y trajectory, horizontal drag slowdown, time deltas, rotation/flattening and batch completion. No dependency installed/code copied. |

Two independently maintained authorities support reduced-motion handling
(MDN/W3C) and contrast guidance (MDN/W3C); two implementation references
(canvas-confetti/js-confetti) show different ways to create a short finite
confetti event. These are not two empirical aerodynamic studies. No claims about
ideal celebration durations, readability-at-distance, player preference or
measured human response were inferred; project timings are product constraints.

Baseline URLs attempted, all proxy403 and unverified: Chess.com
https://support.chess.com/en/articles/9090964-what-are-the-board-animations-on-chess-com ;
Steam https://steamcommunity.com/app/2477010/discussions/0/3975051032840878333 ;
BGA https://en.boardgamearena.com/doc/Gamehelptickettoride ; Samurai Gamers
https://samurai-gamers.com/mario-party-superstars/how-to-unlock-ending-credits/ .
Their game-observation claims remain baseline claims only, not confirmed facts.
NASA https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/ and
OpenStax https://openstax.org/books/university-physics-volume-1/pages/6-4-drag-force-and-terminal-speed
also403. Aerodynamic simplification below is “from knowledge, unverified” and
must be rechecked under NEXT “Re-verify when web works,” not used as a blocker.

## Shared implementation blueprint

Use an actual DOM result layer (winner name, score, 2nd/3rd results, action
buttons) above one Canvas2D decoration/particle layer. Keep text semantic and
selectable; inline SVG/paths or canvas geometry is original decorative art.
Use system fonts, measured label fitting, tabular numerals and sufficient
foreground/background contrast. Never infer a winner by sorting arbitrary
scores: some games reward low values, strings, teams or ties. Caller supplies
explicit ranked results and already formatted score strings.

One shared declarative scene description per theme: duration, palette, initial
objects, track[{id,start,end,from,to,ease}], finite burst[{at,count,origin,...}],
and a fixed final results layout. A pure evaluate(scene,t,payload,seed) produces
poses without side effects. One controller drives all nine scenes; avoid nine
separate sets of timers/CSS loops. All time in seconds, normalized layout units,
seeded PRNG supplied or derived from a caller seed. Render state at arbitrary t
for tests, screenshots, replay and skip. Randomness is sampled once at launch,
never per frame. Date.now/Math.random/IO stay out of pure simulation.

Suggested API (original proposal, not a required external library):
window.partyboxWin.show({theme:'default',view:'phone',seed:123,
  players:[{id:'a',name:'Ana',score:'1200',rank:1},
           {id:'b',name:'Ben',score:'980',rank:2},
           {id:'c',name:'Cleo',score:'940',rank:3}],sound:false})
returns {finished:Promise<{reason:'complete'|'skip'|'superseded'|'cancel'}>}.
Also expose skip(), cancel(), destroy(), snapshot() and deterministic test-only
seek(t). Document API and query parameters (?theme=...&view=...&seed=...&name=...&score=...).
Use a new generation/run id on every show; stale callbacks cannot finish,
clear, announce or alter the new run. Resolve every run exactly once.

Default timeline proposal3.6s: burst0.08–0.40, winner name/score settle by0.45,
podium2nd/3rd0.55–1.15, final confetti gone by3.35, settle3.6. Core information
stays readable after completion; the4s rule is a motion/audio deadline, not an
instruction to erase results. Theme timelines4.2–4.8s with winner information
stable by1.2s. No effect blocks Skip even in the first frame.

| Theme | Original visual motif | Suggested finite beat |
|---|---|---|
| default | winner medal, tasteful edge burst, ranked podium | 3.6s |
| cards | rounded cards with original suits/numbers cascade into a fan; reveal winner through clear centre | 4.6s |
| dice | original pipped cubes/2.5D squares roll in, tumble slows and faces settle; no false score claims | 4.5s |
| board/property | coloured deed rectangles fan from a neutral board/map; winner seal, no copied property names | 4.8s |
| trivia | radial spotlights/light rings focus on winner; one bounded synth buzzer/chime after user activation | 3.8s |
| drawing | three original seeded line-art tiles slide onto a gallery wall; winner title and frame highlight | 4.8s |
| detective | neutral file sheet and original CASE CLOSED typographic stamp; slight impact settles once | 4.2s |
| racing | abstract ribbon finish line and lane markers; winner medallion crosses then rests | 4.4s |
| words | decorative letters converge on the winner name with exact final DOM name already available accessibly | 4.8s |

Phone composition: winner hero top-centre, theatre in middle, compact2nd/3rd
podium below, controls above safe-area bottom. TV: wide hero with theatre across
centre and podium close enough to read. Keep core labels away from particles.
Do not globally scale a16:9 composition into a portrait screen. Fit names from
actual measured width; retain full name in DOM/accessible label. If splitting
word-theme names, use Intl.Segmenter graphemes or keep complex/RTL names as an
unsplit name tile. Repeated characters must have stable occurrence indices.

## Confetti: explicit time-based model

From knowledge, unverified: a simple visually plausible model is acceleration
`a = g + lambda*(wind - velocity)`, using relative velocity rather than adding
wind as a constant position offset. This is linear drag, an artistic approximation
for paper, not validated tumbling aerodynamics. Angular velocity/tilt gives each
piece a face-on/edge-on cycle; projected width never hits negative size. Particle
palette, launch speed, gravity and damping are tuned display-unit parameters.

For each time step with piecewise-constant wind, lambda>0 gives an exact analytic
step: `vInf = wind + g/lambda`; `e = exp(-lambda*dt)`;
`vNew=vInf+(vOld-vInf)*e`;
`pNew=pOld+vInf*dt+(vOld-vInf)*(1-e)/lambda`.
For lambda0, use ballistic `vNew=vOld+g*dt`,
`pNew=pOld+vOld*dt+0.5*g*dt*dt`. Treat smalllambda stably (`expm1` or branch).
An independently written small-step integrator can validate this mathematical
implementation; agreement tests do not validate the aerodynamic approximation.

Use a fixed-step accumulator for changing smooth wind, with interpolation or
pure pose-at-age trajectories. Bound total particle count, lifetime and emission
window; prefer e.g.120 phone/240 TV initially, then measure. No particle emitted
past its descriptor’s emission endpoint, alpha reaches0 before scene duration,
and reaching finished state clears particle storage and cancels RAF. Avoid
per-particle gradients, shadows, readbacks or DOM nodes. DPR cap is a measured
quality/performance choice, not a promise that software rendering meets60fps.

## Controller state and meaningful validation

State: idle -> running -> settled, with cancelled/destroyed explicit. Skip and
natural completion must converge on the same static scene. Reduced motion calls
that same final-state builder immediately (zero particles, no travelling art,
no flashing, no rolling counter, no queued motion). Preference changes during
play settle current run; turning preference off does not silently replay it.
Resize rebuilds geometry at normalized progress and never resets the PRNG/run.
Visibility/background pauses must have documented behavior (freeze or settle);
never huge catch-up simulation bursts. The complete scoreboard remains until
another show/cancel; destroy removes owned listeners/RAF/audio/DOM only.

Audio is optional and synthesized locally via WebAudio after explicit user
action; direct query startup remains silent. The trivia visual must still work
when audio is blocked or muted. Skip/cancel clears scheduled notes and fades or
stops oscillators; no audio tail crosses the visual deadline. Do not copy the
baseline missing WAVs, party horn/crowd samples or branding.

Test every theme at0, reveal, mid, exact end and end+1; assert final name/score,
rank2/3 labels and no moving/decorative particles at deadline. Exercise real RAF
wall-clock progression (not only seek), direct file opening, network interception,
phone390x844/CPU4, TV1920x1080, all themes, all reduced-motion variants and skip
at first/mid/final frame. Repeated shows100times, cancel/destroy, resize during
entry/hold, dynamic reduced-motion, hidden-tab resume and stale promises must
not leak state or duplicate completions. Check long/wide names, emoji/graphemes,
RTL names, HTML/script injection strings, empty names, zero/negative/long-form
scores, missing2nd/3rd, explicit ties and unsupported theme fallback.

Measured checks: warm-up then active-scene RAF frame intervals+p50/p95/p99+long
frames, final2s no-work check, CPU4 phone capture and under10MB clip per milestone;
record failures honestly. Calibration/hardware constraints do not allow calling
phone60fps green merely from a fast seek loop. Pageerror/consoleerror/failed
network requests must be empty. Add CI smoke/screenshot checks with permissions
read-only, job paths filter; real-green PR evidence precedes KEEP GOING.

## Re-verify when web works

Re-read the blocked baseline game references if their specific facts would be
used. Recheck NASA/OpenStax relative-wind drag facts and any aerodynamic claims.
No third-party audio, art, game footage or movie was watched/copied here. All
unsourced human-response and physics assumptions remain labelled; proceed under
the explicit repository fallback rather than blocking this visual job.

## Independent lifecycle review additions

A read-only child review identified these useful hardening details:

- Prefer invocation-bound handles `{id, finished, skip, cancel}`; skip from an
  old handle must not settle a newer invocation. Include `destroyed` as an
  exactly-once completion reason. Increment the generation before cleanup and
  validate it on every callback, since cancelling RAF alone does not protect
  already executing work.
- `cancel()` clears the owned overlay without announcing a winner; `destroy()`
  additionally removes listeners and is terminal. Do not steal host focus;
  provide a keyboard-accessible Skip and restore focus only if owned UI had it.
- A simple background policy is settle on hidden; choose/document this rather
  than arbitrary catch-up. A two-second frame gap must not emit delayed bursts.
- Evaluate identical inputs out of order and require identical results and
  unchanged inputs. Clamp negative time and time beyond duration explicitly.
- Precompute immutable random particle descriptors once; reuse pose buffers.
  No per-frame text measurement, particle construction or broad allocations.
- Test the solver against an independently written fine-step integrator over
  10,000 seeded cases, including zero/tiny/large drag and wind segment changes.
  Check partition invariance for constant wind and continuity at lambda0.
- For very small `x=lambda*dt`, use a series or zero-drag branch. A stable form
  uses `A=-expm1(-x)/lambda`, `B=(x+expm1(-x))/(lambda*lambda)`, then
  `pNew=pOld+vOld*A+wind*(dt-A)+g*B`. Evaluate B by its series near zero;
  merely using expm1 for A does not prevent all cancellation in the vInf form.

No implementation, runtime performance or delivery claim follows from this
review. These are prepared checks for the later claimed job.
