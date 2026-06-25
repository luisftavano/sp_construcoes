import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getClientes, updateCliente } from '../lib/firestore'
import { etapas, nichoLabels } from '../lib/nichos'
import { Plus, ChevronRight, Search } from 'lucide-react'

// ── Badge de etapa ─────────────────────────────────────

function EtapaBadge({ etapaId }) {
  const e = etapas.find(x => x.id === etapaId)
  if (!e) return null
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded"
      style={{ backgroundColor: `${e.cor}18`, color: e.cor }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: e.cor }} />
      {e.label}
    </span>
  )
}

// ── Card kanban ───────────────────────────────────────

function ClienteCard({ cliente, onMover, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-surface border border-border rounded-md p-3.5 cursor-pointer hover:border-border-strong transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-text text-sm font-medium truncate">{cliente.nome}</p>
        <ChevronRight size={13} className="text-text-3 shrink-0 mt-0.5 group-hover:text-ink transition-colors" />
      </div>
      {cliente.referencia && (
        <p className="text-text-2 text-xs mb-1.5 truncate">{cliente.referencia}</p>
      )}
      {cliente.telefone && (
        <p className="text-text-3 text-xs font-mono mb-2">{cliente.telefone}</p>
      )}
      <div className="flex gap-1 flex-wrap pt-2 border-t border-border">
        {etapas.filter(e => e.id !== cliente.etapa).slice(0, 2).map(e => (
          <button
            key={e.id}
            onClick={ev => { ev.stopPropagation(); onMover(cliente.id, e.id) }}
            className="text-[10px] px-2 py-0.5 rounded border border-border text-text-2 hover:border-border-strong hover:text-text transition-colors"
          >
            {e.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Linha na lista ────────────────────────────────────

function ClienteRow({ cliente, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-3 hover:bg-bg cursor-pointer border-b border-border last:border-0 transition-colors group"
    >
      <div className="w-7 h-7 rounded-full bg-ink-light border border-border flex items-center justify-center shrink-0">
        <span className="text-ink text-xs font-medium">{cliente.nome.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text text-sm font-medium truncate">{cliente.nome}</p>
        {cliente.referencia && <p className="text-text-2 text-xs truncate">{cliente.referencia}</p>}
      </div>
      {cliente.telefone && (
        <p className="text-text-2 text-xs font-mono hidden sm:block shrink-0">{cliente.telefone}</p>
      )}
      <EtapaBadge etapaId={cliente.etapa} />
      <ChevronRight size={13} className="text-text-3 group-hover:text-ink transition-colors shrink-0" />
    </div>
  )
}

// ── Página de clientes ────────────────────────────────

export default function Clientes() {
  const { user, empresa } = useAuth()
  const navigate = useNavigate()
  const [clientes, setClientes]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState('lista')
  const [busca, setBusca]         = useState('')
  const [etapaFiltro, setEtapaFiltro] = useState('todas')
  const labels = nichoLabels[empresa?.nicho ?? empresa?.segmento] || nichoLabels.outro

  useEffect(() => {
    if (!user) return
    getClientes(user.uid)
      .then(data => setClientes(data))
      .catch(err => console.error('Clientes:', err))
      .finally(() => setLoading(false))
  }, [user])

  async function moverEtapa(clienteId, novaEtapa) {
    await updateCliente(user.uid, clienteId, { etapa: novaEtapa })
    setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, etapa: novaEtapa } : c))
  }

  const filtrados = clientes.filter(c => {
    const buscaOk = c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.telefone || '').includes(busca) ||
      (c.referencia || '').toLowerCase().includes(busca.toLowerCase())
    const etapaOk = etapaFiltro === 'todas' || c.etapa === etapaFiltro
    return buscaOk && etapaOk
  })

  const porEtapa = etapaId => filtrados.filter(c => c.etapa === etapaId)

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-5 h-5 border-2 border-ink rounded-full border-t-transparent animate-spin" /></div>
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bricolage text-2xl font-semibold text-text">
            {labels.cliente}s
          </h1>
          <p className="text-text-2 text-sm mt-0.5">
            {clientes.length} {labels.cliente.toLowerCase()}{clientes.length !== 1 ? 's' : ''} cadastrado{clientes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/clientes/novo')}
          className="hidden md:flex items-center gap-2 bg-ink hover:bg-blue-hover text-white text-sm px-4 py-2 rounded-md transition-colors font-medium shrink-0"
        >
          <Plus size={15} />
          Novo {labels.cliente.toLowerCase()}
        </button>
      </div>

      {/* Busca + toggle */}
      {clientes.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3" />
              <input
                type="text" value={busca} onChange={e => setBusca(e.target.value)}
                placeholder={`Buscar por nome, telefone...`}
                className="w-full bg-surface border border-border rounded-md pl-9 pr-4 py-2.5 text-sm text-text focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-ink/20 transition-all placeholder:text-text-3"
              />
            </div>
            <div className="flex border border-border rounded-md overflow-hidden shrink-0 bg-surface">
              {['lista', 'kanban'].map(v => (
                <button
                  key={v} onClick={() => setView(v)}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    view === v ? 'bg-ink text-white' : 'text-text-2 hover:text-text'
                  }`}
                >
                  {v === 'lista' ? 'Lista' : 'Kanban'}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro por etapa */}
          <div className="flex gap-1.5 mb-5 flex-wrap">
            <button
              onClick={() => setEtapaFiltro('todas')}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                etapaFiltro === 'todas'
                  ? 'bg-ink text-white border-ink'
                  : 'border-border text-text-2 hover:text-text bg-surface'
              }`}
            >
              Todas ({clientes.length})
            </button>
            {etapas.map(e => {
              const count = clientes.filter(c => c.etapa === e.id).length
              if (count === 0) return null
              return (
                <button
                  key={e.id}
                  onClick={() => setEtapaFiltro(etapaFiltro === e.id ? 'todas' : e.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                    etapaFiltro === e.id
                      ? 'text-white border-transparent'
                      : 'border-border text-text-2 hover:text-text bg-surface'
                  }`}
                  style={etapaFiltro === e.id ? { backgroundColor: e.cor, borderColor: e.cor } : {}}
                >
                  {e.label} ({count})
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Conteúdo */}
      {clientes.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-lg">
          <p className="text-sm font-medium text-text mb-1">Nenhum {labels.cliente.toLowerCase()} ainda</p>
          <p className="text-text-2 text-sm mb-5">Cadastre o primeiro para começar a acompanhar.</p>
          <button
            onClick={() => navigate('/clientes/novo')}
            className="bg-ink hover:bg-blue-hover text-white text-sm px-5 py-2 rounded-md transition-colors font-medium"
          >
            Cadastrar {labels.cliente.toLowerCase()}
          </button>
        </div>
      ) : busca && filtrados.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-2 text-sm">
            Nenhum resultado para "<span className="text-text font-medium">{busca}</span>".
          </p>
        </div>
      ) : view === 'lista' ? (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-2 bg-bg border-b border-border">
            <div className="w-7 shrink-0" />
            <p className="flex-1 text-[10px] font-medium text-text-3 uppercase tracking-wider">Nome</p>
            <p className="text-[10px] font-medium text-text-3 uppercase tracking-wider hidden sm:block w-28 shrink-0">Telefone</p>
            <p className="text-[10px] font-medium text-text-3 uppercase tracking-wider w-24 shrink-0">Etapa</p>
            <div className="w-4 shrink-0" />
          </div>
          {filtrados.map(c => (
            <ClienteRow key={c.id} cliente={c} onClick={() => navigate(`/clientes/${c.id}`)} />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {etapas.map(etapa => {
            const lista = porEtapa(etapa.id)
            return (
              <div key={etapa.id} className="shrink-0 w-56">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: etapa.cor }} />
                  <p className="text-xs font-medium text-text">{etapa.label}</p>
                  <span className="text-[10px] text-text-3 ml-auto border border-border rounded px-1.5 py-0.5 bg-surface">{lista.length}</span>
                </div>
                <div className="space-y-2">
                  {lista.map(c => (
                    <ClienteCard key={c.id} cliente={c} onMover={moverEtapa} onClick={() => navigate(`/clientes/${c.id}`)} />
                  ))}
                  {lista.length === 0 && (
                    <div className="border border-dashed border-border rounded-md py-6 text-center">
                      <p className="text-xs text-text-3">Nenhum</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
