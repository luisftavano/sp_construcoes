# Satta CRM

Sistema de gestão para negócios locais — agenda, clientes, financeiro, estoque e automações via WhatsApp.

---

## O que tem aqui

```
satta-crm/       → frontend (React + Vite)
satta-crm-api/   → backend (Node.js + Express)
```

---

## Pré-requisitos

Instale antes de começar:

- [Node.js 20+](https://nodejs.org) — baixe a versão LTS
- [Git](https://git-scm.com)

Para confirmar que está instalado, abra o terminal e rode:

```bash
node -v   # deve mostrar v20.x.x ou superior
npm -v    # deve mostrar algo como 10.x.x
```

---

## Como rodar localmente

### 1. Clone o projeto

```bash
git clone https://github.com/sattaanalytics/satta-crm.git
cd satta-crm
```

### 2. Configure o backend

```bash
cd satta-crm-api
npm install
cp .env.example .env
```

Abra o arquivo `.env` e preencha pelo menos:

```env
JWT_SECRET=qualquer_frase_longa_aqui
NODE_ENV=development
KANGO_MOCK=true
PORT=3000
```

Inicie o backend:

```bash
npm run dev
```

O terminal deve mostrar algo como `Server running on port 3000`. **Deixa essa janela aberta.**

### 3. Configure o frontend

Abra **outro terminal** e rode:

```bash
cd satta-crm
npm install
cp .env.example .env
```

Abra o `.env` e preencha com as credenciais do Firebase (peça para o Luis):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Inicie o frontend:

```bash
npm run dev
```

### 4. Acesse no navegador

Abra: [http://localhost:5173](http://localhost:5173)

---

## Credenciais de acesso (demo)

Peça para o Luis as credenciais de email e senha da conta de demonstração.

---

## Dúvidas

Fala com o Luis.
