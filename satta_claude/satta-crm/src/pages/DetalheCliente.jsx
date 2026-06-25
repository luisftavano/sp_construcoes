import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getCliente, updateCliente, deleteCliente, getAtendimentos, addAtendimento, getServicos } from '../lib/firestore'
import { etapas, nichoLabels } from '../lib/nichos'
import { ArrowLeft, Phone, Mail, Trash2, Plus, ChevronDown } from 'lucide-react'

function formatData(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

const QTDS = [1, 2, 3, 4, 5]

export default function DetalheCliente() {
  const { id } = useParams()
  const { user, empresa } = useAuth()
  const navigate = useNavigate()
  const labels = nichoLabels[empresa?.nicho] || nichoLabels.outro

  const [cliente, setCliente]       = useState(null)
  const [atendimentos, setAtendimentos] = useState([])
  const [servicos, setServicos]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [saving, setSaving]         = useState(false)

  // Form state
  const [servicoId, setServicoId]           = useState('')
  const [servicoCustom, setServicoCustom]   = useState('')
  const [qty, setQty]                       = useState(1)
  const [valorBase, setValorBase]           = useState(0)   // preço do catálogo
  const [valor, setValor]                   = useState('')   // valor final (pode ter desconto)
  const [observacao, setObservacao]         = useState('')

  useEffect(() => {
    if (!user) return
    async function load() {
      try {
        const [c, a, s] = await Promise.all([
          getCliente(user.uid, id),
          getAtendimentos(user.uid, id),
          getServicos(user.uid).catch(() => []),
        ])
        setCliente(c)
        setAtendimentos(a)
        setServicos(s)
      } catch (err) {
        console.error('DetalheCliente:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, id])

  function resetForm() {
    setServicoId('')
    setServicoCustom('')
    setQty(1)
    setValorBase(0)
    setValor('')
    setObservacao('')
  }

  function handleSelectServico(sid) {
    setServicoId(sid)
    const s = servicos.find(x => x.id === sid)
    const vb = s?.valor || 0
    setValorBase(vb)
    setValor(vb > 0 ? (vb * qty).toFixed(2) : '')
  }

  function handleQty(n) {
    setQty(n)
    if (valorBase > 0) setValor((valorBase * n).toFixed(2))
  }

  async function mudarEtapa(novaEtapa) {
    await updateCliente(user.uid, id, { etapa: novaEtapa })
    setCliente(c => ({ ...c, etapa: novaEtapa }))
  }

  async function registrarAtendimento(e) {
    e.preventDefault()
    setSaving(true)

    const servicoSelecionado = servicos.find(s => s.id === servicoId)
    const nomeServico = servicoSelecionado
      ? qty > 1 ? `${qty}× ${servicoSelecionado.nome}` : servicoSelecionado.nome
      : servicoCustom.trim()

    if (!nomeServico) { setSaving(false); return }

    const valorFinal = parseFloat(valor) || 0

    try {
      const ref = await addAtendimento(user.uid, {
        cliente_id: id,
        cliente_nome: cliente.nome,
        servico: nomeServico,
        valor: valorFinal,
        data: hoje(),
        observacao,
      })
      setAtendimentos(prev => [
        {
          id: ref.id,
          servico: nomeServico,
          valor: valorFinal,
          observacao,
          criado_em: null,
          data: hoje(),
        },
        ...prev,
      ])
      resetForm()
      setShowForm(false)
    } catch (err) {
      console.error('registrarAtendimento:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Remover ${labels.cliente.toLowerCase()} permanentemente?`)) return
    await deleteCliente(user.uid, id)
    navigate(-1)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-ink rounded-full border-t-transparent animate-spin" />
    </div>
  )
  if (!cliente) return <div className="text-text-2 text-sm">Cliente não encontrado.</div>

  const totalGasto = atendimentos.reduce((sum, a) => sum + (a.valor || 0), 0)
  const servicoAtual = servicos.find(s => s.id === servicoId)
  const totalCalculado = valorBase * qty
  const temDesconto = servicoAtual && parseFloat(valor) < totalCalculado && parseFloat(valor) > 0

  return (
    <div className="max-w-lg">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-text-2 hover:text-text text-sm mb-6 transition-colors">
        <ArrowLeft size={15} /> Voltar
      </button>

      {/* Header */}
      <div className="bg-surface border border-border rounded-lg p-5 mb-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-bricolage text-xl font-semibold text-text">{cliente.nome}</h1>
            {cliente.referencia && <p className="text-text-2 text-sm mt-0.5">{cliente.referencia}</p>}
          </div>
          <button onClick={handleDelete} className="text-text-3 hover:text-red-500 transition-colors p-1">
            <Trash2 size={15} />
          </button>
        </div>
        <div className="flex flex-wrap gap-4 mt-3">
          {cliente.telefone && (
            <a href={`tel:${cliente.telefone}`} className="flex items-center gap-1.5 text-xs text-text-2 hover:text-text transition-colors">
              <Phone size={12} />{cliente.telefone}
            </a>
          )}
          {cliente.email && (
            <a href={`mailto:${cliente.email}`} className="flex items-center gap-1.5 text-xs text-text-2 hover:text-text transition-colors">
              <Mail size={12} />{cliente.email}
            </a>
          )}
        </div>
        {cliente.observacao && (
          <p className="text-text-2 text-xs mt-3 border-t border-border pt-3">{cliente.observacao}</p>
        )}
      </div>

      {/* Etapa */}
      <div className="bg-surface border border-border rounded-lg p-5 mb-3">
        <p className="text-xs text-text-3 font-medium uppercase tracking-wide mb-3">Etapa atual</p>
        <div className="flex flex-wrap gap-2">
          {etapas.map(e => (
            <button
              key={e.id}
              onClick={() => mudarEtapa(e.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                cliente.etapa === e.id
                  ? 'text-white border-transparent shadow-sm'
                  : 'text-text-2 border-border hover:border-border-strong hover:text-text'
              }`}
              style={cliente.etapa === e.id ? { backgroundColor: e.cor, borderColor: e.cor } : {}}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Histórico de atendimentos */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-medium text-text">Histórico</p>
            {totalGasto > 0 && <p className="text-xs text-text-3 mt-0.5">{formatMoeda(totalGasto)} no total</p>}
          </div>
          <button
            onClick={() => { setShowForm(f => !f); resetForm() }}
            className="flex items-center gap-1.5 bg-ink hover:bg-ink/90 text-white text-xs px-3 py-1.5 rounded-md transition-colors font-medium"
          >
            <Plus size={13} /> Registrar
          </button>
        </div>

        {/* Formulário de novo atendimento */}
        {showForm && (
          <form onSubmit={registrarAtendimento} className="border-b border-border bg-bg px-4 py-4 space-y-3">

            {/* Serviço do catálogo */}
            {servicos.length > 0 && (
              <div>
                <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Serviço</label>
                <div className="relative">
                  <select
                    value={servicoId}
                    onChange={e => handleSelectServico(e.target.value)}
                    className="w-full appearance-none border border-border bg-surface rounded-md pl-3 pr-8 py-2 text-sm text-text focus:outline-none focus:border-border-strong"
                  >
                    <option value="">Selecionar do catálogo…</option>
                    {servicos.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nome} — {formatMoeda(s.valor)}
                      </option>
                    ))}
                    <option value="__custom__">Outro (digitar)</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Nome customizado (quando "Outro" selecionado ou sem catálogo) */}
            {(servicoId === '__custom__' || servicos.length === 0) && (
              <div>
                <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">
                  {servicos.length === 0 ? 'Serviço realizado' : 'Nome do serviço'}
                </label>
                <input
                  required
                  value={servicoCustom}
                  onChange={e => setServicoCustom(e.target.value)}
                  placeholder="Ex: Lavagem completa"
                  className="w-full border border-border bg-surface rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-border-strong placeholder:text-text-3"
                />
              </div>
            )}

            {/* Quantidade */}
            <div>
              <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wide">Quantidade</label>
              <div className="flex gap-1.5">
                {QTDS.map(n => (
                  <button
                    key={n} type="button"
                    onClick={() => handleQty(n)}
                    className={`w-9 h-9 rounded-md text-sm font-medium transition-colors border ${
                      qty === n
                        ? 'bg-ink text-white border-ink'
                        : 'border-border text-text-2 hover:border-border-strong hover:text-text bg-surface'
                    }`}
                  >
                    {n}×
                  </button>
                ))}
              </div>
            </div>

            {/* Valor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-text-2 uppercase tracking-wide">Valor (R$)</label>
                {valorBase > 0 && qty > 1 && (
                  <span className="text-xs text-text-3">
                    {formatMoeda(valorBase)} × {qty} = {formatMoeda(totalCalculado)}
                  </span>
                )}
              </div>
              <input
                type="number" min="0" step="0.01"
                value={valor}
                onChange={e => setValor(e.target.value)}
                placeholder="0,00"
                className="w-full border border-border bg-surface rounded-md px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-border-strong placeholder:text-text-3"
              />
              {temDesconto && (
                <p className="text-xs text-amber-600 mt-1">
                  Desconto aplicado: {formatMoeda(totalCalculado - parseFloat(valor))}
                </p>
              )}
            </div>

            {/* Observação */}
            <div>
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Observação</label>
              <input
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Opcional"
                className="w-full border border-border bg-surface rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-border-strong placeholder:text-text-3"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setShowForm(false); resetForm() }}
                className="flex-1 border border-border text-text-2 hover:text-text py-2 rounded-md text-sm font-medium transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving || (!servicoId && !servicoCustom.trim())}
                className="flex-1 bg-ink hover:bg-ink/90 text-white py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40">
                {saving ? '...' : 'Salvar'}
              </button>
            </div>
          </form>
        )}

        {/* Lista de atendimentos */}
        {atendimentos.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-text-2 text-sm">Nenhum atendimento registrado.</p>
          </div>
        ) : (
          <div>
            {atendimentos.map(a => (
              <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border last:border-0">
                <div className="min-w-0">
                  <p className="text-text text-sm font-medium truncate">{a.servico}</p>
                  {a.observacao && <p className="text-text-2 text-xs mt-0.5">{a.observacao}</p>}
                  <p className="text-text-3 text-xs mt-0.5">{formatData(a.criado_em)}</p>
                </div>
                {a.valor > 0 && (
                  <p className="text-text text-sm font-mono font-medium shrink-0">{formatMoeda(a.valor)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
