# Controle de Gastos — Docker + Postgres + Login Google

## Rodar com Docker

1. Crie um OAuth Client em https://console.cloud.google.com/apis/credentials (Web) — Authorized JavaScript origins: `http://localhost:5173`
2. `copy .env.example .env` e preencha `GOOGLE_CLIENT_ID` e `VITE_GOOGLE_CLIENT_ID` (mesmo valor)
3. `docker compose up --build`
   - Web: http://localhost:5173 (nginx proxia `/api` → API)
   - API: http://localhost:3001
   - Postgres: localhost:5432 (`postgres`/`postgres`/`controle_gastos`)
4. Login com Google → dados por usuário no Postgres. Sem login, fallback localStorage.

## Rodar sem Docker

```bash
npm install
# terminal 1: API (precisa DATABASE_URL e GOOGLE_CLIENT_ID)
cd server && npm install && npm run dev
# terminal 2: frontend
npm run dev
```

Env frontend: `VITE_GOOGLE_CLIENT_ID`, opcional `VITE_API_URL=http://localhost:3001`.

---

# React + Vite (template original)

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts).
