# Satta CRM API

API REST do Satta CRM — Node.js + Express + Firebase Admin (ou InMemoryRepository para dev).

## Início rápido

```bash
cp .env.example .env
npm install
npm run dev        # inicia na porta 3000
```

## Ambiente de desenvolvimento / seed

O seed cria dados fictícios para todos os segmentos do CRM sem necessidade de criar contas manualmente, pagar ou receber e-mails.

### Criar dados de demonstração

```bash
npm run seed
```

O script:
1. Remove contas de seed anteriores (emails `seed-*@satta.dev`)
2. Recria 6 contas completas, uma por segmento
3. Imprime a tabela de acesso no terminal

### Contas geradas

| Segmento    | Email                          | Senha       | Plano        |
|-------------|--------------------------------|-------------|--------------|
| Barbearia   | seed-barbershop@satta.dev      | Satta@2026  | Básico       |
| Petshop     | seed-petshop@satta.dev         | Satta@2026  | Profissional |
| Clínica     | seed-clinic@satta.dev          | Satta@2026  | Profissional |
| Hotel       | seed-hotel@satta.dev           | Satta@2026  | Crescimento  |
| Lava-rápido | seed-car_wash@satta.dev        | Satta@2026  | Básico       |
| Salão       | seed-beauty_salon@satta.dev    | Satta@2026  | Crescimento  |

Cada conta tem: 8-12 clientes, 7-8 agendamentos (incluindo hoje), 15-20 vendas, 8-10 despesas, e estoque populado para petshop e salão.

### Endpoints de desenvolvimento (NODE_ENV !== production)

```
GET  /api/dev/accounts        → lista contas seed com token JWT gerado
POST /api/dev/login-as        → { segment } → { token, user, account }
POST /api/dev/reset-seed      → recria todos os dados do seed
```

### Painel de acesso rápido (frontend)

Com a API rodando e o seed executado, acesse `http://localhost:5173/dev` no frontend para:
- Ver todos os segmentos disponíveis
- Entrar como qualquer segmento com um clique
- Resetar os dados sem sair do ambiente

O link "Acesso de desenvolvimento" aparece automaticamente na tela de login quando `NODE_ENV=development`.

### Segurança

Todos os recursos de dev são bloqueados quando `NODE_ENV=production`:
- `seed.js` encerra com erro na primeira linha
- `dev.routes.js` lança exceção ao ser importado
- O router só registra `/dev` quando `NODE_ENV !== 'production'`
- O frontend só renderiza `/dev` e o link de login quando `import.meta.env.DEV`

## Scripts

| Comando        | O que faz                                |
|----------------|------------------------------------------|
| `npm run dev`  | Inicia com hot-reload (`node --watch`)   |
| `npm run start`| Inicia em modo produção                  |
| `npm run seed` | Cria/recria dados de demonstração (dev)  |

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha. Sem `USE_FIRESTORE=true`, o sistema usa InMemoryRepository (dados em RAM, perdidos ao reiniciar — ideal para dev + seed).
