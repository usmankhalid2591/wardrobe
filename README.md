# The Wardrobe

A private, mobile-responsive wardrobe manager with an AI stylist. Your data
syncs across phone and laptop. Everything below runs on free tiers.

- **Frontend:** React + Vite
- **Backend:** Supabase (Postgres, file storage, email/password auth) — free tier
- **AI:** Google Gemini (free tier), called through a Netlify serverless function
- **Hosting:** Netlify — free tier

---

## What you'll set up (about 20 minutes, one time)

1. A Supabase project (database + photo storage + login)
2. A Google Gemini API key (for the stylist)
3. A Netlify deploy (the live website)

You do **not** need a paid plan for any of these.

---

## Step 1 — Supabase

1. Go to https://supabase.com, sign up, and create a new project.
   Pick any name and a database password (save it somewhere).
2. When the project is ready, open **SQL Editor → New query**.
3. Paste the entire contents of `supabase-schema.sql` and click **Run**.
   This creates the `items` table, security rules, and the `item-photos`
   storage bucket.
4. Open **Project Settings → API**. Copy two values for later:
   - **Project URL**  (e.g. `https://abcd1234.supabase.co`)
   - **anon public** key

> Note on photos: the SQL tries to create the storage bucket automatically.
> If you see an error about the bucket, just go to **Storage → New bucket**,
> name it exactly `item-photos`, tick **Public**, create it, then re-run the
> `storage.objects` policy lines from the bottom of `supabase-schema.sql`.

---

## Step 2 — Gemini API key

1. Go to https://aistudio.google.com/apikey
2. Click **Create API key** (free). Copy it.

---

## Step 3 — Put the code on GitHub

1. Create a new repository on GitHub.
2. Upload this whole folder to it (or use git push).

---

## Step 4 — Deploy on Netlify

1. Go to https://netlify.com, sign up, **Add new site → Import an existing project**.
2. Connect your GitHub repo. Netlify reads `netlify.toml` automatically, so
   build command (`npm run build`) and publish folder (`dist`) are pre-filled.
3. Before the first deploy, open **Site configuration → Environment variables**
   and add three:

   | Key | Value |
   |-----|-------|
   | `VITE_SUPABASE_URL` | your Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon public key |
   | `GEMINI_API_KEY` | your Gemini key |

4. Click **Deploy**. When it finishes you get a live URL like
   `https://your-wardrobe.netlify.app`.

---

## Step 5 — First sign-in & load your wardrobe

1. Open your live URL, click **Create one**, and sign up with email + password.

   > Supabase may require email confirmation by default. To skip that for a
   > personal app: Supabase → **Authentication → Providers → Email** and turn
   > **Confirm email** off. Then sign up.

2. **Optional — load your existing ~96 pieces instead of typing them:**
   - In Supabase SQL Editor run: `select id, email from auth.users;`
   - Copy your `id`.
   - Open `seed-wardrobe.sql`, replace `YOUR_USER_ID_HERE` with that id, paste
     the whole file into the SQL Editor, and **Run**.
   - Refresh the app — every piece is there.

That's it. Add, edit, delete pieces with photos; open the **Stylist** tab,
type any occasion, and it dresses you from your own wardrobe.

---

## Running locally (optional)

```bash
npm install
cp .env.example .env   # fill in your values
npm run dev
```

Note: the AI stylist calls a Netlify function, which only runs on the deployed
site (or via `netlify dev` if you install the Netlify CLI). Everything else
works locally.

---

## Where things live

```
src/
  App.jsx                      auth gate, tabs, data loading
  components/
    Auth.jsx                   login / signup
    ItemList.jsx               search + cards + delete
    ItemForm.jsx               add / edit + photo upload
    OutfitGenerator.jsx        the stylist tab
  lib/supabase.js              database client
netlify/functions/
  generate-outfit.js           server-side Gemini call (hides your key)
supabase-schema.sql            run once to set up the database
seed-wardrobe.sql              your existing pieces, ready to import
```

## Cost

Free, within these limits: Supabase free tier (500MB database, 1GB file
storage, 50k monthly active users), Gemini free tier (generous daily request
limit), Netlify free tier (100GB bandwidth/month). A personal wardrobe stays
far inside all of these.
