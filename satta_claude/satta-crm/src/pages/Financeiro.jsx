import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getTodosAtendimentos, getDespesas, addDespesa, deleteDespesa } from '../lib/firestore'
import { auth } from '../firebase'
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, X, Search, ShoppingBag } from 'lucide-react'

function formatMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function mesLabel(str) {
  const [y, m] = str.split('-')
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${meses[parseInt(m) - 1]} ${y}`
}

function mesAtual() {
  return new Date().toISOString().slice(0, 7)
}

const CATEGORIAS_DESPESA = [
  'Fornecedor', 'Aluguel', 'Energia / Água', 'Salários', 'Marketing',
  'Equipamentos', 'Software / Assinaturas', 'Impostos', 'Transporte', 'Outros',
]

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

// ── Modal nova despesa ────────────────────────────────

function ModalDespesa({ onSalvar, onFechar }) {
  const [descricao, setDescricao] = useState('')
  const [valor, setValor]         = useState('')
  const [data, setData]           = useState(new Date().toISOString().slice(0, 10))
  const [categoria, setCategoria] = useState('Outros')
  const [erro, setErro]           = useState('')

  function salvar(e) {
    e.preventDefault()
    if (!descricao.trim()) return setErro('Informe uma descrição.')
    if (!valor || isNaN(Number(valor)) || Number(valor) <= 0) return setErro('Informe um valor válido.')
    onSalvar({ descricao: descricao.trim(), valor: Number(valor), data, categoria })
  }

  return (
    <div className="fixed inset-0 bg-text/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg border border-border w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-text">Nova despesa</h2>
          <button onClick={onFechar} className="text-text-3 hover:text-text transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={salvar} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Descrição</label>
            <input
              value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Conta de luz"
              className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-border-strong placeholder:text-text-3"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Valor (R$)</label>
              <input
                type="number" value={valor} onChange={e => setValor(e.target.value)}
                placeholder="0,00" min="0" step="0.01"
                className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-border-strong placeholder:text-text-3"
              />
            </div>
            <div>
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Data</label>
              <input
                type="date" value={data} onChange={e => setData(e.target.value)}
                className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-border-strong"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Categoria</label>
            <select
              value={categoria} onChange={e => setCategoria(e.target.value)}
              className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-border-strong"
            >
              {CATEGORIAS_DESPESA.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onFechar}
              className="flex-1 border border-border text-text-2 hover:text-text py-2 rounded-md text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 bg-ink hover:bg-ink/90 text-white py-2 rounded-md text-sm font-medium transition-colors">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Buscador de catálogo (serviço ou produto) ─────────

function ItemBuscador({ type, catalog, loadingCatalog, onSelect, onCancel }) {
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
          placeholder={type === 'service' ? 'Buscar serviço...' : 'Buscar produto...'}
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
                {formatMoeda(type === 'service' ? item.price : (item.sellPrice ?? 0))}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Modal nova venda ──────────────────────────────────

function ModalNovaVenda({ onFechar, onRegistrada }) {
  const [items, setItems]               = useState([])
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [discountAmount, setDiscountAmount] = useState('')
  const [salvando, setSalvando]         = useState(false)
  const [erro, setErro]                 = useState('')

  const [addingType, setAddingType]     = useState(null)
  const [services, setServices]         = useState([])
  const [inventory, setInventory]       = useState([])
  const [loadingCatalog, setLoadingCatalog] = useState(false)

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice)), 0)
  const discount = Number(discountAmount) || 0
  const total    = Math.max(0, subtotal - discount)

  async function startAdding(type) {
    setAddingType(type)
    if (type === 'service' && services.length === 0) {
      setLoadingCatalog(true)
      try {
        const data = await apiFetch('/api/services')
        setServices(Array.isArray(data) ? data : (data.data ?? []))
      } catch { /* silent */ } finally { setLoadingCatalog(false) }
    }
    if (type === 'product' && inventory.length === 0) {
      setLoadingCatalog(true)
      try {
        const data = await apiFetch('/api/inventory?limit=100')
        setInventory(data.data ?? [])
      } catch { /* silent */ } finally { setLoadingCatalog(false) }
    }
  }

  function selectItem(catalogItem) {
    const isService = addingType === 'service'
    setItems(prev => [...prev, {
      tempId:          crypto.randomUUID(),
      type:            addingType,
      serviceId:       isService ? catalogItem.id : undefined,
      inventoryItemId: !isService ? catalogItem.id : undefined,
      name:            catalogItem.name,
      quantity:        1,
      unitPrice:       isService ? (catalogItem.price ?? 0) : (catalogItem.sellPrice ?? 0),
    }])
    setAddingType(null)
  }

  function updateItem(tempId, field, value) {
    setItems(prev => prev.map(i => i.tempId === tempId ? { ...i, [field]: value } : i))
  }

  function removeItem(tempId) {
    setItems(prev => prev.filter(i => i.tempId !== tempId))
  }

  async function salvar(e) {
    e.preventDefault()
    if (items.length === 0) return setErro('Adicione ao menos um item.')
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
        },
      })
      onRegistrada()
    } catch (err) {
      setErro(err.message || 'Erro ao registrar venda.')
      setSalvando(false)
    }
  }

  const catalog = addingType === 'service' ? services : inventory

  return (
    <div className="fixed inset-0 bg-text/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg border border-border w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-medium text-text">Nova venda</h2>
          <button onClick={onFechar} className="text-text-3 hover:text-text transition-colors"><X size={16} /></button>
        </div>

        <form onSubmit={salvar} className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Itens vendidos */}
          <div>
            <p className="text-xs text-text-2 uppercase tracking-wide mb-2">O que foi vendido</p>

            {items.length > 0 && (
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
                      className="text-text-3 hover:text-red-500 transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {addingType ? (
              <ItemBuscador
                type={addingType}
                catalog={catalog}
                loadingCatalog={loadingCatalog}
                onSelect={selectItem}
                onCancel={() => setAddingType(null)}
              />
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startAdding('service')}
                  className="flex-1 text-xs border border-border text-text-2 hover:text-ink hover:border-border-strong py-2 rounded-md transition-colors"
                >
                  + Serviço
                </button>
                <button
                  type="button"
                  onClick={() => startAdding('product')}
                  className="flex-1 text-xs border border-border text-text-2 hover:text-ink hover:border-border-strong py-2 rounded-md transition-colors"
                >
                  + Produto
                </button>
              </div>
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
              {salvando ? 'Registrando...' : 'Registrar venda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Linha de transação ────────────────────────────────

function TransacaoRow({ tipo, descricao, valor, data, categoria, onExcluir }) {
  const isReceita = tipo === 'receita'
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-bg transition-colors group">
      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${isReceita ? 'bg-emerald-50' : 'bg-red-50'}`}>
        {isReceita
          ? <ArrowUpRight size={14} className="text-emerald-600" />
          : <ArrowDownRight size={14} className="text-red-500" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">{descricao}</p>
        {categoria && <p className="text-xs text-text-3">{categoria}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className={`font-mono text-sm font-medium ${isReceita ? 'text-emerald-700' : 'text-red-600'}`}>
          {isReceita ? '+' : '-'}{formatMoeda(valor)}
        </p>
        <p className="text-xs text-text-3">{data?.split('-').reverse().join('/')}</p>
      </div>
      {onExcluir && (
        <button
          onClick={onExcluir}
          className="opacity-0 group-hover:opacity-100 text-text-3 hover:text-red-500 transition-all shrink-0 ml-1"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

// ── Financeiro ────────────────────────────────────────

export default function Financeiro() {
  const { user } = useAuth()
  const [atendimentos, setAtendimentos] = useState([])
  const [despesas, setDespesas]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState(false)
  const [modalVenda, setModalVenda]     = useState(false)
  const [vendaOk, setVendaOk]           = useState(false)
  const [mesFiltro, setMesFiltro]       = useState(mesAtual())
  const [aba, setAba]                   = useState('tudo')

  useEffect(() => {
    if (!user) return
    Promise.all([getTodosAtendimentos(user.uid), getDespesas(user.uid).catch(() => [])])
      .then(([a, d]) => { setAtendimentos(a); setDespesas(d) })
      .catch(err => console.error('Financeiro:', err))
      .finally(() => setLoading(false))
  }, [user])

  async function salvarDespesa(dados) {
    const ref = await addDespesa(user.uid, dados)
    setDespesas(prev => [{ id: ref.id, ...dados }, ...prev])
    setModal(false)
  }

  async function excluirDespesa(id) {
    if (!confirm('Excluir esta despesa?')) return
    await deleteDespesa(user.uid, id)
    setDespesas(prev => prev.filter(d => d.id !== id))
  }

  function vendaRegistrada() {
    setModalVenda(false)
    setVendaOk(true)
    setTimeout(() => setVendaOk(false), 3000)
  }

  // Filtra por mês selecionado
  const receitasMes = atendimentos
    .filter(a => (a.data || '').startsWith(mesFiltro) && a.valor > 0)
  const despesasMes = despesas
    .filter(d => (d.data || '').startsWith(mesFiltro))

  const totalReceitas = receitasMes.reduce((s, a) => s + (a.valor || 0), 0)
  const totalDespesas = despesasMes.reduce((s, d) => s + (d.valor || 0), 0)
  const resultado = totalReceitas - totalDespesas

  // Lista unificada ordenada por data
  const tudo = [
    ...receitasMes.map(a => ({ tipo: 'receita', descricao: `${a.cliente_nome}${a.servico ? ` — ${a.servico}` : ''}`, valor: a.valor, data: a.data, categoria: 'Serviço' })),
    ...despesasMes.map(d => ({ tipo: 'despesa', ...d, id_despesa: d.id })),
  ].sort((a, b) => (b.data || '').localeCompare(a.data || ''))

  const listaFiltrada = aba === 'tudo' ? tudo
    : aba === 'receitas' ? tudo.filter(t => t.tipo === 'receita')
    : tudo.filter(t => t.tipo === 'despesa')

  // Meses disponíveis (dos atendimentos + despesas)
  const mesesSet = new Set([
    ...atendimentos.map(a => (a.data || '').slice(0, 7)).filter(Boolean),
    ...despesas.map(d => (d.data || '').slice(0, 7)).filter(Boolean),
    mesAtual(),
  ])
  const meses = [...mesesSet].sort((a, b) => b.localeCompare(a)).slice(0, 12)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-ink rounded-full border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bricolage text-2xl font-semibold text-text">Financeiro</h1>
          <p className="text-text-2 text-sm mt-0.5">Receitas e despesas do negócio</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModalVenda(true)}
            className="flex items-center gap-2 border border-border text-text-2 hover:text-ink hover:border-border-strong text-sm px-4 py-2 rounded-md transition-colors font-medium"
          >
            <ShoppingBag size={14} /> Nova venda
          </button>
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-ink hover:bg-ink/90 text-white text-sm px-4 py-2 rounded-md transition-colors font-medium"
          >
            <Plus size={15} /> Nova despesa
          </button>
        </div>
      </div>

      {/* Toast venda registrada */}
      {vendaOk && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-lg">
          Venda registrada com sucesso.
        </div>
      )}

      {/* Seletor de mês */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {meses.map(m => (
          <button
            key={m}
            onClick={() => setMesFiltro(m)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-md border font-medium transition-colors ${
              mesFiltro === m
                ? 'bg-ink text-white border-ink'
                : 'border-border text-text-2 hover:text-text hover:border-border-strong bg-surface'
            }`}
          >
            {mesLabel(m)}
          </button>
        ))}
      </div>

      {/* Resumo do mês */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-surface border border-border rounded-lg px-4 py-3.5">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowUpRight size={13} className="text-emerald-600" />
            <p className="text-xs text-text-3 uppercase tracking-wide">Receitas</p>
          </div>
          <p className="font-mono text-lg font-semibold text-text">{formatMoeda(totalReceitas)}</p>
        </div>
        <div className="bg-surface border border-border rounded-lg px-4 py-3.5">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowDownRight size={13} className="text-red-500" />
            <p className="text-xs text-text-3 uppercase tracking-wide">Despesas</p>
          </div>
          <p className="font-mono text-lg font-semibold text-text">{formatMoeda(totalDespesas)}</p>
        </div>
        <div className={`border rounded-lg px-4 py-3.5 ${resultado >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <p className="text-xs text-text-3 uppercase tracking-wide mb-1">Resultado</p>
          <p className={`font-mono text-lg font-semibold ${resultado >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatMoeda(resultado)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {[['tudo', 'Tudo'], ['receitas', 'Receitas'], ['despesas', 'Despesas']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`text-sm px-3 py-2 border-b-2 -mb-px font-medium transition-colors ${
              aba === id
                ? 'border-ink text-text'
                : 'border-transparent text-text-2 hover:text-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {listaFiltrada.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-text-2 mb-2">Nenhuma movimentação em {mesLabel(mesFiltro)}.</p>
            {aba !== 'receitas' && (
              <button
                onClick={() => setModal(true)}
                className="text-xs text-ink border border-ink/30 hover:bg-ink hover:text-white px-4 py-2 rounded-md transition-colors"
              >
                Registrar despesa
              </button>
            )}
          </div>
        ) : (
          listaFiltrada.map((t, i) => (
            <TransacaoRow
              key={i}
              tipo={t.tipo}
              descricao={t.descricao}
              valor={t.valor}
              data={t.data}
              categoria={t.categoria}
              onExcluir={t.tipo === 'despesa' ? () => excluirDespesa(t.id_despesa) : null}
            />
          ))
        )}
      </div>

      {modal && (
        <ModalDespesa onSalvar={salvarDespesa} onFechar={() => setModal(false)} />
      )}
      {modalVenda && (
        <ModalNovaVenda onFechar={() => setModalVenda(false)} onRegistrada={vendaRegistrada} />
      )}
    </div>
  )
}
