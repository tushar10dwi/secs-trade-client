# SecsTrade — KIIT Section Exchange

A full-stack web app for KIIT students to trade their registered sections with others.

---

## Features

- **Email OTP login** — Only `@kiit.ac.in` emails allowed
- **Profile setup** — Name, roll number, WhatsApp, current section, wanted section
- **Browse** — See all students with the section you want; mutual matches highlighted in red
- **Inbox** — Accept or decline incoming trade requests
- **Realtime Chat** — After a trade is accepted, chat with your match; their contact info is pinned at the top
- **Auto-cleanup** — On accept, both users' section intent is cleared and all other pending requests are auto-deleted
- **Admin panel** — `/admin` route with ban/unban, reports, feedback, and section management

---

## Quick Start

### 1. Link your Supabase project

Open `src/lib/supabase.js` and paste your credentials:

```js
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Find these at: **Supabase Dashboard → Settings → API**

---

### 2. Run the database schema

1. Go to **Supabase Dashboard → SQL Editor → New query**
2. Paste the entire contents of `supabase_schema.sql`
3. Click **Run**

This creates all tables, RLS policies, triggers, and enables realtime.

---

### 3. Enable Email OTP in Supabase Auth

1. Go to **Authentication → Providers → Email**
2. Ensure **Enable Email provider** is ON
3. Turn **OFF** "Confirm email" (OTP handles verification)
4. Go to **Authentication → Email Templates → Magic Link**
5. The default template works. Optionally customize it.

> Supabase sends a 6-digit OTP to the user's email automatically.

---

### 4. (Optional) Restrict to @kiit.ac.in only at DB level

In Supabase SQL editor:
```sql
-- Only allow KIIT emails to sign up
create or replace function public.check_kiit_email()
returns trigger language plpgsql as $$
begin
  if new.email not like '%@kiit.ac.in' then
    raise exception 'Only @kiit.ac.in emails are allowed';
  end if;
  return new;
end;
$$;
```

---

### 5. Install and run

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`

---

### 6. Build for production

```bash
npm run build
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host.

For Vercel: just `vercel --prod` from the project root.

---

## Admin Panel

Visit `/admin` — default credentials (change before deploying!):

```
Email:    admin
Password: 1234
```

Change these in `src/admin/AdminLogin.jsx`.

The admin panel lets you:
- View all users, ban/unban accounts
- See and resolve reports
- Read and delete feedback
- Add/remove available sections
- Set max pending requests per user

---

## Project Structure

```
src/
  lib/
    supabase.js       ← Paste your Supabase URL & key here
    auth.jsx          ← Auth context (session + profile)
    toast.jsx         ← Toast notification system
  pages/
    AuthPage.jsx      ← Email OTP login
    SetupPage.jsx     ← First-time profile setup
    BrowsePage.jsx    ← Browse + mutual match highlight
    InboxPage.jsx     ← Accept/decline requests
    ChatPage.jsx      ← Realtime chat with contact info
    ProfilePage.jsx   ← Edit profile
    FeedbackPage.jsx  ← Submit feedback
  admin/
    AdminLogin.jsx    ← Admin login (/admin)
    AdminDashboard.jsx← Full admin panel
  App.jsx             ← Routing shell
  index.css           ← Global styles
```

---

## Supabase Tables

| Table | Purpose |
|---|---|
| `profiles` | User info + current/wanted section |
| `trade_requests` | Pending/accepted/declined trades |
| `chat_rooms` | One room per accepted trade pair |
| `messages` | Chat messages (realtime enabled) |
| `reports` | User reports for admin review |
| `feedbacks` | User feedback for admin |
| `settings` | Available sections + global config (singleton) |
