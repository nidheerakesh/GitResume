# Deploy

This page describes the three configurations that exist in the repo. It does not cover running them for you; check each platform's current docs.

## Vercel (single domain, monorepo)

`vercel.json` uses two builds:

- `frontend/package.json` with `@vercel/static-build`, output directory `dist` (runs the `build` script: `tsc -b && vite build`).
- `backend/app/main.py` with `@vercel/python`.

Routes send `/api/*` to `backend/app/main.py` and everything else to `frontend/`. Because both are on one domain, the frontend's default `/api` base works with no `VITE_API_BASE_URL` and no CORS setup.

Steps: import the repo in Vercel at the repository root, add any server keys (for example `GROQ_API_KEY`, see [Configuration](configuration.md)) under Project Settings, Environment Variables, and deploy.

Check before relying on it:

- Python dependencies: the root `requirements.txt`, `backend/requirements.txt` and `backend/app/requirements.txt` now list the same packages (including `httpx`, `pdfplumber`, `python-multipart`, `beautifulsoup4`). I did not verify which file `@vercel/python` picks up, so confirm the deployed API starts (`/api/health`).
- PDF output: nothing in `vercel.json` installs Tectonic, so on Vercel `GET /api/templates` should report `pdf_available: false` and the app falls back to the Live sheet and browser print. Not tested.
- The GitHub cache is in memory, so it does not persist across serverless invocations.
- Serverless function time limits apply to the GitHub scan and AI calls (each AI call has a 30 second timeout in the code).

## Docker

`backend/Dockerfile`: Python 3.11 slim, downloads the Tectonic 0.17.0 x86_64 Linux musl binary into `/usr/local/bin` (so PDF output works in the image, on x86_64 hosts only), installs `backend/requirements.txt`, runs `uvicorn app.main:app --host 0.0.0.0 --port 5000`.

`frontend/Dockerfile`: builds with Node 20 (`npm ci`, `npm run build`, with `VITE_API_BASE_URL` as a build arg), then serves `dist` with `serve -s` on port 3000.

`docker-compose.yml` maps backend `5000:5000` and frontend `3000:3000`, passes `GROQ_API_KEY` (from your shell, empty by default) to the backend, and builds the frontend with `VITE_API_BASE_URL=http://localhost:5000/api`.

## Render

`render.yaml` defines two free-plan Docker web services:

- `gitresume-api`: `backend/Dockerfile`, with `GROQ_API_KEY` to be set manually in the dashboard.
- `gitresume-app`: `frontend/Dockerfile`, with `VITE_API_BASE_URL` taken from the API service's `RENDER_EXTERNAL_URL`.

The comment in the file says `/api` is appended, but `fromService` only passes the service URL. The frontend then calls `<url>/github/profile/...` while the backend serves `/api/...`. You will likely need to set `VITE_API_BASE_URL` to the API URL plus `/api` by hand and redeploy the frontend. The frontend Dockerfile also serves on port 3000, so confirm Render's port setting matches. Neither point was tested. The API image includes Tectonic, so PDF output should work there; this was not tested either.

Also set `CORS_ORIGINS` on the API service to the frontend's URL, since the two live on different domains.

## GitHub Pages site

`.github/workflows/pages.yml` builds `site/` (landing page and this guide, rendered from `docs/`, `README.md` and `CONTRIBUTING.md`) on pushes to `main` and on pull requests that touch `site/`, `docs/`, markdown files or the workflow. It runs checks and smoke tests, and deploys to GitHub Pages only from `main`.
