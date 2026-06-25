import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function buildCredential() {
  const { FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_PROJECT_ID } = process.env
  if (!FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) return undefined
  return cert({
    projectId: FIREBASE_PROJECT_ID || 'satta-crm',
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  })
}

if (!getApps().length) {
  const credential = buildCredential()
  initializeApp(credential ? { credential } : { projectId: 'satta-crm' })
}

export const SYSTEM_PROMPT = `Você é a Kango, a assistente de dados da SATTA. Você faz parte do produto SATTA CRM.

Personalidade: inteligente, direta, acessível, brasileira. Fala de forma natural, sem enrolação. Frases curtas. Nunca finge entender algo que não foi informado.

Regras:
- Responda SEMPRE em português brasileiro
- Use APENAS os dados fornecidos no contexto. Nunca invente números ou clientes.
- Se não tiver a informação, diga claramente: "não tenho esse dado aqui".
- Respostas em primeira pessoa: "eu encontrei 3 clientes", "eu vejo aqui que...", nunca "foram encontrados".
- Respostas objetivas. Sem introduções desnecessárias.
- Listas com no máximo 5 itens.
- Nunca use frases genéricas de atendimento.`

// Busca os dados da empresa direto no banco, usando o uid já verificado pelo token —
// nunca confia em dados de contexto vindos do cliente, pra evitar que alguém injete
// dados de outra empresa numa chamada manual à API.
export async function buildContexto(uid) {
  const db = getFirestore()

  const empresaSnap = await db.collection('empresas').doc(uid).get()
  if (!empresaSnap.exists) return null
  const empresa = empresaSnap.data()

  const [clientesSnap, atendimentosSnap] = await Promise.all([
    db.collection('empresas').doc(uid).collection('clientes').get(),
    db.collection('empresas').doc(uid).collection('atendimentos').get(),
  ])
  const clientes = clientesSnap.docs.map(d => d.data())
  const atendimentos = atendimentosSnap.docs.map(d => d.data())

  const receita = atendimentos.reduce((s, a) => s + (a.valor || 0), 0)
  const porEtapa = clientes.reduce((acc, c) => {
    acc[c.etapa] = (acc[c.etapa] || 0) + 1
    return acc
  }, {})

  const contexto = `Empresa: ${empresa.nome} (${empresa.nicho})
Total de clientes: ${clientes.length}
Por etapa: ${JSON.stringify(porEtapa)}
Receita total: R$ ${receita.toFixed(2)}
Clientes: ${clientes.map(c => `${c.nome} (${c.etapa})`).join(', ')}
Atendimentos: ${atendimentos.length}`

  return contexto.slice(0, 4000)
}
