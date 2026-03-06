# FamilyFlights — Setup Guide

This guide walks you through deploying FamilyFlights for your family. No technical experience required — just follow each step in order.

---

## Keeping the App Up to Date

When a new version of the app is deployed, a banner will appear at the bottom of the screen the next time you open the app. Tap **"Update now"** to reload with the latest version instantly.

If you ever see the app behaving strangely, close it fully (swipe it away from your app switcher) and reopen it. This clears any temporary state and loads fresh.

---

## What You'll Need

- A computer with a web browser (Chrome or Firefox recommended)
- About 20–30 minutes

You will create accounts on three free services:

1. **Supabase** — stores your flight data and PDF tickets
2. **Anthropic** — powers the AI that reads your booking PDFs
3. **Vercel** — hosts the app on the internet

---

## Step 1 — Create a Supabase account

1. Go to [supabase.com](https://supabase.com) and click **Start your project**
2. Sign up with your Google account or email
3. Click **New project**
4. Fill in:
   - **Name**: `family-flights` (or anything you like)
   - **Database password**: choose a strong password and save it somewhere safe
   - **Region**: pick the one closest to you
5. Click **Create new project** and wait about 2 minutes for it to set up

---

## Step 2 — Enable Anonymous Auth (required for PDF storage)

FamilyFlights uses Supabase anonymous sessions to upload and download PDF tickets securely.

1. In your Supabase project, click **Authentication** in the left sidebar
2. Click **Providers**
3. Find **Anonymous sign-ins** and toggle it **ON**
4. Click **Save**

---

## Step 3 — Set up the database

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase/migrations/001_initial.sql` from this project (use a text editor like Notepad)
4. Copy all the text and paste it into the SQL Editor
5. Click **Run**
6. You should see "Success" — the database tables are now created

---

## Step 4 — Create the storage bucket for PDF tickets

1. In Supabase, click **Storage** in the left sidebar
2. Click **New bucket**
3. Name it exactly: `tickets`
4. Make sure **Public bucket** is turned **OFF** (private)
5. Click **Save**

---

## Step 5 — Get your Supabase API keys

1. In Supabase, click **Settings** → **API**
2. You'll see two values — copy both and save them:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon/public key** (a long string starting with `eyJ...`)

---

## Step 6 — Get an Anthropic API key

This powers the AI that reads your flight booking PDFs.

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Click **API Keys** → **Create Key**
4. Give it a name like `family-flights`
5. Copy the key (it starts with `sk-ant-...`) — **you can only see it once**
6. You'll need to add some credits (minimum $5) under **Billing** for the PDF feature to work

---

## Step 7 — (Optional) Get an AviationStack API key

This lets you look up flight times by flight number when adding flights manually.

1. Go to [aviationstack.com](https://aviationstack.com)
2. Click **Sign Up Free**
3. Copy your API key from the dashboard
4. The free plan gives 100 lookups/month — plenty for family use

If you skip this, you can still add flights manually by entering all details yourself.

---

## Step 8 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account
   - If you don't have GitHub, create a free account at [github.com](https://github.com) first
2. Fork or upload this project to your GitHub account
3. In Vercel, click **Add New Project** → import your GitHub repository
4. Before clicking Deploy, click **Environment Variables** and add these variables:

| Variable name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase Project URL from Step 5 |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key from Step 5 |
| `VITE_ANTHROPIC_API_KEY` | Your Anthropic key from Step 6 |
| `VITE_AVIATIONSTACK_API_KEY` | Your AviationStack key from Step 7 (optional) |
| `VITE_APP_PASSWORD` | The site password your family will use (default: `Axis@149`) |

5. Click **Deploy**
6. Wait about 2 minutes — Vercel will give you a URL like `https://family-flights-xxx.vercel.app`

---

## Step 9 — Share with your family

1. Open your Vercel URL and enter the site password (default: `Axis@149`, or whatever you set)
2. You'll see the family member picker — tap your name to see your flights
3. Share the URL and password with your family members

The **Admin** member is the only one who can add, edit, or delete flights.

---

## Step 10 — Install on phones (optional but recommended)

**iPhone (iOS Safari):**
1. Open the app URL in Safari
2. Tap the **Share** button (the square with an arrow)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add**

**Android (Chrome):**
1. Open the app URL in Chrome
2. Tap the **three dots** menu in the top right
3. Tap **Add to Home screen**
4. Tap **Add**

The app will now appear on the home screen like a regular app and works offline.

---

## How to use the app

### Adding a flight (Admin only)

**From a booking PDF (recommended):**
1. Tap your profile (Admin) on the home screen
2. Tap the **+** button in the top right
3. Choose **Upload booking PDF**
4. Select your airline booking confirmation PDF
5. Wait 10–20 seconds — the AI reads the PDF and fills in all the details
6. Choose which family member the flight belongs to
7. Review the details and tap **Save flight**

For multi-leg bookings (e.g. BOM → DXB → LHR), all legs will be detected and you'll save them one by one.

**Manually:**
1. Tap **+** → **Enter manually**
2. Fill in the flight number and date, then optionally tap **Auto-fill from flight number**
3. Fill in remaining details and tap **Save flight**

### Viewing flights offline

Once flights have been loaded, they're available offline automatically. For PDF tickets: open the flight detail and tap **View Ticket** while connected — the PDF is saved to your device.

---

## Troubleshooting

**"Missing Supabase environment variables" error:**
Make sure you added the environment variables in Vercel before deploying.

**PDF upload doesn't work:**
Make sure your Anthropic API key is correct and you have billing credits. Also check that Anonymous sign-ins are enabled in Supabase Auth settings.

**Flight times look wrong:**
Times are displayed in the local timezone of each airport. Check that the IATA airport codes are correct (3-letter codes like BOM, DXB, LHR).

---

## PWA Icons

The default icons are placeholders. To generate proper icons:

1. Install ImageMagick: [imagemagick.org/script/download.php](https://imagemagick.org/script/download.php)
2. Run: `node scripts/generate-icons.mjs`
3. Commit and push — Vercel will redeploy automatically

---

## Security notes

- The app is protected by a single site password shared among all family members.
- Your Anthropic API key is included in the browser bundle (required for direct PDF parsing). For production, consider a backend proxy.
- PDF tickets are stored privately in Supabase Storage and only accessible via authenticated (anonymous) sessions.
- Row Level Security is enabled on the database, allowing access only via valid Supabase sessions.
