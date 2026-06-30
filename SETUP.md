# RiderLink — Setup Guide

RiderLink is a concert touring rider management platform. It lets you upload artist riders, manage show details, and send official rider links directly to venue buyers via email and SMS.

---

## What You'll Need

| Service | Cost | Purpose |
|--------|------|---------|
| [Vercel](https://vercel.com) | Free | Hosting |
| [Supabase](https://supabase.com) | Free | Database |
| [Resend](https://resend.com) | Free tier | Email delivery |
| [Twilio](https://twilio.com) | ~$1/mo | SMS (optional) |

---

## Step 1 — Fork & Deploy to Vercel

1. Click **Fork** on this repo (top right of GitHub)
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your fork
3. Click **Deploy** (it'll fail — that's expected, you need env vars first)

---

## Step 2 — Set Up Supabase

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it anything (e.g. `riderlink`)
3. Go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`
4. Go to **SQL Editor** and run this to create your tables:

```sql
-- Shows
CREATE TABLE IF NOT EXISTS shows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist TEXT NOT NULL,
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT DEFAULT 'draft',
  buyer_name TEXT,
  buyer_email TEXT,
  rider_pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rider items
CREATE TABLE IF NOT EXISTS rider_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Other',
  quantity TEXT DEFAULT '1',
  status TEXT DEFAULT 'pending',
  buyer_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rider masters (templates)
CREATE TABLE IF NOT EXISTS rider_masters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Main Rider',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rider master items
CREATE TABLE IF NOT EXISTS rider_master_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  master_id UUID REFERENCES rider_masters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Other',
  quantity TEXT DEFAULT '1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Management contacts
CREATE TABLE IF NOT EXISTS artist_management (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'Management',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security) with open access
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_master_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON shows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON rider_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON rider_masters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON rider_master_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON artist_management FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON messages FOR ALL USING (true) WITH CHECK (true);
```

---

## Step 3 — Set Up Resend (Email)

1. Go to [resend.com](https://resend.com) → sign up
2. Add and verify your domain (e.g. `yourcompany.com`)
3. Copy your **API Key** → `RESEND_API_KEY`

---

## Step 4 — Add Environment Variables to Vercel

In your Vercel project → **Settings → Environment Variables**, add:

### Required
| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |
| `RESEND_API_KEY` | Your Resend API key |
| `ANTHROPIC_API_KEY` | Your Anthropic key (for PDF extraction) |

### Branding (customize these)
| Variable | Example Value |
|----------|--------------|
| `NEXT_PUBLIC_COMPANY_NAME` | `My Touring Company` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `EMAIL_FROM_ADDRESS` | `noreply@yourcompany.com` |
| `EMAIL_FROM_NAME` | `RiderLink` |
| `EMAIL_SENDER_NAME` | `Your Name` |
| `EMAIL_SENDER_TITLE` | `Tour Director · My Touring Company` |
| `EMAIL_SENDER_ADDRESS` | `you@yourcompany.com` |

### Optional (SMS via Twilio)
| Variable | Value |
|----------|-------|
| `TWILIO_ACCOUNT_SID` | From Twilio Console |
| `TWILIO_AUTH_TOKEN` | From Twilio Console |
| `TWILIO_PHONE_NUMBER` | Your Twilio number e.g. `+12025551234` |
| `TWILIO_MESSAGING_SERVICE_SID` | `MG...` from Twilio Messaging Services |

---

## Step 5 — Redeploy

After adding env vars, go to **Vercel → Deployments → Redeploy** (or push any commit). Your app will be live at your Vercel URL.

---

## Step 6 — First Time In

1. Click **📌 Guide** in the top nav — it'll walk you through adding your first artist, building a rider, creating a show, and sending it to a buyer
2. Add your first artist in **Rider Library**
3. You're good to go

---

## Getting an Anthropic API Key (for PDF extraction)

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. **API Keys → Create Key**
3. Add it as `ANTHROPIC_API_KEY` in Vercel

---

Built by [Blue Alley Touring LLC](https://bluealleytouring.com)
