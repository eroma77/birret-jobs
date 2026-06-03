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
  const createTableQuery = `
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
    await pool.query(createTableQuery);
    console.log("Postgres Database 'jobs' table initialized successfully.");
    
    // Enable Row Level Security to block any direct client-side PostgREST manipulations
    await pool.query("ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;");
    console.log("Row Level Security (RLS) enabled on 'jobs' table.");
  } catch (err) {
    console.error("Error initializing Database table or enabling RLS:", err);
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
    // Automatic 15-day job hard delete cleanup logic
    await pool.query("DELETE FROM jobs WHERE created_at < NOW() - INTERVAL '15 days'");

    // Fetch active jobs sorted by created time descending
    const result = await pool.query("SELECT * FROM jobs ORDER BY created_at DESC");
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

  // --- BACKEND-SIDE INPUT VALIDATION ---
  if (!job || typeof job !== 'object') {
    return res.status(400).json({ error: "Некорректный формат данных" });
  }
  if (!job.id || typeof job.id !== 'string' || job.id.length > 50) {
    return res.status(400).json({ error: "Некорректный ID вакансии" });
  }
  if (!job.profession || typeof job.profession !== 'string' || job.profession.trim().length === 0 || job.profession.length > 100) {
    return res.status(400).json({ error: "Некорректное название профессии" });
  }
  const allowedGenders = ["Мужской", "Женский", "Неважно"];
  if (!allowedGenders.includes(job.gender)) {
    return res.status(400).json({ error: "Некорректный пол" });
  }
  const ageFrom = Number(job.ageFrom);
  const ageTo = Number(job.ageTo);
  if (isNaN(ageFrom) || isNaN(ageTo) || ageFrom < 15 || ageTo > 50 || ageFrom > ageTo) {
    return res.status(400).json({ error: "Некорректный возрастной диапазон (разрешено от 15 до 50 лет)" });
  }
  const desc = (job.description || "").trim();
  if (desc.length < 20 || desc.length > 1000) {
    return res.status(400).json({ error: "Описание должно быть от 20 до 1000 символов" });
  }
  if (/http:\/\/|https:\/\/|www\./gi.test(desc)) {
    return res.status(400).json({ error: "Описание не должно содержать внешних ссылок" });
  }
  if (!job.city || typeof job.city !== 'string' || job.city.trim().length === 0 || job.city.length > 100) {
    return res.status(400).json({ error: "Необходимо указать город" });
  }
  const isRemote = !!job.isRemote;
  if (!isRemote) {
    const address = (job.address || "").trim();
    if (address.length < 5 || address.length > 255) {
      return res.status(400).json({ error: "Адрес должен быть от 5 до 255 символов" });
    }
  }
  const isNegotiable = !!job.isNegotiable;
  if (!isNegotiable) {
    const payment = Number(job.payment);
    if (isNaN(payment) || payment < 1000 || payment > 1000000) {
      return res.status(400).json({ error: "Оплата должна быть от 1 000 ₸ до 1 000 000 ₸" });
    }
  }
  const phone = (job.phone || "").replace(/\D/g, "");
  if (phone.length !== 10) {
    return res.status(400).json({ error: "Некорректный номер телефона (должно быть 10 цифр)" });
  }

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
    const result = await pool.query(queryText, values);
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
    // Check if the job exists and verify ownership
    const checkResult = await pool.query("SELECT author_id FROM jobs WHERE id = $1", [jobId]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Вакансия не найдена" });
    }
    
    if (checkResult.rows[0].author_id !== user.id) {
      return res.status(403).json({ error: "У вас нет прав на удаление этого объявления" });
    }

    await pool.query("DELETE FROM jobs WHERE id = $1 RETURNING *;", [jobId]);
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
