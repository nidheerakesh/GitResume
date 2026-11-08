# GitResume frontend

React 19 + TypeScript app built with Vite. It talks to the FastAPI backend in `../backend`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:5173 |
| `npm run build` | Type-check (`tsc -b`) and produce `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | ESLint |

## Layout

- `src/App.tsx` owns app state, API calls, and the page layout.
- `src/components/` holds the login card, portal (source cards, repo curation, saved versions), editor tabs, resume preview, modals, and career coach chat.
- `src/api.ts` sets the backend base URL. `VITE_API_BASE_URL` overrides the default.
- `src/resumeUtils.ts` normalizes AI output and applies accepted tailoring suggestions.
- `src/index.css` holds design tokens, base styles, and the print rules for the resume preview. `src/components.css` holds component styles.

## Print rules

The resume preview is the only thing that prints. The `@media print` block in `src/index.css` hides the editor, navbar, and buttons. Keep `.preview-panel` as the last child of `.dashboard-grid`, because the print rules depend on that.
