# Frontend — ASD Insight Companion

React + TypeScript + Vite shell for the research-only, non-diagnostic ASD-trait
prescreen prototype.

Run both services from the repo root with `./scripts/dev.sh`. To run only this
app:

```bash
npm install
npm run dev      # http://127.0.0.1:5173
```

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server on `127.0.0.1:5173` (strict port) |
| `npm run build` | Typecheck (`tsc -b`) then production build |
| `npm test` | Vitest, single run |
| `npm run lint` | Oxlint, warnings are errors |

`VITE_API_BASE_URL` points the app at the backend and defaults to
`http://127.0.0.1:8000`. Copy `.env.example` to `.env` to override it.

`ResearchDisclaimer` renders on every screen and is not dismissible — the
non-diagnostic notice must stay visible.
