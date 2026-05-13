# YoutubePremium Dashboard

Admin dashboard built with React + Vite + Supabase.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Required environment variables

Create `.env` from `.env.example`:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

If deploying under a subpath (for example GitHub Pages), add:

```bash
VITE_BASE_PATH=/YoutubePremium/
```

## Deploy notes

- Project root for deployment must be `YoutubePremium/` (not repo root).
- Build command: `npm run build`
- Output directory: `dist`
- Node.js: use LTS 20+

## GitHub Pages (auto deploy)

- Workflow file: `.github/workflows/deploy-pages.yml`
- Required repository secrets:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
