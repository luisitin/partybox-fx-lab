# Sources and provenance

Research read on 2026-10-07 UTC through the inherited proxy with TLS verification enabled. “Full PDF” means the document was obtained; the sections actually read are named below. Publisher abstracts are not described as full-paper access. No source images, videos, datasets, code, logos or paid assets are shipped. The deliverable uses original code-made art; baseline code comes from this MIT-licensed repository.

## Baseline and binding requirements

- [Repository README](../../README.md), [RULES](../../RULES.md), [JOBS](../../JOBS.md): scope, checks and delivery requirements.
- [Round-4 page](../../start/wind-sand-paper/index.html): all 929 lines read. Existing sand/tear/shred, scenes, seed, themes, reduced motion and reveal API informed preservation requirements.
- [Round-4 report](../../start/wind-sand-paper/REPORT.md): complete report and ranked leftovers 1–21 read. Its historical measurements guide regressions; they are not evidence that this revision passes.

## Curl noise and coherent wind

### S1. Bridson, Hourihan and Nordenstam — Curl-Noise for Procedural Fluid Flow (2007)

URL: https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph2007-curlnoise.pdf

Read: author-hosted full PDF; abstract, introduction, method sections 2.1–2.5, conclusion. Taken: construct velocities as curl of a potential; a planar scalar streamfunction gives `(dψ/dy, -dψ/dx)`; time-varying noise, smooth spatial modulation inside the potential, and potential-based boundary constraints provide controllable flow. Arbitrary multiplication of returned velocity by a spatial amplitude generally loses the divergence-free property. This is a procedural animation construction, not a Navier–Stokes solution or evidence of a particular frame rate.

### S2. OpenStax — Calculus Volume 3, Divergence and Curl

Official source, pinned to the version read:
https://raw.githubusercontent.com/openstax/osbooks-calculus-bundle/8dbc2ce19e804924b2517b89ac72ee45be949d15/modules/m53986/index.cnxml

Repository: https://github.com/openstax/osbooks-calculus-bundle

Read: actual official curriculum CNXML, divergence definition/physical interpretation and “Divergence of the Curl” theorem/proof. Taken: for a field with continuous second-order partial derivatives, `div(curl(F)) = 0`; mixed partials cancel. This independently corroborates S1's mathematical construction. Smooth-potential theory does not guarantee exact floating-point divergence, no projected debris crossings, or bounded integration error.

### S3. Isaac Cohen — glsl-curl-noise

GLSL: https://raw.githubusercontent.com/cabbibo/glsl-curl-noise/master/curl.glsl
Metadata: https://raw.githubusercontent.com/cabbibo/glsl-curl-noise/master/package.json

Read: complete curl GLSL and package metadata; repository root listing. Taken: an independent practical GPU implementation uses decorrelated noise components and central finite differences. Its final vector normalization differs materially from S1/S2: see CONFLICTS.md. Package metadata says BSD, but no root LICENSE file was present; no code is copied. This is an implementation reference, not a third scientific experiment or benchmark.

## Falling-paper dynamics

### S4. Pesavento and Z. Jane Wang — Falling Paper: Navier-Stokes Solutions, Model of Fluid Forces, and Center of Mass Elevation (2004)

URL: https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.93.144501

Read: publisher abstract, title, authors and DOI metadata. Taken: the study explicitly couples translation and rotation in a two-dimensional falling-plate flow; it motivates using angular state and relative airflow rather than a time-only flip. Its particular reported lift relation is a source-specific result, not an independently verified universal law for this page. Full publisher PDF returned HTTP 401; no full equations or coefficients were read or imported.

### S5. Belmonte, Eisenberg and Moses — From Flutter to Tumble: Inertial Drag and Froude Similarity in Falling Paper (1998)

URL: https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.81.345

Read: publisher abstract, title, authors and DOI metadata. Taken: a separate experimental group observed side-to-side flutter and end-over-end tumble in thin strips falling through fluid in a vertical cell, and discussed a phenomenological drag/lift model. This independently supports distinct flutter/tumble behavior and a force-based approach. Its transition threshold is not adopted for scraps in air. Full publisher PDF returned HTTP 401.

### S6. Pessa, Perc and Ribeiro — Clustering free-falling paper motion with complexity and entropy (2022)

Abstract: https://arxiv.org/abs/2204.14097
Full preprint: https://arxiv.org/pdf/2204.14097

Read: full preprint obtained; abstract, introduction, data/behavior descriptions and projected-area discussion read. Taken: actual air-paper observations distinguish end-over-end tumbling with lateral drift from irregular falls alternating tumble and large swoops; projected visible area changes with sheet orientation. Shapes studied include circles, hexagons, squares and crosses, rather than torn flexible ribbons. This analysis uses Howison et al.'s experiment data; S6 and S7 are not separate experimental replications.

