import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getClientes, getTodosAtendimentos, getDespesas } from '../lib/firestore'
import { etapas, nichoLabels } from '../lib/nichos'
import { Users, DollarSign, TrendingUp, UserCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react'

function formatMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function mesAtual() {
  return new Date().toISOString().slice(0, 7)
}

function StatCard({ icon: Icon, label, value, sub, trend }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-text-2 text-sm">{label}</p>
        <div className="w-8 h-8 rounded-md bg-ink-light flex items-center justify-center">
          <Icon size={15} className="text-ink" />
        </div>
      </div>
      <p className="text-text text-2xl font-semibold font-mono">{value}</p>
      {sub && <p className="text-text-3 text-xs mt-1">{sub}</p>}
    </div>
  )
}

export default function Metricas() {
  const { user, empresa } = useAuth()
  const labels = nichoLabels[empresa?.nicho] || nichoLabels.outro
  const [clientes, setClientes] = useState([])
  const [atendimentos, setAtendimentos] = useState([])
  const [despesas, setDespesas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getClientes(user.uid),
      getTodosAtendimentos(user.uid),
      getDespesas(user.uid).catch(() => []),
    ])
      .then(([c, a, d]) => {
        setClientes(c)
        setAtendimentos(a)
        setDespesas(d)
      })
      .catch(err => console.error('Metricas:', err))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-ink rounded-full border-t-transparent animate-spin" />
    </div>
  )

  const mesStr = mesAtual()
  const totalReceita = atendimentos.reduce((s, a) => s + (a.valor || 0), 0)
  const receitaMes = atendimentos.filter(a => (a.data || '').startsWith(mesStr)).reduce((s, a) => s + (a.valor || 0), 0)
  const despesasMes = despesas.filter(d => (d.data || '').startsWith(mesStr)).reduce((s, d) => s + (d.valor || 0), 0)
  const resultadoMes = receitaMes - despesasMes

  const fechados = clientes.filter(c => c.etapa === 'fechado').length
  const taxaConversao = clientes.length > 0 ? Math.round((fechados / clientes.length) * 100) : 0

  const porEtapa = etapas.map(e => ({
    ...e,
    total: clientes.filter(c => c.etapa === e.id).length,
  }))

  const origens = clientes.reduce((acc, c) => {
    if (!c.origem) return acc
    acc[c.origem] = (acc[c.origem] || 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="font-bricolage text-2xl font-semibold text-text">Métricas</h1>
        <p className="text-text-2 text-sm mt-0.5">{empresa?.nome}</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label={`Total de ${labels.cliente.toLowerCase()}s`} value={clientes.length} />
        <StatCard icon={DollarSign} label="Receita total" value={formatMoeda(totalReceita)} />
        <StatCard icon={UserCheck} label="Fechados" value={fechados} sub={`${taxaConversao}% de conversão`} />
        <StatCard icon={TrendingUp} label="Resultado do mês" value={formatMoeda(resultadoMes)} sub={resultadoMes >= 0 ? 'positivo' : 'negativo'} />
      </div>

      {/* Financeiro do mês */}
      <div className="bg-surface border border-border rounded-lg p-5 mb-4">
        <p className="text-sm font-medium text-text mb-4">Financeiro — mês atual</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowUpRight size={13} className="text-emerald-600" />
              <p className="text-xs text-text-2 uppercase tracking-wide">Receitas</p>
            </div>
            <p className="font-mono text-lg font-medium text-text">{formatMoeda(receitaMes)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownRight size={13} className="text-red-500" />
              <p className="text-xs text-text-2 uppercase tracking-wide">Despesas</p>
            </div>
            <p className="font-mono text-lg font-medium text-text">{formatMoeda(despesasMes)}</p>
          </div>
          <div className="border-l border-border pl-4">
            <p className="text-xs text-text-3 uppercase tracking-wide mb-1">Resultado</p>
            <p className={`font-mono text-lg font-semibold ${resultadoMes >= 0 ? 'text-ink' : 'text-red-600'}`}>
              {formatMoeda(resultadoMes)}
            </p>
          </div>
        </div>
      </div>

      {/* Funil */}
      <div className="bg-surface border border-border rounded-lg p-5 mb-4">
        <p className="text-sm font-medium text-text mb-4">Funil de vendas</p>
        {clientes.length === 0 ? (
          <p className="text-text-2 text-sm">Sem dados ainda.</p>
        ) : (
          <div className="space-y-3">
            {porEtapa.map(e => (
              <div key={e.id}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-text-2 font-medium">{e.label}</span>
                  <span className="text-text font-semibold tabular-nums">{e.total}</span>
                </div>
                <div className="h-1.5 bg-bg rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: clientes.length > 0 ? `${(e.total / clientes.length) * 100}%` : '0%',
                      backgroundColor: e.cor,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Origens */}
      {Object.keys(origens).length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-5">
          <p className="text-sm font-medium text-text mb-4">Origem dos clientes</p>
          <div className="space-y-2">
            {Object.entries(origens).sort((a, b) => b[1] - a[1]).map(([origem, count]) => (
              <div key={origem} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <p className="text-text-2 text-sm">{origem}</p>
                <p className="text-text text-sm font-semibold tabular-nums">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
