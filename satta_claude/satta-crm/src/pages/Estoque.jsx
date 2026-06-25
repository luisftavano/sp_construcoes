import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getEstoque, addEstoqueItem, updateEstoqueItem, deleteEstoqueItem } from '../lib/firestore'
import { Plus, Pencil, Trash2, Check, X, AlertTriangle } from 'lucide-react'

const UNIDADES = ['unidade', 'kg', 'litro', 'caixa', 'pacote', 'ml', 'g']

function formatQtd(item) {
  return `${item.quantidade} ${item.unidade || 'un'}`
}

export default function Estoque() {
  const { user } = useAuth()
  const [itens, setItens]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId]   = useState(null)
  const [saving, setSaving]   = useState(false)
  const [erro, setErro]       = useState('')
  const [filtro, setFiltro]   = useState('')

  const [novo, setNovo] = useState({ nome: '', marca: '', unidade: 'unidade', quantidade: '', estoque_minimo: '', preco_custo: '', preco_venda: '' })
  const [editVals, setEditVals] = useState({})

  useEffect(() => {
    if (!user) return
    getEstoque(user.uid)
      .then(setItens)
      .catch(err => setErro(`Erro ao carregar: ${err.message}`))
      .finally(() => setLoading(false))
  }, [user])

  const itensFiltrados = filtro
    ? itens.filter(i => i.nome.toLowerCase().includes(filtro.toLowerCase()) || (i.marca || '').toLowerCase().includes(filtro.toLowerCase()))
    : itens

  const baixoEstoque = itens.filter(i => i.estoque_minimo != null && i.quantidade <= i.estoque_minimo)

  async function handleAdd(e) {
    e.preventDefault()
    setErro('')
    if (!novo.nome.trim()) return setErro('Informe o nome do item.')
    if (novo.quantidade === '') return setErro('Informe a quantidade.')
    setSaving(true)
    try {
      const ref = await addEstoqueItem(user.uid, {
        nome:           novo.nome.trim(),
        marca:          novo.marca.trim() || null,
        unidade:        novo.unidade,
        quantidade:     parseFloat(novo.quantidade),
        estoque_minimo: novo.estoque_minimo !== '' ? parseFloat(novo.estoque_minimo) : null,
        preco_custo:    novo.preco_custo !== '' ? parseFloat(novo.preco_custo) : null,
        preco_venda:    novo.preco_venda !== '' ? parseFloat(novo.preco_venda) : null,
      })
      const item = {
        id: ref.id,
        nome: novo.nome.trim(),
        marca: novo.marca.trim() || null,
        unidade: novo.unidade,
        quantidade: parseFloat(novo.quantidade),
        estoque_minimo: novo.estoque_minimo !== '' ? parseFloat(novo.estoque_minimo) : null,
        preco_custo: novo.preco_custo !== '' ? parseFloat(novo.preco_custo) : null,
        preco_venda: novo.preco_venda !== '' ? parseFloat(novo.preco_venda) : null,
      }
      setItens(prev => [...prev, item].sort((a, b) => a.nome.localeCompare(b.nome)))
      setNovo({ nome: '', marca: '', unidade: 'unidade', quantidade: '', estoque_minimo: '', preco_custo: '', preco_venda: '' })
      setShowAdd(false)
    } catch (err) {
      setErro(`Erro ao salvar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(item) {
    setEditId(item.id)
    setEditVals({
      nome:           item.nome,
      marca:          item.marca || '',
      unidade:        item.unidade || 'unidade',
      quantidade:     item.quantidade?.toString() ?? '',
      estoque_minimo: item.estoque_minimo?.toString() ?? '',
      preco_custo:    item.preco_custo?.toString() ?? '',
      preco_venda:    item.preco_venda?.toString() ?? '',
    })
  }

  async function handleUpdate(id) {
    if (!editVals.nome.trim() || editVals.quantidade === '') return
    setSaving(true)
    try {
      const data = {
        nome:           editVals.nome.trim(),
        marca:          editVals.marca.trim() || null,
        unidade:        editVals.unidade,
        quantidade:     parseFloat(editVals.quantidade),
        estoque_minimo: editVals.estoque_minimo !== '' ? parseFloat(editVals.estoque_minimo) : null,
        preco_custo:    editVals.preco_custo !== '' ? parseFloat(editVals.preco_custo) : null,
        preco_venda:    editVals.preco_venda !== '' ? parseFloat(editVals.preco_venda) : null,
      }
      await updateEstoqueItem(user.uid, id, data)
      setItens(prev =>
        prev.map(i => i.id === id ? { ...i, ...data } : i)
          .sort((a, b) => a.nome.localeCompare(b.nome))
      )
      setEditId(null)
    } catch (err) {
      setErro(`Erro ao salvar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id, nome) {
    if (!confirm(`Remover "${nome}" do estoque?`)) return
    await deleteEstoqueItem(user.uid, id)
    setItens(prev => prev.filter(i => i.id !== id))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-ink rounded-full border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bricolage text-2xl font-semibold text-text">Estoque</h1>
          <p className="text-text-2 text-sm mt-0.5">
            {itens.length} {itens.length === 1 ? 'item' : 'itens'}
            {baixoEstoque.length > 0 && (
              <span className="ml-2 text-amber-600 font-medium">— {baixoEstoque.length} com estoque baixo</span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditId(null) }}
          className="flex items-center gap-2 bg-ink hover:bg-ink/90 text-white text-sm px-4 py-2 rounded-md transition-colors font-medium"
        >
          <Plus size={15} /> Novo item
        </button>
      </div>

      {/* Alerta de estoque baixo */}
      {baixoEstoque.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-2">
          <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Estoque baixo</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {baixoEstoque.map(i => `${i.nome} (${formatQtd(i)})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Busca */}
      {itens.length > 4 && (
        <input
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          placeholder="Buscar por nome ou marca…"
          className="w-full border border-border bg-surface rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-border-strong placeholder:text-text-3 mb-4"
        />
      )}

      {/* Formulário de adição */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-surface border border-ink/20 rounded-lg p-4 mb-4 space-y-3">
          <p className="text-sm font-medium text-text">Novo item</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Nome</label>
              <input autoFocus value={novo.nome} onChange={e => setNovo(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Ração Golden"
                className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-border-strong placeholder:text-text-3" />
            </div>
            <div>
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Marca</label>
              <input value={novo.marca} onChange={e => setNovo(f => ({ ...f, marca: e.target.value }))}
                placeholder="Opcional"
                className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-border-strong placeholder:text-text-3" />
            </div>
            <div>
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Unidade</label>
              <select value={novo.unidade} onChange={e => setNovo(f => ({ ...f, unidade: e.target.value }))}
                className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-border-strong">
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Quantidade</label>
              <input type="number" min="0" step="any" value={novo.quantidade} onChange={e => setNovo(f => ({ ...f, quantidade: e.target.value }))}
                placeholder="0"
                className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-border-strong placeholder:text-text-3" />
            </div>
            <div>
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Alerta mínimo</label>
              <input type="number" min="0" step="any" value={novo.estoque_minimo} onChange={e => setNovo(f => ({ ...f, estoque_minimo: e.target.value }))}
                placeholder="Opcional"
                className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-border-strong placeholder:text-text-3" />
            </div>
            <div>
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Preço custo (R$)</label>
              <input type="number" min="0" step="0.01" value={novo.preco_custo} onChange={e => setNovo(f => ({ ...f, preco_custo: e.target.value }))}
                placeholder="0,00"
                className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-border-strong placeholder:text-text-3" />
            </div>
            <div>
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Preço venda (R$)</label>
              <input type="number" min="0" step="0.01" value={novo.preco_venda} onChange={e => setNovo(f => ({ ...f, preco_venda: e.target.value }))}
                placeholder="0,00"
                className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-border-strong placeholder:text-text-3" />
            </div>
          </div>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => { setShowAdd(false); setErro('') }}
              className="flex-1 border border-border text-text-2 hover:text-text py-2 rounded-md text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-ink hover:bg-ink/90 text-white py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? '...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {itensFiltrados.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-text mb-1">
              {filtro ? 'Nenhum item encontrado' : 'Estoque vazio'}
            </p>
            <p className="text-text-2 text-sm mb-5 max-w-xs mx-auto">
              {filtro ? 'Tente outro termo.' : 'Cadastre os produtos que você trabalha para controlar quantidades e receber alertas de reposição.'}
            </p>
            {!filtro && (
              <button onClick={() => setShowAdd(true)}
                className="bg-ink hover:bg-ink/90 text-white text-sm px-5 py-2 rounded-md transition-colors font-medium">
                Cadastrar primeiro item
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-2 bg-bg border-b border-border">
              <p className="flex-1 text-[10px] font-medium text-text-3 uppercase tracking-wider">Item</p>
              <p className="text-[10px] font-medium text-text-3 uppercase tracking-wider w-24 text-right">Quantidade</p>
              <div className="w-14 shrink-0" />
            </div>
            {itensFiltrados.map(item => {
              const emAlerta = item.estoque_minimo != null && item.quantidade <= item.estoque_minimo
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0 hover:bg-bg transition-colors group">
                  {editId === item.id ? (
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input autoFocus value={editVals.nome} onChange={e => setEditVals(f => ({ ...f, nome: e.target.value }))}
                        onKeyDown={e => e.key === 'Escape' && setEditId(null)}
                        className="col-span-2 border border-border bg-bg rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-border-strong" />
                      <input value={editVals.marca} onChange={e => setEditVals(f => ({ ...f, marca: e.target.value }))}
                        placeholder="Marca"
                        className="border border-border bg-bg rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-border-strong placeholder:text-text-3" />
                      <select value={editVals.unidade} onChange={e => setEditVals(f => ({ ...f, unidade: e.target.value }))}
                        className="border border-border bg-bg rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-border-strong">
                        {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <input type="number" min="0" step="any" value={editVals.quantidade} onChange={e => setEditVals(f => ({ ...f, quantidade: e.target.value }))}
                        placeholder="Qtd"
                        className="border border-border bg-bg rounded px-2 py-1.5 text-sm font-mono text-text focus:outline-none focus:border-border-strong" />
                      <input type="number" min="0" step="any" value={editVals.estoque_minimo} onChange={e => setEditVals(f => ({ ...f, estoque_minimo: e.target.value }))}
                        placeholder="Mínimo"
                        className="border border-border bg-bg rounded px-2 py-1.5 text-sm font-mono text-text focus:outline-none focus:border-border-strong placeholder:text-text-3" />
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text truncate">{item.nome}</p>
                        {emAlerta && <AlertTriangle size={12} className="text-amber-500 shrink-0" />}
                      </div>
                      {item.marca && <p className="text-xs text-text-3 mt-0.5">{item.marca}</p>}
                    </div>
                  )}

                  <p className={`text-sm font-mono w-24 text-right shrink-0 ${emAlerta ? 'text-amber-600 font-semibold' : 'text-text'}`}>
                    {editId === item.id ? null : formatQtd(item)}
                  </p>

                  <div className="flex gap-0.5 shrink-0 w-14 justify-end">
                    {editId === item.id ? (
                      <>
                        <button onClick={() => handleUpdate(item.id)} disabled={saving}
                          className="text-ink hover:text-ink/70 p-1.5 transition-colors">
                          <Check size={15} />
                        </button>
                        <button onClick={() => setEditId(null)}
                          className="text-text-2 hover:text-text p-1.5 transition-colors">
                          <X size={15} />
                        </button>
                      </>
                    ) : (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(item)}
                          className="text-text-2 hover:text-ink p-1.5 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(item.id, item.nome)}
                          className="text-text-2 hover:text-red-500 p-1.5 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
