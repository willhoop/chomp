# Risk Register — CHOMP

**Version 1.0 · Last updated 2026-07-22**

| # | Risk | Likelihood | Impact | Mitigation | Status |
|---|---|---|---|---|---|
| R1 | Showdown changes its client and the plugin cannot read teams | **High** (already occurred) | High — the tool shows nothing | Detect both clients; fall back to reading the page text; show a diagnostic instead of failing silently | **Mitigated** |
| R2 | A new regulation changes legal Pokémon, items, or stat rules | Certain (every few months) | Medium — recommendations become wrong | All format rules live in one `FORMAT` block; updating is a one-file edit | **Mitigated** |
| R3 | Pikalytics changes format, restricts access, or shuts down | Medium | Medium — opponent inference degrades to generic sets | Inference degrades gracefully; usage data is a prior, not a dependency | Accepted |
| R4 | Inferred opponent sets are wrong (unusual items/moves) | High | Low–Medium — one recommendation is off | Documented as a known limitation; roadmap item #2 adds usage-weighted beliefs | Open |
| R5 | Single-turn model misjudges multi-turn matchups | Certain by design | Medium | Documented openly; roadmap item #1 adds a turn simulator | Open |
| R6 | Deterministic output becomes predictable to a repeat opponent | Low (at current scale) | Low | Roadmap item #3 adds mixed strategies | Open |
| R7 | Small validation sample leads to overconfident claims | Medium | High — credibility | Validation report states n and marks results as not statistically significant | **Mitigated** |
| R8 | Third-party data or trademark concerns on public release | Low | High — legal | MIT licence; no game assets redistributed; explicit non-affiliation notice | **Mitigated** |
| R9 | Engine change ships without rebuilding the plugin | Medium | Medium — silent stale logic | Documented in the how-to; regression tests in `tests/` | Open |
