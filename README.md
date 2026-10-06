# DormMates (React + Vite PWA)

## Run locally
```
npm install
cp .env.example .env   # fill in your Firebase web config
npm run dev
```

## Firebase
1. Create a project, add a **Web app**, copy its config values into `.env`.
2. Authentication → enable **Google**. Add your Vercel domain under Authorized domains.
3. Firestore → create database → Rules → paste `firestore.rules` → Publish.

## Deploy to Vercel
Push to GitHub → import in Vercel (Vite is auto-detected). Add the four `VITE_FB_*` variables under Project Settings → Environment Variables, then redeploy.

## Install on phone
Open the Vercel URL → browser menu → **Add to Home Screen**. It runs full-screen like a native app.

## Rules of the app
- Cycle: 14th of previous month → 13th of current month.
- Hours = paired in/out punches + approved fixes (overlaps merged).
- Bills split by each person's share of total hours; due on the 5th after the cycle ends.
