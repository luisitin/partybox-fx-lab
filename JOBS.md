# JOBS: visual effects lab

Each job is a single self-contained HTML page (three.js from cdnjs allowed, pinned version) that a TV party game could use as a background or a moment. The start/ folder holds earlier rounds: read the page and its REPORT.md, keep what is good, fix the ranked leftovers, then push past them. Show TV (1920x1080) and phone (390x844 portrait) layouts via ?view=tv|phone.

## F01 Murmuration round 5
Start: start/murmuration/ (index.html + REPORT.md with ranked leftovers). Fix every leftover in order, then make it the most beautiful starling murmuration on the web: research real murmuration physics (topological neighbours, about 7), the best WebGL/GPU flocking demos, and film footage. GPU compute for 20k+ birds at 60 fps on TV; graceful 3k on phone. The flock must react to game events: ?event=win (bursts into a heart then reforms), ?event=tick (ripple), ?event=idle.

## F02 Wind, sand and paper round 5
Start: start/wind-sand-paper/ (leftovers 1-21 in REPORT.md). Same rules as F01. Paper scraps and sand ride one coherent wind field (curl noise + gusts); paper flutters with real tumbling (research falling-paper dynamics). Event hooks as in F01.

## F03 Win screens
Start: start/win-screens/ (research page). Build (a) a default winner moment under 4 s that works for any game (name, score, confetti physics, podium for 2nd/3rd) and (b) 8 themed endings: cards (cascade), dice (roll-in), board/property (deeds fan), trivia (lights + buzzer), drawing (gallery wall), detective (case closed stamp), racing (finish line), word games (letters fly into the name). Each under 6 s, skippable, reduced-motion version, 60 fps on phone.

## F04 3D table kit
A three.js kit for card and tile games on a felt table: cards (rounded, real thickness, front/back from canvas-drawn faces), tiles (domino, mahjong-style, Rummikub-style numbered), dice, chips. Physics-feel animations without a physics engine (or Rapier from a CDN if clearly better: measure): deal, fan a hand, draw, play to centre, shuffle (riffle + bridge), stacks that settle, nothing ever interpenetrates. A phone view: your hand as a 3D fan you flick through and tap to lift/play. Ship a demo page per game type (cards, dominoes, tiles, dice) and API.md.

## F05 Party board camera
A three.js demo of a party board game camera: a looping path of 40 spaces on a floating island, a player token hopping space to space (squash-and-stretch), the camera following smoothly, then a "board overview" fly-out and back. Research the camera language of top console party games; deliver CAMERA.md with the rules you derived (framing, easing curves, timings) and the page that follows them. All geometry code-made and original.
