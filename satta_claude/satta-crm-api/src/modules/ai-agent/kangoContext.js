/**
 * kangoContext.js — Constrói o contexto da conta para a IA.
 *
 * Quando KANGO_MOCK=false, passe o retorno desta função como `system`
 * na chamada para a API da Anthropic (ou outra IA) via kango.client.js.
 *
 * Uso:
 *   import { buildKangoContext } from './kangoContext.js'
 *   const context = await buildKangoContext(accountId, summary)
 *   await sendMessage({ message, system: context, tools, ... })
 */

/**
 * Builds the system prompt / account context for Kango AI.
 *
 * @param {object} opts
 * @param {string} opts.accountId          - Firebase UID / empresaId
 * @param {string} opts.businessName       - Nome fantasia do negócio
 * @param {string} opts.segment            - Nicho (ex: petshop, salao, etc.)
 * @param {object} opts.nicheLabels        - { cliente, agenda, ... } do nichoLabels map
 * @param {object} [opts.todaySummary]     - Snapshot do dia (agenda, receita, clientes)
 * @param {string[]} [opts.activeFeatures] - Features ativas (ex: ['inventory', 'sales'])
 * @param {string[]} [opts.availableTools] - Nomes das ferramentas disponíveis
 * @returns {string} System prompt pronto para uso
 */
export function buildKangoContext({
  accountId,
  businessName,
  segment,
  nicheLabels = {},
  todaySummary = null,
  activeFeatures = [],
  availableTools = [],
}) {
  const today = new Date().toISOString().slice(0, 10)
  const customerLabel = nicheLabels.cliente ?? 'cliente'
  const appointmentLabel = nicheLabels.agenda ?? 'agendamento'

  const lines = [
    `Você é Kango, a assistente de dados da SATTA Analytics.`,
    `Você está ajudando o negócio "${businessName}" (segmento: ${segment}).`,
    `Data atual: ${today}.`,
    ``,
    `Use "${customerLabel}" para se referir a clientes e "${appointmentLabel}" para agendamentos.`,
    `Responda sempre em português do Brasil, de forma direta e objetiva.`,
    `Não use jargões técnicos nem linguagem corporativa engessada.`,
    `Se não tiver dados suficientes para responder, diga claramente o que falta.`,
  ]

  if (todaySummary) {
    lines.push(``)
    lines.push(`Resumo do dia (${today}):`)
    if (todaySummary.agendaHoje != null)
      lines.push(`- Agendamentos: ${todaySummary.agendaHoje}`)
    if (todaySummary.faturamentoHoje != null)
      lines.push(`- Faturamento: R$ ${todaySummary.faturamentoHoje.toFixed(2)}`)
    if (todaySummary.totalClientes != null)
      lines.push(`- Total de clientes cadastrados: ${todaySummary.totalClientes}`)
  }

  if (activeFeatures.length > 0) {
    lines.push(``)
    lines.push(`Funcionalidades ativas: ${activeFeatures.join(', ')}.`)
  }

  if (availableTools.length > 0) {
    lines.push(``)
    lines.push(`Ferramentas disponíveis: ${availableTools.join(', ')}.`)
    lines.push(`Use as ferramentas sempre que a pergunta do usuário exigir dados reais.`)
  }

  return lines.join('\n')
}
