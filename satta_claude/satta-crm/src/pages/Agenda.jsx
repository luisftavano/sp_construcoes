import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAgendamentos, addAgendamento, updateAgendamento, deleteAgendamento, getClientes } from '../lib/firestore'
import { auth } from '../firebase'
import { Plus, X, ChevronLeft, ChevronRight, Search } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────

function formatDataDisplay(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function diaSemana(dateStr) {
  const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
  return dias[new Date(dateStr + 'T12:00:00').getDay()]
}

function formatMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

const STATUS_STYLES = {
  agendado:   { bg: '#F5EDDE', color: '#5C3D10', label: 'agendado' },
  confirmado: { bg: '#E9F3EC', color: '#1A3D2B', label: 'confirmado' },
  concluido:  { bg: '#EDEBE6', color: '#6B6560', label: 'concluído' },
  cancelado:  { bg: '#F5DEDE', color: '#5C1010', label: 'cancelado' },
}

const PAYMENT_METHODS = [
  { value: 'pix',            label: 'Pix' },
  { value: 'dinheiro',       label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão de crédito' },
  { value: 'cartao_debito',  label: 'Cartão de débito' },
  { value: 'fiado',          label: 'Fiado' },
  { value: 'outro',          label: 'Outro' },
]

async function apiFetch(path, { method = 'GET', body } = {}) {
  const token = await auth.currentUser?.getIdToken()
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    ...(body != null ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.agendado
  return (
    <span className="text-[11px] px-2 py-0.5 rounded shrink-0" style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

// ── Seletor de cliente com autocomplete ───────────────

function ClienteInput({ clientes, clienteId, clienteNome, onSelect }) {
  const [q, setQ]             = useState(clienteNome || '')
  const [aberto, setAberto]   = useState(false)
  const wrapRef               = useRef()

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setAberto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtrados = q.trim()
    ? clientes.filter(c => c.nome.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    : clientes.slice(0, 8)

  function pick(c) {
    setQ(c.nome)
    setAberto(false)
    onSelect({ id: c.id, nome: c.nome })
  }

  function handleChange(e) {
    setQ(e.target.value)
    setAberto(true)
    // Se o usuário apaga o campo, limpa a seleção
    if (!e.target.value) onSelect({ id: '', nome: '' })
  }

  function handleBlur() {
    // Guarda o texto livre mesmo sem selecionar da lista
    if (!clienteId && q.trim()) onSelect({ id: '', nome: q.trim() })
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none" />
        <input
          value={q}
          onChange={handleChange}
          onFocus={() => setAberto(true)}
          onBlur={handleBlur}
          placeholder="Buscar ou digitar nome..."
          className="w-full border border-border bg-bg rounded-md pl-8 pr-8 py-2 text-sm text-text focus:outline-none focus:border-border-strong placeholder:text-text-3"
        />
        {q && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); setQ(''); setAberto(false); onSelect({ id: '', nome: '' }) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-3 hover:text-text transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {aberto && (
        <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {filtrados.length === 0 ? (
            <p className="text-xs text-text-3 px-3 py-3">
              {q ? `Nenhum cliente encontrado. Será salvo como "${q}".` : 'Nenhum cliente cadastrado.'}
            </p>
          ) : (
            filtrados.map(c => (
              <button
                key={c.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); pick(c) }}
                className={`w-full text-left px-3 py-2.5 hover:bg-bg transition-colors border-b border-border last:border-0 ${clienteId === c.id ? 'bg-bg' : ''}`}
              >
                <p className="text-sm text-text">{c.nome}</p>
                {c.telefone && <p className="text-xs text-text-3 font-mono">{c.telefone}</p>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Modal de agendamento ──────────────────────────────

function ModalAgendamento({ clientes, onSalvar, onFechar, editando }) {
  const [clienteId, setClienteId]     = useState(editando?.cliente_id ?? '')
  const [clienteNome, setClienteNome] = useState(editando?.cliente_nome ?? '')
  const [servico, setServico]         = useState(editando?.servico ?? '')
  const [recurso, setRecurso]         = useState(editando?.recurso ?? '')
  const [data, setData]               = useState(editando?.data ?? new Date().toISOString().slice(0, 10))
  const [horaInicio, setHoraInicio]   = useState(editando?.hora_inicio ?? '09:00')
  const [horaFim, setHoraFim]         = useState(editando?.hora_fim ?? '09:30')
  const [status, setStatus]           = useState(editando?.status ?? 'agendado')
  const [valor, setValor]             = useState(editando?.valor ?? '')
  const [obs, setObs]                 = useState(editando?.obs ?? '')
  const [erro, setErro]               = useState('')

  function salvar(e) {
    e.preventDefault()
    if (!clienteNome.trim()) return setErro('Informe o cliente.')
    if (!data) return setErro('Informe a data.')
    if (!horaInicio || !horaFim) return setErro('Informe os horários.')
    onSalvar({
      cliente_id: clienteId,
      cliente_nome: clienteNome,
      servico, recurso, data, hora_inicio: horaInicio, hora_fim: horaFim,
      status, valor: Number(valor) || 0, obs,
    })
  }

  return (
    <div className="fixed inset-0 bg-text/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg border border-border w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-text">{editando ? 'Editar agendamento' : 'Novo agendamento'}</h2>
          <button onClick={onFechar} className="text-text-3 hover:text-text transition-colors"><X size={16} /></button>
        </div>

        <form onSubmit={salvar} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Cliente</label>
            <ClienteInput
              clientes={clientes}
              clienteId={clienteId}
              clienteNome={clienteNome}
              onSelect={({ id, nome }) => { setClienteId(id); setClienteNome(nome) }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Serviço</label>
              <input value={servico} onChange={e => setServico(e.target.value)} placeholder="Ex: Corte"
                className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-border-strong placeholder:text-text-3" />
            </div>
            <div>
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Recurso</label>
              <input value={recurso} onChange={e => setRecurso(e.target.value)} placeholder="Ex: Box 1"
                className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-border-strong placeholder:text-text-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)}
              className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-border-strong" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Início</label>
              <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
                className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-border-strong" />
            </div>
            <div>
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Fim</label>
              <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)}
                className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-border-strong" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Valor (R$)</label>
              <input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" min="0" step="0.01"
                className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-border-strong placeholder:text-text-3" />
            </div>
            <div>
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-border-strong">
                {Object.entries(STATUS_STYLES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Observações</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} placeholder="Opcional"
              className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-border-strong placeholder:text-text-3 resize-none" />
          </div>

          {erro && <p className="text-xs text-late-text">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onFechar}
              className="flex-1 border border-border text-text-2 hover:text-text hover:border-border-strong py-2 rounded-md text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 bg-ink hover:bg-blue-hover text-white py-2 rounded-md text-sm font-medium transition-colors">
              {editando ? 'Salvar alterações' : 'Salvar agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Buscador de produto para o modal de conclusão ─────

function ProdutoBuscador({ catalog, loadingCatalog, onSelect, onCancel }) {
  const [q, setQ] = useState('')
  const inputRef = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtered = catalog.filter(i =>
    i.name.toLowerCase().includes(q.toLowerCase()) ||
    (i.brand || '').toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8)

  return (
    <div className="border border-border rounded-lg bg-bg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Search size={13} className="text-text-3 shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar produto..."
          className="flex-1 text-sm bg-transparent outline-none text-text placeholder:text-text-3"
        />
        <button type="button" onClick={onCancel} className="text-text-3 hover:text-text transition-colors">
          <X size={13} />
        </button>
      </div>
      {loadingCatalog ? (
        <p className="text-xs text-text-3 px-3 py-3">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-text-3 px-3 py-3">Nenhum resultado{q ? ` para "${q}"` : ''}.</p>
      ) : (
        <div className="max-h-40 overflow-y-auto">
          {filtered.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface text-left border-b border-border last:border-0 transition-colors"
            >
              <span className="text-sm text-text">
                {item.name}{item.brand ? ` (${item.brand})` : ''}
              </span>
              <span className="text-xs font-mono text-text-2 shrink-0 ml-2">
                {formatMoeda(item.sellPrice ?? 0)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Modal confirmar conclusão com venda ───────────────

function ModalConcluirVenda({ ag, onConfirmar, onFechar }) {
  const [items, setItems] = useState([{
    tempId:    'ag-service',
    type:      'service',
    name:      ag.servico || 'Serviço',
    quantity:  1,
    unitPrice: ag.valor || 0,
  }])
  const [paymentMethod, setPaymentMethod]     = useState('pix')
  const [discountAmount, setDiscountAmount]   = useState('')
  const [salvando, setSalvando]               = useState(false)
  const [erro, setErro]                       = useState('')

  const [addingProduct, setAddingProduct]     = useState(false)
  const [inventory, setInventory]             = useState([])
  const [loadingInv, setLoadingInv]           = useState(false)

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice)), 0)
  const discount = Number(discountAmount) || 0
  const total    = Math.max(0, subtotal - discount)

  async function startAddingProduct() {
    setAddingProduct(true)
    if (inventory.length === 0) {
      setLoadingInv(true)
      try {
        const data = await apiFetch('/api/inventory?limit=100')
        setInventory(data.data ?? [])
      } catch { /* silent */ } finally { setLoadingInv(false) }
    }
  }

  function selectProduct(invItem) {
    setItems(prev => [...prev, {
      tempId:          crypto.randomUUID(),
      type:            'product',
      inventoryItemId: invItem.id,
      name:            invItem.name,
      quantity:        1,
      unitPrice:       invItem.sellPrice ?? 0,
    }])
    setAddingProduct(false)
  }

  function updateItem(tempId, field, value) {
    setItems(prev => prev.map(i => i.tempId === tempId ? { ...i, [field]: value } : i))
  }

  function removeItem(tempId) {
    if (tempId === 'ag-service') return // serviço principal não pode ser removido
    setItems(prev => prev.filter(i => i.tempId !== tempId))
  }

  async function confirmar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      await apiFetch('/api/sales', {
        method: 'POST',
        body: {
          items: items.map(({ tempId, ...i }) => ({
            type:            i.type,
            serviceId:       i.serviceId ?? null,
            inventoryItemId: i.inventoryItemId ?? null,
            name:            i.name,
            quantity:        Number(i.quantity),
            unitPrice:       Number(i.unitPrice),
          })),
          paymentMethod,
          discountAmount: discount,
          soldAt: new Date().toISOString(),
          force:  true,
        },
      })
      onConfirmar()
    } catch (err) {
      setErro(err.message || 'Erro ao registrar venda.')
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-text/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg border border-border w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-medium text-text">Confirmar conclusão</h2>
            <p className="text-xs text-text-3 mt-0.5">{ag.cliente_nome}</p>
          </div>
          <button onClick={onFechar} className="text-text-3 hover:text-text transition-colors"><X size={16} /></button>
        </div>

        <form onSubmit={confirmar} className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Itens */}
          <div>
            <p className="text-xs text-text-2 uppercase tracking-wide mb-2">Itens da venda</p>

            <div className="space-y-2 mb-3">
              {items.map(item => (
                <div key={item.tempId} className="flex items-center gap-2 bg-bg border border-border rounded-md px-3 py-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                    item.type === 'service' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {item.type === 'service' ? 'serv' : 'prod'}
                  </span>
                  <span className="text-sm text-text flex-1 min-w-0 truncate">{item.name}</span>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => updateItem(item.tempId, 'quantity', e.target.value)}
                    min="1"
                    className="w-12 text-center border border-border bg-surface rounded px-1 py-0.5 text-sm font-mono text-text focus:outline-none focus:border-border-strong"
                  />
                  <span className="text-xs text-text-3 shrink-0">×</span>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={e => updateItem(item.tempId, 'unitPrice', e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-20 border border-border bg-surface rounded px-2 py-0.5 text-sm font-mono text-text focus:outline-none focus:border-border-strong text-right"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.tempId)}
                    disabled={item.tempId === 'ag-service'}
                    className="text-text-3 hover:text-red-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {addingProduct ? (
              <ProdutoBuscador
                catalog={inventory}
                loadingCatalog={loadingInv}
                onSelect={selectProduct}
                onCancel={() => setAddingProduct(false)}
              />
            ) : (
              <button
                type="button"
                onClick={startAddingProduct}
                className="w-full text-xs border border-border text-text-2 hover:text-ink hover:border-border-strong py-2 rounded-md transition-colors"
              >
                + Adicionar produto consumido
              </button>
            )}
          </div>

          {/* Forma de pagamento */}
          <div>
            <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Forma de pagamento</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-border-strong"
            >
              {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {/* Desconto */}
          <div>
            <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Desconto (R$) — opcional</label>
            <input
              type="number"
              value={discountAmount}
              onChange={e => setDiscountAmount(e.target.value)}
              placeholder="0,00"
              min="0"
              step="0.01"
              className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-border-strong placeholder:text-text-3"
            />
          </div>

          {/* Total */}
          <div className="flex items-center justify-between bg-bg border border-border rounded-md px-4 py-3">
            <span className="text-sm font-medium text-text">Total</span>
            <span className="font-mono text-lg font-semibold text-ink">{formatMoeda(total)}</span>
          </div>

          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onFechar}
              className="flex-1 border border-border text-text-2 hover:text-text py-2 rounded-md text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              className="flex-1 bg-ink hover:bg-ink/90 disabled:opacity-50 text-white py-2 rounded-md text-sm font-medium transition-colors">
              {salvando ? 'Concluindo...' : 'Concluir atendimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Status seguinte para o fluxo rápido
const PROXIMO_STATUS = {
  agendado:   { next: 'confirmado', label: 'Confirmar' },
  confirmado: { next: 'concluido',  label: 'Concluir' },
  concluido:  null,
  cancelado:  null,
}

// ── Linha de agendamento ──────────────────────────────

function AgendamentoRow({ ag, onEditar, onExcluir, onStatus, onConcluir }) {
  const proximo = PROXIMO_STATUS[ag.status]

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0 hover:bg-bg transition-colors group">
      <span className="font-mono text-sm text-text-2 w-11 shrink-0">{ag.hora_inicio}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">{ag.cliente_nome}</p>
        <p className="text-xs text-text-2 truncate">
          {ag.servico || 'Sem serviço'}{ag.recurso ? ` · ${ag.recurso}` : ''}
          {ag.valor > 0 ? ` · R$ ${ag.valor.toFixed(2).replace('.', ',')}` : ''}
        </p>
      </div>
      {/* Status rápido: botão de avanço */}
      <div className="flex items-center gap-2 shrink-0">
        {proximo && (
          <button
            onClick={() => proximo.next === 'concluido' ? onConcluir(ag) : onStatus(ag.id, proximo.next)}
            className="text-[11px] font-medium px-2.5 py-1 rounded border border-ink/20 text-ink hover:bg-ink hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          >
            {proximo.label}
          </button>
        )}
        <StatusBadge status={ag.status} />
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onEditar(ag)}
          className="text-xs text-text-2 hover:text-ink border border-border hover:border-border-strong rounded px-2 py-1 transition-colors">
          editar
        </button>
        <button onClick={() => onExcluir(ag.id)}
          className="text-xs text-late-text hover:text-late-text/70 border border-late-bg hover:border-late-text/30 rounded px-2 py-1 transition-colors">
          excluir
        </button>
      </div>
    </div>
  )
}

// ── Agenda ────────────────────────────────────────────

export default function Agenda() {
  const { user } = useAuth()
  const [agendamentos, setAgendamentos] = useState([])
  const [clientes, setClientes]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState(false)
  const [editando, setEditando]         = useState(null)
  const [filtroData, setFiltroData]     = useState(new Date().toISOString().slice(0, 10))
  const [modalVenda, setModalVenda]     = useState(null) // agendamento sendo concluído

  useEffect(() => {
    if (!user) return
    Promise.all([
      getAgendamentos(user.uid).catch(err => { console.error('Agenda/agendamentos:', err); return [] }),
      getClientes(user.uid).catch(err => { console.error('Agenda/clientes:', err); return [] }),
    ])
      .then(([ags, cls]) => { setAgendamentos(ags); setClientes(cls) })
      .finally(() => setLoading(false))
  }, [user])

  async function salvarAgendamento(dados) {
    if (editando) {
      await updateAgendamento(user.uid, editando.id, dados)
      setAgendamentos(prev => prev.map(a => a.id === editando.id ? { ...a, ...dados } : a))
    } else {
      const ref = await addAgendamento(user.uid, dados)
      setAgendamentos(prev => [...prev, { id: ref.id, ...dados }])
    }
    setModal(false)
    setEditando(null)
  }

  async function excluir(id) {
    if (!confirm('Excluir este agendamento?')) return
    await deleteAgendamento(user.uid, id)
    setAgendamentos(prev => prev.filter(a => a.id !== id))
  }

  function editarAg(ag) {
    setEditando(ag)
    setModal(true)
  }

  async function mudarStatus(id, novoStatus) {
    await updateAgendamento(user.uid, id, { status: novoStatus })
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: novoStatus } : a))
  }

  async function confirmarConclusao() {
    // Venda já foi criada pelo modal; agora marca o status no Firestore
    const ag = modalVenda
    setModalVenda(null)
    await updateAgendamento(user.uid, ag.id, { status: 'concluido' })
    setAgendamentos(prev => prev.map(a => a.id === ag.id ? { ...a, status: 'concluido' } : a))
  }

  function moverDia(delta) {
    const d = new Date(filtroData + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    setFiltroData(d.toISOString().slice(0, 10))
  }

  const doFiltro = agendamentos
    .filter(a => a.data === filtroData)
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-5 h-5 border-2 border-ink rounded-full border-t-transparent animate-spin" /></div>
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bricolage text-2xl font-semibold text-text">Agenda</h1>
        <button
          onClick={() => { setEditando(null); setModal(true) }}
          className="flex items-center gap-2 bg-ink hover:bg-blue-hover text-white text-sm px-4 py-2 rounded-md transition-colors font-medium"
        >
          <Plus size={15} /> Novo horário
        </button>
      </div>

      {/* Seletor de data */}
      <div className="flex items-center gap-3 mb-5 bg-surface border border-border rounded-md px-4 py-3">
        <button onClick={() => moverDia(-1)} className="text-text-2 hover:text-text transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center">
          <input
            type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)}
            className="font-mono text-sm text-text bg-transparent border-0 outline-none cursor-pointer text-center"
          />
          <span className="text-xs text-text-3 ml-2 capitalize">{diaSemana(filtroData)}</span>
        </div>
        <button onClick={() => moverDia(1)} className="text-text-2 hover:text-text transition-colors">
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => setFiltroData(new Date().toISOString().slice(0, 10))}
          className="text-xs text-ink border border-ink/30 hover:bg-ink hover:text-white px-2.5 py-1 rounded transition-colors"
        >
          hoje
        </button>
      </div>

      {/* Lista */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {doFiltro.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-text-2 mb-3">Nenhum horário marcado para {formatDataDisplay(filtroData)}.</p>
            <button
              onClick={() => { setEditando(null); setModal(true) }}
              className="text-xs text-ink border border-ink/30 hover:bg-ink hover:text-white px-4 py-2 rounded-md transition-colors"
            >
              Adicionar agendamento
            </button>
          </div>
        ) : (
          doFiltro.map(ag => (
            <AgendamentoRow
              key={ag.id}
              ag={ag}
              onEditar={editarAg}
              onExcluir={excluir}
              onStatus={mudarStatus}
              onConcluir={ag => setModalVenda(ag)}
            />
          ))
        )}
      </div>

      {modal && (
        <ModalAgendamento
          clientes={clientes}
          editando={editando}
          onSalvar={salvarAgendamento}
          onFechar={() => { setModal(false); setEditando(null) }}
        />
      )}

      {modalVenda && (
        <ModalConcluirVenda
          ag={modalVenda}
          onConfirmar={confirmarConclusao}
          onFechar={() => setModalVenda(null)}
        />
      )}
    </div>
  )
}
