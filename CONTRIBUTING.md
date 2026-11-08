# Contributing

GitResume is MIT licensed (see `LICENSE`). Issues and pull requests are welcome.

## Run it

Follow [docs/quickstart.md](docs/quickstart.md): backend on port 5000 (`python run.py` in `backend/`), frontend on port 5173 (`npm run dev` in `frontend/`). Install [Tectonic](docs/configuration.md#pdf-engine-tectonic) if you touch templates or PDF code.

Before opening a PR:

- Backend tests live in `backend/tests/test_fixes.py` and use pytest, which is not in `requirements.txt`. Install it in your venv and run `python -m pytest tests` from `backend/`.
- `cd frontend && npm run lint && npm run build` (the build runs `tsc -b`). At the time of writing lint reports one `react-hooks/set-state-in-effect` error in `App.tsx` and one warning; check that you add none.
- Start the backend and check `GET /api/health`, then do one full run in the browser: scan a username, generate, switch templates, check the PDF preview, download the `.tex`.
- If you change a prompt in `backend/app/ai.py`, say what you ran it against.

## Layout

- `backend/app/main.py`: FastAPI routes and CORS
- `backend/app/github.py`: GitHub fetching and repo scoring
- `backend/app/ai.py`: provider selection, prompts, tailoring helpers, no-key fallback
- `backend/app/resume.py`: template list and LaTeX rendering
- `backend/app/pdf.py`: Tectonic lookup and PDF compile
- `backend/app/templates/<id>.tex.j2`: the four LaTeX templates
- `frontend/src/App.tsx`: app state and API calls
- `frontend/src/components/`: login, portal, editor, preview, modals, chat
- `frontend/src/resumeUtils.ts`, `types.ts`, `api.ts`: normalization, tailor helpers, types, API base
- `docs/`: this guide (rendered by `site/`)

## Add a template

Add `backend/app/templates/<id>.tex.j2` (Jinja with `<% %>` blocks, `<< >>` variables, `<# #>` comments) and an entry in `TEMPLATES` in `backend/app/resume.py`. Respect each project's `hidden` flag. Compile it with Tectonic before opening a PR.

## Branches and PRs

1. Branch from `main` (existing branches use prefixes like `perf/` and `claude/`).
2. Keep changes focused. Do not reformat unrelated lines.
3. Commit messages in this repo follow `feat:`, `fix:`, `refactor:` prefixes.
4. In the PR, say what changed and what you ran to check it.

## Docs

Docs must match the code on `main`. If you change a default, port, env var or UI label, update the matching page in `docs/`. Do not add claims about metrics or results you have not measured.

## Never commit

API keys, tokens or `.env` files.
