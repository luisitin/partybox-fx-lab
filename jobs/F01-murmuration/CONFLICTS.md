# Source conflicts

## Optimum neighbour count versus flock thickness

Secondary account: https://raw.githubusercontent.com/tralev/murmuration/main/sci.md,
section 4.4, proposes an interpolation from about 6.05 in a thin flock to 9.78
in a thick/round flock.

Primary account: Young et al., Results,
https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1002894,
reports that the optimum for normalized robustness per neighbour decreases
with thickness in the measured flock networks. Randomly generated networks
initially decrease, then level off.

Choice: prefer the primary paper's stated analysis and scope. Its criterion is
noisy linear consensus on fixed directed neighbour graphs, with measured flock
snapshots shared with the earlier empirical programme; it is not a universal
flight law. Do not adopt the secondary interpolation. This demo selects seven
nearest among 32 initially local candidates and applies an artistic guide;
it implements no geometry-specific optimum-count law.
