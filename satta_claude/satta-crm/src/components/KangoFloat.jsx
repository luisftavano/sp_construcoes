import { useState, useEffect, useRef } from 'react'
import {
  X, Send, Calendar, TrendingUp, ShoppingBag, ArrowDownRight,
  BarChart2, Star, Users, Package, AlertTriangle, ChevronDown,
  RefreshCw, Zap, Bell, PlayCircle,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { auth } from '../firebase'
import { nichoLabels } from '../lib/nichos'

// ── Helpers ──────────────────────────────────────────

function hojeStr() { return new Date().toISOString().slice(0, 10) }
function mesInicioStr() { return new Date().toISOString().slice(0, 7) + '-01' }
function formatMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}
function formatHora(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function diasAtras(isoStr) {
  if (!isoStr) return null
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 86_400_000)
}

async function apiFetch(path) {
  const token = await auth.currentUser?.getIdToken()
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function apiPost(path, body) {
  const token = await auth.currentUser?.getIdToken()
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Categorias e ações ───────────────────────────────

const NICHOS_COM_ESTOQUE = new Set(['petshop', 'loja', 'restaurante', 'restaurant'])

function getCategorias(nicho) {
  const labels = nichoLabels[nicho] ?? nichoLabels.outro
  const cli = labels.cliente ?? 'Cliente'
  const agenda = labels.agenda ?? 'Agenda de hoje'

  const cats = [
    {
      id: 'hoje',
      label: 'Hoje',
      acoes: [
        { id: 'agenda-hoje',      label: agenda,               Icon: Calendar },
        { id: 'faturamento-hoje', label: 'Faturamento do dia', Icon: TrendingUp },
        { id: 'vendas-hoje',      label: 'Vendas de hoje',     Icon: ShoppingBag },
        { id: 'gastos-hoje',      label: 'Gastos do dia',      Icon: ArrowDownRight },
      ],
    },
    {
      id: 'financeiro',
      label: 'Financeiro',
      acoes: [
        { id: 'resumo-mes',   label: 'Como foi esse mês?',   Icon: BarChart2 },
        { id: 'top-vendidos', label: 'O que mais vendeu?',    Icon: Star },
        { id: 'ticket-medio', label: 'Qual meu ticket médio?', Icon: TrendingUp },
      ],
    },
    {
      id: 'clientes',
      label: `${cli}s`,
      acoes: [
        { id: 'inativos-30',       label: `${cli}s sem visita há 30+ dias`,    Icon: Users },
        { id: 'total-clientes',    label: `Total de ${cli.toLowerCase()}s`,     Icon: Users },
        { id: 'lembrete-preview',  label: 'Quem vai receber lembrete hoje?',    Icon: Bell },
      ],
    },
  ]

  if (NICHOS_COM_ESTOQUE.has(nicho)) {
    cats.push({
      id: 'estoque',
      label: 'Estoque',
      acoes: [
        { id: 'baixo-estoque',  label: 'O que está acabando?',  Icon: AlertTriangle },
        { id: 'estoque-resumo', label: 'Resumo do estoque',     Icon: Package },
        { id: 'top-produtos',   label: 'Produtos mais saídos',  Icon: Star },
      ],
    })
  }

  return cats
}

function findAcao(categorias, id) {
  for (const cat of categorias) {
    const a = cat.acoes.find(a => a.id === id)
    if (a) return a
  }
  return null
}

// ── Mini-dashboard ────────────────────────────────────

function MiniDash({ data, loading, onRefresh, onLembreteClick }) {
  if (loading) {
    return (
      <div className="px-4 py-3 border-b border-border bg-slate-50 flex items-center justify-center gap-2">
        <div className="w-3 h-3 border-2 border-navy/30 rounded-full border-t-navy/80 animate-spin" />
        <span className="text-[11px] text-text-3">Carregando...</span>
      </div>
    )
  }
  if (!data) return null

  return (
    <div className="px-4 py-2.5 border-b border-border bg-slate-50">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-text-3 uppercase tracking-wider font-medium">Hoje</span>
        <button onClick={onRefresh} className="text-text-3 hover:text-text transition-colors p-0.5" title="Atualizar">
          <RefreshCw size={10} />
        </button>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border">
        <div className="text-center pr-2">
          <p className="font-mono text-base font-bold text-navy leading-none">{data.agendaHoje ?? 0}</p>
          <p className="text-[10px] text-text-3 mt-0.5">agendamentos</p>
        </div>
        <div className="text-center px-2">
          <p className="font-mono text-base font-bold text-navy leading-none">
            {data.faturamentoHoje != null
              ? `R$ ${data.faturamentoHoje.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
              : '–'}
          </p>
          <p className="text-[10px] text-text-3 mt-0.5">faturado</p>
        </div>
        <div className="text-center pl-2">
          <p className="font-mono text-base font-bold text-navy leading-none">{data.totalClientes ?? '–'}</p>
          <p className="text-[10px] text-text-3 mt-0.5">clientes</p>
        </div>
      </div>
      {data.lembretesHoje != null && (
        <button
          onClick={onLembreteClick}
          className="mt-2 w-full flex items-center justify-between text-[11px] border-t border-border pt-2 text-text-2 hover:text-navy transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Bell size={10} className="text-amber-500" />
            Lembretes hoje
          </span>
          <span className="font-mono font-medium text-navy">
            {data.lembretesHoje} cliente{data.lembretesHoje !== 1 ? 's' : ''}
          </span>
        </button>
      )}
    </div>
  )
}

// ── Renderizador de mensagens ─────────────────────────

function KangoMsg({ msg, actions = {} }) {
  const { type, data, text } = msg

  if (type === 'thinking') {
    return (
      <div className="bg-offwhite border border-border px-4 py-3 rounded-2xl rounded-tl-sm">
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 bg-slate-soft rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (type === 'text') {
    return (
      <div className="bg-offwhite border border-border px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed text-navy whitespace-pre-line">
        {text}
      </div>
    )
  }

  if (type === 'agenda') {
    const ags = Array.isArray(data) ? data : []
    if (!ags.length) return (
      <div className="bg-offwhite border border-border px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm text-navy">
        Nenhum agendamento para hoje.
      </div>
    )
    return (
      <div className="bg-offwhite border border-border rounded-2xl rounded-tl-sm overflow-hidden">
        <p className="text-[11px] font-medium text-text-2 px-3.5 pt-2.5 pb-1">
          {ags.length} agendamento{ags.length !== 1 ? 's' : ''} hoje
        </p>
        <div className="divide-y divide-border">
          {ags.slice(0, 10).map((ag, i) => {
            const hora = ag.startAt ? formatHora(ag.startAt) : (ag.horaInicio ?? '--:--')
            const titulo = ag.title ?? ag.servico ?? '-'
            const cliente = ag.customerName ?? ag.clienteNome ?? null
            const status = ag.status
            const statusCor = status === 'completed' || status === 'concluido'
              ? 'bg-gray-100 text-gray-600'
              : status === 'confirmed' || status === 'confirmado'
              ? 'bg-green-50 text-green-700'
              : status === 'cancelled' || status === 'cancelado'
              ? 'bg-red-50 text-red-600'
              : 'bg-amber-50 text-amber-700'
            return (
              <div key={i} className="px-3.5 py-2 flex items-center gap-2">
                <span className="font-mono text-xs text-text-3 w-10 shrink-0">{hora}</span>
                <div className="flex-1 min-w-0">
                  {cliente && <p className="text-sm text-navy font-medium truncate">{cliente}</p>}
                  <p className={`text-xs text-text-2 truncate ${cliente ? '' : 'font-medium text-navy'}`}>{titulo}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${statusCor}`}>{status ?? 'agendado'}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (type === 'financial-day') {
    const { totalRevenue = 0 } = data ?? {}
    return (
      <div className="bg-offwhite border border-border px-3.5 py-3 rounded-2xl rounded-tl-sm">
        <p className="text-[11px] text-text-2 mb-1">Faturamento de hoje</p>
        <p className="font-mono text-2xl font-bold text-navy">{formatMoeda(totalRevenue)}</p>
        {totalRevenue === 0 && (
          <p className="text-xs text-text-3 mt-1">Nenhuma venda registrada ainda hoje.</p>
        )}
      </div>
    )
  }

  if (type === 'financial-month') {
    const { totalRevenue = 0, totalExpenses = 0, netProfit = 0, comparison } = data ?? {}
    return (
      <div className="bg-offwhite border border-border px-3.5 py-3 rounded-2xl rounded-tl-sm space-y-3">
        <p className="text-[11px] text-text-2">Resultado do mês atual</p>
        <div>
          <p className="text-[11px] text-text-3">Receita</p>
          <p className="font-mono text-2xl font-bold text-navy">{formatMoeda(totalRevenue)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-text-3">Despesas</p>
            <p className="font-mono text-sm font-medium text-red-600">{formatMoeda(totalExpenses)}</p>
          </div>
          <div>
            <p className="text-[11px] text-text-3">Resultado</p>
            <p className={`font-mono text-sm font-medium ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatMoeda(netProfit)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'top-items') {
    const items = Array.isArray(data) ? data : []
    if (!items.length) return (
      <div className="bg-offwhite border border-border px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm text-navy">
        Nenhuma venda registrada no período.
      </div>
    )
    return (
      <div className="bg-offwhite border border-border rounded-2xl rounded-tl-sm overflow-hidden">
        <p className="text-[11px] font-medium text-text-2 px-3.5 pt-2.5 pb-1">Mais vendidos no mês</p>
        <div className="divide-y divide-border">
          {items.slice(0, 5).map((item, i) => (
            <div key={i} className="px-3.5 py-2 flex items-center gap-2">
              <span className="font-mono text-xs text-text-3 w-4 shrink-0">{i + 1}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                item.type === 'service' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
              }`}>{item.type === 'service' ? 'serv' : 'prod'}</span>
              <p className="text-sm text-navy flex-1 truncate">{item.name}</p>
              <div className="text-right shrink-0">
                <p className="font-mono text-xs text-text-2">{item.quantitySold}×</p>
                <p className="font-mono text-[10px] text-text-3">{formatMoeda(item.totalRevenue)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'avg-ticket') {
    const { averageTicket = 0, saleCount = 0, comparison } = data ?? {}
    return (
      <div className="bg-offwhite border border-border px-3.5 py-3 rounded-2xl rounded-tl-sm">
        <p className="text-[11px] text-text-2 mb-1">Ticket médio do mês</p>
        <p className="font-mono text-2xl font-bold text-navy">{formatMoeda(averageTicket)}</p>
        <p className="text-xs text-text-3 mt-1">{saleCount} venda{saleCount !== 1 ? 's' : ''} no período</p>
        {comparison?.changePercent != null && (
          <p className={`text-xs mt-1 ${comparison.changePercent >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {comparison.changePercent >= 0 ? '+' : ''}{comparison.changePercent.toFixed(1)}% vs. mês anterior
          </p>
        )}
      </div>
    )
  }

  if (type === 'sales-list') {
    const sales = Array.isArray(data) ? data : []
    if (!sales.length) return (
      <div className="bg-offwhite border border-border px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm text-navy">
        Nenhuma venda registrada hoje.
      </div>
    )
    const total = sales.reduce((s, v) => s + (v.totalAmount ?? v.amount ?? 0), 0)
    return (
      <div className="bg-offwhite border border-border rounded-2xl rounded-tl-sm overflow-hidden">
        <p className="text-[11px] font-medium text-text-2 px-3.5 pt-2.5 pb-1">
          {sales.length} venda{sales.length !== 1 ? 's' : ''} hoje · {formatMoeda(total)}
        </p>
        <div className="divide-y divide-border">
          {sales.slice(0, 10).map((s, i) => (
            <div key={i} className="px-3.5 py-2 flex items-center justify-between gap-2">
              <p className="text-sm text-navy truncate">{s.customerName ?? 'Venda avulsa'}</p>
              <span className="font-mono text-sm text-navy shrink-0">{formatMoeda(s.totalAmount ?? s.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'expenses-list') {
    const exps = Array.isArray(data) ? data : []
    if (!exps.length) return (
      <div className="bg-offwhite border border-border px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm text-navy">
        Nenhum gasto registrado hoje.
      </div>
    )
    const total = exps.reduce((s, e) => s + (e.amount ?? 0), 0)
    return (
      <div className="bg-offwhite border border-border rounded-2xl rounded-tl-sm overflow-hidden">
        <p className="text-[11px] font-medium text-text-2 px-3.5 pt-2.5 pb-1">
          {exps.length} gasto{exps.length !== 1 ? 's' : ''} hoje · {formatMoeda(total)}
        </p>
        <div className="divide-y divide-border">
          {exps.slice(0, 10).map((e, i) => (
            <div key={i} className="px-3.5 py-2 flex items-center justify-between gap-2">
              <p className="text-sm text-navy truncate">{e.description}</p>
              <span className="font-mono text-sm text-red-600 shrink-0">{formatMoeda(e.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'customers-inactive') {
    const customers = Array.isArray(data) ? data : []
    if (!customers.length) return (
      <div className="bg-offwhite border border-border px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm text-navy">
        Nenhum cliente inativo há mais de 30 dias.
      </div>
    )
    return (
      <div className="bg-offwhite border border-border rounded-2xl rounded-tl-sm overflow-hidden">
        <p className="text-[11px] font-medium text-text-2 px-3.5 pt-2.5 pb-1">
          {customers.length} cliente{customers.length !== 1 ? 's' : ''} sem visita há 30+ dias
        </p>
        <div className="divide-y divide-border">
          {customers.slice(0, 10).map((c, i) => {
            const dias = c.daysSinceLastActivity ?? (c.lastActivityAt ? diasAtras(c.lastActivityAt) : null)
            return (
              <div key={i} className="px-3.5 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-navy font-medium">{c.name ?? c.nome}</p>
                  {dias != null && (
                    <span className="text-xs font-mono text-amber-600 shrink-0">{dias}d sem visita</span>
                  )}
                </div>
                {(c.phone ?? c.telefone) && (
                  <p className="text-[11px] text-text-3 font-mono mt-0.5">{c.phone ?? c.telefone}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (type === 'customers-count') {
    const { total = 0 } = data ?? {}
    return (
      <div className="bg-offwhite border border-border px-3.5 py-3 rounded-2xl rounded-tl-sm">
        <p className="text-[11px] text-text-2 mb-1">Total de clientes cadastrados</p>
        <p className="font-mono text-2xl font-bold text-navy">{total}</p>
      </div>
    )
  }

  if (type === 'low-stock') {
    const items = Array.isArray(data) ? data : []
    if (!items.length) return (
      <div className="bg-offwhite border border-border px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm text-navy">
        Estoque OK — nenhum item abaixo do mínimo configurado.
      </div>
    )
    return (
      <div className="bg-offwhite border border-border rounded-2xl rounded-tl-sm overflow-hidden">
        <p className="text-[11px] font-medium text-text-2 px-3.5 pt-2.5 pb-1">
          {items.length} item{items.length !== 1 ? 's' : ''} abaixo do estoque mínimo
        </p>
        <div className="divide-y divide-border">
          {items.slice(0, 10).map((item, i) => (
            <div key={i} className="px-3.5 py-2 flex items-center justify-between gap-2">
              <p className="text-sm text-navy truncate">{item.name}{item.brand ? ` (${item.brand})` : ''}</p>
              <span className="font-mono text-xs text-red-600 shrink-0">
                {item.quantity} / mín {item.minStockAlert} {item.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'inventory-summary') {
    const { total = 0, lowStockCount = 0 } = data ?? {}
    return (
      <div className="bg-offwhite border border-border px-3.5 py-3 rounded-2xl rounded-tl-sm">
        <p className="text-[11px] text-text-2 mb-2">Resumo do estoque</p>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="font-mono text-xl font-bold text-navy">{total}</p>
            <p className="text-[11px] text-text-3">itens cadastrados</p>
          </div>
          <div>
            <p className={`font-mono text-xl font-bold ${lowStockCount > 0 ? 'text-amber-600' : 'text-navy'}`}>
              {lowStockCount}
            </p>
            <p className="text-[11px] text-text-3">abaixo do mínimo</p>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'reminder-preview') {
    const { customers = [], totalCount = 0, dispatching, dispatched } = data ?? {}
    if (!customers.length) return (
      <div className="bg-offwhite border border-border px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm text-navy">
        Nenhum cliente está no momento certo para receber lembrete agora.
      </div>
    )
    return (
      <div className="bg-offwhite border border-border rounded-2xl rounded-tl-sm overflow-hidden">
        <p className="text-[11px] font-medium text-text-2 px-3.5 pt-2.5 pb-1">
          A Kango vai lembrar {totalCount} cliente{totalCount !== 1 ? 's' : ''} hoje
        </p>
        <div className="divide-y divide-border">
          {customers.slice(0, 8).map((c, i) => (
            <div key={i} className="px-3.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-navy font-medium truncate">{c.name}</p>
                <span className="text-[11px] font-mono text-text-3 shrink-0">
                  {c.diasDesdeUltimaVisita}d / padrão {Math.round(c.averageIntervalDays)}d
                </span>
              </div>
            </div>
          ))}
        </div>
        {!dispatched && (
          <div className="px-3.5 py-2.5 border-t border-border bg-slate-50">
            {dispatching ? (
              <div className="flex items-center gap-2 text-xs text-text-2">
                <div className="w-3 h-3 border-2 border-navy/30 rounded-full border-t-navy/80 animate-spin" />
                Enviando lembretes...
              </div>
            ) : (
              <button
                onClick={() => actions?.['disparar-lembretes']?.()}
                className="flex items-center gap-1.5 text-xs font-medium text-navy hover:text-blue transition-colors"
              >
                <PlayCircle size={13} /> Disparar agora
              </button>
            )}
          </div>
        )}
        {dispatched && (
          <div className="px-3.5 py-2 border-t border-border bg-emerald-50">
            <p className="text-xs text-emerald-700 font-medium">
              {dispatched.sent} lembrete{dispatched.sent !== 1 ? 's' : ''} enviado{dispatched.sent !== 1 ? 's' : ''} com sucesso.
            </p>
          </div>
        )}
      </div>
    )
  }

  return null
}

// ── Chips de ações rápidas ────────────────────────────

function AcoesRapidas({ categorias, onAcao, compact = false }) {
  const [catAberta, setCatAberta] = useState(compact ? null : categorias[0]?.id ?? null)

  if (compact) {
    return (
      <div className="max-h-56 overflow-y-auto px-3 py-2 space-y-2.5">
        {categorias.map(cat => (
          <div key={cat.id}>
            <button
              onClick={() => setCatAberta(catAberta === cat.id ? null : cat.id)}
              className="flex items-center gap-1 text-[10px] text-text-3 uppercase tracking-wider font-medium mb-1.5 w-full text-left hover:text-text-2 transition-colors"
            >
              <ChevronDown size={10} className={`transition-transform ${catAberta === cat.id ? '' : '-rotate-90'}`} />
              {cat.label}
            </button>
            {catAberta === cat.id && (
              <div className="flex flex-wrap gap-1.5 pl-3">
                {cat.acoes.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => onAcao(id)}
                    className="flex items-center gap-1.5 text-xs border border-border bg-white text-text-2 hover:text-navy hover:border-navy/40 px-2.5 py-1 rounded-full transition-colors"
                  >
                    <Icon size={11} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
      {/* Saudação */}
      <div className="flex justify-center pt-1">
        <img src="/kango-full-body.png" alt="" aria-hidden className="w-24 object-contain select-none opacity-90" />
      </div>

      {categorias.map(cat => (
        <div key={cat.id}>
          <p className="text-[10px] text-text-3 uppercase tracking-wider font-medium mb-2">{cat.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {cat.acoes.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => onAcao(id)}
                className="flex items-center gap-1.5 text-xs border border-border bg-white text-text-2 hover:text-navy hover:border-navy/40 px-2.5 py-1.5 rounded-full transition-colors"
              >
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── KangoFloat ────────────────────────────────────────

export default function KangoFloat() {
  const { user, empresa } = useAuth()
  const nicho = empresa?.nicho ?? empresa?.segmento ?? 'outro'
  const categorias = getCategorias(nicho)

  const [aberto, setAberto] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [textLoading, setTextLoading] = useState(false)
  const [miniDash, setMiniDash] = useState(null)
  const [miniDashLoading, setMiniDashLoading] = useState(false)
  const [acoesCompact, setAcoesCompact] = useState(false) // false = initial full view
  const [acoesCompactAberta, setAcoesCompactAberta] = useState(false)

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const keyRef = useRef(0)

  const temMsgs = msgs.length > 0
  const isLoading = actionLoading != null || textLoading

  function nextKey() { return ++keyRef.current }

  function addMsg(msg) {
    const k = nextKey()
    setMsgs(prev => [...prev, { ...msg, key: k }])
    return k
  }

  function replaceMsg(key, msg) {
    setMsgs(prev => prev.map(m => m.key === key ? { ...m, ...msg } : m))
  }

  // ── Mini-dashboard ──────────────────────────────────

  async function carregarMiniDash() {
    if (!user) return
    setMiniDashLoading(true)
    try {
      const d = hojeStr()
      const [agenda, summary, customers, lembretes] = await Promise.allSettled([
        apiFetch(`/api/appointments/agenda?date=${d}`),
        apiFetch(`/api/reports/financial-summary?startDate=${d}&endDate=${d}`),
        apiFetch('/api/customers?page=1&limit=1'),
        apiFetch('/api/reminders/preview'),
      ])

      setMiniDash({
        agendaHoje:      agenda.status === 'fulfilled' ? (Array.isArray(agenda.value) ? agenda.value.length : 0) : null,
        faturamentoHoje: summary.status === 'fulfilled' ? (summary.value.totalRevenue ?? 0) : null,
        totalClientes:   customers.status === 'fulfilled' ? (customers.value.total ?? customers.value?.data?.length ?? 0) : null,
        lembretesHoje:   lembretes.status === 'fulfilled' ? (lembretes.value.totalCount ?? 0) : null,
      })
    } finally {
      setMiniDashLoading(false)
    }
  }

  useEffect(() => {
    if (!aberto || !user) return
    carregarMiniDash()
    const interval = setInterval(carregarMiniDash, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [aberto, user])

  // ── Scroll automático ───────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  useEffect(() => {
    if (aberto) setTimeout(() => inputRef.current?.focus(), 100)
  }, [aberto])

  // ── Evento global para abrir o painel ───────────────

  useEffect(() => {
    const handler = () => setAberto(true)
    window.addEventListener('kango-open', handler)
    return () => window.removeEventListener('kango-open', handler)
  }, [])

  // ── Executar ação rápida ────────────────────────────

  async function executarAcao(id) {
    if (isLoading) return
    const acao = findAcao(categorias, id)
    if (!acao) return

    // Primeira ação → colapsa o painel de chips para o modo compacto
    if (!acoesCompact) setAcoesCompact(true)
    setAcoesCompactAberta(false)

    // Adiciona a pergunta do usuário e o "pensando" da Kango
    addMsg({ role: 'user', type: 'text', text: acao.label })
    const thinkKey = addMsg({ role: 'kango', type: 'thinking' })
    setActionLoading(id)

    try {
      const d = hojeStr()
      const m1 = mesInicioStr()

      switch (id) {

        case 'agenda-hoje': {
          const data = await apiFetch(`/api/appointments/agenda?date=${d}`)
          replaceMsg(thinkKey, { type: 'agenda', data })
          break
        }

        case 'faturamento-hoje': {
          const data = await apiFetch(`/api/reports/financial-summary?startDate=${d}&endDate=${d}`)
          replaceMsg(thinkKey, { type: 'financial-day', data })
          break
        }

        case 'vendas-hoje': {
          const all = await apiFetch('/api/sales')
          const data = (Array.isArray(all) ? all : (all.data ?? [])).filter(s =>
            s.status !== 'cancelled' && (s.soldAt ?? '').startsWith(d)
          )
          replaceMsg(thinkKey, { type: 'sales-list', data })
          break
        }

        case 'gastos-hoje': {
          const all = await apiFetch('/api/expenses')
          const data = (Array.isArray(all) ? all : (all.data ?? [])).filter(e =>
            (e.paidAt ?? e.createdAt ?? '').startsWith(d)
          )
          replaceMsg(thinkKey, { type: 'expenses-list', data })
          break
        }

        case 'resumo-mes': {
          const data = await apiFetch(`/api/reports/financial-summary?startDate=${m1}&endDate=${d}`)
          replaceMsg(thinkKey, { type: 'financial-month', data })
          break
        }

        case 'top-vendidos':
        case 'top-produtos': {
          const typeFilter = id === 'top-produtos' ? '&type=product' : ''
          const data = await apiFetch(`/api/reports/top-items?startDate=${m1}&endDate=${d}&limit=5${typeFilter}`)
          replaceMsg(thinkKey, { type: 'top-items', data: Array.isArray(data) ? data : [] })
          break
        }

        case 'ticket-medio': {
          const data = await apiFetch(`/api/reports/average-ticket?startDate=${m1}&endDate=${d}`)
          replaceMsg(thinkKey, { type: 'avg-ticket', data })
          break
        }

        case 'inativos-30': {
          const res = await apiPost('/api/ai/chat', { message: 'clientes inativos há 30 dias' })
          const result = res.toolResults?.find(t => t.name === 'list_inactive_customers')?.result ?? []
          replaceMsg(thinkKey, { type: 'customers-inactive', data: Array.isArray(result) ? result : [] })
          break
        }

        case 'total-clientes': {
          const res = await apiFetch('/api/customers?page=1&limit=1')
          replaceMsg(thinkKey, { type: 'customers-count', data: { total: res.total ?? 0 } })
          break
        }

        case 'baixo-estoque': {
          const data = await apiFetch('/api/inventory/low-stock')
          replaceMsg(thinkKey, { type: 'low-stock', data: Array.isArray(data) ? data : [] })
          break
        }

        case 'estoque-resumo': {
          const [inv, lowStock] = await Promise.all([
            apiFetch('/api/inventory?page=1&limit=1'),
            apiFetch('/api/inventory/low-stock').catch(() => []),
          ])
          replaceMsg(thinkKey, {
            type: 'inventory-summary',
            data: {
              total:         inv.total ?? 0,
              lowStockCount: Array.isArray(lowStock) ? lowStock.length : 0,
            },
          })
          break
        }

        case 'lembrete-preview': {
          const res = await apiFetch('/api/reminders/preview')
          replaceMsg(thinkKey, {
            type: 'reminder-preview',
            data: { customers: res.customers ?? [], totalCount: res.totalCount ?? 0 },
          })
          break
        }

        default:
          replaceMsg(thinkKey, { type: 'text', text: 'Essa consulta ainda está sendo preparada.' })
      }
    } catch {
      replaceMsg(thinkKey, {
        type: 'text',
        text: 'Não consegui buscar esse dado agora. Tente de novo em instantes.',
      })
    } finally {
      setActionLoading(null)
    }
  }

  // ── Disparar lembretes manualmente ─────────────────

  async function dispararLembretes() {
    // Find the reminder-preview message and mark it as dispatching
    setMsgs(prev => prev.map(m =>
      m.type === 'reminder-preview' && !m.data?.dispatched
        ? { ...m, data: { ...m.data, dispatching: true } }
        : m
    ))
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/reminders/trigger-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      const result = res.ok ? await res.json() : null
      const sent = result?.data?.sent ?? 0
      // Update message: remove dispatching, show dispatched state
      setMsgs(prev => prev.map(m =>
        m.type === 'reminder-preview'
          ? { ...m, data: { ...m.data, dispatching: false, dispatched: { sent } } }
          : m
      ))
    } catch {
      setMsgs(prev => prev.map(m =>
        m.type === 'reminder-preview'
          ? { ...m, data: { ...m.data, dispatching: false } }
          : m
      ))
    }
  }

  // ── Enviar texto livre ──────────────────────────────

  async function enviarTexto(texto) {
    if (!texto.trim() || isLoading) return
    const msg = texto.trim()
    setInput('')
    if (!acoesCompact) setAcoesCompact(true)
    setAcoesCompactAberta(false)

    addMsg({ role: 'user', type: 'text', text: msg })
    const thinkKey = addMsg({ role: 'kango', type: 'thinking' })
    setTextLoading(true)

    // Pequeno delay para dar sensação de processamento
    await new Promise(r => setTimeout(r, 500))

    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg }),
      })

      if (!res.ok) throw new Error()
      const data = await res.json()

      // Se a IA retornou uma resposta real (não genérica), usar ela
      const reply = data.reply
      if (reply && reply !== 'Aqui está o que encontrei nos seus dados.') {
        replaceMsg(thinkKey, { type: 'text', text: reply })
      } else {
        throw new Error('mock-default')
      }
    } catch {
      // KANGO_MOCK=true ou falha: resposta honesta
      replaceMsg(thinkKey, {
        type: 'text',
        text: 'Ainda estou em treinamento para entender mensagens livres. Por enquanto, use os atalhos acima para consultar dados rapidamente. Em breve estarei muito mais inteligente por aqui!',
      })
    } finally {
      setTextLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes kangoBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @media (prefers-reduced-motion: reduce) {
          .kango-fab-breathe { animation: none !important; }
        }
        .kango-fab-breathe { animation: kangoBreathe 4s ease-in-out infinite; }
      `}</style>

      {/* Overlay mobile */}
      {aberto && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setAberto(false)} />
      )}

      {/* Painel do chat */}
      <div className={`fixed z-50 transition-all duration-300 ease-out
        ${aberto ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
        bottom-24 right-5 w-[calc(100vw-2.5rem)] max-w-sm md:bottom-24 md:right-6 md:w-96
      `}>
        <div className="bg-white rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden"
          style={{ height: '520px' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-navy shrink-0">
            <div className="flex items-center gap-3">
              <img src="/kango-avatar.png" alt="Kango"
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/20" />
              <div>
                <p className="text-white text-sm font-semibold leading-none">Kango</p>
                <p className="text-white/50 text-xs mt-0.5">a assistente de dados da SATTA</p>
              </div>
            </div>
            <button onClick={() => setAberto(false)}
              className="text-white/50 hover:text-white transition-colors p-1">
              <X size={18} />
            </button>
          </div>

          {/* Mini-dashboard */}
          <MiniDash
            data={miniDash}
            loading={miniDashLoading}
            onRefresh={carregarMiniDash}
            onLembreteClick={() => executarAcao('lembrete-preview')}
          />

          {/* Área principal */}
          {!temMsgs ? (
            /* Estado inicial: chips em tela cheia */
            <>
              <div className="px-4 pt-3 pb-0 shrink-0">
                <p className="text-sm font-medium text-navy text-center">
                  O que você quer saber sobre <span className="font-semibold">{empresa?.nome ?? 'seu negócio'}</span>?
                </p>
              </div>
              <AcoesRapidas categorias={categorias} onAcao={executarAcao} compact={false} />
            </>
          ) : (
            /* Estado com mensagens */
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.map(m => (
                <div key={m.key} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {m.role === 'kango' && (
                    <img src="/kango-avatar.png" alt="" aria-hidden
                      className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                  )}
                  <div className={`${m.role === 'user'
                    ? 'max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed bg-blue text-white rounded-tr-sm'
                    : 'max-w-[85%]'
                  }`}>
                    {m.role === 'user'
                      ? m.text
                      : <KangoMsg msg={m} actions={{ 'disparar-lembretes': dispararLembretes }} />
                    }
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Barra de ações compacta (aparece após primeira interação) */}
          {temMsgs && (
            <div className="border-t border-border shrink-0">
              <button
                onClick={() => setAcoesCompactAberta(a => !a)}
                className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-text-2 hover:text-navy hover:bg-slate-50 transition-colors"
              >
                <Zap size={11} className="text-blue" />
                <span>Ações rápidas</span>
                <ChevronDown size={11} className={`ml-auto transition-transform ${acoesCompactAberta ? 'rotate-180' : ''}`} />
              </button>
              {acoesCompactAberta && (
                <div className="border-t border-border">
                  <AcoesRapidas categorias={categorias} onAcao={executarAcao} compact={true} />
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <div className={`px-3 pb-3 pt-2 flex gap-2 ${temMsgs ? '' : 'border-t border-border'} shrink-0`}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarTexto(input)}
              placeholder="Pergunte sobre seu negócio..."
              disabled={isLoading}
              className="flex-1 bg-offwhite border border-border text-navy rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/10 transition-all placeholder:text-slate-soft text-[14px] disabled:opacity-50"
            />
            <button
              onClick={() => enviarTexto(input)}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 bg-blue hover:bg-blue-hover text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
            >
              <Send size={15} />
            </button>
          </div>

        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setAberto(a => !a)}
        title="Falar com a Kango"
        aria-label="Abrir assistente Kango"
        className={`fixed bottom-5 right-5 md:bottom-6 md:right-6 z-50
          w-14 h-14 rounded-full shadow-lg flex items-center justify-center
          overflow-hidden bg-navy transition-all duration-200
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue
          ${aberto ? 'scale-95' : 'hover:scale-110 kango-fab-breathe'}
        `}
      >
        {aberto
          ? <X size={20} className="text-white" />
          : <img src="/kango-avatar.png" alt="Kango" className="w-full h-full object-cover" />
        }
      </button>
    </>
  )
}
