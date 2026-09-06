# EVENTOS Intelligence Platform — Feature Roadmap

> Prioritized by impact × build effort. Every feature aligns with the existing editorial warm aesthetic and dual Visitor / Organizer architecture.

---

## 🔴 High Impact · Quick Wins

### 1. Real Authentication (JWT)
Replace the hardcoded `user-visitor-alex` with a proper login/signup flow.
- Email + password login modal on the Auth screen
- JWT issued by backend, stored in `localStorage`
- All API calls send `Authorization: Bearer <token>`
- Middleware `authenticateToken()` guards every protected route
- **Stack:** `bcryptjs` + `jsonwebtoken` (pure JS, no native deps)

### 2. Real QR Code Generation
The current QR code is a fake 5×5 CSS grid. Replace with actual scannable QR.
- Backend generates a signed QR payload: `{ passId, userId, eventId, sig }`
- Frontend renders it using `qrcode` npm package (canvas-based, pure JS)
- Organizer check-in scanner POSTs `{ qrPayload }` → `/api/passes/scan` → validates signature + marks `status = 'used'`

### 3. Live WebSocket Crowd Updates
Currently zone occupancy only updates on page refresh (±2% API drift).
- Backend opens a WebSocket server (`ws` package) on port 3001
- Every 5 seconds broadcasts updated zone occupancies to all connected clients
- Organizer Live Map auto-repaints without any user action
- Visitor crowd panel updates silently in background

### 4. Ticket Payment Flow (Stripe)
The "Get Pass" button skips payment entirely.
- Integrate Stripe Checkout (redirect mode — no PCI scope needed)
- Backend `POST /api/checkout` creates a Stripe session
- On success webhook → issue pass in DB automatically
- Show order confirmation with pass ID

### 5. Email Pass Delivery
After pass issuance, send a confirmation email with the QR code attached.
- Backend uses `nodemailer` (pure JS)
- HTML email template matching the platform's warm editorial aesthetic
- Attach QR code as inline PNG

---

## 🟠 Core Feature Additions

### 6. Multi-Day Agenda Builder
Sessions currently assume a single event. Extend for multi-day conferences.
- Sessions table gains `day_number` (1, 2, 3…) and `start_time` / `end_time`
- Visitor My Journey shows a tabbed schedule: **Day 1 | Day 2 | Day 3**
- Conflict detection: warn if two selected sessions overlap in time

### 7. Speaker Profiles & Session Detail Pages
Each session card is a dead end — clicking it does nothing.
- New `speakers` table: `{ id, name, bio, photo_url, social_url }`
- `GET /api/sessions/:id` returns full session + speaker data
- Visitor taps a session card → opens speaker profile modal with bio, photo, linked sessions

### 8. Event Search & Filters
"Discover Great Events" only has 4 category chips.
- Full-text search bar: `GET /api/events?q=urban+design`
- SQLite `LIKE` query on title + description
- Additional filter chips: **Date Range**, **Price**, **Location**
- Sort by: Newest · Price Low→High · Most Popular

### 9. Visitor Reviews & Ratings
No social proof anywhere on event cards.
- `reviews` table: `{ id, user_id, event_id, rating 1-5, body, created_at }`
- `POST /api/reviews` — authenticated visitors post after event ends
- Star rating shown on event cards and detail view
- Organizer dashboard shows average rating + review feed

### 10. Organizer Event Creation & Management
Organizers can only view AARPO — they can't create their own events.
- Full CRUD: `POST/PUT/DELETE /api/organizer/events`
- Form: title, description, category, date, location, capacity, price, zones layout
- Drag-to-place zones on a canvas editor (build on existing `SpatialMapEngine`)
- Published events appear instantly on visitor's Explore screen

---

## 🟡 Intelligence & Analytics

### 11. AI-Powered Session Recommender
"You might also like…" based on itinerary choices.
- Simple collaborative filtering: find users with similar itineraries → suggest their sessions
- Or use Gemini API: send user's itinerary + all sessions → get ranked recommendations
- Shown as "Suggested for You" strip at the bottom of My Schedule

### 12. Crowd Heatmap Export (PDF)
Organizers want post-event reports.
- `GET /api/organizer/report/:eventId` → generates a PDF summary
- Includes: total attendance, peak occupancy times, bottleneck zones, check-in rate chart
- Uses `pdfkit` (pure JS PDF generation)
- Download button on Organizer Dashboard

### 13. Predictive Bottleneck Alerts
The simulator is manual. Make it proactive.
- Backend cron job runs every 60 seconds
- Compares current zone occupancy vs. thresholds
- If a zone crosses 85% → auto-generates an alert record in DB
- WebSocket pushes alert to all connected organizer clients in real time
- Shows as a red banner on the Organizer Dashboard automatically

