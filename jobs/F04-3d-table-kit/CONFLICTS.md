# Decisions to carry into implementation

1. JOBS.md's generic single-page description conflicts with F04's explicit
   demo-per-game-type requirement. Deliver four standalone demos and API.md;
   the specific F04 instruction controls.
2. The job allows pinned three.js CDN usage, while RULES.md requires zero
   runtime network and a self-contained disk-open page. Prefer a verified
   pinned inline library so both requirements can be satisfied. Do not claim a
   network-free pass for a remote CDN dependency.
3. Rapier is an option only if measured clearly better. Begin with engine-free
   physics-feel animation, then record objective comparison before changing.
4. Generic commercial game-type descriptions permit mechanics, not copied
   logos/art. Use original rounded geometry and canvas faces; no trademarked
   assets or ripped tile patterns.
