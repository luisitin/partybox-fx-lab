# CAMERA.md: the party-board camera rules

The rules the page follows, with the numbers it uses. They were derived from the camera language of
console party board games and from game-camera practice. The web was blocked while this was written,
so every observation below is **from knowledge, unverified** (SOURCES.md lists each source; NEXT.md
lists what to re-check against footage). The rules are original: no game's art, maps, characters or
names appear in the page.

`test/unit/camera-md.test.ts` reads the `camera-rules` JSON block at the end of this file and
deep-compares it with `src/core/rules.ts`, so this file and the page cannot drift apart. The browser
tests then measure the page against the composition targets in each rule.

## 1. What console party board games do (from knowledge, unverified)

- **O1 Fixed board orientation.** In the Mario Party series (N64 to Jamboree), Wii Party and Fortune
  Street, the board camera does not spin the board while play goes on: it pans and changes height.
  Players learn the map by where things sit on screen, and a rotating board breaks that.
- **O2 A three-quarter high angle.** Turns are shown from roughly 40 to 60 degrees down, close enough
  that the character fills about a tenth of the screen height; the map view climbs higher and steeper.
- **O3 The turn opens on the character.** The camera arrives on the next player, a dice block floats
  over the head, the character jumps and hits it, the number hangs over the head and counts down.
- **O4 Walking is followed, with lag.** The camera trails the walking piece softly and never bobs with
  each hop. It looks ahead along the route rather than straight at the feet.
- **O5 Junctions stop and frame the options.** At a fork the walk pauses, arrows appear on each branch
  and the camera rises to show the first spaces of every branch at once.
- **O6 Map view on demand.** A button lifts the camera to show the whole board; letting go glides back.
- **O7 Arrivals are held.** Landing on a space, the camera settles on the piece while the space acts;
  big moments (a star) push in closer.
- **O8 Far turn changes travel, they do not cut.** When the next player is across the board, the camera
  sweeps there (some entries pull back while sweeping) instead of cutting, so the room keeps its bearings.

Game-camera practice used alongside (from knowledge, unverified): critically damped springs for
camera smoothing (T. Lowe, Game Programming Gems 4, 2004); "lead room" and the rule of thirds from film
framing; J. Nesky's GDC 2014 talk "50 Game Camera Mistakes" (do not bob with the character, do not
fight the player's mental map, ease every move); M. Haigh-Hutchinson, *Real-Time Cameras* (2009).

## 2. The rules

Board units: spaces sit **2.4 units** apart along the path; a token is **1.3 units** tall.
The camera is a rig with PartyBox `CameraRig` semantics: a goal `{ position, target, focus, settle }`
that a critically damped spring chases (section 3). Every shot below is only a goal.