### 14. Historical Occupancy Charts
Organizers can't see how occupancy changed over time.
- `zone_snapshots` table: `{ zone_id, occ, recorded_at }` — insert every 5 min
- `GET /api/organizer/snapshots/:zoneId?range=2h` returns time-series data
- Render a simple SVG line chart on the Live Map panel (no library needed — raw SVG path)

### 15. Visitor Journey Analytics
Track which sessions visitors actually attended (post check-in).
- `check_ins` table: `{ user_id, session_id, scanned_at }`
- Populated by QR scan endpoint
- Visitor "My Journey" shows: sessions planned vs. sessions attended
- Organizer sees per-session attendance funnel

---

## 🟢 UX & Quality of Life

### 16. Offline Mode (PWA / Service Worker)
The venue has poor WiFi. The app should work offline.
- Add `manifest.json` + `sw.js` service worker
- Cache shell HTML, CSS, and JS on first load
- Cache last-fetched events, passes, itinerary in IndexedDB
- Sync itinerary changes when connectivity returns

### 17. Push Notifications
Alert visitors of session starts, gate congestion, and organizer broadcasts.
- Web Push API + `web-push` npm package on backend
- Visitor opts in on My Journey screen
- Organizer "Broadcast Alert" sends a real push notification — not just a toast
- Session start reminder 10 minutes before

### 18. Interactive Indoor Map (SVG-based)
The current map is a Canvas with hardcoded rectangles. Make it truly interactive.
- Organizer uploads a floor plan SVG
- Zones are mapped to SVG `<path>` elements by ID
- Click any room → occupancy popup with dispatch button
- Visitor sees their route highlighted as an animated dashed path on the real floor plan

### 19. Multi-Language Support (i18n)
AARPO is a global summit — attendees aren't all English speakers.
- `translations/` folder: `en.json`, `pt.json`, `es.json`, `fr.json`
- Language selector in header
- All UI strings pulled from translation object
- Persist selected language in `localStorage`

### 20. Dark Mode
The editorial warm palette is beautiful — but late-night organizers want dark mode.
- CSS custom properties already declared in `custom.css`
- Add dark palette override: `#1A1414` background, `#F0DEDD` text
- `prefers-color-scheme: dark` media query + manual toggle button in header
- Organizer's simulation canvas is already dark — consistent

---

## 🔵 Platform / Infrastructure

### 21. Admin Super-Dashboard
No way to manage the platform itself right now.
- New role: `admin`
- View all events, all users, all passes across the platform
- Suspend events, refund passes, promote users to organizer role
- Simple table UI with search + filter

### 22. Rate Limiting + Abuse Protection
Currently rate-limited globally at 300 req/min.
- Per-user rate limiting (identify by JWT user ID)
- Honeypot field on forms to catch bots
- Block IPs that trigger 10+ 4xx errors in 60 seconds

### 23. Database Migration Versioning
Current `migrate.js` is a single idempotent script.
- Numbered migration files: `001_init.js`, `002_add_reviews.js`, etc.
- Migration runner tracks which migrations have run in a `migrations` table
- `npm run migrate` only applies new ones

### 24. Automated Testing Suite
Zero tests currently.
- Unit tests for all route handlers using `supertest` + Node's built-in `node:test`
- Test DB seeded fresh before each test run
- CI-ready: `npm test` exits 0 on green

### 25. Docker Compose Setup
Share the project with one command.
- `Dockerfile` for the Node backend
- `docker-compose.yml`: backend + volume-mounted SQLite db
- Frontend served by Nginx container
- `docker compose up` → full stack running in 30 seconds on any machine

---

## Priority Matrix

| Feature | Impact | Effort | Build Next? |
|---|---|---|---|
| Real Auth (JWT) | ⭐⭐⭐⭐⭐ | Medium | ✅ Yes |
| Real QR Code | ⭐⭐⭐⭐⭐ | Low | ✅ Yes |
| WebSocket Live Updates | ⭐⭐⭐⭐ | Medium | ✅ Yes |
| Ticket Payment (Stripe) | ⭐⭐⭐⭐⭐ | Medium | ✅ Yes |
| Email Pass Delivery | ⭐⭐⭐⭐ | Low | ✅ Yes |
| AI Session Recommender | ⭐⭐⭐⭐ | Medium | 🔜 Soon |
| Predictive Bottleneck Alerts | ⭐⭐⭐⭐ | Medium | 🔜 Soon |
| Offline PWA | ⭐⭐⭐ | High | 📋 Later |
| Multi-Language | ⭐⭐⭐ | Medium | 📋 Later |
| Docker Compose | ⭐⭐⭐ | Low | ✅ Yes |
