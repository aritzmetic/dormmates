# 🏠 DormMates

**Punch in and out, fix missed days, and split the bills by who was actually home.**

DormMates is a mobile-first Progressive Web App (PWA) for people who share a dorm, apartment or house. Each person times in and out of the space, the app adds up everyone's hours per billing cycle, and the host splits the electric and water bills fairly based on those hours.

Built with **React + Vite**, **Firebase** (Auth, Firestore, Cloud Messaging) and **Vercel** serverless functions.

---

## ✨ Features

### ⏱ Time tracking
- One-tap **Time in / Time out** with proof: a picture or your location.
- Live **"Who's home"** board showing every dormmate's status and proof.
- **Auto time-in at 8:00 PM** if you don't confirm you're still away between 7:30 and 8:00 PM.
- Cycle **leaderboard** and per-cycle hours (the cycle start day is set by the host).

### 📊 History
- Daily hours chart. **Everyone** shows the *average hours per member*; tap a name to see that person on their own.
- Full list of logged sessions, with proof and approved fixes marked.

### 📝 Fixes
- Request a fix for any day: **edit** a session, add **time in + out**, **time in only**, or **time out only**. The default range is 12:00 AM to 11:59 PM.
- Multi-day requests are split into one request per day, so each day can be approved or denied on its own.
- Host controls: approve or deny, undo a decision, set a fix deadline per cycle, limit how far back members can go.
- **Counter-check (host):** view any member's punches (with photo or location proof) and **suggest** a time in/out. The member must **accept** the suggestion before it changes their hours.

### 💡 Bills
- The host enters the electric and water bills, a base contribution (%) and who pays the base. The rest is split by actual hours.
- **Draft → verify → send:** *Save draft & calculate* is private to the host. Dormmates only see the bills (and get notified) after the host taps **Send to dormmates**.
- Mark paid, remind unpaid members, finalize the cycle (locks hours), CSV export.
- **PDF receipts** for every member showing exactly how their share was computed.

### 🔔 Notifications
- Push notifications for punches, notice-board posts, announcements, bills, receipts, fix requests and decisions, and fix suggestions.
- **Custom reminders**: a time-in and a time-out reminder at times you choose, on the days you choose, plus an optional "still timed in after N hours" alert.
- Saving reminders sends a confirmation push. Settings has **Send a test**, **Test a push from the server**, and a status line showing whether the reminder timer is running.

### 🎨 Everything else
- **Light, Dark and System** themes.
- **How-To guide:** a page-by-page tour shown once to every user (new or existing) until they confirm they understood. It can be replayed from *Settings → Help*.
- Notice board, host announcements, multiple spaces, invite codes, host transfer, CSV export of hours and requests.
- Installs to the home screen like a native app.

---

## 🧱 Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite 5, Framer Motion |
| Auth / Database | Firebase Authentication (Google), Cloud Firestore |
| Push | Firebase Cloud Messaging (web push) + service worker |
| Server | Vercel serverless functions in `/api` (using `firebase-admin`) |
| PDFs | jsPDF |

---

## 📁 Project structure

```
dormmates/
├── api/                    # Vercel serverless functions
│   ├── _lib.js             # firebase-admin setup + push helper
│   ├── notify.js           # sends push after an action in the app
│   ├── tick.js             # called every 5 min: reminders, due dates, heartbeat
│   ├── remind.js           # 7:30 / 7:55 PM "confirm you are away" push
│   └── ping.js             # health check
├── functions/              # optional Cloud Functions alternative to /api
├── public/                 # service worker (sw.js), icons, manifest
├── src/
│   ├── App.jsx             # main app: Home, Dorm, History, Bills, shell
│   ├── Fixes.jsx           # fix requests, counter-check, suggestions
│   ├── Settings.jsx        # space, rules, reminders, appearance, help
│   ├── Tour.jsx            # How-To guide
│   ├── ReceiptView.jsx     # in-app receipt viewer
│   ├── receipt.js          # PDF receipt generator
│   ├── lib.js              # hours, cycles, bill-split maths
│   ├── theme.js            # light / dark / system theme
│   ├── push.js, notify.js  # push registration + server calls
│   ├── firebase.js, ui.jsx, main.jsx, styles.css
├── firestore.rules         # Firestore security rules
├── index.html
└── package.json
```

