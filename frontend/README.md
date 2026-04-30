# JET5 Frontend (Vite + React)

This package renders the dashboard and public onboarding flows for JET5. It consumes the Django API through Axios and ships as a static bundle (`frontend/dist`).

## Environment
Copy `.env.example` to `.env` and fill in values before running any command:

```
VITE_BACKEND_ORIGIN=https://api.jet5.example.com
VITE_API_URL=https://api.jet5.example.com/api
VITE_MEDIA_URL=https://cdn.jet5.example.com/media
```

Any variable left empty falls back to the heuristics implemented in `src/config/env.js`.

## Commands

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot reload. |
| `npm run build` | Produce the production bundle under `dist/`. Runs CSS validation before bundling. |
| `npm run preview` | Serve the built bundle locally for smoke tests. |
| `npm run lint` | Execute ESLint with the shared config. |

> The project enforces balanced braces in CSS via `npm run check:css` (automatically called during `prebuild`).

## Deployment
1. Install dependencies and run `npm run build`.
2. Upload `dist/` to your CDN or let Django serve it as part of `collectstatic` (the backend automatically points to `frontend/dist`).
3. Keep `VITE_API_URL` / `VITE_MEDIA_URL` synchronized with the backend deployment so the SPA talks to the correct environment.

Refer to `../docs/DEPLOYMENT.md` for the end-to-end pipeline.
