# Streex Tracker

Streex is a Vite + React app connected to Supabase.

## Preview Deployments

This repo is ready for Vercel preview deployments.

Use these settings when importing the GitHub repo into Vercel:

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

Required environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Vercel should enable preview deployments for pull requests automatically after the repo is connected. The `vercel.json` file keeps app routes working when a user opens a nested URL directly.
