# Research ledger — F01

Research performed on 2026-10-07 UTC. This is an unfinished research milestone,
not a finished effect. No third-party code, artwork or footage has been copied
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
satisfy the binding requirement for two independent sources for a physical fact.
No numerical claim about real starling dynamics is treated as verified here.

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
URL is not evidence that its contents were read. Scientific and footage research
remain incomplete; see `BLOCKED.md` and `NEXT.md`.
