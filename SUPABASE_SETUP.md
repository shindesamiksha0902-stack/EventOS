# 🚀 Supabase Integration & Setup Guide for EVENTOS

All data, user accounts, authentication hashes, events, sessions, tickets/passes, spatial zones, flow balancer states, alerts, dispatches, itineraries, and journeys are configured to be stored directly in **Supabase PostgreSQL**.

---

## ⚡ Quick 3-Step Setup

### Step 1: Create or Open Your Supabase Project
1. Go to [https://app.supabase.com](https://app.supabase.com) and log in.
2. Create a new project (e.g. `eventos-platform`).
3. Note your **Project URL** and **API Keys** under **Project Settings > API**:
   - `Project URL` (e.g., `https://abcdefghijkl.supabase.co`)
   - `anon public key` (or `service_role secret key`)

---

### Step 2: Apply the Database Schema in Supabase
1. In your Supabase Dashboard, click **SQL Editor** on the left menu.
2. Click **New query**.
3. Open the [`supabase_schema.sql`](./supabase_schema.sql) file located in this repository.
4. Copy its entire content, paste it into the Supabase SQL Editor, and click **Run** (▶).

> This creates all tables (`users`, `events`, `sessions`, `visitor_events`, `passes`, `itinerary_items`, `zones`, `alerts`, `staff_dispatches`, `flow_state`, `journeys`), sets up indexes, configures Row Level Security (RLS), and seeds initial demo data.

---

### Step 3: Configure Backend Environment Variables
1. Open the file `backend/.env` (or copy from `backend/.env.example`).
2. Add your Supabase credentials:

```env
PORT=3001
ALLOWED_ORIGINS=*

SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-or-service-role-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

3. (Optional) You can also seed data via Node.js by running:
```bash
cd backend
npm run seed:supabase
```

---

## 🏃 Running the Application

### Start the Backend
```bash
cd backend
npm start
```
You should see:
```
[db] 🚀 Supabase PostgreSQL connected and active as primary datastore.
EVENTOS API running on port 3001
```

### Check Backend Health
Visit `http://localhost:3001/health` in your browser. It will return:
```json
{
  "status": "ok",
  "database": "supabase-postgresql",
  "ts": "2026-09-06T13:30:00.000Z"
}
```

---

## 📊 Database Schema Overview

| Table | Description |
|---|---|
| `users` | User credentials, hashed passwords, salts, profile details, and role (`visitor` / `organizer`). |
| `events` | Event metadata, organizers, date ranges, capacities, venue locations, and pricing. |
| `sessions` | Agenda sessions, speakers, stages, and time slots. |
| `visitor_events` | Multi-event registrations linking visitors to their active events. |
| `passes` | Issued digital badges and QR tickets with confirmation statuses. |
| `itinerary_items` | Visitor bookmarked schedule sessions. |
| `zones` | Venue spatial map zones and real-time occupancy counts. |
| `alerts` | Organizer safety and flow broadcast alerts. |
| `staff_dispatches` | On-ground staff coordinator dispatches. |
| `flow_state` | Real-time pedestrian choke-point telemetry and rebalancing state. |
| `journeys` | Saved pedestrian routing steps and wayfinding navigation. |

---

## 🔑 Default Seed Credentials

| Role | Email | Password |
|---|---|---|
| **Visitor** | `alex@eventos.io` | `alex123` |
| **Organizer** | `admin@eventos.io` | `admin123` |
