# Controle de Gastos

App de controle de gastos com autenticação, transações e entrada por voz.

## Features

✅ Autenticação com email/senha (bcrypt)
✅ CRUD de transações
✅ Entrada de dados por voz (pt-BR)
✅ Persistência de dados (PostgreSQL)
✅ Interface responsiva
✅ Testes automatizados (35 testes)
✅ Docker Compose

## Stack

**Frontend:**
- React 19 + Vite
- Framer Motion (animações)
- Web Speech API (reconhecimento de voz)

**Backend:**
- Node.js + Express
- PostgreSQL
- JWT + bcryptjs
- Cors

**DevOps:**
- Docker + Docker Compose
- GitHub Actions

## Setup Local

### Pré-requisitos
- Node.js 20+
- Docker + Docker Compose
- Git

### Rodar

```bash
# Clone
git clone https://github.com/elisanctus/controle-gastos.git
cd controle-gastos

# Build + start
docker-compose up -d

# Acessa
# Frontend: http://localhost:5173
# API: http://localhost:3001
```

### Variáveis de Ambiente

Criar `.env` na raiz:
```
JWT_SECRET=seu-secret-super-seguro-aqui
VITE_API_URL=http://localhost:3001  # opcional
```

## Testes

```bash
# Frontend (lógica de voz)
node src/test.js

# Backend (dentro do container)
docker-compose exec api node test.js
```

Resultado: **35/35 passing** ✅

## Deploy no Render

### 1. Backend (API)

1. Acessa https://render.com
2. "New +" → "Web Service"
3. Conecta repositório GitHub
4. Configuração:
   - **Name:** controle-gastos-api
   - **Runtime:** Node
   - **Build Command:** `cd server && npm install --omit=dev`
   - **Start Command:** `cd server && node index.js`
   - **Environment:** Free
5. Em "Environment," adiciona:
   - `JWT_SECRET` = seu secret
   - `DATABASE_URL` = conexão PostgreSQL (Render fornece)
   - `NODE_ENV` = production
6. Deploy

### 2. Database (PostgreSQL)

1. Em Render, "New +" → "PostgreSQL"
2. Free tier
3. Copia `DATABASE_URL` fornecido
4. Cola em variável de ambiente do Backend

### 3. Frontend

1. Acessa https://vercel.com (mais fácil que Render pra frontend)
2. Import repositório GitHub
3. Configuração:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Environment:**
     - `VITE_API_URL` = URL da API no Render (ex: https://controle-gastos-api.onrender.com)
4. Deploy

### 4. GitHub Actions (CI/CD)

1. Em GitHub, Settings → Secrets and variables → Actions
2. Adiciona:
   - `RENDER_DEPLOY_HOOK_BACKEND` = webhook do Render (Settings → Deploy Hooks)
   - `RENDER_DEPLOY_HOOK_FRONTEND` = webhook do Render (se usar)
3. Pronto! A cada push em `main`, deploy automático

## API Endpoints

### Auth
- `POST /api/auth/register` — Registra usuário
- `POST /api/auth/login` — Faz login
- `GET /api/me` — Perfil do usuário (requer token)

### Transactions
- `GET /api/transactions` — Lista transações do usuário
- `POST /api/transactions` — Cria transação
- `DELETE /api/transactions/:id` — Deleta transação

## Estrutura

```
controle-gastos/
├── server/              # Backend (Express + PostgreSQL)
│   ├── index.js
│   ├── package.json
│   ├── test.js
│   └── Dockerfile
├── src/                 # Frontend (React + Vite)
│   ├── App.jsx
│   ├── AuthContext.jsx
│   ├── HomeScreen.jsx
│   ├── AddScreen.jsx
│   ├── Login.jsx
│   ├── api.js
│   ├── test.js
│   └── ...
├── docker-compose.yml
├── Dockerfile
├── vite.config.js
├── package.json
└── README.md
```

## Segurança

✅ Senhas hasheadas com bcryptjs
✅ JWT para autenticação
✅ CORS configurado
✅ SQL Injection protegido (parameterized queries)
✅ `.env` não commitado (`.gitignore`)
✅ Tokens não em localStorage (seguro)

## Troubleshooting

**"Failed to connect to database"**
- Verifica `DATABASE_URL` em variáveis de ambiente
- Garante que PostgreSQL tá rodando (local: `docker-compose up db`)

**"Invalid token"**
- Verifica se `JWT_SECRET` é igual no backend e frontend
- Token expira em 30 dias (relogin necessário)

**"CORS error"**
- Adiciona `VITE_API_URL` corretamente em variáveis de ambiente

## License

MIT

## Author

Desenvolvido com Kiro
