/* server.js */
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const { initDb } = require('./db');
const { isSupabaseConfigured, getSupabase } = require('./db/supabase');

const eventsRouter    = require('./routes/events');
const usersRouter     = require('./routes/users');
const passesRouter    = require('./routes/passes');
const itineraryRouter = require('./routes/itinerary');
const organizerRouter = require('./routes/organizer');
const journeyRouter   = require('./routes/journey');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false }));
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['*'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow vercel and netlify preview/production domains
    if (/(\.vercel\.app|\.netlify\.app|localhost|127\.0\.0\.1)/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET','POST','DELETE','PUT','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/events',    eventsRouter);
app.use('/api/users',     usersRouter);
app.use('/api/passes',    passesRouter);
app.use('/api/itinerary', itineraryRouter);
app.use('/api/organizer', organizerRouter);
app.use('/api/journey',   journeyRouter);

const path = require('path');
// Serve static frontend files
app.use(express.static(path.join(__dirname, '..')));

app.get('/health', (_req, res) => res.json({
  status: 'ok',
  database: isSupabaseConfigured() ? 'supabase-postgresql' : 'sqlite-sqljs',
  ts: new Date().toISOString()
}));

// Fallback to index.html for root / unknown page routes
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.use('/api/*', (_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Bootstrap: init DB then start listening
(async () => {
  try {
    if (isSupabaseConfigured()) {
      console.log('[db] 🚀 Supabase PostgreSQL connected and active as primary datastore.');
      getSupabase();
    } else {
      console.log('[db] ℹ️ Supabase not configured in .env. Initializing local database fallback...');
      await initDb();
      console.log('[db] Local database initialised');
    }
    app.listen(PORT, '0.0.0.0', () => console.log(`EVENTOS API running on port ${PORT}`));
  } catch (err) {
    console.error('[FATAL] Could not start server:', err.message);
    process.exit(1);
  }
})();

module.exports = app;
