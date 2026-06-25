import Anthropic from '@anthropic-ai/sdk'
import { getAuth } from 'firebase-admin/auth'
import { SYSTEM_PROMPT, buildContexto } from '../lib/kango.js'

// Rate limiting em memória (por instância Vercel)
const rateMap = new Map()
const LIMITE = 30
const JANELA = 60_000

function checkRate(uid) {
  const agora = Date.now()
  const r = rateMap.get(uid) || { count: 0, inicio: agora }
  if (agora - r.inicio > JANELA) { r.count = 0; r.inicio = agora }
  r.count++
  rateMap.set(uid, r)
  return r.count <= LIMITE
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Auth
  const token = req.headers.authorization?.split('Bearer ')[1]
  if (!token) return res.status(401).json({ erro: 'Token não fornecido.' })

  let uid
  try {
    const decoded = await getAuth().verifyIdToken(token)
    if (!decoded.email_verified) return res.status(403).json({ erro: 'Email não verificado.' })
    uid = decoded.uid
  } catch {
    return res.status(401).json({ erro: 'Token inválido.' })
  }

  // Rate limit
  if (!checkRate(uid)) {
    return res.status(429).json({ erro: 'Muitas requisições. Aguarde um minuto.' })
  }

  const { pergunta } = req.body
  if (!pergunta) return res.status(400).json({ erro: 'Dados incompletos.' })

  const perguntaLimpa = String(pergunta).slice(0, 500)

  try {
    const contextoLimpo = await buildContexto(uid)
    if (!contextoLimpo) return res.status(404).json({ erro: 'Empresa não encontrada.' })

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
}
