<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f271cec2-4266-4924-8594-d3af0476234e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` (get a key at [Google AI Studio](https://aistudio.google.com/apikey)). Do not commit `.env.local`.
3. **With AI features:** run `npm run dev:netlify` — this starts Vite and Netlify Functions so `/api/gemini` works.
4. **UI only (no AI):** run `npm run dev` — AI buttons will fail until you use step 3 or deploy to Netlify with `GEMINI_API_KEY` set.
