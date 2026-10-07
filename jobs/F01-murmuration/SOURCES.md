# Research ledger — F01

Research performed on 2026-10-07 UTC. Initial research used the updated
`RULES.md` knowledge fallback after source denials. After Git/GitHub access
changed, ordinary HTTPS retries retrieved and allowed reading the Ballerini
primary PDF and the Young primary article. Those readings now replace the
earlier unverified physics recollections. Film playback remains unverified.
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
| Ballerini et al., *Interaction Ruling Animal Collective Behaviour Depends on Topological rather than Metric Distance: Evidence from a Field Study* | https://arxiv.org/abs/0709.1916 and https://arxiv.org/pdf/0709.1916 | Both returned HTTP 200 on retry; the 2,124,607-byte primary PDF was read through text extraction, including introduction, results, discussion and methods. Ten selected cohesive flocking events, stereo-reconstructed at dusk near Rome's Termini roost, support approximately six–seven neighbours through the decay of spatial anisotropy. The paper reports nc=6.5±0.9 SE. This is a statistical inference, not observation that every bird always chooses exactly seven. |
| Young et al., *Starling Flock Networks Manage Uncertainty in Consensus at Low Cost* (2013) | https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1002894 | HTTP 200 full text read: abstract, introduction, analysis, results, discussion and supporting-information descriptions. The authors evaluate normalized noisy linear consensus on fixed nearest-neighbour graphs: 394 snapshots of twelve flocks (440–2600 birds). Overall robustness per neighbour peaks at six/seven, with individual flock optima between five and nine; geometry/thickness matters. It does not establish that every flocking task, large turn or topology uses a universally optimal seven. |
| RSPB, Starling species account | https://www.rspb.org.uk/birds-and-wildlife/starling | HTTP 200; relevant description and behaviour sections read. Describes dark starling plumage, social flocks, and dusk swooping/swirl displays. Links to the working murmuration article below. No photograph or audio was copied. |
| RSPB, *Starling murmurations: explore one of nature's winter wonders* (8 November 2024) | https://www.rspb.org.uk/whats-happening/news/starlings-murmurations | HTTP 200; article read. Describes cloud-like shapes, swoops/dives, synchronized mass movement, dusk roosts, hundreds/thousands and sometimes tens of thousands of birds. Used for the dark-cloud/dusk visual direction, independently of the mathematical papers. No image was copied. |
| *Murmuration*, Islands & Rivers, film page | https://vimeo.com/31158841 | HTTP 200 on retry. Page identifies a 123-second film with public viewing/embedding, while download and offline viewing are disabled. Only public page metadata was read; no film was watched, extracted or copied. The ordinary public player URL and player configuration endpoint remain proxy HTTP 403. |

Independent support for the state-update design: three.js, WebGPU Samples and
NVIDIA all separate old and new particle state. Independent evidence for why an
unmodified demo cannot establish the required scale: both official flocking
examples contain an all-particle inner loop, at 1,024 and 1,500 particles
respectively. A 20,000-bird implementation requires its own measured validation.

## Accessible secondary projects, not primary scientific validation

| Source | URL | Limited use |
| --- | --- | --- |
| Alex Quiterio, murmuration README | https://raw.githubusercontent.com/alex-quiterio/murmuration/main/README.md | Read the documented seven-neighbour design, separation/alignment/cohesion description and references to Ballerini and Cavagna. These project assertions were preliminary leads; primary-paper retries now provide the stronger evidence above. |
| tralev, murmuration scientific notes | https://raw.githubusercontent.com/tralev/murmuration/main/sci.md | Read the stated Young/Pearce references and the discussion of projection versus topological models. This is a simulation project's account, not an independent verification of those papers or their numerical conclusions. |
| tralev, murmuration README | https://raw.githubusercontent.com/tralev/murmuration/main/README.md | Identified a simulated GIF and listed scientific papers. The GIF is computer-generated and does not satisfy the request to research real film footage. |

These two project accounts cite overlapping underlying papers. They do **not**
establish independent primary confirmation of a physical fact. Ballerini and
Young provide two separately published primary analyses for the approximate
six/seven-neighbour design, but share coauthors and much of the observed data:
Young is a different consensus/robustness analysis, not a wholly independent
field replication. That scope limit is retained rather than overstating source
independence. RSPB independently supports the large, dark dusk-cloud behaviour.

