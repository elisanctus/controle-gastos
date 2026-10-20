import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:postgres@db:5432/controle_gastos";

const pool = new Pool({ connectionString: DATABASE_URL });

// --- DB health check with retries ---
async function waitForDb(maxRetries = 30, delayMs = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query("SELECT 1");
      console.log("✅ Database connected");
      return true;
    } catch (err) {
      console.log(`⏳ Waiting for database... (${i + 1}/${maxRetries})`);
      if (i === maxRetries - 1) {
        console.error("❌ Database connection failed after retries");
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

app.use(cors());
app.use(express.json());

// --- DB init ---
async function initDb() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      valor_total NUMERIC(12,2) NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa')),
      categoria TEXT NOT NULL,
      parcelas INT NOT NULL DEFAULT 1,
      mes_inicio TEXT NOT NULL,
      fixa BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
  `);
  console.log("✅ DB schema ready");
}

// --- auth middleware ---
function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "invalid token" });
  }
}

// --- routes ---
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/register", async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });
  if (password.length < 6) return res.status(400).json({ error: "password must be at least 6 chars" });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1,$2,$3)
       RETURNING id, email, name`,
      [email.toLowerCase(), hash, name || email]
    );
    const user = rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
    res.status(201).json({ token, user });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: "email already registered" });
    console.error(e);
    res.status(500).json({ error: "registration failed", detail: String(e.message || e) });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });
  try {
    const { rows } = await pool.query("SELECT id, email, name, password_hash FROM users WHERE email=$1", [email.toLowerCase()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "invalid email or password" });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "login failed", detail: String(e.message || e) });
  }
});

app.get("/api/me", auth, async (req, res) => {
  const { rows } = await pool.query("SELECT id,email,name FROM users WHERE id=$1", [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: "user not found" });
  res.json(rows[0]);
});

app.get("/api/transactions", auth, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, description as desc, valor_total as \"valorTotal\", tipo, categoria, parcelas, mes_inicio as \"mesInicio\", fixa FROM transactions WHERE user_id=$1 ORDER BY created_at ASC",
    [req.user.id]
  );
  // pg returns numeric as string — coerce
  const data = rows.map(r => ({ ...r, valorTotal: Number(r.valorTotal) }));
  res.json(data);
});

app.post("/api/transactions", auth, async (req, res) => {
  const { desc, valorTotal, tipo, categoria, parcelas, mesInicio, fixa } = req.body || {};
  if (!desc || valorTotal == null || !tipo || !categoria || !mesInicio) return res.status(400).json({ error: "missing fields" });
  const { rows } = await pool.query(
    `INSERT INTO transactions (user_id, description, valor_total, tipo, categoria, parcelas, mes_inicio, fixa)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, description as desc, valor_total as "valorTotal", tipo, categoria, parcelas, mes_inicio as "mesInicio", fixa`,
    [req.user.id, String(desc).trim(), Number(valorTotal), tipo, categoria, Number(parcelas) || 1, mesInicio, !!fixa]
  );
  const r = rows[0];
  r.valorTotal = Number(r.valorTotal);
  res.status(201).json(r);
});

app.delete("/api/transactions/:id", auth, async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM transactions WHERE id=$1 AND user_id=$2", [req.params.id, req.user.id]);
  if (!rowCount) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// start
(async () => {
  try {
    await waitForDb();
    await initDb();
    app.listen(PORT, "0.0.0.0", () => console.log(`✅ API listening on :${PORT}`));
  } catch (e) {
    console.error("❌ Startup failed:", e.message);
    process.exit(1);
  }
})();
