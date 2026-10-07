# T-0275 r4: murmuration lobby, a smoother and less repetitive ring (builder-2)

File: `index.html` (one self-contained file; r3's URL params and `window.__murm` hook still work). `r3.html` = the untouched baseline. Open it in a 16:9 window (TV) or a portrait window (phone). Buttons at the bottom: join, room code, winner, theme, look, shape; `?kiosk` hides them.
URL: `?theme=pop|gouache` `?join=Ana&join=Ben` (queued in order) `?code=ERVY` `?look=ink|rainbow|players|shimmer` `?shape=bird|dart|petal|comet` `?style=0..3` (force wind, dive, orbit, sweep) `?seed=` `?motion=1` (ignore reduced motion).
Status: for review, not signed off. Ranked leftovers are at the end.

## What changed, against the owner's asks
1. **Smoother ring.** One closed superellipse fitted to the word's box (exponent 2.6 to 4.6, squarer for a taller word; TV ANA: 2.7, ring length 2357 px), walked by arc length, so birds keep an even gap round the corners. 4 lanes on the TV, 3 on the phone, turning at slightly different speeds (inner lane fastest, 1.12 to 0.88 x cruise) so the ring shears like an orbit. Fixed 60 Hz simulation step. Birds join the ring through a quintic ease and a speed leash (7 x cruise at most).
2. **Spiral in, on a different path each time.** Every event (join, room code, winner) picks one of four entries, never the same one twice in a row: **wind** (a wide swirl, the whole ring starts at once), **dive** (the least swirl, the fastest arrival), **orbit** (the most swirl, the slowest arrival, the ring starts filling half a second in), **sweep** (the ring fills round like a clock hand over one second). Each bird's path is worked out along the ring and across it from where the bird really is when it joins: it sweeps round while it drops onto its lane, so the path is a spiral, and it never cuts a chord over the word. Sheet: `shots/entry-styles-wind-dive-orbit-sweep.jpg` (same start, one row per entry).
3. **More dynamic, less repetitive.** Each event also rolls its own direction (65 % clockwise), a density wave that travels round the ring (2 to 3 crests, drifting either way), a lane weave (each lane wobbles sideways with its own phase, so the lanes braid), a breathing wave in the ring's width (1 to 2 crests, drifting either way), the colour drift speed and a random start seat. The exit belongs to the entry: wind unwinds along the tangent (1.15 s), dive bursts outward (0.25 s), orbit streams off in one shared heading, sweep peels along the tangent (0.3 s). Hold time follows the queue (3 or more waiting: 1.3 s, alone: 2.8 to 4.6 s depending on when the ring closes). Six joins in a row with the default seed gave: dive, wind, sweep, dive, sweep, dive; directions -, +, +, -, -, -.
4. **Colour looks** (`look`, button "look"; sheet `shots/looks-four-by-two-themes.jpg`): **rainbow** (default) = ring birds take a hue from their place on the ring and the pattern drifts round it slowly; **players** = the ring wears the seat colours of everyone in the room (one player = one colour); **shimmer** = ink flock, a light band sweeps across it plus single-bird twinkles; **ink** = r3. Colour is blended in by how settled a bird is on the ring, so the flock stays ink and the colour arrives as birds join and drains as they leave.
5. **Extra, not asked:** four bird shapes (`shape`): bird (r3), dart, petal, comet (video `tv-pop-shapes`).
Kept from r3: the word (text sampled to a dot grid; 640 birds TV / 400 phone, 440 / 290 of them in the word), the idle flock (falcon, turning waves), seeded PRNG (mulberry32, seed 20260928), reduced motion (still flock + live caption).

## Videos (60 fps, `video/`)
- `tv-pop-rainbow`, `tv-gouache-rainbow`: Ana then Ben, 14 s. `phone-pop-rainbow`, `phone-gouache-rainbow`: same on the upright phone, 12 s.
- `tv-pop-variety`, `tv-gouache-variety`: four joins back to back, 16 s (a different entry each time, short queue holds).
- `tv-pop-looks`: four joins; ink, then rainbow at 3 s, players at 6.5 s, shimmer at 10 s.
- `tv-pop-shapes`: three joins; dart at 3 s, petal at 6 s, comet at 9.5 s. `tv-pop-code-win`: room code ERVY, then "ANA WINS" at 6 s.
- Sheets: `framestrip-*` are 10 fps (20 frames a sheet, 2 s each, 7 sheets = 14 s) of the Ana + Ben run on TV Pop, TV Gouache and phone Pop; `overview-*` are 16 frames of the same runs (0.5 s to 13 s); `video-poster-frames-*` is one frame per video.

## Numbers
- Chromium with GPU flags, TV, real time: 60 fps (5 samples; the first, 1.5 s after load, reads 6 while it warms up). WebKit iPhone 13 emulation on this Windows box (software raster): 27 to 28 fps, the same as r3, so the ring costs nothing measurable. **Not measured:** a real phone, a real TV, a 4K screen.
- 0 page errors in all 9 videos, the 3 sheet runs, the probes and the fps run.
- Reduced motion: the flock is still (the birds did not move in 1.5 s) and the caption shows the word ("ANA"). `shots/reduced-motion-tv.jpg`.
- Probe, TV, Pop, one join (`tools/probe.mjs`; the word locks at 1.6 s, the ring closes at 3.0 s): the settled ring (from 3 s) has 95 % of its 243 birds within 0.86 to 1.15 of the ring line, speed 95th percentile 1.16 x cruise, max 1.20. While entering, the max is 7.0 (the leash). 0 to 1 ring birds are inside the word's box at any sampled moment. Phone, Gouache: the same shape (ring closes at 3.0 s, settled max 1.19; at 2.85 s a few birds were still catching up, max 2.3 x).
- The 60 fps videos step 17 ms a frame (1000/60 rounded), so they play about 2 % fast.

## Review against the owner's four questions (my read, from the 10 fps sheets and the videos)
- **Value / cool:** the Pop rainbow ring is the strongest new thing (`overview-tv-pop-ana-ben.jpg`, t=3 to 8); the entries read as different arrivals when they are far apart in style (dive vs sweep), less so wind vs dive (leftover 2). The Gouache rainbow is faint (leftover 4).
- **Smooth:** the entries and the settled ring are smooth; the two places that still break the flow are the word-to-word hand-over and the release clump (leftovers 3 and 1).
- **Dynamic power:** entry and exit have it (long trails and arcs in Gouache, bursts and peels). The hold is calm: a steady ring with a small density wave (leftover 5).
- **Logic:** the ring always closes round the word, colour follows position so the ring reads as one thing, the word's birds return to the flock. The A crossbar on the phone does not read (leftover 6).

## Still not perfect (ranked; nothing here is signed off)
Noticeable
1. **Release clump.** After the exit the flock is a dense sheet with a hole where the word was, for about 4 s (`shots/release-and-scatter-pop.jpg`, t=9.9 to 13.9), the same shape after every event. Inherited from r3, but now it is the one thing that repeats. Idea: open the exit into a ribbon or two sub-flocks, weaker cohesion for 3 s after a release.
2. **The four entries are too close.** Wind and dive look alike on the TV (rows 1 and 2 of the styles sheet). They differ in timing and in how much extra swirl they add (0.02 to 0.25 of a lap on the TV); the spiral itself comes from the shared blend. Idea: give each entry its own shape (dive: a straight stoop from above; wind: a two-turn spiral; orbit: a lap around the outside first).
3. **Word to word.** With a queue, the leaving word's birds scramble as a pink cloud over the next ring for about half a second (`overview-tv-gouache-ana-ben.jpg`, t=4). Idea: peel them off along the ring direction first.
4. **Gouache rainbow is pastel.** The hues stay close to the ink colour (`looks-four-by-two-themes.jpg`, bottom row, second panel); Pop is bold. Idea: a more saturated Gouache ring palette, or a lighter rim.
5. **Calm hold.** The variety lives in the entry and the exit; for 2 to 3 s in the middle the ring is one ring turning (density wave 0.6 to 1.1 % of the circumference). Idea: a travelling bulge, or a lane that turns the other way in some events.
6. **Phone word legibility.** With 290 birds the A's crossbar drops out on some frames and ANA reads as a lambda with dots (`overview-phone-pop-ana-ben.jpg`, t=1.5 to 3). Coarse sampling inherited from r3 (step = font size / 26). Idea: sample by stroke width, raise the phone cap.
Smaller
7. No render interpolation: on a 120 or 144 Hz screen the motion still steps at 60 Hz.
8. Three unused fields in the bird literal (`uE`, `leave`, `sh`); left in so the videos match the file.
9. The players look with one player is a single-colour ring (the same as the word).
Delight ideas, not built
10. Winner: run all the seat colours round the ring as a fast lap, then settle. 11. Shimmer only on a win. 12. Gouache trails on the ring birds during the hold.
What is good, keep: the leashed entries (no bird crosses the word, none tears across the screen), the exit that matches the entry, a different ring every event, 60 fps with zero page errors, reduced motion, and one file with no dependencies.
