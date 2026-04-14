# 🍱 Ghop-Ghop-Ghop — Personal Macro Tracker

A cute, full-stack personal macro & calorie tracking web app. Built with Node.js + Express + SQLite on the backend, and plain HTML/CSS/JS on the frontend. Installable on your phone as a PWA.

---

## ✨ Features

- 📊 **Daily dashboard** — calorie ring, macro progress bars
- 📅 **Date navigation** — browse any past day with ◀ ▶
- 📋 **History tab** — see last 14 days with macro breakdowns
- ➕ **Add meals** from your personal menu (searchable)
- ✕ **Delete meals** by tapping the × on any logged item
- 💾 **Persistent SQLite database** — data survives server restarts
- 📱 **PWA** — installable on iPhone/Android home screen

---

## 🏃 Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in browser
open http://localhost:3000
```

For live-reload during development:
```bash
npm run dev
```

---

## 🚀 Deploy to Render.com (Free, Permanent URL)

This is the easiest way to get a live URL you can open on your phone forever.

### Step 1 — Push to GitHub

```bash
# In the project folder:
git init
git add .
git commit -m "🍱 Initial commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/nomnomacros.git
git branch -M main
git push -u origin main
```

### Step 2 — Deploy on Render

1. Go to **https://dashboard.render.com** → Sign up (free)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account → select the `nomnomacros` repo
4. Render reads `render.yaml` automatically — everything is pre-filled
5. Click **"Create Web Service"**
6. Wait ~2 minutes for the build to finish
7. Your app is live at `https://nomnomacros.onrender.com` 🎉

### Step 3 — Install on your phone

**iPhone (Safari):**
1. Open your Render URL in Safari
2. Tap the Share button → "Add to Home Screen"
3. Tap "Add" — it installs like a native app!

**Android (Chrome):**
1. Open your Render URL in Chrome
2. Tap the menu → "Add to Home Screen"
3. Tap "Add"

> **Note:** Render free tier sleeps after 15 min of inactivity. First load after sleep takes ~30 seconds. Totally normal.

---

## 🗂️ Project Structure

```
nomnomacros/
├── server/
│   ├── index.js          ← Express server
│   ├── db.js             ← SQLite setup & queries
│   └── routes/
│       └── meals.js      ← REST API routes
├── public/
│   ├── index.html        ← Full frontend (HTML+CSS+JS)
│   └── manifest.json     ← PWA manifest
├── data/                 ← Auto-created; holds macros.db
├── package.json
├── render.yaml           ← Render.com deploy config
└── .gitignore
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meals?date=YYYY-MM-DD` | All meals for a date |
| GET | `/api/summary?date=YYYY-MM-DD` | Macro totals for a date |
| GET | `/api/history?limit=14` | Last N days with data |
| POST | `/api/meals` | Log a meal (body: meal object) |
| DELETE | `/api/meals/:id` | Remove a meal by ID |

---

## 🍽️ Adding More Menu Items

Edit the `menuList` array at the top of `public/index.html`:

```js
{ name: "Your Meal Name", emoji: "🍜", category: "Lunch", kcal: 500, protein: 20, carbs: 60, fats: 15 },
```

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express
- **Database:** SQLite via `better-sqlite3`
- **Frontend:** Vanilla HTML/CSS/JS, Google Fonts
- **Hosting:** Render.com
