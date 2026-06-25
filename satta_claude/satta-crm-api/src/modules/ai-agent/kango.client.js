/**
 * Kango AI adapter — único arquivo a alterar para integrar com IA real.
 *
 * MODO ATUAL: KANGO_MOCK=true (modo demonstração, sem IA real)
 *
 * Para integrar com a API da Anthropic (Claude):
 * 1. Defina KANGO_API_URL=https://api.anthropic.com/v1/messages
 * 2. Defina KANGO_API_KEY=sua_chave_aqui   (sk-ant-...)
 * 3. Defina KANGO_MOCK=false
 * 4. A função sendMessageReal já está no formato da API Anthropic:
 *    envia `messages` array + `tools` + `system` — basta ativar.
 * Nenhuma outra mudança é necessária no restante do código.
 *
 * Retorno esperado:
 *   { reply: string|null, toolCalls: [{ name: string, arguments: object }] }
 */

const MOCK_RESPONSES = {
  default: {
    reply: 'Aqui está o que encontrei nos seus dados.',
    toolCalls: [],
  },
}

function buildNicheSystemPrompt(nicheSettings) {
  if (!nicheSettings) return ''
  const { displayName, labels, inventory, sales } = nicheSettings
  const lines = [
    `O negócio é um(a) ${displayName}.`,
    `Use "${labels.customer}" para clientes, "${labels.appointments}" para agendamentos, "${labels.appointmentSingular}" no singular.`,
  ]
  if (inventory?.enabled) lines.push('O negócio usa controle de estoque — ferramentas de inventário estão ativas.')
  if (sales?.allowItemized) lines.push('Vendas podem ser detalhadas por item de estoque.')
  return lines.join(' ')
}

async function sendMessageMock({ message, toolResults, nicheSettings }) {
  // Second turn: tool results are available — generate a final reply
  if (toolResults?.length) {
    const summary = toolResults.map(r => `${r.name}: ${JSON.stringify(r.result)}`).join('; ')
    return { reply: `Com base nos seus dados: ${summary}`, toolCalls: [] }
  }

  // First turn: decide whether to call a tool
  if (/faturamento|receita/i.test(message)) {
    return { reply: null, toolCalls: [{ name: 'get_financial_summary', arguments: {} }] }
  }
  if (/cliente.*inativo|inativo/i.test(message)) {
    return { reply: null, toolCalls: [{ name: 'list_inactive_customers', arguments: { daysSinceLastSale: 30 } }] }
  }

  // Inventory: "entrada de 30 ração golden" / "chegaram 30 kg de ração"
  const entradaMatch = message.match(/(?:entrada|chegou|chegaram|adiciona|adicion)\s+(\d+)\s+(?:\w+\s+)?(?:de\s+)?(.+)/i)
  if (entradaMatch) {
    const qty = parseInt(entradaMatch[1])
    const name = entradaMatch[2].trim()
    return { reply: null, toolCalls: [{ name: 'adjust_inventory', arguments: { name, quantityChange: qty } }] }
  }

  // Inventory: "saiu 5 ração golden" / "vendemos 5 kg de ração"
  const saidaMatch = message.match(/(?:saiu|saíu|saíram|saiu|usou|usamos|vendemos|consum)\s+(\d+)\s+(?:\w+\s+)?(?:de\s+)?(.+)/i)
  if (saidaMatch) {
    const qty = parseInt(saidaMatch[1])
    const name = saidaMatch[2].trim()
    return { reply: null, toolCalls: [{ name: 'adjust_inventory', arguments: { name, quantityChange: -qty } }] }
  }

  // Inventory: "estoque baixo" / "o que está acabando"
  if (/estoque.*baixo|acabando|faltando|repor/i.test(message)) {
    return { reply: null, toolCalls: [{ name: 'list_low_stock_items', arguments: {} }] }
  }

  // Inventory: "cadastra ração golden 30 kg" / "novo item no estoque"
  const novoItemMatch = message.match(/(?:cadastra|cria|novo.*item|adiciona.*estoque)\s+(.+?)\s+(\d+)\s*(\w+)?/i)
  if (novoItemMatch) {
    return { reply: null, toolCalls: [{ name: 'create_inventory_item', arguments: {
      name: novoItemMatch[1].trim(),
      quantity: parseInt(novoItemMatch[2]),
      unit: novoItemMatch[3] ?? 'unidade',
    } }] }
  }

  return MOCK_RESPONSES.default
}

async function sendMessageReal({ message, history = [], tools = [], toolResults = [], nicheSettings }) {
  const systemPrompt = buildNicheSystemPrompt(nicheSettings)
  const res = await fetch(process.env.KANGO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.KANGO_API_KEY}`,
    },
    body: JSON.stringify({ message, history, tools, toolResults, systemPrompt: systemPrompt || undefined }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Kango API error ${res.status}: ${text}`)
  }

  // Adapt the real API response here when docs are available.
  // Expected: { reply, toolCalls } or equivalent structure.
  const data = await res.json()
  return {
    reply: data.reply ?? data.message ?? null,
    toolCalls: data.toolCalls ?? data.tool_calls ?? [],
  }
}

export async function sendMessage(payload) {
  if (process.env.KANGO_MOCK === 'true') {
    return sendMessageMock(payload)
  }
  return sendMessageReal(payload)
}
