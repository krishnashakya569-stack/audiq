# AudiQ Deployment

## Target setup

- Frontend: Vercel
- Backend API: Render
- Database/Auth: Supabase
- Domain: `www.audiq.online`
- Source control: GitHub

## Vercel

Create a Vercel project from the GitHub repo.

Settings:

- Framework: Next.js
- Root directory: repository root
- Install command: `npm install`
- Build command: `npm run build --workspace=web`
- Output directory: `apps/web/.next`

Environment variables:

- `NEXT_PUBLIC_API_URL=https://YOUR_RENDER_API_URL/api`
- `NEXT_PUBLIC_SUPABASE_URL=https://YOUR_SUPABASE_PROJECT.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY`

Add custom domain:

- `www.audiq.online`

## Render

Create a Blueprint from `render.yaml` or create a Web Service manually.

Settings:

- Root directory: `backend/api`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/`

Environment variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-4o-mini`
- `API_PUBLIC_URL=https://YOUR_RENDER_API_URL`
- `AUDIUS_APP_NAME=Audiq`
- `YOUTUBE_API_KEY` if using YouTube search

## Supabase

Create a Supabase project, then run the SQL in:

- `supabase/migrations/202607020001_audiq_social.sql`

This creates profiles, friendships, and chat messages tables for the next backend-backed social phase.

## Hostinger DNS

For Vercel frontend on `www.audiq.online`:

- `CNAME` `www` -> `cname.vercel-dns.com`

For apex redirect or Vercel apex hosting:

- `A` `@` -> `76.76.21.21`

Your screenshot currently shows:

- `CNAME www -> audiq.online`
- `A @ -> 2.57.91.91`

Those should be replaced when Vercel confirms the domain.

## GitHub

Create a GitHub repo, then from the project root:

```bash
git remote add origin https://github.com/YOUR_USERNAME/audiq.git
git add .
git commit -m "Prepare AudiQ deployment"
git push -u origin main
```
