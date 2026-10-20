import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const API = "http://localhost:3001";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// Utility
const req = async (path, opts = {}) => {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const res = await fetch(`${API}${path}`, {
    method: opts.method || "GET",
    body: opts.body,
    headers
  });
  const data = await res.json();
  return { status: res.status, data };
};

const withAuth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

const uniqueEmail = (base) => `${base}${Date.now()}@test.com`;

// Tests
const tests = [];
let passed = 0, failed = 0;

const test = (name, fn) => tests.push({ name, fn });
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

test("Register: valid email/password", async () => {
  const { status, data } = await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: uniqueEmail("user1"), password: "pass123", name: "User One" })
  });
  assert(status === 201, `Expected 201, got ${status}`);
  assert(data.token, "No token returned");
  assert(data.user.id, "No user ID");
});

test("Register: duplicate email", async () => {
  const email = uniqueEmail("user2");
  await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password: "pass123" })
  });
  const { status, data } = await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password: "pass456" })
  });
  assert(status === 409, `Expected 409, got ${status}`);
  assert(data.error === "email already registered", "Wrong error message");
});

test("Register: password too short", async () => {
  const { status, data } = await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: uniqueEmail("user3"), password: "short" })
  });
  assert(status === 400, `Expected 400, got ${status}`);
  assert(data.error.includes("6 chars"), "Wrong error message");
});

test("Login: valid credentials", async () => {
  const email = uniqueEmail("user4");
  await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password: "pass123" })
  });
  const { status, data } = await req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "pass123" })
  });
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.token, "No token returned");
});

test("Login: wrong password", async () => {
  const email = uniqueEmail("user5");
  await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password: "pass123" })
  });
  const { status, data } = await req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "wrongpass" })
  });
  assert(status === 401, `Expected 401, got ${status}`);
  assert(data.error === "invalid email or password", "Wrong error message");
});

test("Login: nonexistent email", async () => {
  const { status, data } = await req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: uniqueEmail("nouser"), password: "pass123" })
  });
  assert(status === 401, `Expected 401, got ${status}`);
});

test("GET /api/me: valid token", async () => {
  const reg = await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: uniqueEmail("user6"), password: "pass123", name: "User Six" })
  });
  const token = reg.data.token;
  const { status, data } = await req("/api/me", withAuth(token));
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.name === "User Six", "Name mismatch");
});

test("GET /api/me: missing token", async () => {
  const { status } = await req("/api/me");
  assert(status === 401, `Expected 401, got ${status}`);
});

test("GET /api/me: invalid token", async () => {
  const { status } = await req("/api/me", { headers: { Authorization: "Bearer invalid" } });
  assert(status === 401, `Expected 401, got ${status}`);
});

// Transaction tests
test("POST /api/transactions: create tx", async () => {
  const reg = await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: uniqueEmail("user7"), password: "pass123" })
  });
  const token = reg.data.token;
  const { status, data } = await req("/api/transactions", {
    method: "POST",
    body: JSON.stringify({
      desc: "Almoço",
      valorTotal: 25.50,
      tipo: "despesa",
      categoria: "Alimentação",
      parcelas: 1,
      mesInicio: "2026-10",
      fixa: false
    }),
    ...withAuth(token)
  });
  assert(status === 201, `Expected 201, got ${status}`);
  assert(data.desc === "Almoço", "Desc mismatch");
  assert(data.valorTotal === 25.50, "Value mismatch");
  assert(data.id, "No transaction ID");
});

test("POST /api/transactions: missing fields", async () => {
  const reg = await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: uniqueEmail("user8"), password: "pass123" })
  });
  const token = reg.data.token;
  const { status } = await req("/api/transactions", {
    method: "POST",
    body: JSON.stringify({ desc: "Test" }),
    ...withAuth(token)
  });
  assert(status === 400, `Expected 400, got ${status}`);
});

test("GET /api/transactions: list tx", async () => {
  const reg = await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: uniqueEmail("user9"), password: "pass123" })
  });
  const token = reg.data.token;
  
  await req("/api/transactions", {
    method: "POST",
    body: JSON.stringify({
      desc: "TX1",
      valorTotal: 10,
      tipo: "despesa",
      categoria: "Outros",
      parcelas: 1,
      mesInicio: "2026-10",
      fixa: false
    }),
    ...withAuth(token)
  });
  await req("/api/transactions", {
    method: "POST",
    body: JSON.stringify({
      desc: "TX2",
      valorTotal: 20,
      tipo: "receita",
      categoria: "Salário",
      parcelas: 1,
      mesInicio: "2026-10",
      fixa: false
    }),
    ...withAuth(token)
  });
  
  const { status, data } = await req("/api/transactions", withAuth(token));
  assert(status === 200, `Expected 200, got ${status}`);
  assert(Array.isArray(data), "Response not array");
  assert(data.length === 2, `Expected 2 txs, got ${data.length}`);
});

test("DELETE /api/transactions/:id: delete tx", async () => {
  const reg = await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: uniqueEmail("user10"), password: "pass123" })
  });
  const token = reg.data.token;
  
  const tx = await req("/api/transactions", {
    method: "POST",
    body: JSON.stringify({
      desc: "TXDelete",
      valorTotal: 50,
      tipo: "despesa",
      categoria: "Outros",
      parcelas: 1,
      mesInicio: "2026-10",
      fixa: false
    }),
    ...withAuth(token)
  });
  const txId = tx.data.id;
  
  const { status } = await req(`/api/transactions/${txId}`, {
    method: "DELETE",
    ...withAuth(token)
  });
  assert(status === 200, `Expected 200, got ${status}`);
  
  const list = await req("/api/transactions", withAuth(token));
  const found = list.data.find(t => t.id === txId);
  assert(!found, "TX still exists after delete");
});

test("DELETE /api/transactions/:id: not found", async () => {
  const reg = await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: uniqueEmail("user11"), password: "pass123" })
  });
  const token = reg.data.token;
  const { status } = await req("/api/transactions/nonexistent", {
    method: "DELETE",
    ...withAuth(token)
  });
  assert(status === 404, `Expected 404, got ${status}`);
});

test("POST /api/transactions: isolation (user can't see others txs)", async () => {
  const user1 = await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: uniqueEmail("user12a"), password: "pass123" })
  });
  const user2 = await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: uniqueEmail("user12b"), password: "pass123" })
  });
  
  const token1 = user1.data.token;
  const token2 = user2.data.token;
  
  await req("/api/transactions", {
    method: "POST",
    body: JSON.stringify({
      desc: "User1 TX",
      valorTotal: 100,
      tipo: "despesa",
      categoria: "Outros",
      parcelas: 1,
      mesInicio: "2026-10",
      fixa: false
    }),
    ...withAuth(token1)
  });
  
  const list2 = await req("/api/transactions", withAuth(token2));
  assert(list2.data.length === 0, "User2 can see User1 txs!");
});

// Health check
test("GET /api/health: service up", async () => {
  const { status, data } = await req("/api/health");
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.ok === true, "Health not OK");
});

// Run all tests
(async () => {
  console.log(`\n🧪 Running ${tests.length} tests...\n`);
  
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (err) {
      console.log(`❌ ${name}: ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
})();
