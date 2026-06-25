import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { authenticate } from '../src/shared/middlewares/authenticate.js'
import { checkPlanFeature } from '../src/shared/middlewares/checkPlanFeature.js'
import { resolveAccountId } from '../src/shared/resolveAccountId.js'
import { errorHandler } from '../src/shared/middlewares/errorHandler.js'
import { registerEventListeners } from '../src/shared/registerEventListeners.js'
import apiRouter from '../src/routes/index.js'

// Carrega .env manualmente
try {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  env.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  })
} catch {}

// Importado depois do carregamento do .env, porque inicializa o Firebase Admin
// lendo FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY de process.env
const { SYSTEM_PROMPT, buildContexto } = await import('../lib/kango.js')

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
const isProd = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT
app.use(cors({ origin: isProd ? false : 'http://localhost:5173' }))

// Stripe webhook precisa do body raw — registrar ANTES do express.json
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const { stripeWebhook } = await import('../src/modules/billing/billing.controller.js')
  return stripeWebhook(req, res)
})

app.use(express.json({ limit: '10kb' }))

// ── Rate limiting simples em memória ──
const rateMap = new Map()
const LIMITE = 30        // máx requisições
const JANELA = 60_000    // por minuto

function rateLimiter(req, res, next) {
  const uid = req.uid || req.ip
  const agora = Date.now()
  const registro = rateMap.get(uid) || { count: 0, inicio: agora }

  if (agora - registro.inicio > JANELA) {
    registro.count = 0
    registro.inicio = agora
  }

  registro.count++
  rateMap.set(uid, registro)

  if (registro.count > LIMITE) {
    return res.status(429).json({ erro: 'Muitas requisições. Aguarde um minuto.' })
  }

  next()
}

