import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getServicos, addServico, updateServico, deleteServico } from '../lib/firestore'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

function formatMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

export default function Servicos() {
  const { user } = useAuth()
  const [servicos, setServicos]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [novo, setNovo]           = useState({ nome: '', valor: '' })
  const [editId, setEditId]       = useState(null)
  const [editVals, setEditVals]   = useState({ nome: '', valor: '' })
  const [saving, setSaving]       = useState(false)
  const [erro, setErro]           = useState('')

  useEffect(() => {
    if (!user) return
    getServicos(user.uid)
      .then(setServicos)
      .catch(err => {
        console.error('Servicos load:', err)
        setErro(`Erro ao carregar: ${err.message}`)
      })
      .finally(() => setLoading(false))
  }, [user])

  async function handleAdd(e) {
    e.preventDefault()
    setErro('')
    if (!novo.nome.trim()) return setErro('Informe o nome do serviço.')
    if (!novo.valor) return setErro('Informe o preço.')
    setSaving(true)
    try {
      const ref = await addServico(user.uid, {
        nome: novo.nome.trim(),
        valor: parseFloat(novo.valor),
      })
      setServicos(prev =>
        [...prev, { id: ref.id, nome: novo.nome.trim(), valor: parseFloat(novo.valor) }]
          .sort((a, b) => a.nome.localeCompare(b.nome))
      )
      setNovo({ nome: '', valor: '' })
      setShowAdd(false)
    } catch (err) {
      console.error('addServico:', err)
      setErro(`Erro ao salvar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id) {
    if (!editVals.nome.trim() || !editVals.valor) return
    setSaving(true)
    try {
      await updateServico(user.uid, id, {
        nome: editVals.nome.trim(),
        valor: parseFloat(editVals.valor),
      })
      setServicos(prev =>
        prev
          .map(s => s.id === id ? { ...s, nome: editVals.nome.trim(), valor: parseFloat(editVals.valor) } : s)
          .sort((a, b) => a.nome.localeCompare(b.nome))
      )
      setEditId(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id, nome) {
    if (!confirm(`Remover "${nome}" do catálogo?`)) return
    await deleteServico(user.uid, id)
    setServicos(prev => prev.filter(s => s.id !== id))
  }

  function startEdit(s) {
    setEditId(s.id)
    setEditVals({ nome: s.nome, valor: s.valor.toString() })
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
          <h1 className="font-bricolage text-2xl font-semibold text-text">Serviços</h1>
          <p className="text-text-2 text-sm mt-0.5">Catálogo de serviços e preços padrão</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditId(null) }}
          className="flex items-center gap-2 bg-ink hover:bg-ink/90 text-white text-sm px-4 py-2 rounded-md transition-colors font-medium"
        >
          <Plus size={15} /> Novo serviço
        </button>
      </div>

      {/* Formulário de adição */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-surface border border-ink/20 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-text mb-3">Novo serviço</p>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Nome</label>
              <input
                autoFocus
                value={novo.nome}
                onChange={e => setNovo(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Lavagem simples"
                className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-border-strong placeholder:text-text-3"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs text-text-2 mb-1 uppercase tracking-wide">Preço (R$)</label>
              <input
                type="number" min="0" step="0.01"
                value={novo.valor}
                onChange={e => setNovo(f => ({ ...f, valor: e.target.value }))}
                placeholder="0,00"
                className="w-full border border-border bg-bg rounded-md px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-border-strong placeholder:text-text-3"
              />
            </div>
            <button type="submit" disabled={saving}
              className="bg-ink text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50 shrink-0">
              {saving ? '...' : 'Salvar'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setErro('') }}
              className="text-text-2 hover:text-text p-2 transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
          {erro && (
            <p className="text-xs text-red-600 mt-2">{erro}</p>
          )}
        </form>
      )}

      {/* Lista */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {servicos.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-text mb-1">Nenhum serviço cadastrado</p>
            <p className="text-text-2 text-sm mb-5 max-w-xs mx-auto">
              Cadastre seus serviços e preços para agilizar os registros e deixar a Kango mais precisa.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-ink hover:bg-ink/90 text-white text-sm px-5 py-2 rounded-md transition-colors font-medium"
            >
              Cadastrar primeiro serviço
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 px-4 py-2 bg-bg border-b border-border">
              <p className="flex-1 text-[10px] font-medium text-text-3 uppercase tracking-wider">Serviço</p>
              <p className="text-[10px] font-medium text-text-3 uppercase tracking-wider w-28 text-right">Preço padrão</p>
              <div className="w-14 shrink-0" />
            </div>
            {servicos.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0 hover:bg-bg transition-colors group">
                {editId === s.id ? (
                  <>
                    <input
                      autoFocus
                      value={editVals.nome}
                      onChange={e => setEditVals(f => ({ ...f, nome: e.target.value }))}
                      onKeyDown={e => e.key === 'Escape' && setEditId(null)}
                      className="flex-1 border border-border bg-bg rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-border-strong"
                    />
                    <input
                      type="number" min="0" step="0.01"
                      value={editVals.valor}
                      onChange={e => setEditVals(f => ({ ...f, valor: e.target.value }))}
                      className="w-28 border border-border bg-bg rounded px-2 py-1.5 text-sm font-mono text-text focus:outline-none focus:border-border-strong text-right"
                    />
                    <div className="flex gap-0.5 shrink-0">
                      <button onClick={() => handleUpdate(s.id)} disabled={saving}
                        className="text-ink hover:text-ink/70 p-1.5 transition-colors" title="Salvar">
                        <Check size={15} />
                      </button>
                      <button onClick={() => setEditId(null)}
                        className="text-text-2 hover:text-text p-1.5 transition-colors" title="Cancelar">
                        <X size={15} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="flex-1 text-sm font-medium text-text">{s.nome}</p>
                    <p className="text-sm font-mono text-text w-28 text-right">{formatMoeda(s.valor)}</p>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => startEdit(s)}
                        className="text-text-2 hover:text-ink p-1.5 transition-colors" title="Editar">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(s.id, s.nome)}
                        className="text-text-2 hover:text-red-500 p-1.5 transition-colors" title="Remover">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {servicos.length > 0 && (
        <p className="text-xs text-text-3 mt-3 text-center">
          Preços usados como sugestão ao registrar atendimentos e detectados automaticamente pelo chat da Kango.
        </p>
      )}
    </div>
  )
}
