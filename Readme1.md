# TriageLens — AI Emergency Triage Dashboard

AI-powered emergency department triage using Claude and the ESI 5-level system.

## Deploy to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create triagelens --public --push
```

### 2. Deploy on Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your `triagelens` GitHub repo
3. Vercel auto-detects the Vite config — no changes needed
4. Add the environment variable:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** your `sk-ant-...` key
5. Click **Deploy**

### 3. Done
Your app is live at `https://triagelens.vercel.app` (or whatever Vercel assigns).

The `/api/claude` serverless function proxies all AI requests — your API key stays server-side, never exposed to browsers.

## Local Development
```bash
npm install

# Create .env file with your key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# Run with Vercel dev (needed for /api routes)
npx vercel dev
```

## Architecture
- **Frontend:** React + Vite + Recharts + Lucide icons
- **Backend:** Single Vercel serverless function (`/api/claude.js`)
- **AI:** Claude Sonnet via Anthropic Messages API