---

## 🚀 Getting started

### 1. Prerequisites
- Node.js 18+ and npm
- A Firebase project
- (For deployment) a Vercel account

### 2. Install
```bash
git clone https://github.com/<your-username>/dormmates.git
cd dormmates
npm install
```

### 3. Firebase setup
1. Create a Firebase project and add a **Web app**.
2. **Authentication** → enable the **Google** provider. Add your deployed domain under *Authorized domains*.
3. **Firestore** → create a database → *Rules* → paste the contents of `firestore.rules` → **Publish**.
4. **Cloud Messaging** → *Web configuration* → generate a **Web Push key pair** (the VAPID key).
5. **Project settings → Service accounts** → generate a private key (a JSON file) for the server functions.

### 4. Environment variables
Create a `.env` file in the project root:

```env
VITE_FB_API_KEY=
VITE_FB_AUTH_DOMAIN=
VITE_FB_PROJECT_ID=
VITE_FB_APP_ID=
VITE_FB_SENDER_ID=
VITE_FB_VAPID_KEY=
```

Server-side variables (set these in **Vercel → Project Settings → Environment Variables**, not in `.env`):

| Variable | Purpose |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | The service-account JSON (as a single line of text) |
| `CRON_SECRET` | Any long random string; protects `/api/tick` and `/api/remind` |

### 5. Run locally
```bash
npm run dev
```
Push notifications and the `/api` routes only work when deployed (or when using `vercel dev`).

### 6. Deploy to Vercel
Push to GitHub, import the repo in Vercel (Vite is auto-detected), add all the environment variables above, then deploy.

### 7. Install on your phone
Open the deployed URL → browser menu → **Add to Home Screen**. On iPhone, notifications only work from the Home Screen icon.

---

## ⏰ Setting up reminders

Custom reminders are sent by the server, so something has to call `/api/tick` regularly. Vercel's free plan only allows daily cron jobs, so use a free external timer such as [cron-job.org](https://cron-job.org):

1. **Every 5 minutes** → `https://YOUR-APP.vercel.app/api/tick?key=YOUR_CRON_SECRET`
2. **7:30 PM and 7:55 PM (Asia/Manila)** → `https://YOUR-APP.vercel.app/api/remind?key=YOUR_CRON_SECRET`

Then in the app: *Settings → Notifications & reminders* → turn on notifications → **Save reminders** (you should get a "Reminders set" notification) → **Test a push from the server**. The same screen warns you if the timer isn't running.

> While the app is open, reminders also fire on the phone itself as a backup. Reminders for a closed app need the timer above.

---

## 📐 How it works

- **Cycle:** starts on the day set by the host (default the 14th) and ends the day before the next one.
- **Hours:** paired in/out punches plus approved fixes, with overlaps merged.
- **Bill split:** the base contribution % is split equally among the chosen "fixed" members; the rest is split by each person's share of total hours. Cents are allocated so shares add up exactly to the bill.
- **Due date:** by default the 5th after the cycle ends (configurable in *Settings → Bill defaults*).
- **Every fix is one day:** a multi-day request is saved as one document per day, so approving, denying or editing one day never touches another.

---

## 🔒 Security notes

- All access is enforced by `firestore.rules`: only members can read a space; only the host can approve fixes, edit bills and delete data.
- Bill drafts live in a host-only `billDrafts` collection, so members can't read them until the host sends them.
- A host's fix suggestion only changes a member's hours after that member accepts it. The rules let the member change only the decision fields.
- Server routes verify the caller's Firebase ID token and re-read the saved document before sending any push, so a client can't trigger arbitrary notifications.
- Never commit `.env` or your service-account JSON.

---

## 🛠 Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build |

---

## 🔄 Updating

After pulling updates, always re-publish `firestore.rules` in the Firebase console. New features such as bill drafts and fix suggestions need the newer rules. To show the How-To guide to everyone again, bump `TOUR_V` in `src/Tour.jsx`.

---

## 📄 License

Add a license of your choice (for example MIT) before making the repository public.
