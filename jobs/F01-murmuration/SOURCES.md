# Research ledger — F01

Research performed on 2026-10-07 UTC. The updated `RULES.md` section "When the
web is blocked" permits proceeding after GitHub, package-registry and knowledge
fallbacks, with unread claims explicitly marked and scheduled for re-verification.
No third-party code, artwork or footage has been copied
into this job. The repository's existing `start/murmuration/index.html` and
`REPORT.md` were read, along with root `README.md`, `RULES.md` and `JOBS.md`.

## Sources actually retrieved and read

| Source | URL | What was verified and taken |
| --- | --- | --- |
| Official three.js r180 GPGPU birds example | https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/webgl_gpgpu_birds.html | `WIDTH = 32` gives 1,024 simulated birds; the velocity shader loops over every position texel and calculates separation, alignment and cohesion. The architecture is an example to study, not evidence that 20k birds meet this job's 60 fps target. |
| Official three.js r180 GPUComputationRenderer | https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/misc/GPUComputationRenderer.js | State variables are RGBA floating-point textures. Each variable has two render targets, reading the current state while writing the next; fragment shaders perform the calculation. Rendering can read the resulting textures directly. |
| Official WebGPU compute-boids host code | https://raw.githubusercontent.com/webgpu/webgpu-samples/main/sample/computeBoids/main.ts | 1,500 particles; two buffers are alternately bound as input and output. Their usage includes both storage and vertex data. Compute dispatch uses workgroups of 64; rendering draws the particle instances. No performance conclusion was taken from this sample. |
| Official WebGPU compute-boids shader | https://raw.githubusercontent.com/webgpu/webgpu-samples/main/sample/computeBoids/updateSprites.wgsl | Separate read and read/write storage buffers; a per-particle loop over the entire input particle array; radius-based cohesion, separation and alignment. This is a metric all-pairs example, not a verified seven-nearest-neighbour starling model. |
| Simon Green, NVIDIA, *Particle Simulation using CUDA*, May 2010 | https://developer.download.nvidia.com/assets/cuda/files/particles.pdf | Pages 4–6 explain double buffering, local interactions and a uniform spatial grid. The loose grid assigns particles by centre and visits 27 neighbouring cells in 3D; grid construction uses atomics or sorting. This is architectural research, not a WebGL portability or device-performance guarantee. |
| three.js licence | https://raw.githubusercontent.com/mrdoob/three.js/r180/LICENSE | MIT terms read. No source incorporated into this milestone. |
| WebGPU Samples licence | https://raw.githubusercontent.com/webgpu/webgpu-samples/main/LICENSE.txt | BSD three-clause terms read. No source incorporated into this milestone. |
| npm `boids` registry metadata, version 2.0.0 | https://registry.npmjs.org/boids | Live package README documents metric separation/alignment/cohesion, attractors, and speed/acceleration limits. Its published benchmark numbers were not adopted as measurements for this job. |
| npm `boids@2.0.0` source archive | https://registry.npmjs.org/boids/-/boids-2.0.0.tgz | Retrieved and checked SHA-512 against live registry integrity; read `package/index.js`, README and package metadata without executing/installing it. The code has an all-particle inner loop and uses metric distance thresholds. No code was copied and this package is not a runtime dependency. |

Independent support for the state-update design: three.js, WebGPU Samples and
NVIDIA all separate old and new particle state. Independent evidence for why an
unmodified demo cannot establish the required scale: both official flocking
examples contain an all-particle inner loop, at 1,024 and 1,500 particles
respectively. A 20,000-bird implementation requires its own measured validation.

## Accessible secondary projects, not primary scientific validation

| Source | URL | Limited use |
| --- | --- | --- |
| Alex Quiterio, murmuration README | https://raw.githubusercontent.com/alex-quiterio/murmuration/main/README.md | Read the documented seven-neighbour design, separation/alignment/cohesion description and references to Ballerini and Cavagna. These are that project's assertions; the linked scientific sources were not retrievable here. |
| tralev, murmuration scientific notes | https://raw.githubusercontent.com/tralev/murmuration/main/sci.md | Read the stated Young/Pearce references and the discussion of projection versus topological models. This is a simulation project's account, not an independent verification of those papers or their numerical conclusions. |
| tralev, murmuration README | https://raw.githubusercontent.com/tralev/murmuration/main/README.md | Identified a simulated GIF and listed scientific papers. The GIF is computer-generated and does not satisfy the request to research real film footage. |

These two project accounts cite overlapping underlying papers. They do **not**
establish independent primary confirmation of a physical fact. The following
knowledge-based model is permitted by the updated fallback rule; its scientific
and footage claims remain explicitly unverified.

## From knowledge, unverified — physical model and film-inspired choices

The literature references below identify what to check later. Their contents
were **not** read live in this environment, and no film was watched here.

