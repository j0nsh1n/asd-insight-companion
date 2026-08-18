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

## Demo day

Do not merge during the final demo day unless the change fixes a critical
blocker (crash, privacy leak, or a path that prevents the demo).
