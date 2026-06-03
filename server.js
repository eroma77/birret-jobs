const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// FAIL-FAST CONFIGURATION — never fall back to hardcoded secrets
// ---------------------------------------------------------------------------
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[Fatal] Required environment variable "${name}" is not set. Aborting.`);
    process.exit(1);
  }
  return value;
}

const supabaseUrl     = requireEnv('SUPABASE_URL');
const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');

console.log('[Supabase Auth Init] Target URL:', supabaseUrl);
console.log('[Supabase Auth Init] Key Prefix:', supabaseAnonKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------------------------------------------------------------------------
// POSTGRESQL CONNECTION POOL
// ---------------------------------------------------------------------------
const pool = new Pool({
  connectionString: requireEnv('DATABASE_URL'),
  ssl: { rejectUnauthorized: false },
  // Disable prepared statements — required for PgBouncer transaction-mode
  prepareThreshold: 0,
  max:                    parseInt(process.env.DB_POOL_MAX                    || '20'),
  idleTimeoutMillis:      parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS        || '30000'),
  connectionTimeoutMillis:parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS  || '2000')
});

// ---------------------------------------------------------------------------
// SANITIZATION HELPERS
// ---------------------------------------------------------------------------

/**
 * Strip HTML/script tags from a string to prevent Stored XSS.
 * Only plain text is accepted in user-supplied fields.
 */
function stripHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '');
}

/**
 * URL/spam detection regex — rewritten to avoid catastrophic backtracking.
 * Explicit literal TLDs instead of nested quantifiers prevent ReDoS.
 */
const URL_REGEX = /https?:\/\/|www\.|t\.me\/|wa\.me\/|vk\.com\/|[^\s@]+\.(com|ru|kz|net|org|info|me|ly|co|io|app|biz|site|online|xyz|club|top)\b/gi;

/**
 * Normalize gender to a canonical DB value regardless of what the client sends.
 * Accepted input:  'male'|'female'|'any'  OR  legacy Cyrillic strings.
 * Stored value:    'male' | 'female' | 'any'
 */
function normalizeGender(raw) {
  const GENDER_MAP = {
    male:     'male',
    female:   'female',
    any:      'any',
    // Legacy Russian labels sent by older front-end versions
    'Мужской': 'male',
    'Женский':  'female',
    'Неважно':  'any'
  };
  return GENDER_MAP[raw] ?? null;
}

// ---------------------------------------------------------------------------
// AUTH HELPER
// ---------------------------------------------------------------------------
async function getUserFromRequest(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[Auth Warning] Missing or malformed Authorization header');
      return null;
    }
    const token = authHeader.split(' ')[1];
    if (!token) { return null; }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      console.error('[Auth Error] getUser failed:', error?.message);
      return null;
    }
    return user;
  } catch (err) {
    console.error('[Auth Error] Unexpected exception:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// DATABASE INITIALIZATION  (DDL only — runs once, before server accepts traffic)
// ---------------------------------------------------------------------------
async function initDb() {
  // Use a dedicated session-mode connection for DDL commands so PgBouncer
  // does not interfere with schema-altering statements.
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const directPool = new Pool({
    connectionString: directUrl,
    ssl: { rejectUnauthorized: false },
    prepareThreshold: 0,
    max: 1
  });

  try {
    await directPool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id          VARCHAR(50)  PRIMARY KEY,
        profession  VARCHAR(100) NOT NULL,
        gender      VARCHAR(10)  NOT NULL CHECK (gender IN ('male','female','any')),
        age_from    INT          NOT NULL,
        age_to      INT          NOT NULL,
        description TEXT         NOT NULL,
        city        VARCHAR(100) NOT NULL,
        address     VARCHAR(255),
        is_remote   BOOLEAN      NOT NULL,
        payment     INT          NOT NULL,
        is_negotiable BOOLEAN    NOT NULL,
        phone       VARCHAR(50)  NOT NULL,
        created_at  TIMESTAMP WITH TIME ZONE NOT NULL,
        author_id   VARCHAR(100) NOT NULL
      );
    `);
    console.log("Postgres Database 'jobs' table initialized successfully.");
  } catch (err) {
    console.error('Error initializing Database table:', err.message);
  }

  try {
    await directPool.query('ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;');
    console.log("Row Level Security (RLS) enabled on 'jobs' table.");
  } catch (err) {
    console.warn('RLS enablement skipped (may already be active):', err.message);
  }

  // Run cleanup once at startup only — not on every GET request
  try {
    await directPool.query("DELETE FROM jobs WHERE created_at < NOW() - INTERVAL '15 days'");
    console.log('Startup database cleanup executed. Expired records deleted.');
  } catch (err) {
    console.error('Error executing startup database cleanup:', err.message);
  }

  await directPool.end();
}