| # | Rule | Numbers |
| --- | --- | --- |
| R1 | Fixed heading (O1). The camera always looks board-north; it never rotates the board. | yaw 0 deg in every shot |
| R2 | Lens. One vertical field of view; a portrait window widens it so the horizontal view never drops below 30 deg. | vFOV 34 deg (hFOV 57.05 deg at 16:9) |
| R3 | Pitch range (O2). Never flatter than 35 deg (the horizon creeps in), never steeper than 70 deg (the board loses depth). | 35..70 deg |
| R4 | Dice shot, turn start (O3). Low and close: feet on the lower third line, the die on the upper third line, centred. | pitch 40, distance 11, aim 1.6 above the token's feet, settle 0.7 s. Feet at y = 0.667, die centre at y = 0.36 |
| R5 | Follow shot, walking (O4). The camera tracks the token's ground point (never its hop height) plus a look-ahead along the path that shrinks as the walk ends, so the token rides the trailing side and arrives centred. | pitch 48, distance 14, aim 0.6 up, settle 0.5 s; look-ahead = 0.5 x min(steps left, 3) spaces, measured along the path. Token stays inside the lead box x, y in [0.25, 0.75] |
| R6 | Hold shot, landed (O7). A gentle push-in on arrival, token centred. | pitch 46, distance 12.5, aim 0.65 up, settle 0.6 s. Token centre at (0.5, 0.5) +- 0.03 |
| R7 | Celebrate shot (O7). A star: closer and lower, then back to hold. | pitch 38, distance 9, aim 1.0 up, settle 0.6 s, held 1.2 s |
| R8 | Turn change (O8). Measured as the ground distance D from the camera's current target to the new aim, against W = the follow frame's ground width (15.2 units at 16:9). | D < 0.35 W: nudge, settle 0.6 s. D <= 1.0 W: pan, settle 0.85 s. D > 1.0 W: crane (R9) |
| R9 | Crane (O8). A far change rises over the middle of the trip, then comes down on the new token. | goal 1: aim at the midpoint, pitch 58, distance 11 x clamp(D / W, 1.4, 2.4), settle 0.7 s, for 0.4 s; then the dice shot, settle 0.9 s |
| R10 | Overview (O6). Same heading, steeper, fitted so all 40 spaces (each tile's rim) and every token sit inside the HUD-safe frame. Exact fit (section 4), not a guessed distance. | pitch 58; margins left/right 0.06, top 0.11, bottom 0.17; fly out settle 1.1 s, hold 2.2 s (auto), fly back settle 0.95 s |
| R11 | Two tokens (pair shot). Both tokens inside the central box between the third lines' neighbourhood; never closer than the hold distance. | pitch 50; margins 0.30 left/right, 0.28 top, 0.30 bottom; distance >= 12.5; settle 0.7 s, held 1.4 s |
| R12 | Branch choice (O5). Frame the junction and the next 3 spaces of every branch, steeper so the routes read as a map. | pitch 62; overview margins; settle 0.7 s; held until a branch is picked, then the follow shot, settle 0.5 s |
| R13 | Safety. After the spring, the camera is lifted if it would come within the clearance of the island's surface or the sea. | 2.5 units over the island, 2.0 over the water |
| R14 | Cut or glide. Glide every change on the board, including far turn changes (R8, R9). Cut only: reduced motion (every change), the first frame, a tab coming back after being hidden. | a cut is `settle = 0` |
| R15 | Reduced motion. Every camera change is a cut. A walk is framed once (a cut to a shot that holds the start and the end spaces) and the token slides without hops or squash; no island bob, no cloud drift, no idle breathing. | token slide 0.26 s per space, scale always 1 |

Why these numbers:
- **R4/R6 thirds:** at 40 deg, 11 units, aim 1.6 up, the feet land exactly on the lower third line (y = 0.667)
  and a die hovering 2.75 above the feet lands at y = 0.36, next to the upper third (computed by
  the projection in `src/core/director.ts`; the browser test measures the real camera).
- **R5 lag vs lead:** a walking token crosses one space per 0.4 s (2.4 / 0.4 = 6 units/s). A critically
  damped spring trailing a goal moving at v lags by 2v/omega = 2 x 6 / (4.74 / 0.5) = 1.27 units, about half a
  space; the 1.5-space look-ahead leaves the token about one space behind the frame centre: lead room
  in the walking direction, and the token arrives centred because the look-ahead shrinks to 0.
- **R8 thresholds:** under a third of a frame the next token is already on screen (nudge); within a frame
  it is near (pan); beyond a frame a level pan would blur the board, so the crane keeps it readable.
- **R10 margins:** the TV HUD has a header (top 8 %) and player panels (bottom 15 %): the margins keep the
  spaces clear of both with 2 to 3 % to spare.

## 3. The spring (the only easing on the camera)

The rig is PartyBox `table3d/smooth.ts` exactly: a critically damped spring per axis, omega = 4.74 / settle,
`dt` clamped to 0.1 s, velocity carried across goal changes (so a goal that changes mid-flight bends the
path instead of snapping). From rest, the share of a step covered at time t is `1 - (1 + omega t) e^(-omega t)`:

| t / settle | 0.1 | 0.211 (peak speed) | 0.25 | 0.5 | 0.75 | 1.0 | 1.25 | 1.5 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| progress | 8.2 % | 26.4 % | 33.2 % | 68.5 % | 87.0 % | 95.0 % | 98.1 % | 99.3 % |

It starts at zero speed (no jolt), peaks at 0.211 of the settle, and never overshoots a fixed goal.
2D overlays (banner, labels, toasts) use the PartyBox easing `cubic-bezier(0.2, 0.8, 0.2, 1)` at 150/300/600 ms.

## 4. Fitting a set of points (overview, pair, choice)

For a fixed heading and pitch, a point's depth along the view axis does not change when the aim slides
across the image plane. So the closest distance that keeps every point inside the margins has a closed
form per axis: `d = (max_i(x_i - p z_i) - min_j(x_j + q z_j)) / (p + q)`, with `p`, `q` the right and left
frame edges' slopes after the margins, and the same for y; the larger d wins and the aim shift follows.
`src/core/fit.ts` holds this solver and an independent bisection solver; the unit test diffs them on
10,000 random point sets.

## 5. One turn, in milliseconds (normal pace)

| Beat | Time | Camera |
| --- | --- | --- |
| Turn banner slides in | 0 to 300 | turn change to the dice shot (R8/R9) |
| Die appears over the head (spring scale, overshoot <= 6 %) | 450 to 750 | dice shot |
| Auto roll (or wait for the player) | +1100 after the die | dice shot |
| Token crouches, jumps, hits the die; number pops | 0 to 320 after the roll | dice shot |
| Token lands, number shrinks into the step counter | 320 to 1100 | dice shot |
| Walk: wind-up 120, then 400 per space (280 air, 120 on the ground), settle 300 | 1100 + 120 + 400 n + 300 | follow (R5) until the last contact, then hold (R6) |
| The space acts (coins, gust, star) | 700 | hold, or celebrate (R7) on a star, or pair (R11) next to another token |
| Next turn | +400 | R8/R9 |
| After every full round (auto) | out 1.1 s, hold 2.2 s, back 0.95 s | overview (R10) |

The hop that the camera is timed to: anticipation crouch to 0.80 (0.76 on the wind-up), launch stretch 1.16
over the first 50 ms of the air, back to 1.00 at the apex, 1.06 at contact, contact squash 0.80, and after the
last hop a settle of 300 ms (0.80, 1.07, 0.98, 1.00). Volume is kept: the width scale is `1 / sqrt(height scale)`.
Height 0.85 units, forward lean 7 deg at the apex. Reduced motion: no hop, no squash (R15).

## 6. The rules as data (tests compare this block with `src/core/rules.ts`)

```json camera-rules
{
  "spacing": 2.4,
  "tokenHeight": 1.3,
  "lens": { "vFovDeg": 34, "minHFovDeg": 30 },
  "yawDeg": 0,
  "pitchLimitsDeg": [35, 70],
  "spring": { "settle95": 4.74, "maxDt": 0.1 },
  "dice": { "pitchDeg": 40, "distance": 11, "aimUp": 1.6, "settle": 0.7 },
  "follow": { "pitchDeg": 48, "distance": 14, "aimUp": 0.6, "settle": 0.5, "lookAheadPerStep": 0.5, "lookAheadMaxSteps": 3, "leadBox": [0.25, 0.75] },
  "hold": { "pitchDeg": 46, "distance": 12.5, "aimUp": 0.65, "settle": 0.6, "centreTolerance": 0.03 },
  "celebrate": { "pitchDeg": 38, "distance": 9, "aimUp": 1, "settle": 0.6, "holdSec": 1.2 },
  "turnChange": { "nudgeBelow": 0.35, "craneAbove": 1, "nudgeSettle": 0.6, "panSettle": 0.85 },
  "crane": { "pitchDeg": 58, "distanceScale": [1.4, 2.4], "settle": 0.7, "holdSec": 0.4, "finalSettle": 0.9 },
  "overview": { "pitchDeg": 58, "margins": { "left": 0.06, "right": 0.06, "top": 0.11, "bottom": 0.17 }, "settleOut": 1.1, "holdSec": 2.2, "settleBack": 0.95 },
  "pair": { "pitchDeg": 50, "margins": { "left": 0.3, "right": 0.3, "top": 0.28, "bottom": 0.3 }, "minDistance": 12.5, "settle": 0.7, "holdSec": 1.4 },
  "choice": { "pitchDeg": 62, "spacesPerBranch": 3, "settle": 0.7, "exitSettle": 0.5 },
  "safety": { "islandClearance": 2.5, "waterClearance": 2 },
  "hop": { "windUpMs": 120, "stepMs": 400, "airMs": 280, "launchMs": 50, "settleMs": 300, "height": 0.85, "crouch": 0.8, "windUpCrouch": 0.76, "stretchLaunch": 1.16, "stretchFall": 1.06, "contact": 0.8, "leanDeg": 7, "reducedStepMs": 260 },
  "turn": { "bannerMs": 300, "dieInAtMs": 450, "dieInMs": 300, "autoRollMs": 1100, "bonkMs": 320, "moveAfterRollMs": 1100, "actMs": 700, "nextTurnMs": 400 }
}
```