| Claim/choice | Status and remembered basis | Consequence for this job |
| --- | --- | --- |
| Starling interaction is approximately topological, with about six or seven closest neighbours rather than a fixed metric radius. | **From knowledge, unverified.** Remembered empirical result of Ballerini et al. (2008), DOI 10.1073/pnas.0711437105; accessible project READMEs also describe it, but the primary article is blocked. | Use seven neighbour headings/positions for the flock's alignment/cohesion inspiration. Do not describe seven as a universal biological law or this visual simulation as a validated physical reconstruction. |
| A limited-neighbour consensus graph can balance communication cost and robustness; preferred count can depend on flock geometry. | **From knowledge, unverified.** Remembered result of Young et al. (2013), DOI 10.1371/journal.pcbi.1002894; the independent paper must be read later. | Keep the neighbour-count choice configurable during development; do not assert that seven is optimal for every shape. |
| Large murmurations can appear as rolling sheets, ribbons and lobes with coherent turns, occasional splits/rejoins, and darkening caused by overlapping depth. | **From knowledge, unverified.** Memory of real murmuration films, including the intended film reference https://vimeo.com/31158841. No new observation, timing or physical measurement was made here. | Create original layered bird geometry and coherent turn-wave/density variation. Treat shape, contrast and timings as artistic choices pending footage review. |
| A flock should avoid instant individual direction reversals and abrupt density collapse. | **From knowledge, unverified** as a naturalistic judgement, not a measured flight limit. | Bound acceleration/turn rate and speed; soften cohesion briefly on event release; reform through two streaming lobes rather than a uniformly shrinking hole. Tune the limits by browser tests, without attaching unverified real-world units. |

A workable computational model uses velocity alignment toward the mean unit
heading of the selected neighbours, cohesion toward their centroid, and separate
short-range metric repulsion. Clamp the total acceleration and speed, integrate
at a stable simulation step, and add a weak shared smooth flow field to guide
large-scale form. Heart targets, colour laps, ring lanes and event timings are
original artistic controls; they are not claims about natural starling behaviour.

"Seven nearest" must describe the actual implemented search. If a WebGL2
implementation considers only a bounded local candidate set, call it **seven
nearest within the candidate set**, an approximate topological graph; do not
claim an exact global nearest-seven result. A fixed seven-index adjacency graph
is another approximation and must be labelled if used. Evaluate candidate
quality against a full nearest-neighbour reference on representative small
samples if the implementation claims spatial accuracy.

For scale, a direct all-pairs search requires roughly N×(N−1) distance tests
per step (about 400 million at N=20,000). This is a count derived from the
algorithm, not a hardware benchmark. Double-buffered GPU state is supported by
the retrieved official sources. Candidate pruning or a spatial index is an
engineering requirement to investigate and measure, not an assumed performance
guarantee. WebGL2 lacks general compute-shader storage-buffer atomics; avoid
silently substituting WebGPU requirements into an offline WebGL2 deliverable.

## Required primary research unavailable in this environment

The following read-only HTTPS attempts used inherited proxy settings and normal
TLS verification. Each failed with curl exit 22 and a proxy HTTP 403 before any
source content was downloaded. No proxy bypass or verification override was used.
The current supported environment policy reports restricted, enforced access
with package-manager/GitHub destinations, not the hosts below.

| Intended source | Attempted URL | Remaining purpose |
| --- | --- | --- |
| Ballerini et al., topological interaction paper | https://arxiv.org/abs/0709.1916 | Read the primary evidence and limitations behind the job's approximate-seven-neighbour premise. |
| Ballerini et al., publisher copy | https://www.pnas.org/doi/10.1073/pnas.0711437105 | Authoritative alternate to the arXiv attempt. |
| Young et al., consensus robustness paper | https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1002894 | Read an independent analysis before adopting the neighbour count and claiming its physical meaning. |
| Princeton research explanation | https://www.princeton.edu/news/2013/01/29/birds-feather-turn-together | Attempted independent institutional account; page existence/content was not verified. |
| RSPB murmuration reference | https://www.rspb.org.uk/birds-and-wildlife/starling-murmurations | Attempted natural-history/footage reference; page existence/content was not verified. |
| *Murmuration* film reference | https://vimeo.com/31158841 | Attempted real footage research. No footage was retrieved or watched. |

GitHub repository searches for `starling topological`, `Cavagna flocking`,
`Bialek flock`, `StarDisplay`, and quoted paper/footage terms found accessible
simulation projects and bibliographic references. They did not yield a verified
primary-paper mirror or accessible actual film footage. Listing an unavailable
URL is not evidence that its contents were read. After those GitHub attempts,
the npm registry and verified `boids@2.0.0` archive were consulted as the package
fallback. The project may now proceed under the updated explicit knowledge
fallback. Primary scientific and actual film verification remain pending in
`NEXT.md` under "Re-verify when web works"; this research limitation alone is
not a reason to mark the job blocked.
