# Quickstart

By the end of this page you will have generated a resume from a GitHub username on your machine.

## Use the hosted app

The fastest route is the deployed app at [git-resume-two.vercel.app](https://git-resume-two.vercel.app). Enter a GitHub username, pick repos, and generate. The Vercel build does not install Tectonic (see [Deploy](deploy.md)), so server-side PDF compile is a local or Docker feature.

## Run locally

You need Python 3.10 or newer (the Docker image uses 3.11) and Node.js 20 or newer. The backend listens on port 5000 and the Vite dev server on 5173.

Backend:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

`run.py` starts uvicorn on `0.0.0.0:5000` with reload. Check `http://localhost:5000/api/health`, which returns `{"status": "healthy", "service": "GitResume API"}`.

Frontend, in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. On `localhost` or `127.0.0.1` the frontend calls `http://localhost:5000/api` automatically (`frontend/src/api.ts`). Set `VITE_API_BASE_URL` to override.

## Optional: install Tectonic for real PDFs

Without Tectonic the app still works, but PDF output falls back to the browser print dialog and the preview shows the "Live sheet". To get compiled PDFs, install [Tectonic](https://tectonic-typesetting.github.io/) so the backend can find it. See [Configuration](configuration.md#pdf-engine-tectonic) for the lookup order. Check with `GET /api/templates`: `"pdf_available": true` means it was found.

## Docker

```bash
docker-compose up --build
```

`docker-compose.yml` maps the backend to port 5000 and the frontend (a static build served by `serve`) to port 3000. Open http://localhost:3000. The backend image downloads the x86_64 Linux build of Tectonic, so PDF output works in the container on x86_64 hosts only.

## First successful run

1. On the first screen enter a GitHub username (or click one of the demo chips: `@gaearon`, `@charliegerard`, `@tannerlinsley`) and click **Open workspace**. The token and AI key fields are optional (see [Configuration](configuration.md)).
2. Click **Scan GitHub**. A "Connected as @user. N repos found." line appears and the recommended repos are pre-selected.
3. Adjust the selection (up to 7), then click **Use GitHub only**. This works without an AI key but the text is then built from repo facts, not written by a model (see [How it works](how-it-works.md)).
4. The editor opens. Pick a template in the preview header, then use **Download PDF** (or **Print to PDF** when no PDF engine is available) or **Download .tex**.

If the scan fails with a rate-limit message, add a GitHub token (see [Troubleshooting](troubleshooting.md)).