### S7. Howison, Hughes and Iida — Falling-Paper experimental data/code repository

URL: https://raw.githubusercontent.com/th533/Falling-Paper/master/readme.txt
Repository: https://github.com/th533/Falling-Paper

Read: repository README and root directory listing only. Taken: identifies the underlying automated falling-paper project and trajectory/classification processing scripts. No numerical dataset, processing program, experiment video or licence was inspected or copied. S7 explains S6's provenance; it is not an extra independent corroborating experiment.

### S8. Tanabe and Kaneko — Behavior of a Falling Paper (1994)

URL: https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.73.1372

Read: publisher abstract and bibliographic metadata. Taken: historical phenomenological lift/friction modeling can produce several rotating, fluttering and steady fall regimes. Used as context; no equations, calibrated constants or assertion of a universal model are imported from this abstract.

## Sand transport and settlement

### S9. Kok, Parteli, Michaels and Bou Karam — The physics of wind-blown sand and dust (2012)

Abstract: https://arxiv.org/abs/1201.4353
Full review: https://arxiv.org/pdf/1201.4353

Read: full review obtained; abstract, transport overview, particle trajectories, turbulence and impact/rebound sections read. Taken: distinguish surface creep, saltation and airborne suspension; saltating grain trajectories depend mainly on gravity and drag relative to local airflow, with bed impacts/rebounds and deposition. Numerical grain sizes, thresholds, rebound angles and real-world drag constants are not mapped directly to screen pixels.

### S10. Sauermann, Kroy and Herrmann — A Continuum Saltation Model for Sand Dunes (2001)

Abstract: https://arxiv.org/abs/cond-mat/0101377
Full preprint: https://arxiv.org/pdf/cond-mat/0101377

Read: full preprint obtained; abstract, introduction and sections II–III read. Taken: independently authored primary phenomenological model connects wind drag, transported grains, bed impacts, source/sink exchange and transient response; parameters were compared to wind-tunnel measurements. It supports explicit settlement and later gust-driven re-entrainment. S9 cites this earlier work: these are an original model and a later synthesis, not two independent replications of every numerical result.

## Claim-to-evidence audit

| Claim used for design | Independent corroboration | Limit |
| --- | --- | --- |
| Curl of a sufficiently smooth potential is divergence-free | S1 research construction + S2 independent textbook theorem/proof | Discretization, integration, collisions and projected paths need separate checks. |
| Falling paper exhibits flutter/tumble/irregular motion | S5 independent fluid-cell experiment + S6 analysis of a different air-paper experiment; S8 context | Different shapes/fluids; no universal threshold is assumed. |
| Angular and translational state matter for falling-paper motion | S4 coupled-flow model + S5 drag/lift phenomenology; S6 orientation observations | No exact lift/torque coefficient is independently calibrated here. |
| Relative airflow, gravity and bed interactions matter for sand motion | S9 review + S10 separately authored primary model | Review cites prior studies; neither validates screen-space coefficients or runtime behavior. |

A shared wind field, adaptive rendering, release staggering, crack timing, flexible-ribbon deformation and heart/ripple game choreography are original implementation choices. They are not presented as research-established facts. Performance and regressions belong in VERIFY.md.

## Access and unverified scope

Working source routes: author-hosted UBC PDF, APS public abstracts, arXiv pages/PDFs, public GitHub API and raw files. Official OpenStax GitHub source supplies the textbook section despite its public website being inaccessible.

Observed access failures: APS PDF routes returned HTTP 401; direct OpenStax, MathWorld, LibreTexts, NVIDIA GPU Gems and USGS attempts returned proxy CONNECT 403. Accessible sources above cover the selected factual claims, so these failures do not block research or require wholesale host additions.

UNVERIFIED: full APS force equations; independently calibrated aerodynamic coefficients; real-device performance; any footage comparison; physical models of tearing/crumpling/flexible shred ribbons. No video was watched and no inaccessible equation was filled in from memory. Optional deeper source checks belong under NEXT.md “Re-verify when web works.”

## Baseline flamingo demo fixture

The inherited fakeout prompt “Flamingos are born grey” and grey answer are an illustrative baseline fixture, **from knowledge, unverified** as zoological content in this revision. No claim of two-source or species-qualified factual validation is made. The rendering/scoring fixture may be preserved for regression checks without counting those checks as fact validation.

Attempted authoritative reads on 2026-10-07: https://animals.sandiegozoo.org/animals/flamingo and https://nationalzoo.si.edu/animals/caribbean-flamingo both returned proxy CONNECT 403; their content was not read. Public GitHub code search for flamingos/gray/San Diego returned no results. An npm registry search for flamingo animal facts found no zoo-attributed corroborating candidate; no registry payload is treated as a zoological source. Re-verify the exact wording against two independent authoritative, species-qualified sources when access works.
