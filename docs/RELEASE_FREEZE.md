# Release freeze

Applies after Phase 8 documentation and automated checks land.

## Feature freeze

No new product features after Phase 8.

## Allowed after freeze

- Critical crash fixes
- Privacy or security fixes
- Accessibility blockers
- Broken demo-path fixes (consent, skip, results, camera cleanup)
- Documentation and typo fixes

Every allowed code change needs a targeted test and a regression pass on the
affected flow.

## Not allowed after freeze

- New APIs or integrations (including OpenAlex, PubMed, Ollama, LLMs)
- New scoring, models, risk, or probability logic
- New stimuli
- UI redesign
- Dependency upgrades unless required to fix a critical blocker
- User accounts, history, or extra storage

## Post-freeze amendments

### Amendment 1 (2026-09-01)

Permitted — stimulus replacement with a licensed silent stock clip
(content, configuration, and rights documentation), and a visual restyle
of the session screens (CSS-only).

Justification — the stimulus replacement was planned before the freeze
(the asset was committed as a placeholder explicitly "until replaced");
the restyle is CSS-only and changes no behaviour, consent flow, skip
paths, safety copy, or the privacy boundary.

Scope limit — every other freeze rule still applies. This amendment does
not permit new APIs, integrations, scoring, models, stimuli beyond this
one replacement, dependency upgrades, or storage/account features.

### Amendment 2 (2026-09-03)

Permitted — retroactive: the Dark mode / Light mode toggle in the session
header (`frontend/src/lib/theme.ts`, its `localStorage` preference, and the
header control), shipped in PR #21.

Justification — Amendment 1 permitted a CSS-only restyle, and this toggle
went past that wording: it added a small module and a user-visible control.
It is appearance only. It changes no behaviour in the consent flow, skip
paths, safety copy, questionnaire, camera handling, or the privacy
boundary; the chosen theme stays in the browser and is never sent to the
API or stored as research data.

Scope limit — every other freeze rule still applies. This amendment covers
the existing toggle only. It does not permit further UI features, new APIs,
scoring, stimuli, dependency upgrades, or storage/account features.

## Demo day

Do not merge during the final demo day unless the change fixes a critical
blocker (crash, privacy leak, or a path that prevents the demo).
