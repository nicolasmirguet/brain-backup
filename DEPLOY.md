## Brain Backup — deploy checklist (Netlify + Firebase)

### 1) Make a code change
- Edit the app in `src/`

### 2) Push to GitHub (Netlify will auto-build)
From repo root: `brain-updated/`

```powershell
git add .
git commit -m "Describe change"
git push
```

If Netlify is connected to your GitHub repo and set to deploy from `main`, the new push should publish automatically.

### 3) Netlify one-time setup (after first import)
1. Netlify → **Add new site** → **Import an existing project** → **GitHub**
2. Choose repo: `nicolasmirguet/brain-backup`
3. Build command: `npm run build`
4. Publish directory: `dist`

### 4) Netlify environment variables (required for Firebase)
Netlify → Site settings → **Environment variables**

Add these variables (names must match exactly):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Source of truth for values:
- Firebase Console → Project settings → **Your apps** → **Web app** (`</>`) → `firebaseConfig`

Also add (for Brain Dump / AI advisor / History wrap-up):
- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/apikey) (server-only; never `V_*` prefix)
- Optional: `GEMINI_MODEL` — defaults to `gemini-2.0-flash` if unset (see comment in `netlify/functions/gemini.js`)

Brain Dump **email** uses your device’s default mail app (`mailto`) — no SendGrid needed.

After adding/changing any env vars:
- Netlify → **Deploys** → **Trigger deploy**

### 5) Firebase Authentication & Firestore rules (multi-user)
1. Firebase Console → **Authentication** → enable **Email/Password**.
2. Firestore → **Rules** — use a pattern like [`firestore.rules.example`](firestore.rules.example): users may read/write only under `users/{theirUid}/**`, and may **read** legacy `userdata/*` once for migration.

### 6) Quick verification after deploy
- Open the live site
- In browser console you should see Firebase load logs
- Essentials and Brain Points behaviors should match the latest code

