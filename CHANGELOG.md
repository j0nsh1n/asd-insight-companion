# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `context.md` and `CHANGELOG.md` adopted as tracked governance files
  (2026-08-07).
- Anonymous research sessions with a fail-closed consent gate: `POST
  /api/v1/sessions`, `GET /api/v1/sessions/{id}`, `POST
  /api/v1/sessions/{id}/consent`, `POST /api/v1/sessions/{id}/intake`.
- Consent screen requiring three separate acknowledgements, with an
  "Agree to all" shortcut. Intake is unreachable until all three are accepted.
- Intake screen collecting age range, language, accessibility preferences, and
  an optional free-text context field.
- Session resume: the session id is kept in browser `sessionStorage`, so a
  reload returns the participant to their current stage.
- SQLite persistence for sessions, created automatically on startup at
  `backend/data/app.db` and overridable via `SQLITE_PATH`.
- Persistent research-only, non-diagnostic disclaimer banner, pinned to the top
  of the viewport on every screen.
- `GET /api/v1/health` and a JSON API root.
- `scripts/run-backend.sh` — starts the backend from any working directory and
  reports clearly when the port is already in use.
- Continuous integration: per-directory backend and frontend jobs, CodeQL
  analysis, and Dependabot updates.
- Backend lint and type checking via `ruff` and `mypy` (strict).

### Changed

- Welcome copy now states the study is for adults 18 and older, matching the
  age options and API validation.
- Intake now warns participants not to enter a name, email, phone number, or
  address in the optional context field.
- `npm run lint` fails on warnings rather than exiting 0.

### Fixed

- Consent and intake stage transitions are atomic. Concurrent requests
  previously allowed the same session to be consented multiple times and
  overwrote the consent timestamp; exactly one request now succeeds.
- Session creation no longer returns 500 on row mapping.
- Test renders no longer leak between frontend test cases.
