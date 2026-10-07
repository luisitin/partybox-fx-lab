# Decisions to carry into implementation

1. The starter's infinite eight-second sketches and roughly 4–7 s proposals
   conflict with JOBS.md's strict default <4 s and eight themes <6 s. Follow
   JOBS.md; use finite motion that settles on readable results before the limit.
2. The research page references unavailable frames/audio and names commercial
   games. Public-repository hygiene and the self-contained requirement win:
   create original generic art and inline owned assets; copy no absent/ripped art.
3. The baseline's reduced-motion CSS stops animation but leaves some starting
   transforms offscreen. Build one explicit static final-result state used by
   initial/live reduced motion, skip and natural completion; verify it visually.
4. The starter's game-specific observation/loudness assertions were not
   reproduced here. Preserve useful design directions without promoting those
   historical assertions into fresh measurements or corroborated facts.
