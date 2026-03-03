# FamilyFlights — Setup Guide

This guide walks you through deploying FamilyFlights for your family. No technical experience required — just follow each step in order.

---

## What You'll Need

- A computer with a web browser (Chrome or Firefox recommended)
- About 30–45 minutes
- A credit card (for Vercel — free tier is sufficient, no charge)

You will create accounts on three free services:

1. **Supabase** — stores your flight data and handles login
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

## Step 2 — Set up the database

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase/migrations/001_initial.sql` from this project (use a text editor like Notepad)
4. Copy all the text and paste it into the SQL Editor
5. Click **Run**
6. You should see "Success" — the database tables are now created

---

## Step 3 — Create the storage bucket for PDF tickets

1. In Supabase, click **Storage** in the left sidebar
2. Click **New bucket**
3. Name it exactly: `tickets`
4. Make sure **Public bucket** is turned **OFF** (private)
5. Click **Save**

---

## Step 4 — Get your Supabase API keys

1. In Supabase, click **Settings** → **API**
2. You'll see two values — copy both and save them:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon/public key** (a long string starting with `eyJ...`)

---

## Step 5 — Get an Anthropic API key

This powers the AI that reads your flight booking PDFs.

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Click **API Keys** → **Create Key**
4. Give it a name like `family-flights`
5. Copy the key (it starts with `sk-ant-...`) — **you can only see it once**
6. You'll need to add some credits (minimum $5) under **Billing** for the PDF feature to work

---

## Step 6 — (Optional) Get an AviationStack API key

This lets you look up flight times by flight number when adding flights manually.

1. Go to [aviationstack.com](https://aviationstack.com)
2. Click **Sign Up Free**
3. Copy your API key from the dashboard
4. The free plan gives 100 lookups/month — plenty for family use

If you skip this, you can still add flights manually by entering all details yourself.

---

## Step 7 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account
   - If you don't have GitHub, create a free account at [github.com](https://github.com) first
2. Fork or upload this project to your GitHub account:
   - Click the **+** button → **New repository** → upload the project files
3. In Vercel, click **Add New Project** → import your GitHub repository
4. Before clicking Deploy, click **Environment Variables** and add these four variables:

| Variable name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase Project URL from Step 4 |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key from Step 4 |
| `VITE_ANTHROPIC_API_KEY` | Your Anthropic key from Step 5 |
| `VITE_AVIATIONSTACK_API_KEY` | Your AviationStack key from Step 6 (optional) |

5. Click **Deploy**
6. Wait about 2 minutes — Vercel will give you a URL like `https://family-flights-xxx.vercel.app`

---

## Step 8 — Create the first account (Group Admin)

1. Open your Vercel URL in a browser
2. Click **Sign up**
3. Enter your email and a password
4. Enter your name, choose a colour, and give your family group a name (e.g. "The Sharma Family")
5. Click **Create account**
6. You are now the Group Admin

---

## Step 9 — Invite family members

1. Log in and go to the **Profile** tab (bottom right)
2. Tap **Manage Family**
3. Copy the **Family invite link**
4. Send it to your family members via WhatsApp or email

When a family member opens the link, they'll be asked to create an account and will automatically join your family group.

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

### Adding a flight

**From a booking PDF (recommended):**
1. Tap the **+** button on the Home or My Flights screen
2. Choose **Upload booking PDF**
3. Select your airline booking confirmation PDF
4. Wait 10–20 seconds — the AI reads the PDF and fills in all the details
5. Review the details, correct anything if needed, and tap **Save flight**

For multi-leg bookings (e.g. BOM → DXB → LHR), all legs will be detected and you'll save them one by one.

**Manually:**
1. Tap the **+** button
2. Choose **Enter manually**
3. Fill in the flight number and date, then optionally tap **Auto-fill from flight number** to look up times
4. Fill in any remaining details and tap **Save flight**

### Viewing flights offline

Once flights have been loaded, they're available offline automatically. You can browse all flights, including family members' flights, without a connection.

For PDF tickets: open the flight detail and tap **View Ticket** while connected — the PDF is saved to your device and available offline from then on.

---

## Troubleshooting

**"Missing Supabase environment variables" error:**
Make sure you added the environment variables in Vercel before deploying. Go to Vercel → your project → Settings → Environment Variables, add them, then redeploy.

**PDF upload doesn't work:**
Make sure your Anthropic API key is correct and you have billing credits added. The free tier requires adding a payment method.

**Can't see family members' flights:**
All members must be in the same family group (joined via the invite link). Check Profile → Manage Family to see who is in the group.

**Flight times look wrong:**
Times are displayed in the local timezone of each airport. If a flight shows a time that seems off, check that the IATA airport codes are correct (3-letter codes like BOM, DXB, LHR).

---

## PWA Icons

The default icons are placeholders. To generate proper icons from the included SVG:

1. Install ImageMagick: [imagemagick.org/script/download.php](https://imagemagick.org/script/download.php)
2. Run: `node scripts/generate-icons.mjs`
3. Commit and push — Vercel will redeploy automatically

Or use any online SVG-to-PNG converter with the file `public/icons/icon.svg`.

---

## Security notes

- Your Anthropic API key is included in the browser bundle (this is required for direct PDF parsing). For a more secure setup, consider creating a backend proxy.
- The app uses Supabase Row Level Security — family members can only see flights within their own group.
- Ticket PDFs are stored privately and only accessible to authenticated members of your group.