// ── Rota do chat ──
app.post('/api/chat', authenticate, rateLimiter, async (req, res) => {
  const { pergunta } = req.body

  if (!pergunta) {
    return res.status(400).json({ erro: 'Dados incompletos.' })
  }

  // Sanitização básica
  const perguntaLimpa = String(pergunta).slice(0, 500)

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ erro: 'API não configurada.' })
  }

  try {
    const contextoLimpo = await buildContexto(req.uid)
    if (!contextoLimpo) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Dados do negócio:\n${contextoLimpo}\n\nPergunta: ${perguntaLimpa}`,
      }],
    })

    res.json({ resposta: msg.content[0].text })
  } catch (err) {
    console.error('Erro Claude API:', err.message)
    res.status(500).json({ erro: 'Erro ao consultar a IA.' })
  }
})

// ── Feedback ──────────────────────────────────────────
app.post('/api/feedback', authenticate, async (req, res) => {
  const { mensagem, email } = req.body
  if (!mensagem?.trim()) return res.status(400).json({ erro: 'Mensagem vazia.' })

  // Registra no console por enquanto; plugar emailSender quando disponível
  console.log(`[FEEDBACK] uid=${req.uid} email=${email}\n${mensagem}`)

  // Salvar no Firestore como evidência
  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    await db.collection('feedbacks').add({
      uid: req.uid,
      email: email || null,
      mensagem: String(mensagem).slice(0, 2000),
      criadoEm: new Date(),
    })
  } catch {}

  res.json({ ok: true })
})

// ── Sessions ───────────────────────────────────────────
app.get('/api/sessions', authenticate, async (req, res) => {
  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    const snap = await db.collection('sessions')
      .where('userId', '==', req.uid)
      .orderBy('lastUsedAt', 'desc')
      .limit(20)
      .get()
    const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    res.json({ data: sessions })
  } catch (e) {
    res.status(500).json({ erro: e.message })
  }
})

app.delete('/api/sessions/:id', authenticate, async (req, res) => {
  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    const ref = db.collection('sessions').doc(req.params.id)
    const snap = await ref.get()
    if (!snap.exists || snap.data().userId !== req.uid) {
      return res.status(404).json({ erro: 'Sessão não encontrada.' })
    }
    await ref.delete()
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ erro: e.message })
  }
})

// ── Admin middleware ──────────────────────────────────
function verificarAdmin(req, res, next) {
  if (!req.email?.endsWith('@sattaanalytics.com.br')) {
    return res.status(403).json({ erro: 'Acesso restrito.' })
  }
  next()
}

// ── Tickets ────────────────────────────────────────────
app.post('/api/tickets', authenticate, async (req, res) => {
  const { categoria, assunto, descricao } = req.body
  if (!categoria || !assunto?.trim() || !descricao?.trim()) {
    return res.status(400).json({ erro: 'Dados incompletos.' })
  }

  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()

    const usuarioSnap = await db.collection('usuarios').doc(req.uid).get()
    const u = usuarioSnap.data() || {}
    const accountId = u.accountId || null

    let empresaNome = null
    let codigoSatta = null
    if (accountId) {
      const empSnap = await db.collection('empresas').doc(accountId).get()
      const emp = empSnap.data() || {}
      empresaNome = emp.nome || null
      codigoSatta = accountId.slice(0, 8).toUpperCase()
    }

    const agora = new Date()
    const ticketRef = db.collection('tickets').doc()

    await ticketRef.set({
      accountId,
      userId: req.uid,
      userEmail: req.email,
      userName: u.nome || req.email,
      empresaNome,
      codigoSatta,
      categoria: String(categoria).slice(0, 50),
      assunto: String(assunto).slice(0, 200),
      status: 'aberto',
      criadoEm: agora,
      atualizadoEm: agora,
      ultimaMensagem: String(descricao).slice(0, 150),
      ultimaMensagemEm: agora,
      naoLidasAdmin: 1,
      naoLidasUser: 0,
    })

    await ticketRef.collection('mensagens').add({
      remetente: 'user',
      texto: String(descricao).slice(0, 5000),
      nomeRemetente: u.nome || req.email,
      criadoEm: agora,
    })

    console.log(`[TICKET] novo id=${ticketRef.id} uid=${req.uid} assunto="${assunto}"`)
    res.json({ id: ticketRef.id, ok: true })
  } catch (e) {
    console.error('Erro ao criar ticket:', e.message)
    res.status(500).json({ erro: 'Erro ao criar chamado.' })
  }
})

app.get('/api/tickets', authenticate, async (req, res) => {
  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    const snap = await db.collection('tickets')
      .where('userId', '==', req.uid)
      .orderBy('atualizadoEm', 'desc')
      .limit(50)
      .get()
    res.json({ data: snap.docs.map(d => ({ id: d.id, ...d.data() })) })
  } catch (e) {
    res.status(500).json({ erro: e.message })
  }
})

app.get('/api/tickets/:id', authenticate, async (req, res) => {
  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    const ref = db.collection('tickets').doc(req.params.id)
    const snap = await ref.get()
    if (!snap.exists) return res.status(404).json({ erro: 'Chamado não encontrado.' })

    const data = snap.data()
    const isAdmin = req.email?.endsWith('@sattaanalytics.com.br')
    if (!isAdmin && data.userId !== req.uid) {
      return res.status(403).json({ erro: 'Acesso negado.' })
    }

    const msgSnap = await ref.collection('mensagens').orderBy('criadoEm', 'asc').get()
    const mensagens = msgSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    // Reset unread counter for who's reading
    const field = isAdmin ? 'naoLidasAdmin' : 'naoLidasUser'
    if (data[field] > 0) await ref.update({ [field]: 0 })

    res.json({ id: snap.id, ...data, mensagens })
  } catch (e) {
    res.status(500).json({ erro: e.message })
  }
})

app.post('/api/tickets/:id/mensagem', authenticate, async (req, res) => {
  const { texto } = req.body
  if (!texto?.trim()) return res.status(400).json({ erro: 'Mensagem vazia.' })

  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    const ref = db.collection('tickets').doc(req.params.id)
    const snap = await ref.get()
    if (!snap.exists || snap.data().userId !== req.uid) {
      return res.status(403).json({ erro: 'Acesso negado.' })
    }
    if (snap.data().status === 'resolvido') {
      return res.status(400).json({ erro: 'Chamado encerrado.' })
    }

    const agora = new Date()
    const u = snap.data()
    const usuarioSnap = await db.collection('usuarios').doc(req.uid).get()
    const nome = usuarioSnap.data()?.nome || req.email

    await ref.collection('mensagens').add({
      remetente: 'user',
      texto: String(texto).slice(0, 5000),
      nomeRemetente: nome,
      criadoEm: agora,
    })

    await ref.update({
      atualizadoEm: agora,
      ultimaMensagem: String(texto).slice(0, 150),
      ultimaMensagemEm: agora,
      status: u.status === 'resolvido' ? 'aberto' : u.status,
      naoLidasAdmin: (u.naoLidasAdmin || 0) + 1,
    })

    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ erro: e.message })
  }
})

// ── Admin: tickets ─────────────────────────────────────
app.get('/api/admin/tickets', authenticate, verificarAdmin, async (req, res) => {
  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    const status = req.query.status
    let query = db.collection('tickets').orderBy('atualizadoEm', 'desc').limit(100)
    if (status && status !== 'todos') query = query.where('status', '==', status)
    const snap = await query.get()
    res.json({ data: snap.docs.map(d => ({ id: d.id, ...d.data() })) })
  } catch (e) {
    res.status(500).json({ erro: e.message })
  }
})

app.post('/api/admin/tickets/:id/reply', authenticate, verificarAdmin, async (req, res) => {
  const { texto } = req.body
  if (!texto?.trim()) return res.status(400).json({ erro: 'Mensagem vazia.' })

  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    const ref = db.collection('tickets').doc(req.params.id)
    const snap = await ref.get()
    if (!snap.exists) return res.status(404).json({ erro: 'Chamado não encontrado.' })

    const agora = new Date()
    const t = snap.data()

    await ref.collection('mensagens').add({
      remetente: 'admin',
      texto: String(texto).slice(0, 5000),
      nomeRemetente: 'Equipe Satta',
      criadoEm: agora,
    })

    await ref.update({
      atualizadoEm: agora,
      ultimaMensagem: String(texto).slice(0, 150),
      ultimaMensagemEm: agora,
      status: t.status === 'aberto' ? 'em_andamento' : t.status,
      naoLidasUser: (t.naoLidasUser || 0) + 1,
    })

    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ erro: e.message })
  }
})

app.patch('/api/admin/tickets/:id/status', authenticate, verificarAdmin, async (req, res) => {
  const { status } = req.body
  const validos = ['aberto', 'em_andamento', 'resolvido']
  if (!validos.includes(status)) return res.status(400).json({ erro: 'Status inválido.' })

  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    const ref = db.collection('tickets').doc(req.params.id)
    const snap = await ref.get()
    if (!snap.exists) return res.status(404).json({ erro: 'Chamado não encontrado.' })
    await ref.update({ status, atualizadoEm: new Date() })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ erro: e.message })
  }
})

// ── Activity Log ───────────────────────────────────────
app.post('/api/log', authenticate, async (req, res) => {
  const { acao, detalhes, clienteNome, valor } = req.body
  if (!acao) return res.status(400).json({ erro: 'Ação não informada.' })

  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    const accountId = await resolveAccountId(db, req.uid)

    await db.collection('empresas').doc(accountId).collection('activityLog').add({
      acao:        String(acao).slice(0, 100),
      detalhes:    detalhes    ? String(detalhes).slice(0, 500)    : null,
      clienteNome: clienteNome ? String(clienteNome).slice(0, 200) : null,
      valor:       valor != null ? Number(valor) : null,
      userId:      req.uid,
      userEmail:   req.email,
      criadoEm:    new Date(),
    })

    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ erro: e.message })
  }
})

app.get('/api/activityLog', authenticate, checkPlanFeature('team_audit'), async (req, res) => {
  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    // requirePlan já resolveu o accountId e checou o plano
    const accountId = req.accountId ?? await resolveAccountId(db, req.uid)

    // Apenas dono ou admin podem ler
    const membroSnap = await db.collection('membros').doc(req.uid).get()
    const membro = membroSnap.exists ? membroSnap.data() : null
    const isOwner = !membro
    if (!isOwner && membro?.role !== 'admin') {
      return res.status(403).json({ erro: 'Acesso restrito.' })
    }

    const snap = await db.collection('empresas').doc(accountId).collection('activityLog')
      .orderBy('criadoEm', 'desc').limit(300).get()

    res.json({ data: snap.docs.map(d => ({ id: d.id, ...d.data() })) })
  } catch (e) {
    res.status(500).json({ erro: e.message })
  }
})

// ── Estoque (inventory) ────────────────────────────────
app.get('/api/inventory', authenticate, async (req, res) => {
  const lim = Math.min(parseInt(req.query.limit) || 100, 300)
  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    const accountId = await resolveAccountId(db, req.uid)

    const snap = await db.collection('empresas').doc(accountId).collection('estoque')
      .orderBy('nome').limit(lim).get()

    const data = snap.docs.map(d => {
      const doc = d.data()
      return {
        id:        d.id,
        name:      doc.nome,
        brand:     doc.marca   ?? null,
        unit:      doc.unidade ?? 'un',
        quantity:  doc.quantidade,
        minStock:  doc.estoque_minimo ?? null,
        costPrice: doc.preco_custo   ?? null,
        sellPrice: doc.preco_venda   ?? null,
      }
    })

    res.json({ data })
  } catch (e) {
    res.status(500).json({ erro: e.message })
  }
})

// ── Vendas ─────────────────────────────────────────────
app.post('/api/sales', authenticate, async (req, res) => {
  const { items, paymentMethod, discountAmount, soldAt } = req.body
  if (!Array.isArray(items) || !items.length || !paymentMethod) {
    return res.status(400).json({ erro: 'Dados incompletos.' })
  }

  try {
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore')
    const db = getFirestore()
    const accountId = await resolveAccountId(db, req.uid)
    const empresaRef = db.collection('empresas').doc(accountId)

    const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0)
    const discount = Math.max(0, Number(discountAmount) || 0)
    const total    = Math.max(0, subtotal - discount)

    const batch = db.batch()

    const saleRef = empresaRef.collection('vendas').doc()
    batch.set(saleRef, {
      userId:         req.uid,
      userEmail:      req.email,
      items:          items.map(i => ({
        type:            i.type,
        inventoryItemId: i.inventoryItemId ?? null,
        name:            String(i.name).slice(0, 200),
        quantity:        Number(i.quantity),
        unitPrice:       Number(i.unitPrice),
        total:           Number(i.quantity) * Number(i.unitPrice),
      })),
      paymentMethod,
      subtotal,
      discountAmount: discount,
      total,
      soldAt:    soldAt ? new Date(soldAt) : new Date(),
      criadoEm:  new Date(),
    })

    // Desconta estoque dos produtos
    for (const item of items) {
      if (item.type === 'product' && item.inventoryItemId) {
        const invRef = empresaRef.collection('estoque').doc(item.inventoryItemId)
        batch.update(invRef, { quantidade: FieldValue.increment(-Number(item.quantity)) })
      }
    }

    await batch.commit()

    // Log da venda
    const desconto = discount > 0 ? ` · desconto R$ ${discount.toFixed(2)}` : ''
    await empresaRef.collection('activityLog').add({
      acao:      'venda_registrada',
      detalhes:  `${items.length} item(s) · ${paymentMethod}${desconto}`,
      valor:     total,
      userId:    req.uid,
      userEmail: req.email,
      criadoEm:  new Date(),
    })

    console.log(`[VENDA] id=${saleRef.id} uid=${req.uid} total=${total}`)
    res.json({ id: saleRef.id, ok: true })
  } catch (e) {
    console.error('Erro ao registrar venda:', e.message)
    res.status(500).json({ erro: 'Erro ao registrar venda.' })
  }
})

// ── AI Chat — Kango com tool calling ──────────────────
app.post('/api/ai/chat', authenticate, rateLimiter, async (req, res) => {
  const { message, conversationHistory = [] } = req.body

  if (!message?.trim()) {
    return res.status(400).json({ erro: 'Mensagem vazia.' })
  }

  if (process.env.KANGO_MOCK === 'true') {
    return res.json({
      reply: 'Estou em modo de demonstração. Use os atalhos acima para consultar seus dados.',
      toolResults: [],
    })
  }

  const apiKey = process.env.KANGO_API_KEY || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ erro: 'API não configurada.' })
  }

  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    const accountId = await resolveAccountId(db, req.uid)

    const empSnap = await db.collection('empresas').doc(accountId).get()
    const emp = empSnap.data() || {}

    const { buildSystemPrompt } = await import('../lib/kango.js')
    const { KANGO_TOOLS, executeTool } = await import('../lib/kangoTools.js')

    const context = {
      businessName: emp.nome ?? 'seu negócio',
      ownerName:    '',
      todayDate:    new Date().toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }),
    }

    const anthropic = new Anthropic({ apiKey })
    const MAX_HISTORY = 10
    const messages = [
      ...conversationHistory.slice(-MAX_HISTORY),
      { role: 'user', content: String(message).trim().slice(0, 500) },
    ]

    let response = await anthropic.messages.create({
      model:      process.env.KANGO_MODEL || 'claude-sonnet-4-6',
      max_tokens: parseInt(process.env.KANGO_MAX_TOKENS || '1024'),
      system:     buildSystemPrompt(context),
      tools:      KANGO_TOOLS,
      messages,
    })

    const toolResults = []
    let iterations = 0
    const MAX_ITER = 5

    while (response.stop_reason === 'tool_use' && iterations < MAX_ITER) {
      iterations++
      const toolBlocks = response.content.filter(b => b.type === 'tool_use')

      const toolResultBlocks = await Promise.all(
        toolBlocks.map(async block => {
          try {
            const result = await executeTool(block.name, block.input, accountId)
            toolResults.push({ name: block.name, result })
            return {
              type:        'tool_result',
              tool_use_id: block.id,
              content:     JSON.stringify(result),
            }
          } catch (err) {
            const errResult = { error: true, message: err.message }
            toolResults.push({ name: block.name, result: errResult })
            return {
              type:        'tool_result',
              tool_use_id: block.id,
              content:     JSON.stringify(errResult),
            }
          }
        })
      )

      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResultBlocks })

      response = await anthropic.messages.create({
        model:      process.env.KANGO_MODEL || 'claude-sonnet-4-6',
        max_tokens: parseInt(process.env.KANGO_MAX_TOKENS || '1024'),
        system:     buildSystemPrompt(context),
        tools:      KANGO_TOOLS,
        messages,
      })
    }

    const reply = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim() || null

    // Log de auditoria LGPD — apenas metadados, sem conteúdo da conversa
    try {
      const toolsUsed = toolResults.map(t => t.name)
      await db.collection('empresas').doc(accountId).collection('activityLog').add({
        acao:      'kango_interacao',
        detalhes:  toolsUsed.length > 0
          ? `tools: ${toolsUsed.join(', ')}`
          : 'resposta direta',
        userId:    req.uid,
        userEmail: req.email,
        criadoEm:  new Date(),
      })
    } catch { /* log não-crítico — nunca bloquear a resposta */ }

    res.json({ reply, toolResults })
  } catch (err) {
    const status = err.status ?? 500

    if (status === 429) {
      return res.status(429).json({
        erro: 'Estou processando muitas solicitações agora. Tente novamente em alguns segundos.',
      })
    }
    if (status === 401 || status === 403) {
      console.error('[KANGO] Erro de autenticação na API Anthropic:', err.message)
      return res.status(500).json({
        erro: 'Estou com uma dificuldade técnica no momento. Nossa equipe foi notificada.',
      })
    }

    console.error('[KANGO] Erro no chat:', err.message)
    res.status(500).json({
      erro: 'Não consegui processar sua mensagem agora. Tente novamente.',
    })
  }
})

// ── WhatsApp — solicitação de conexão (cliente) ────────────
app.post('/api/account/request-whatsapp-connection', authenticate, checkPlanFeature('integration_whatsapp'), async (req, res) => {
  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()

    const rawPhone = String(req.body?.phone || '').replace(/\D/g, '')
    if (rawPhone.length < 10 || rawPhone.length > 11) {
      return res.status(400).json({ erro: 'Número de telefone inválido. Informe DDD + número (10 ou 11 dígitos).' })
    }
    const formattedPhone = rawPhone.length === 11
      ? `(${rawPhone.slice(0,2)}) ${rawPhone.slice(2,7)}-${rawPhone.slice(7)}`
      : `(${rawPhone.slice(0,2)}) ${rawPhone.slice(2,6)}-${rawPhone.slice(6)}`

    const accountId = req.accountId ?? await resolveAccountId(db, req.uid)
    const empSnap = await db.collection('empresas').doc(accountId).get()
    const emp = empSnap.data() || {}

    await db.collection('empresas').doc(accountId).update({
      whatsappPhone:  formattedPhone,
      whatsappStatus: 'pending',
    })

    // Registra solicitação para processamento pela equipe SATTA
    await db.collection('whatsapp_requests').add({
      accountId,
      businessName: emp.nome || '(sem nome)',
      userEmail:    req.email,
      phone:        formattedPhone,
      planId:       req.planId || 'desconhecido',
      requestedAt:  new Date(),
      status:       'pending',
    })

    // Email interno para a equipe SATTA (substituir por emailer real quando disponível)
    console.log(`
[WHATSAPP REQUEST] ─────────────────────────────
Para:     contato@sattaanalytics.com.br
Assunto:  Nova solicitação WhatsApp — ${emp.nome || accountId}
Negócio:  ${emp.nome || '(sem nome)'}
Account:  ${accountId}
Plano:    ${req.planId || 'desconhecido'}
Telefone: ${formattedPhone}
Email:    ${req.email}
─────────────────────────────────────────────────`)

    // Notificação interna para o owner
    const { createNotification } = await import('../src/modules/notifications/notification.service.js')
    await createNotification(
      accountId,
      null,
      'whatsapp_request',
      'Solicitação de WhatsApp recebida',
      `Recebemos sua solicitação de conexão do WhatsApp ${formattedPhone}. Nossa equipe entrará em contato em até 24 horas para finalizar a ativação.`,
    )

    res.json({ status: 'pending', message: 'Solicitação enviada com sucesso.' })
  } catch (err) {
    console.error('[WHATSAPP REQUEST] Erro:', err.message)
    res.status(500).json({ erro: 'Erro ao processar solicitação. Tente novamente.' })
  }
})

// ── WhatsApp — configuração admin (equipe SATTA) ───────────
function verifyAdminToken(req, res, next) {
  const token = req.headers['x-admin-token']
  const configured = process.env.INTERNAL_ADMIN_TOKEN
  if (!configured || token !== configured) {
    return res.status(401).json({ erro: 'Token admin inválido.' })
  }
  next()
}

app.patch('/api/admin/accounts/:accountId/whatsapp-config', verifyAdminToken, async (req, res) => {
  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()

    const { accountId } = req.params
    const { phoneNumberId, enabled } = req.body

    if (!phoneNumberId) {
      return res.status(400).json({ erro: 'phoneNumberId é obrigatório.' })
    }

    await db.collection('empresas').doc(accountId).update({
      whatsappPhoneNumberId: phoneNumberId,
      whatsappEnabled:       Boolean(enabled),
      whatsappStatus:        enabled ? 'active' : 'pending',
    })

    await db.collection('whatsapp_requests')
      .where('accountId', '==', accountId)
      .where('status', '==', 'pending')
      .limit(1)
      .get()
      .then(snap => snap.docs[0]?.ref.update({ status: 'active', activatedAt: new Date() }))
      .catch(() => {})

    if (enabled) {
      try {
        const { createNotification } = await import('../src/modules/notifications/notification.service.js')
        const notifId = await createNotification(
          accountId,
          null,
          'whatsapp_activated',
          'WhatsApp ativado com sucesso!',
          'Seu WhatsApp Business foi conectado ao SATTA CRM. Você pode começar a receber e responder mensagens dos clientes.',
        )
        console.log(`[ADMIN] notificação criada id=${notifId}`)
      } catch (notifErr) {
        console.error('[ADMIN] Falha ao criar notificação:', notifErr.message)
      }
    }

    console.log(`[ADMIN] whatsapp-config atualizado account=${accountId} phoneNumberId=${phoneNumberId} enabled=${enabled}`)
    res.json({ ok: true, accountId, enabled })
  } catch (err) {
    console.error('[ADMIN] Erro ao configurar whatsapp:', err.message)
    res.status(500).json({ erro: err.message })
  }
})

// ── Módulos — booking e notifications ──────────────────────
app.use('/api', apiRouter)

app.use(errorHandler)

await registerEventListeners()

// Serve frontend em produção
const distPath = join(__dirname, '../dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get(/^(?!\/api|\/webhook).*$/, (req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Kango API rodando em http://localhost:${PORT}`))