## Physical model supported by the retrieved papers

Topological means neighbour rank/count rather than a fixed radius. The Ballerini
paper specifically cautions that selecting a fixed count and then weighting its
interaction strength by metric distance is not the same finding. Young's main
analysis uses an equal-weight normalized neighbour average, while acknowledging
possible weighting differences, static-graph analysis, near-consensus linearity
and other behaviours requiring different performance metrics. Together they
support a seven-neighbour alignment inspiration and a clearly approximate
computational implementation, not a validated reconstruction of real birds.

| Claim/choice | Evidence/status | Consequence for this job |
| --- | --- | --- |
| Approximately six/seven-neighbour topological interaction can preserve cohesive flocking across density changes. | Read in Ballerini primary results/discussion and Young primary introduction/consensus analysis, subject to their shared-data and methodological limitations. | Use seven neighbour headings/positions for the alignment/cohesion inspiration. Do not describe seven as a universal biological law. |
| Neighbour count trades information-processing effort against robustness, with geometry affecting the result. | Read in Young results/discussion; Ballerini discussion offers cognitive/tracking and anti-predatory explanations as hypotheses. These explanations are hypotheses/analyses, not directly measured cognition or proof of evolution. | Do not assert that seven is optimal for every shape or that the demo proves a biological mechanism. |
| Dark masses can swoop, swirl, contract, expand, split and reform near dusk roosts. | RSPB species/murmuration accounts independently describe dusk mass displays and swoops/swirls; Ballerini introduction describes contraction, expansion, splitting and reformation. | Original layered bird geometry, coherent large-scale motion and streaming releases are appropriate artistic interpretations. |
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

## Network retries and remaining film limitation

Initial read-only HTTPS attempts below all failed with curl exit 22 and proxy
HTTP 403 before source content was downloaded. Retries after a meaningful runtime
change used the same inherited proxy settings and normal TLS verification.
Runtime/policy readiness is not inferred from a successful individual request.
No proxy bypass or verification override was used.

| Intended source | Attempted URL | Latest observed result |
| --- | --- | --- |
| Ballerini et al., topological interaction paper | https://arxiv.org/abs/0709.1916 | HTTP 200 abstract; primary PDF also HTTP 200 and read. |
| Ballerini et al., publisher copy | https://www.pnas.org/doi/10.1073/pnas.0711437105 | Still HTTP 403; arXiv full-text alternative succeeds. |
| Young et al., consensus robustness paper | https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1002894 | HTTP 200 full text read. |
| Princeton research explanation | https://www.princeton.edu/news/2013/01/29/birds-feather-turn-together | HTTP 404 on retry; not a supporting source. |
| Old RSPB murmuration URL | https://www.rspb.org.uk/birds-and-wildlife/starling-murmurations | HTTP 200 containing a 404 page. Correct article linked by the species page was fetched/read successfully. |
| *Murmuration* film page | https://vimeo.com/31158841 | HTTP 200 public page metadata read; not a watched film. |
| Public film player and config | https://player.vimeo.com/video/31158841?h=53552f5cc3 and https://player.vimeo.com/video/31158841/config | Both still proxy HTTP 403. No film playback, frames or motion observations obtained. |
| Wikimedia Commons alternative footage search | https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=murmuration%20filetype%3Avideo&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url%7Cextmetadata&format=json | Proxy HTTP 403. No alternative footage retrieved. |

GitHub repository searches for `starling topological`, `Cavagna flocking`,
`Bialek flock`, `StarDisplay`, and quoted paper/footage terms found accessible
simulation projects and bibliographic references. They did not yield a verified
primary-paper mirror or accessible actual film footage. Listing an unavailable
URL is not evidence that its contents were read. After those GitHub attempts,
the npm registry and verified `boids@2.0.0` archive were consulted as the package
fallback. Later runtime retries allowed the primary papers to be read and
superseded that portion of the fallback. Actual film viewing remains pending
under "Re-verify when web works"; artistic film-memory choices are still marked
unverified. No video download or playback bypass was attempted, and no footage
was copied into the public repository.
