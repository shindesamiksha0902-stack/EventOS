# 🎪 EVENTOS Intelligence Platform

> **Fullstack Editorial Event Experience & Real-Time Spatial Intelligence Platform**

EVENTOS is a next-generation event operations and visitor navigation system. Designed with a warm editorial aesthetic and powerful spatial telemetry, it delivers an end-to-end split architecture for **Attendees (Visitors)** and **Event Directors (Organizers)**.

---

## ✨ Key Features

### 👤 Visitor Experience
- **Event Discovery & Pass Management**: Browse multi-track summits, generate dynamic access passes, and view event schedules.
- **Interactive Spatial Map & Live Crowds**: Real-time zone density radar with live status indicators (Low, Moderate, High, Critical).
- **Intelligent Multi-Stop Journey Planner**: Dynamic routing between stages, keynotes, catering zones, and exits with step-by-step navigation and time estimates.
- **Personalized Itinerary**: Save sessions, track conflicts, and synchronize bookmarks with the backend.

### 🏢 Organizer Command Center
- **Real-Time Operations Dashboard**: High-level telemetry for active check-ins, velocity, revenue, and crowd distribution.
- **Flow Balancer & AI Recommendations**: Automated crowd mitigation proposals with 1-click execution (gate redirection, dynamic signage, staff dispatch).
- **Interactive Spatial Live Map**: Visual heatmap with zone selection, capacity monitoring, and quick staff dispatch.
- **What-If Crowd Simulator**: Interactive parameter tuning (arrival rates, gate throughput, stage capacity) to test scenario outcomes and stress limits.

---

## 📁 Repository Structure

`
eventos_fullstack_platform/
├── backend/                             # Express REST API & Database
│   ├── db/                              # sql.js / SQLite database & migration scripts
│   │   ├── helpers.js                   # Query wrappers & helpers
│   │   ├── index.js                     # DB initialization & persistent binary storage
│   │   ├── migrate.js                   # Table schema definitions
│   │   └── seed.js                      # Realistic seed datasets
│   ├── routes/                          # Express REST API route handlers
│   │   ├── events.js                    # Event listings, details, zones, live state
│   │   ├── itinerary.js                 # Visitor session bookmarks
│   │   ├── journey.js                   # Spatial pathfinding & route planner
│   │   ├── organizer.js                 # Organizer telemetry, alerts, flow balancing & simulation
│   │   ├── passes.js                    # Digital pass generation & validation
│   │   └── users.js                     # Authentication, profiles & user events
│   ├── package.json                     # Backend dependencies & npm scripts
│   ├── server.js                        # Main Express server entrypoint & CORS
│   ├── Procfile                         # Heroku / Railway deployment configuration
│   └── render.yaml                      # Render 1-click cloud service blueprint
│
├── css/                                 # Styling
│   └── custom.css                       # Editorial theme, typography, paper shadows & animations
│
├── js/                                  # Frontend Architecture
│   ├── api.js                           # API client layer with automatic fallback & polling
│   ├── app.js                           # Master controller, routing, role switcher & modal manager
│   ├── config.js                        # Dynamic backend URL resolution & localStorage caching
│   ├── crowd-simulator.js               # Client-side agent simulation engine
│   ├── organizer.js                     # Organizer dashboard, flow balancing & heatmap views
│   ├── spatial-map.js                   # Canvas-based spatial map & pathfinding renderer
│   └── visitor.js                       # Visitor views: explore, passes, journeys & agenda
│
├── stitch_eventos_intelligence_platform/# UI/UX Reference mockups & screen designs
├── .gitignore                           # Git ignore rules (node_modules, zip, env)
├── DEPLOYMENT_GUIDE.md                  # Comprehensive deployment instructions (Render + Vercel)
├── FEATURE_ROADMAP.md                   # Feature roadmap & planned enhancements
├── index.html                           # Single Page Application entrypoint
├── netlify.toml                         # Netlify hosting configuration
├── vercel.json                          # Vercel hosting configuration
└── README.md                            # Main project documentation
`

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **Python 3** (or 
px serve / any static file server)

### 2. Start the Backend API
`ash
cd backend
npm install
node server.js
`
> The API server will start at http://localhost:3001.
> Health check: http://localhost:3001/health

### 3. Start the Frontend App
From the root directory of the project:
`ash
# Using Python:
python -m http.server 8000

# OR using Node / npx:
npx serve .
`
> Open your browser at **http://localhost:8000**.

---

## 🌐 Production Deployment

The project is pre-configured for dual-cloud deployment:

| Component | Recommended Platform | Configuration Files |
| :--- | :--- | :--- |
| **Backend API** | [Render](https://render.com) / [Railway](https://railway.app) | ackend/render.yaml, ackend/Procfile |
| **Frontend Web** | [Vercel](https://vercel.com) / [Netlify](https://netlify.app) | ercel.json, 
etlify.toml, js/config.js |

👉 **For complete, step-by-step instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).**

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Tailwind CSS CDN, Vanilla JavaScript (ES6+ Modules), HTML5 Canvas 2D
- **Backend**: Node.js, Express.js, Helmet, CORS, Morgan
- **Database**: SQLite via sql.js (WebAssembly-based embedded SQLite with zero external database server requirements)
- **Typography & Icons**: Google Fonts (Noto Serif, Anybody, Archivo Narrow), Material Symbols Outlined

---

## 📄 License
MIT License. Created for the EVENTOS Intelligence Platform.