// ---------------------------------------------------------------------------
// SCHEDULED CLEANUP — isolated async interval, never blocks request handling
// ---------------------------------------------------------------------------
function scheduleCleanup() {
  const INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours
  setInterval(async () => {
    try {
      await pool.query("DELETE FROM jobs WHERE created_at < NOW() - INTERVAL '15 days'");
      console.log('[Cleanup] Scheduled expired-job cleanup completed.');
    } catch (err) {
      console.error('[Cleanup] Scheduled cleanup error:', err.message);
    }
  }, INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// DATABASE ROW MAPPER
// ---------------------------------------------------------------------------
const mapRowToJob = (row) => ({
  id:           row.id,
  profession:   row.profession,
  gender:       row.gender,
  ageFrom:      row.age_from,
  ageTo:        row.age_to,
  description:  row.description,
  city:         row.city,
  address:      row.address || '',
  isRemote:     row.is_remote,
  payment:      row.payment,
  isNegotiable: row.is_negotiable,
  phone:        row.phone,
  createdAt:    row.created_at,
  authorId:     row.author_id
});

// ---------------------------------------------------------------------------
// MIDDLEWARE
// ---------------------------------------------------------------------------
app.use(express.json());

// Serve static files with correct MIME types; do NOT fall through to SPA handler
app.use(express.static(__dirname, {
  // Disable etag/last-modified to let query-string versioning (?v=) take precedence
  etag:         true,
  lastModified: true
}));

// ---------------------------------------------------------------------------
// API ROUTES
// ---------------------------------------------------------------------------

// 0. CLIENT-SIDE SDK CONFIGURATION
app.get('/api/config', (req, res) => {
  res.json({ supabaseUrl, supabaseAnonKey });
});

// 1. GET ALL JOBS — read-only, no writes
app.get('/api/jobs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jobs ORDER BY created_at DESC');
    res.json(result.rows.map(mapRowToJob));
  } catch (err) {
    console.error('GET /api/jobs error:', err.message);
    res.status(500).json({ code: 'DB_READ_ERROR', error: 'Failed to fetch jobs' });
  }
});

// 2. CREATE / UPDATE JOB
app.post('/api/jobs', async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ code: 'AUTH_REQUIRED', error: 'Session expired or invalid. Please sign in again.' });
  }

  const job = req.body;
  if (!job || typeof job !== 'object') {
    return res.status(400).json({ code: 'INVALID_PAYLOAD', error: 'Invalid request payload' });
  }

  // ---- Determine new vs. edit ------------------------------------------------
  let isEdit = false;
  let createdAt = new Date().toISOString();
  let recordId;

  if (job.id && typeof job.id === 'string' && job.id.length <= 50) {
    // Client provided an ID — check if it belongs to this user (edit flow)
    try {
      const existing = await pool.query(
        'SELECT author_id, created_at FROM jobs WHERE id = $1',
        [job.id]
      );
      if (existing.rows.length > 0) {
        if (existing.rows[0].author_id !== user.id) {
          return res.status(403).json({ code: 'FORBIDDEN', error: 'You do not have permission to edit this listing.' });
        }
        isEdit = true;
        createdAt = existing.rows[0].created_at; // Preserve original timestamp
        recordId  = job.id;
      } else {
        // New record — use client-supplied ID only if it looks safe (alphanum + dash)
        if (/^[a-zA-Z0-9_-]{1,50}$/.test(job.id)) {
          recordId = job.id;
        } else {
          recordId = crypto.randomUUID(); // Fall back to server-generated UUID
        }
      }
    } catch (err) {
      console.error('Error verifying job ownership:', err.message);
      return res.status(500).json({ code: 'DB_OWNERSHIP_CHECK_ERROR', error: 'Database error during ownership verification' });
    }
  } else {
    // No client ID supplied — generate server-side UUID for new records
    recordId = crypto.randomUUID();
  }

  // ---- Validation -----------------------------------------------------------

  if (!job.profession || typeof job.profession !== 'string' ||
      job.profession.trim().length === 0 || job.profession.length > 100) {
    return res.status(400).json({ code: 'INVALID_PROFESSION', error: 'Invalid profession value' });
  }

  const gender = normalizeGender(job.gender);
  if (!gender) {
    return res.status(400).json({ code: 'INVALID_GENDER', error: 'Invalid gender value' });
  }

  const ageFrom = Number(job.ageFrom);
  const ageTo   = Number(job.ageTo);
  if (isNaN(ageFrom) || isNaN(ageTo) || ageFrom < 15 || ageTo > 50 || ageFrom > ageTo) {
    return res.status(400).json({ code: 'INVALID_AGE_RANGE', error: 'Age range must be between 15 and 50' });
  }

  // XSS: strip HTML from all text fields before any further checks
  const desc = stripHtml((job.description || '').trim());
  if (desc.length < 20 || desc.length > 1000) {
    return res.status(400).json({ code: 'INVALID_DESCRIPTION_LENGTH', error: 'Description must be 20–1000 characters' });
  }
  // Reset regex lastIndex before test (global flag retains state across calls)
  URL_REGEX.lastIndex = 0;
  if (URL_REGEX.test(desc)) {
    return res.status(400).json({ code: 'DESCRIPTION_CONTAINS_URL', error: 'Description must not contain external links' });
  }

  if (!job.city || typeof job.city !== 'string' ||
      job.city.trim().length === 0 || job.city.length > 100) {
    return res.status(400).json({ code: 'INVALID_CITY', error: 'City is required' });
  }

  const isRemote = !!job.isRemote;
  const address  = isRemote ? '' : stripHtml((job.address || '').trim());
  if (!isRemote && (address.length < 5 || address.length > 255)) {
    return res.status(400).json({ code: 'INVALID_ADDRESS', error: 'Address must be 5–255 characters' });
  }

  const isNegotiable = !!job.isNegotiable;
  const payment = isNegotiable ? 0 : Number(job.payment);
  if (!isNegotiable && (isNaN(payment) || payment < 1000 || payment > 5000000)) {
    return res.status(400).json({ code: 'INVALID_PAYMENT', error: 'Payment must be between 1 000 and 5 000 000' });
  }

  const phone = (job.phone || '').replace(/\D/g, '');
  if (phone.length !== 10) {
    return res.status(400).json({ code: 'INVALID_PHONE', error: 'Phone must be exactly 10 digits' });
  }

  // ---- Persist --------------------------------------------------------------
  const queryText = `
    INSERT INTO jobs (
      id, profession, gender, age_from, age_to, description,
      city, address, is_remote, payment, is_negotiable, phone,
      created_at, author_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    ON CONFLICT (id) DO UPDATE SET
      profession    = EXCLUDED.profession,
      gender        = EXCLUDED.gender,
      age_from      = EXCLUDED.age_from,
      age_to        = EXCLUDED.age_to,
      description   = EXCLUDED.description,
      city          = EXCLUDED.city,
      address       = EXCLUDED.address,
      is_remote     = EXCLUDED.is_remote,
      payment       = EXCLUDED.payment,
      is_negotiable = EXCLUDED.is_negotiable,
      phone         = EXCLUDED.phone,
      created_at    = EXCLUDED.created_at,
      author_id     = EXCLUDED.author_id
    RETURNING *;
  `;

  const values = [
    recordId,
    job.profession.trim(),
    gender,         // normalized canonical enum
    ageFrom,
    ageTo,
    desc,           // XSS-sanitized
    job.city.trim(),
    address,        // XSS-sanitized
    isRemote,
    payment,        // exact value, no rounding
    isNegotiable,
    phone,
    createdAt,
    user.id         // always server-enforced, never from client body
  ];

  try {
    const result = await pool.query(queryText, values);
    res.status(201).json(mapRowToJob(result.rows[0]));
  } catch (err) {
    console.error('POST /api/jobs error:', err.message);
    res.status(500).json({ code: 'DB_WRITE_ERROR', error: 'Failed to save job' });
  }
});

