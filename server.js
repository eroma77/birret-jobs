const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase Client for token verification
const supabase = createClient(
  process.env.SUPABASE_URL || "https://mkgsoamugnnbqgwgvinb.supabase.co",
  process.env.SUPABASE_ANON_KEY || ""
);

// Helper function to extract user from Authorization header
async function getUserFromRequest(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    
    return user;
  } catch (err) {
    console.error("Error verifying auth token:", err);
    return null;
  }
}

// PostgreSQL Connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necessary for connection to Supabase hosted Postgres
  }
});

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Initialize Database Table if it doesn't exist
async function initDb() {
  const queryText = `
    CREATE TABLE IF NOT EXISTS jobs (
      id VARCHAR(50) PRIMARY KEY,
      profession VARCHAR(100) NOT NULL,
      gender VARCHAR(50) NOT NULL,
      age_from INT NOT NULL,
      age_to INT NOT NULL,
      description TEXT NOT NULL,
      city VARCHAR(100) NOT NULL,
      address VARCHAR(255),
      is_remote BOOLEAN NOT NULL,
      payment INT NOT NULL,
      is_negotiable BOOLEAN NOT NULL,
      phone VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL,
      author_id VARCHAR(100) NOT NULL
    );
  `;
  try {
    const client = await pool.connect();
    await client.query(queryText);
    console.log("Postgres Database 'jobs' table initialized successfully.");
    client.release();
  } catch (err) {
    console.error("Error initializing Database table:", err);
  }
}

// Database mapper helpers
const mapRowToJob = (row) => ({
  id: row.id,
  profession: row.profession,
  gender: row.gender,
  ageFrom: row.age_from,
  ageTo: row.age_to,
  description: row.description,
  city: row.city,
  address: row.address || "",
  isRemote: row.is_remote,
  payment: row.payment,
  isNegotiable: row.is_negotiable,
  phone: row.phone,
  createdAt: row.created_at,
  authorId: row.author_id
});

// API Routes

// 0. GET CONFIGURATION FOR CLIENT-SIDE SDK
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || "https://mkgsoamugnnbqgwgvinb.supabase.co",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ""
  });
});

// 1. GET ALL JOBS (and execute 15-day expiration cleanup query)
app.get('/api/jobs', async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Automatic 15-day job hard delete cleanup logic
    await client.query("DELETE FROM jobs WHERE created_at < NOW() - INTERVAL '15 days'");

    // Fetch active jobs sorted by created time descending
    const result = await client.query("SELECT * FROM jobs ORDER BY created_at DESC");
    client.release();

    const jobs = result.rows.map(mapRowToJob);
    res.json(jobs);
  } catch (err) {
    console.error("GET /api/jobs database error:", err);
    res.status(500).json({ error: "Дерекқордан жұмыстарды алу кезінде қате кетті" });
  }
});

// 2. CREATE NEW JOB
app.post('/api/jobs', async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Сессия устарела или недействительна. Пожалуйста, войдите снова." });
  }

  const job = req.body;
  // Securely override the authorId with the verified token user ID
  job.authorId = user.id;

  const queryText = `
    INSERT INTO jobs (
      id, profession, gender, age_from, age_to, description, 
      city, address, is_remote, payment, is_negotiable, phone, 
      created_at, author_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (id) DO UPDATE SET
      profession = $2,
      gender = $3,
      age_from = $4,
      age_to = $5,
      description = $6,
      city = $7,
      address = $8,
      is_remote = $9,
      payment = $10,
      is_negotiable = $11,
      phone = $12,
      created_at = $13,
      author_id = $14
    RETURNING *;
  `;
  
  const values = [
    job.id,
    job.profession,
    job.gender,
    job.ageFrom,
    job.ageTo,
    job.description,
    job.city,
    job.isRemote ? "" : job.address,
    job.isRemote,
    job.isNegotiable ? 0 : Number(job.payment),
    job.isNegotiable,
    job.phone,
    job.createdAt,
    job.authorId
  ];

  try {
    const client = await pool.connect();
    const result = await client.query(queryText, values);
    client.release();

    res.status(201).json(mapRowToJob(result.rows[0]));
  } catch (err) {
    console.error("POST /api/jobs database error:", err);
    res.status(500).json({ error: "Жұмысты сақтау кезінде қате кетті" });
  }
});

// 3. DELETE JOB BY ID
app.delete('/api/jobs/:id', async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Сессия устарела или недействительна." });
  }

  const jobId = req.params.id;
  
  try {
    const client = await pool.connect();
    
    // Check if the job exists and verify ownership
    const checkResult = await client.query("SELECT author_id FROM jobs WHERE id = $1", [jobId]);
    if (checkResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: "Вакансия не найдена" });
    }
    
    if (checkResult.rows[0].author_id !== user.id) {
      client.release();
      return res.status(403).json({ error: "У вас нет прав на удаление этого объявления" });
    }

    const result = await client.query("DELETE FROM jobs WHERE id = $1 RETURNING *;", [jobId]);
    client.release();

    res.json({ success: true, message: "Жұмыс сәтті өшірілді" });
  } catch (err) {
    console.error("DELETE /api/jobs database error:", err);
    res.status(500).json({ error: "Жұмысты өшіру кезінде қате кетті" });
  }
});

// Fallback to SPA Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start listening
app.listen(PORT, async () => {
  console.log(`Server is running locally at http://localhost:${PORT}`);
  await initDb();
});
