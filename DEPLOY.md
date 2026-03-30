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

Also add (if you use the Netlify function):
- `ANTHROPIC_API_KEY`

After adding/changing any env vars:
- Netlify → **Deploys** → **Trigger deploy**

### 5) Quick verification after deploy
- Open the live site
- In browser console you should see Firebase load logs
- Essentials and Brain Points behaviors should match the latest code

