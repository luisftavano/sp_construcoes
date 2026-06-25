import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getAgendamentosHoje, getTodosAtendimentos, getClientes as fetchClientes, getDespesas } from '../lib/firestore'
import { auth } from '../firebase'
import { nichoLabels } from '../lib/nichos'
import { Plus, ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react'

// ── Helpers ──────────────────────────────────────────

function formatBRL(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0)
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function mesAtual() {
  return new Date().toISOString().slice(0, 7)
}

function formatDataExtenso() {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date())
}

async function apiFetch(path) {
  const token = await auth.currentUser?.getIdToken()
  const res = await fetch(path, { headers: { 'Authorization': `Bearer ${token}` } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Badge de status ───────────────────────────────────

const STATUS_STYLES = {
  agendado:   { bg: '#F5EDDE', color: '#5C3D10', label: 'agendado' },
  confirmado: { bg: '#E9F3EC', color: '#1A3D2B', label: 'confirmado' },
  concluido:  { bg: '#EDEBE6', color: '#6B6560', label: 'concluído' },
  cancelado:  { bg: '#F5DEDE', color: '#5C1010', label: 'cancelado' },
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.agendado
  return (
    <span className="text-[11px] px-2 py-0.5 rounded shrink-0" style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

// ── Linha de agendamento ──────────────────────────────

function AgendamentoRow({ ag, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-3.5 border-b border-border last:border-0 hover:bg-bg cursor-pointer transition-colors"
    >
      <span className="font-mono text-sm text-text-2 w-11 shrink-0">{ag.hora_inicio}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">{ag.cliente_nome}</p>
        <p className="text-xs text-text-2 truncate">
          {ag.servico}{ag.recurso ? ` · ${ag.recurso}` : ''}
        </p>
      </div>
      <StatusBadge status={ag.status} />
    </div>
  )
}

// ── Kango Teaser ──────────────────────────────────────
// Ponto de entrada leve para a Kango no dashboard.
// O chat completo vive no KangoFloat (botão flutuante no canto).
// Os chips disparam o evento 'kango-open' que o KangoFloat escuta.

function KangoTeaser() {
  function abrirKango() {
    window.dispatchEvent(new CustomEvent('kango-open'))
  }

  return (
    <div className="bg-ink-light border border-border-strong rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        {/*
          TODO: ARTE FALTANTE — /assets/kango-avatar.png precisa ter fundo transparente
          Substituir este placeholder quando a arte estiver disponível
        */}
        <img
          src="/kango-avatar.png"
          alt="Kango"
          className="w-10 h-10 rounded-full object-cover shrink-0"
        />
        <div>
          <p className="text-sm font-semibold text-ink">Kango</p>
          <p className="text-xs text-text-3">a assistente de dados da SATTA</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {['Qual minha receita?', 'Quem não voltou?', 'Resumo do mês'].map(q => (
          <button
            key={q}
            onClick={abrirKango}
            className="text-xs border border-border bg-surface text-text-2 hover:text-ink hover:border-ink/40 px-2.5 py-1 rounded-full transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Widget: Mais vendidos hoje ────────────────────────

function MaisVendidosWidget({ items, loading }) {
  if (loading) return null
  if (!items.length) return null

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-medium text-text">Mais vendidos hoje</h2>
      </div>
      <div className="px-4 py-3 space-y-2">
        {items.map((item, i) => (
          <div key={item.itemId ?? i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-text-3 font-mono w-4 shrink-0">{i + 1}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                item.type === 'service' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
              }`}>
                {item.type === 'service' ? 'serv' : 'prod'}
              </span>
              <span className="text-sm text-text truncate">{item.name}</span>
            </div>
            <span className="text-xs font-mono text-text-2 shrink-0">{item.quantitySold}×</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────

export default function Dashboard() {
  const { user, empresa } = useAuth()
  const navigate = useNavigate()
  const labels = nichoLabels[empresa?.nicho ?? empresa?.segmento] || nichoLabels.outro

  const [agendamentos, setAgendamentos] = useState([])
  const [atendimentos, setAtendimentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [despesas, setDespesas] = useState([])
  const [loading, setLoading] = useState(true)
  const [topItems, setTopItems] = useState([])

  useEffect(() => {
    if (!user) return
    Promise.all([
      getAgendamentosHoje(user.uid),
      getTodosAtendimentos(user.uid),
      fetchClientes(user.uid),
      getDespesas(user.uid).catch(() => []),
    ])
      .then(([ags, ats, cls, deps]) => {
        setAgendamentos(ags)
        setAtendimentos(ats)
        setClientes(cls)
        setDespesas(deps)
      })
      .catch(err => console.error('Dashboard:', err))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!user) return
    const d = hoje()
    apiFetch(`/api/reports/top-items?startDate=${d}&endDate=${d}&limit=3`)
      .then(data => setTopItems(Array.isArray(data) ? data : []))
      .catch(() => {}) // widget is optional — silent fail is fine
  }, [user])

  // Financeiro do mês atual
  const mesStr = mesAtual()
  const receitaMes = atendimentos
    .filter(a => (a.data || '').startsWith(mesStr))
    .reduce((acc, a) => acc + (a.valor || 0), 0)
  const despesasMes = despesas
    .filter(d => (d.data || '').startsWith(mesStr))
    .reduce((acc, d) => acc + (d.valor || 0), 0)

  // Saldo de hoje
  const hojeStr = hoje()
  const saldoHoje = atendimentos
    .filter(a => a.data === hojeStr)
    .reduce((acc, a) => acc + (a.valor || 0), 0)

  // Clientes inativos (sem atendimento nos últimos 30 dias)
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  const clientesInativos = clientes.filter(c => {
    const atsCliente = atendimentos.filter(a => a.cliente_id === c.id)
    if (!atsCliente.length) return true
    const ultimo = atsCliente.map(a => a.data || '').sort().at(-1)
    return ultimo < cutoff
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-ink rounded-full border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl">

      {/* ── Cabeçalho ── */}
      <div className="flex items-start justify-between pb-5 mb-6 border-b border-border">
        <div>
          <h1 className="font-bricolage text-2xl font-semibold text-text leading-tight">
            {empresa?.nome}
          </h1>
          <p className="text-text-3 text-sm mt-0.5 capitalize">{formatDataExtenso()}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-3 uppercase tracking-wide mb-1">saldo de hoje</p>
          <p className="font-mono text-2xl font-medium text-ink">{formatBRL(saldoHoje)}</p>
        </div>
      </div>

      {/* ── Corpo: 2 colunas no desktop ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Coluna principal: Agenda ── */}
        <div className="lg:col-span-2">
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-medium text-text">{labels.agenda ?? 'Agenda de hoje'}</h2>
              <button
                onClick={() => navigate('/agenda')}
                className="text-xs text-text-2 hover:text-ink flex items-center gap-1 transition-colors"
              >
                ver tudo <ArrowRight size={12} />
              </button>
            </div>

            {agendamentos.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-text-2 mb-3">Nenhum horário marcado para hoje.</p>
                <button
                  onClick={() => navigate('/agenda')}
                  className="text-xs text-ink border border-ink/30 hover:bg-ink hover:text-white px-4 py-2 rounded-md transition-colors"
                >
                  Adicionar agendamento
                </button>
              </div>
            ) : (
              <div>
                {agendamentos.map(ag => (
                  <AgendamentoRow
                    key={ag.id}
                    ag={ag}
                    onClick={() => navigate('/agenda')}
                  />
                ))}
                <div className="px-4 py-3 border-t border-border">
                  <button
                    onClick={() => navigate('/agenda')}
                    className="text-xs text-ink flex items-center gap-1.5 hover:underline transition-colors"
                  >
                    <Plus size={13} /> Adicionar horário
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Coluna lateral: Financeiro + Kango ── */}
        <div className="space-y-4">

          {/* Resumo financeiro */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-medium text-text">Este mês</h2>
              <button
                onClick={() => navigate('/financeiro')}
                className="text-xs text-text-2 hover:text-ink flex items-center gap-1 transition-colors"
              >
                ver tudo <ArrowRight size={12} />
              </button>
            </div>
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-2 flex items-center gap-1.5">
                  <ArrowUpRight size={12} className="text-emerald-600" /> Receita
                </span>
                <span className="font-mono text-sm text-text">{formatBRL(receitaMes)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-2 flex items-center gap-1.5">
                  <ArrowDownRight size={12} className="text-red-500" /> Despesas
                </span>
                <span className="font-mono text-sm text-text">{formatBRL(despesasMes)}</span>
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="text-sm font-medium text-text">Resultado</span>
                <span className={`font-mono text-sm font-medium ${receitaMes - despesasMes >= 0 ? 'text-ink' : 'text-red-600'}`}>
                  {formatBRL(receitaMes - despesasMes)}
                </span>
              </div>
            </div>
          </div>

          {/* Clientes inativos */}
          {clientesInativos.length > 0 && (
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3.5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text">{clientesInativos.length} {clientesInativos.length === 1 ? 'cliente' : 'clientes'} sem retorno</p>
                  <p className="text-xs text-text-2 mt-0.5">há 30 dias ou mais</p>
                </div>
                <button
                  onClick={() => navigate('/clientes')}
                  className="text-xs text-ink border border-ink/30 hover:bg-ink hover:text-white px-3 py-1.5 rounded-md transition-colors shrink-0"
                >
                  ver
                </button>
              </div>
            </div>
          )}

          {/* Mais vendidos hoje */}
          <MaisVendidosWidget items={topItems} loading={loading} />

          {/* Kango teaser — abre o chat flutuante */}
          <KangoTeaser />
        </div>
      </div>
    </div>
  )
}
