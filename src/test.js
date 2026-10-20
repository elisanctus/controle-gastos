// Frontend logic tests - no dependencies
// Run with: node src/test.js

// Parse voice tests
function parseValorVoice(t){
  t=t.toLowerCase().replace(/r\$/g,"");
  let m=t.match(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+\.\d{1,2}|\d+(?:,\d{1,2})?)\s*(?:reais|real)\b/i);
  if(m){
    let raw=m[1].trim();
    if(raw.includes(",")) raw=raw.replace(/\./g,"").replace(",",".");
    else if(/^\d{1,3}(\.\d{3})+$/.test(raw)) raw=raw.replace(/\./g,"");
    const n=parseFloat(raw);
    if(Number.isFinite(n)&&n>0) return Math.abs(n);
  }
  let nums=t.match(/\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+\.\d{1,2}|\d+(?:,\d{1,2})?|\d+/g);
  if(!nums) return null;
  let best=null;
  for(let raw of nums){
    let norm=raw.trim();
    if(norm.includes(",")) norm=norm.replace(/\./g,"").replace(",",".");
    else if(/^\d{1,3}(\.\d{3})+$/.test(norm)) norm=norm.replace(/\./g,"");
    const n=parseFloat(norm);
    if(!Number.isFinite(n)||n<=0) continue;
    if(best===null || n>best) best=n;
  }
  return best;
}

function parseTipoVoice(t){
  t=t.toLowerCase();
  if(/\breceita\b|\brecebi\b|\bganhei\b|\bsal[áa]rio\b|\brendimento\b/.test(t)) return "receita";
  if(/\bdespesa\b|\bgastei\b|\bpaguei\b|\bcomprei\b|\bdespesa\b/.test(t)) return "despesa";
  return null;
}

function parseCategoriaVoice(t, _tipo){
  const cats = ["Alimentação","Transporte","Moradia","Lazer","Saúde","Salário","Outros"];
  t=t.toLowerCase();
  for(let c of cats) if(t.includes(c.toLowerCase())) return c;
  return "Outros";
}

function parseParcelasVoice(t){
  t=t.toLowerCase();
  let m=t.match(/(\d+)\s*(?:vezes|x|parcelas|parcelado)/i);
  if(m) return parseInt(m[1]);
  return 1;
}

function parseFixaVoice(t){
  t=t.toLowerCase();
  return /\bfixa\b|\bmensal\b|\bretorno\b/.test(t);
}

// Tests
const tests = [];
let passed = 0, failed = 0;

const test = (name, fn) => tests.push({ name, fn });
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

// Voice parsing tests
test("parseValorVoice: simple '50 reais'", () => {
  const v = parseValorVoice("50 reais");
  assert(v === 50, `Expected 50, got ${v}`);
});

test("parseValorVoice: decimal '25.50 reais'", () => {
  const v = parseValorVoice("25.50 reais");
  assert(v === 25.50, `Expected 25.50, got ${v}`);
});

test("parseValorVoice: formatted '1.000,50 reais'", () => {
  const v = parseValorVoice("1.000,50 reais");
  assert(v === 1000.50, `Expected 1000.50, got ${v}`);
});

test("parseValorVoice: no unit '100'", () => {
  const v = parseValorVoice("gastei 100");
  assert(v === 100, `Expected 100, got ${v}`);
});

test("parseValorVoice: invalid input", () => {
  const v = parseValorVoice("nenhum valor aqui");
  assert(v === null, `Expected null, got ${v}`);
});

test("parseTipoVoice: despesa", () => {
  const t = parseTipoVoice("gastei 50 reais");
  assert(t === "despesa", `Expected despesa, got ${t}`);
});

test("parseTipoVoice: receita", () => {
  const t = parseTipoVoice("recebi 1000 reais");
  assert(t === "receita", `Expected receita, got ${t}`);
});

test("parseTipoVoice: salário", () => {
  const t = parseTipoVoice("salário de 3000");
  assert(t === "receita", `Expected receita, got ${t}`);
});

test("parseTipoVoice: null", () => {
  const t = parseTipoVoice("um valor qualquer");
  assert(t === null, `Expected null, got ${t}`);
});

test("parseCategoriaVoice: alimentação", () => {
  const c = parseCategoriaVoice("comprei alimentação", "despesa");
  assert(c === "Alimentação", `Expected Alimentação, got ${c}`);
});

test("parseCategoriaVoice: transporte", () => {
  const c = parseCategoriaVoice("uber transporte", "despesa");
  assert(c === "Transporte", `Expected Transporte, got ${c}`);
});

test("parseCategoriaVoice: moradia", () => {
  const c = parseCategoriaVoice("aluguel moradia", "despesa");
  assert(c === "Moradia", `Expected Moradia, got ${c}`);
});

test("parseCategoriaVoice: default outros", () => {
  const c = parseCategoriaVoice("coisa aleatória", "despesa");
  assert(c === "Outros", `Expected Outros, got ${c}`);
});

test("parseParcelasVoice: 3x", () => {
  const p = parseParcelasVoice("paguei em 3 vezes");
  assert(p === 3, `Expected 3, got ${p}`);
});

test("parseParcelasVoice: 12 parcelas", () => {
  const p = parseParcelasVoice("12 parcelas");
  assert(p === 12, `Expected 12, got ${p}`);
});

test("parseParcelasVoice: no parcelas mention", () => {
  const p = parseParcelasVoice("gastei 50");
  assert(p === 1, `Expected 1, got ${p}`);
});

test("parseFixaVoice: fixa", () => {
  const f = parseFixaVoice("aluguel fixa");
  assert(f === true, `Expected true, got ${f}`);
});

test("parseFixaVoice: mensal", () => {
  const f = parseFixaVoice("conta de água mensal");
  assert(f === true, `Expected true, got ${f}`);
});

test("parseFixaVoice: not fixa", () => {
  const f = parseFixaVoice("comprei um livro");
  assert(f === false, `Expected false, got ${f}`);
});

// Run all tests
(async () => {
  console.log(`\n🧪 Frontend Logic Tests (${tests.length} tests)\n`);
  
  for (const { name, fn } of tests) {
    try {
      fn();
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
