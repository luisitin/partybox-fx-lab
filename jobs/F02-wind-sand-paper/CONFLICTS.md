# Conflicts and interpretation choices

1. **Exact curl construction versus normalized GLSL curl.** S1 (Bridson) and S2 (OpenStax) establish `div(curl(F)) = 0` for a smooth potential. S3 returns `normalize(curl(...))`; normalization is a spatially varying rescaling and generally destroys that identity. Choice: use the potential/curl construction without per-sample normalization; adjust amplitude inside the potential. Check the actual numerical field separately.

2. **Real falling-paper dynamics versus illustrative models.** S4 studies a 2D free plate in numerically solved flow; S5 studies thin strips in a fluid-filled vertical cell; S6 analyzes distinct 3D paper shapes falling in air. They agree that rotation and translation produce multiple fall behaviors, but do not establish one transferable set of drag, lift, torque or flutter-threshold values. Choice: use a bounded phenomenological relative-wind/angular-state animation, label coefficients as artistic settings, and avoid describing it as a calibrated fluid solver. Flexible tearing, ribbon bending and crumple remain original visual assumptions.

3. **Review and primary study are not independent replications.** S9 synthesizes sand research and cites earlier work including S10. S6 reuses S7's experimental dataset. Choice: identify provenance explicitly; use distinct studies for qualitative corroboration without counting a review or re-analysis as a new experiment. No numerical source result is called independently reproduced by this page.

4. **Baseline “inside-out” label versus cell ordering.** The baseline report calls plaque erosion inside-out; `buildCells()` delays deeper plaque cells and its comment describes rim-inward progression. Choice: preserve gradual text/plaque erosion and visible seam ownership; judge the result with current checks rather than treating an ambiguous phrase as proof of direction.

5. **Noncrossing river presentation versus inertial debris.** A smooth shared advection field has a single local velocity. Paper inertia, paper rotation, projected depth and unsteady trajectories do not guarantee that all screen-space debris paths never intersect. Choice: preserve coherent broad flow and prevent debris obscuring readable neighbors; do not assert a universal no-crossing physical law. A particle that fades at a neighboring card would violate the preserved no-mid-air-disappearance behavior.

6. **Historical measurements versus current evidence.** The baseline report's TV 60 fps, phone 29–42 fps, 192 clean runs and isolated frame spikes describe its earlier Windows/browser setup. Choice: rerun current checks and retain explicit device/runtime/throttling details. Desktop phone viewport or CPU throttling cannot establish real-phone performance or diagnose all past GC/GPU hitches.

7. **“Same rules as F01” applied to another material.** F02 inherits GPU scale, TV/phone views, win/tick/idle hooks, research and checks. Seven topological neighbors is a bird-flocking mechanism and does not apply to wind or sand. Choice: carry the 20k+/3k particle and heart/reform/ripple event expectations to sand/paper, while documenting the material-specific physical model. All 21 ranked baseline leftovers remain in scope.

See SOURCES.md for source identifiers and what was actually read. There are no imported source assets or code snippets requiring a licence conflict resolution.

8. **Broad flamingo demo wording versus unverified species scope.** The original fakeout fixture supplies grey as its answer, but two authoritative zoo pages were inaccessible and no independent live corroboration was obtained. Choice: preserve it as an explicitly illustrative, unverified baseline fixture; do not claim zoological validation or generalize it to every species.
