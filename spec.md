<!-- INSTRUCTION TO AGENT: replace every {{PLACEHOLDER}} by reading the actual
codebase. Do not guess — if something is ambiguous, flag it as a question for
the human instead. Verify every version number against the repo's config
files (Dockerfile, CI, lockfiles), not your training data. -->

# spec.md — {{PROJECT_NAME}}

## Problem
{{One paragraph: what problem this solves and why it exists. Infer from README,
code structure, and entry points.}}

## Intended Users
{{Who uses this. E.g., "solo owner, local use" / "public web users."}}

## Required Behavior
- {{Core behavior 1, as an observable outcome}}
- {{Core behavior 2}}
- {{Edge case handling: empty input, network failure, bad data, etc.}}

## User Experience
{{CLI / web UI / library API. Include an example invocation or request and
expected output. Note deliberate choices, e.g. "vanilla JS, NO npm."}}

## Architecture
- Language/runtime: {{e.g., Python 3.14}} — PINNED. Verify against {{Dockerfile / CI / .python-version}}.
- Frameworks: {{name + pinned version, from lockfile/requirements}}
- Storage: {{e.g., SQLite via SQLCipher / none}}
- Major components:
  - `{{path/}}` — {{responsibility}}
  - `{{path/}}` — {{responsibility}}
- External APIs/services: {{list, with auth method}}

## Security & Privacy
- No secrets in source. All credentials via environment variables.
- Dependencies must be pinned and reproducible{{; Dependabot handles update
  PRs — DELETE THIS CLAUSE if Dependabot is not installed in this repo}}.
- {{Project-specific rules: e.g., "never log raw user data," "research queries are private."}}

## Validation & Tooling
- Lint: {{exact command, e.g., `ruff check .`}} — must pass.
- Types: {{exact command, e.g., `pyright`}} — must pass. (If onboarding is in
  progress, note the transitional rule here: "report new errors introduced by
  your change only until the backlog phase completes.")
- Tests: {{exact command, e.g., `pytest -q`}} — must pass.
- {{Any project-specific lint/type quirks the agent would otherwise get wrong.}}

## Acceptance Criteria
- [ ] {{Testable criterion, e.g., "a known input produces expected output within Ns"}}
- [ ] {{Testable criterion}}
- [ ] All validation commands above exit 0.
- [ ] CHANGELOG.md updated for user-visible changes.
