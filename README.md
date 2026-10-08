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
- Cycle: starts on the day set in Settings → Space (default 14th) and ends the day before the next one.
- Hours = paired in/out punches + approved fixes (overlaps merged).
- Bills split by each person's share of total hours; due on the 5th after the cycle ends (Settings → Bill defaults).

## Fixing hours (Fixes tab)
Tap a day, then pick one of four options:
1. **Edit** – change one session's time in / time out for that day.
2. **Time in + out** – add a full session. A range over several days is split automatically:
   first day = start → 11:59 PM, middle days = 12:00 AM → 11:59 PM, last day = 12:00 AM → end.
3. **Time in only** – you forgot to time in. Counts until your next time out.
4. **Time out only** – you forgot to time out. Ends your open session at that time.

**Every day is its own request.** A multi-day request is saved as one document per day (linked by a `batch` id), so the host can approve, deny
or undo one day without touching the others, and editing one day later never changes its neighbours. The host also gets *Approve all / Deny all*
and a *Review day by day* list. Use the **Everyone / person** and **status** chips to filter the request list.

## Settings tab
One place for everything, grouped: **Space** (name, cycle day, invite code, members, host transfer) · **Fix request rules** · **Bill defaults** ·
**Notifications & reminders** · **Host tools** (broadcast) · **Export data** (CSV) · **Account**. Members can see the space-level sections; only the host can change them.
These are stored on the space document under `cfg` (`hostAuto`, `needReason`, `fixBackDays`, `fixMaxDays`, `basePct`, `fixedIds`, `dueDay`).

## After updating
Publish the new `firestore.rules` (the host's own fixes can now be created already-approved, and request `kind` is validated).
Old fix requests keep working exactly as before.

## Reminders (important)
Custom reminders are sent by the server, so something must call `/api/tick` every 5 minutes (Vercel Hobby cron is only daily, so use a free outside timer):
1. Vercel → Settings → Environment Variables: add `CRON_SECRET` (any long random text) and `FIREBASE_SERVICE_ACCOUNT` (service-account JSON), redeploy.
2. cron-job.org → new job → URL `https://YOUR-APP.vercel.app/api/tick?key=YOUR_CRON_SECRET` → every 5 minutes.
3. A second job at 7:30 PM and 7:55 PM Asia/Manila → `https://YOUR-APP.vercel.app/api/remind?key=YOUR_CRON_SECRET`.
4. In the app: Settings → Notifications & reminders → *Save reminders* (you get a "Reminders set" notification), then *Test a push from the server*. The same screen tells you if the timer has stopped running.
While the app is open, reminders also fire on the phone itself as a backup.

## Bills flow
*Save draft & calculate* is private to the host (`billDrafts`). Dormmates only see the bills and get notified after the host taps *Send to dormmates*.

## Fix suggestions
In Fixes, the host picks a member under *Counter-check*, reviews their punches (with photo / location proof), and can suggest a time in / out. The member must accept it before it counts.

## How-To guide
Shown once to every user until they confirm (`prefs/{uid}.tourV`). Replay it from Settings → Help. Change `TOUR_V` in `src/Tour.jsx` to show it to everyone again.