// 3. DELETE JOB BY ID
app.delete('/api/jobs/:id', async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ code: 'AUTH_REQUIRED', error: 'Session expired or invalid.' });
  }

  const jobId = req.params.id;
  if (!jobId || typeof jobId !== 'string' || !/^[a-zA-Z0-9_-]{1,50}$/.test(jobId)) {
    return res.status(400).json({ code: 'INVALID_ID', error: 'Invalid job ID format' });
  }

  try {
    const check = await pool.query('SELECT author_id FROM jobs WHERE id = $1', [jobId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', error: 'Job not found' });
    }
    if (check.rows[0].author_id !== user.id) {
      return res.status(403).json({ code: 'FORBIDDEN', error: 'You do not have permission to delete this listing.' });
    }
    await pool.query('DELETE FROM jobs WHERE id = $1', [jobId]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/jobs error:', err.message);
    res.status(500).json({ code: 'DB_DELETE_ERROR', error: 'Failed to delete job' });
  }
});

// ---------------------------------------------------------------------------
// SPA FALLBACK — only for non-API, non-static-file routes
// Return 404 for requests that look like missing static assets (.js, .css, etc.)
// ---------------------------------------------------------------------------
app.get('*', (req, res) => {
  const url = req.path;

  // Do not serve index.html in place of missing static assets — that confuses browsers
  if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|map)(\?.*)?$/i.test(url)) {
    return res.status(404).send('Not found');
  }

  // Also skip API paths that somehow fell through
  if (url.startsWith('/api/')) {
    return res.status(404).json({ code: 'NOT_FOUND', error: 'API endpoint not found' });
  }

  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------------------------------------------------------------------------
// STARTUP — initDb MUST complete before the server accepts traffic
// ---------------------------------------------------------------------------
async function start() {
  try {
    await initDb();
    scheduleCleanup();
    app.listen(PORT, () => {
      console.log(`Server is running locally at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Fatal] Server startup failed:', err.message);
    process.exit(1);
  }
}

start();
