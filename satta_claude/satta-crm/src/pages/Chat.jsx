import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getClientes, getTodosAtendimentos, getServicos, addAtendimento, getEstoque } from '../lib/firestore'
import { auth } from '../firebase'
import { Send, ClipboardList, X, Check } from 'lucide-react'

function formatMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

const perguntasRapidas = [
  'Quantos clientes tenho?',
  'Qual minha receita total?',
  'Quais clientes estão na etapa Fechado?',
  'Quem são os clientes novos?',
]

// ── Detecta comando de registro ──────────────────────
// Exemplos: "3 lavagens cliente maria", "corte pra joao", "2x lavagem para Maria Silva"

function detectarComando(texto) {
  const comQtd = texto.match(/^(\d+)\s*x?\s+(.+?)\s+(?:cliente|para|pra)\s+(.+)$/i)
  if (comQtd) {
    return {
      qty: parseInt(comQtd[1]),
      servicoTerm: comQtd[2].trim(),
      clienteTerm: comQtd[3].trim(),
    }
  }
  const semQtd = texto.match(/^(.+?)\s+(?:cliente|para|pra)\s+(.+)$/i)
  if (semQtd) {
    return {
      qty: 1,
      servicoTerm: semQtd[1].trim(),
      clienteTerm: semQtd[2].trim(),
    }
  }
  return null
}

function matchServico(term, servicos) {
  const t = term.toLowerCase()
  return (
    servicos.find(s => s.nome.toLowerCase() === t) ||
    servicos.find(s => s.nome.toLowerCase().includes(t)) ||
    servicos.find(s => t.includes(s.nome.toLowerCase())) ||
    null
  )
}

function matchCliente(term, clientes) {
  const t = term.toLowerCase()
  return (
    clientes.find(c => c.nome.toLowerCase() === t) ||
    clientes.find(c => c.nome.toLowerCase().startsWith(t)) ||
    clientes.find(c => c.nome.toLowerCase().includes(t)) ||
    null
  )
}

// ── Card de confirmação de registro ──────────────────

function RegistroCard({ inicial, servicos, clientes, onConfirm, onCancelar }) {
  const [dados, setDados] = useState(inicial)

  function handleServico(sid) {
    if (sid === '__custom__') {
      setDados(d => ({ ...d, servicoId: '__custom__', servicoNome: '', valorBase: 0, valorTotal: 0 }))
      return
    }
    const s = servicos.find(x => x.id === sid)
    const vb = s?.valor || 0
    setDados(d => ({
      ...d,
      servicoId: sid,
      servicoNome: s?.nome || '',
      valorBase: vb,
      valorTotal: parseFloat((vb * d.qty).toFixed(2)),
    }))
  }

  function handleCliente(cid) {
    const c = clientes.find(x => x.id === cid)
    setDados(d => ({ ...d, clienteId: cid, clienteNome: c?.nome || '' }))
  }

  function handleQty(n) {
    setDados(d => ({
      ...d,
      qty: n,
      valorTotal: dados.valorBase > 0 ? parseFloat((dados.valorBase * n).toFixed(2)) : d.valorTotal,
    }))
  }

  const totalCalculado = dados.valorBase * dados.qty
  const temDesconto = dados.valorBase > 0 && dados.valorTotal < totalCalculado && dados.valorTotal > 0
  const canConfirm = dados.clienteId && (dados.servicoId && dados.servicoId !== '__custom__' ? true : dados.servicoNome.trim())

  return (
    <div className="bg-surface border border-border rounded-xl p-4 w-full max-w-xs shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-text">Registrar atendimento</p>
        <button onClick={onCancelar} className="text-text-3 hover:text-text transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Cliente */}
      <div className="mb-2.5">
        <label className="block text-[10px] text-text-3 uppercase tracking-wide mb-1">Cliente</label>
        <select
          value={dados.clienteId || ''}
          onChange={e => handleCliente(e.target.value)}
          className="w-full text-sm border border-border bg-bg rounded-md px-2.5 py-1.5 text-text focus:outline-none focus:border-border-strong"
        >
          <option value="">Selecionar…</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      {/* Serviço */}
      <div className="mb-2.5">
        <label className="block text-[10px] text-text-3 uppercase tracking-wide mb-1">Serviço</label>
        {servicos.length > 0 ? (
          <select
            value={dados.servicoId || ''}
            onChange={e => handleServico(e.target.value)}
            className="w-full text-sm border border-border bg-bg rounded-md px-2.5 py-1.5 text-text focus:outline-none focus:border-border-strong mb-1"
          >
            <option value="">Selecionar…</option>
            {servicos.map(s => <option key={s.id} value={s.id}>{s.nome} — {formatMoeda(s.valor)}</option>)}
            <option value="__custom__">Outro (digitar)</option>
          </select>
        ) : null}
        {(dados.servicoId === '__custom__' || servicos.length === 0) && (
          <input
            value={dados.servicoNome}
            onChange={e => setDados(d => ({ ...d, servicoNome: e.target.value }))}
            placeholder="Nome do serviço"
            className="w-full text-sm border border-border bg-bg rounded-md px-2.5 py-1.5 text-text focus:outline-none focus:border-border-strong placeholder:text-text-3"
          />
        )}
      </div>

      {/* Quantidade */}
      <div className="mb-2.5">
        <label className="block text-[10px] text-text-3 uppercase tracking-wide mb-1.5">Quantidade</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n} type="button"
              onClick={() => handleQty(n)}
              className={`w-8 h-8 rounded-md text-xs font-medium transition-colors border ${
                dados.qty === n
                  ? 'bg-ink text-white border-ink'
                  : 'border-border text-text-2 hover:border-border-strong bg-surface'
              }`}
            >
              {n}×
            </button>
          ))}
        </div>
      </div>

      {/* Valor */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-text-3 uppercase tracking-wide">Valor total (R$)</label>
          {dados.valorBase > 0 && dados.qty > 1 && (
            <span className="text-[10px] text-text-3">{formatMoeda(dados.valorBase)} × {dados.qty}</span>
          )}
        </div>
        <input
          type="number" min="0" step="0.01"
          value={dados.valorTotal || ''}
          onChange={e => setDados(d => ({ ...d, valorTotal: parseFloat(e.target.value) || 0 }))}
          placeholder="0,00"
          className="w-full text-sm border border-border bg-bg rounded-md px-2.5 py-1.5 font-mono text-text focus:outline-none focus:border-border-strong placeholder:text-text-3"
        />
        {temDesconto && (
          <p className="text-[10px] text-amber-600 mt-1">
            Desconto: {formatMoeda(totalCalculado - dados.valorTotal)}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button" onClick={onCancelar}
          className="flex-1 text-xs border border-border text-text-2 hover:text-text py-1.5 rounded-md transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => onConfirm(dados)}
          className="flex-1 text-xs bg-ink text-white py-1.5 rounded-md hover:bg-ink/90 transition-colors font-medium disabled:opacity-40 flex items-center justify-center gap-1"
        >
          <Check size={12} /> Confirmar
        </button>
      </div>
    </div>
  )
}

// ── Chat ──────────────────────────────────────────────

export default function Chat() {
  const { user, empresa } = useAuth()
  const [msgs, setMsgs] = useState([
    {
      role: 'kango',
      text: `Oi! Sou a Kango, a assistente de dados da SATTA. Pode me perguntar qualquer coisa sobre ${empresa?.nome || 'seu negócio'} — ou digitar algo como "3 lavagens cliente Maria" pra eu registrar um atendimento.`,
    },
  ])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [clientes, setClientes]   = useState([])
  const [atendimentos, setAtendimentos] = useState([])
  const [servicos, setServicos]   = useState([])
  const [estoque, setEstoque]     = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getClientes(user.uid),
      getTodosAtendimentos(user.uid),
      getServicos(user.uid).catch(() => []),
      getEstoque(user.uid).catch(() => []),
    ]).then(([c, a, s, e]) => {
      setClientes(c)
      setAtendimentos(a)
      setServicos(s)
      setEstoque(e)
    })
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  function abrirRegistro() {
    setMsgs(m => [
      ...m,
      { role: 'user', text: 'Registrar atendimento' },
      {
        role: 'kango',
        tipo: 'registro',
        registro: { qty: 1, servicoId: '', servicoNome: '', clienteId: '', clienteNome: '', valorBase: 0, valorTotal: 0 },
      },
    ])
  }

  async function confirmarRegistro(idx, dados) {
    const nomeServico = dados.servicoId && dados.servicoId !== '__custom__'
      ? (dados.qty > 1 ? `${dados.qty}× ${dados.servicoNome}` : dados.servicoNome)
      : dados.servicoNome.trim()

    try {
      await addAtendimento(user.uid, {
        cliente_id: dados.clienteId,
        cliente_nome: dados.clienteNome,
        servico: nomeServico,
        valor: dados.valorTotal,
        data: hoje(),
      })
      setMsgs(prev => prev.map((msg, i) =>
        i === idx
          ? { role: 'kango', text: `Registrado! ${nomeServico} para ${dados.clienteNome} — ${formatMoeda(dados.valorTotal)}.` }
          : msg
      ))
    } catch (err) {
      console.error(err)
      setMsgs(prev => prev.map((msg, i) =>
        i === idx
          ? { role: 'kango', text: 'Erro ao registrar. Tente novamente.' }
          : msg
      ))
    }
  }

  async function enviar(texto) {
    if (!texto.trim() || loading) return
    const pergunta = texto.trim()
    setInput('')
    setMsgs(m => [...m, { role: 'user', text: pergunta }])

    // Detectar comando de registro
    const cmd = detectarComando(pergunta)
    if (cmd) {
      const servico = matchServico(cmd.servicoTerm, servicos)
      const cliente = matchCliente(cmd.clienteTerm, clientes)
      const vb = servico?.valor || 0

      setMsgs(m => [...m, {
        role: 'kango',
        tipo: 'registro',
        registro: {
          qty: cmd.qty,
          servicoId: servico?.id || '',
          servicoNome: servico?.nome || cmd.servicoTerm,
          clienteId: cliente?.id || '',
          clienteNome: cliente?.nome || cmd.clienteTerm,
          valorBase: vb,
          valorTotal: parseFloat((vb * cmd.qty).toFixed(2)),
        },
      }])
      return
    }

    // Perguntas de estoque buscam dado fresco do Firebase (evita cache stale)
    const ehPerguntaEstoque = /estoque|produto|acabando|repor|faltando|quanto.*tem|tem.*quanto/i.test(pergunta)
    if (ehPerguntaEstoque) {
      setLoading(true)
      try {
        const estoqueAtual = await getEstoque(user.uid).catch(() => estoque)
        setEstoque(estoqueAtual)
        const resposta = responderLocal(pergunta, clientes, atendimentos, estoqueAtual)
        setMsgs(m => [...m, { role: 'kango', text: resposta }])
      } finally {
        setLoading(false)
      }
      return
    }

    setLoading(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ pergunta }),
      })
      if (!res.ok) throw new Error('API indisponível')
      const data = await res.json()
      setMsgs(m => [...m, { role: 'kango', text: data.resposta }])
    } catch {
      const resposta = responderLocal(pergunta, clientes, atendimentos, estoque)
      setMsgs(m => [...m, { role: 'kango', text: resposta }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-3rem)] max-w-2xl">
      <div className="mb-4">
        <h1 className="text-text text-xl font-bold">Kango</h1>
        <p className="text-text-2 text-sm">a assistente de dados da SATTA</p>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {m.role === 'kango' && (
              <img
                src="/kango-avatar.png"
                alt=""
                aria-hidden="true"
                className="w-8 h-8 rounded-full object-cover shrink-0 shadow-sm"
              />
            )}
            {m.tipo === 'registro' ? (
              <RegistroCard
                inicial={m.registro}
                servicos={servicos}
                clientes={clientes}
                onConfirm={dados => confirmarRegistro(i, dados)}
                onCancelar={() => setMsgs(prev => prev.filter((_, idx) => idx !== i))}
              />
            ) : (
              <div className={`max-w-xs md:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-ink text-white rounded-tr-sm shadow-sm'
                  : 'bg-surface border border-border text-text rounded-tl-sm shadow-sm'
              }`}>
                {m.text}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <img src="/kango-avatar.png" alt="" aria-hidden="true" className="w-8 h-8 rounded-full object-cover shrink-0 shadow-sm opacity-70" />
            <div className="bg-surface border border-border px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 bg-text-3 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Perguntas rápidas */}
      {msgs.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {perguntasRapidas.map(p => (
            <button
              key={p}
              onClick={() => enviar(p)}
              className="text-xs border border-border text-text-2 hover:text-text hover:border-border-strong bg-surface px-3 py-1.5 rounded-full transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Botão de registro rápido */}
      <div className="mb-2">
        <button
          onClick={abrirRegistro}
          className="flex items-center gap-1.5 text-xs text-ink border border-ink/25 hover:bg-ink/5 px-3 py-1.5 rounded-full transition-colors font-medium"
        >
          <ClipboardList size={12} /> Registrar atendimento
        </button>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar(input)}
          placeholder='Pergunte ou diga "3 lavagens cliente Maria"…'
          disabled={loading}
          className="flex-1 bg-surface border border-border text-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-border-strong focus:ring-2 focus:ring-ink/10 transition-all placeholder:text-text-3 disabled:opacity-50 shadow-sm"
        />
        <button
          onClick={() => enviar(input)}
          disabled={!input.trim() || loading}
          className="w-12 h-12 bg-ink hover:bg-ink/90 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 shadow-sm"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}

function formatMoedaLocal(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function responderLocal(pergunta, clientes, atendimentos, estoque) {
  const p = pergunta.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const receita = atendimentos.reduce((s, a) => s + (a.valor || 0), 0)
  const fechados = clientes.filter(c => c.etapa === 'fechado')
  const novos = clientes.filter(c => c.etapa === 'novo')

  // ── Clientes ──────────────────────────────────────────
  if (p.includes('quantos') && p.includes('cliente'))
    return `Voce tem ${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} cadastrado${clientes.length !== 1 ? 's' : ''}.`
  if (p.includes('receita') || p.includes('faturamento') || p.includes('dinheiro'))
    return `A receita total registrada e de ${formatMoedaLocal(receita)}.`
  if (p.includes('fechado'))
    return fechados.length > 0
      ? `${fechados.length} cliente${fechados.length > 1 ? 's' : ''} fechado${fechados.length > 1 ? 's' : ''}: ${fechados.map(c => c.nome).join(', ')}.`
      : 'Nenhum cliente na etapa Fechado ainda.'
  if (p.includes('novo'))
    return novos.length > 0
      ? `${novos.length} cliente${novos.length > 1 ? 's' : ''} novo${novos.length > 1 ? 's' : ''}: ${novos.map(c => c.nome).join(', ')}.`
      : 'Nenhum cliente novo no momento.'

  // ── Estoque ───────────────────────────────────────────
  if (estoque.length === 0 && (p.includes('estoque') || p.includes('produto') || p.includes('acabando') || p.includes('repor'))) {
    return 'Voce ainda nao tem itens cadastrados no estoque. Va em Estoque no menu para adicionar.'
  }

  if (p.includes('estoque baixo') || p.includes('acabando') || p.includes('repor') || p.includes('faltando')) {
    const baixo = estoque.filter(i => i.estoque_minimo != null && i.quantidade <= i.estoque_minimo)
    if (baixo.length === 0) return 'Tudo certo no estoque — nenhum item abaixo do minimo.'
    return `${baixo.length} item${baixo.length > 1 ? 'ns' : ''} com estoque baixo: ${baixo.map(i => `${i.nome} (${i.quantidade} ${i.unidade || 'un'})`).join(', ')}.`
  }

  if (p.includes('estoque') || (p.includes('produto') && p.includes('tem'))) {
    if (estoque.length === 0) return 'Nenhum item no estoque ainda.'
    return `Voce tem ${estoque.length} item${estoque.length > 1 ? 'ns' : ''} no estoque: ${estoque.slice(0, 5).map(i => `${i.nome} (${i.quantidade} ${i.unidade || 'un'})`).join(', ')}${estoque.length > 5 ? ` e mais ${estoque.length - 5}` : ''}.`
  }

  // Busca por item específico: "quanto tem de ração" / "quantas caixas de shampoo"
  const buscaItem = p.match(/(?:quanto|quantos|quantas).*(?:tem|tenho|temos|sobrou|sobram).*?(?:de|do|da)?\s+(.+)/) ||
                    p.match(/(?:tem|tenho|temos).*(?:de|do|da)\s+(.+)/)
  if (buscaItem) {
    const termo = buscaItem[1].trim()
    const item = estoque.find(i =>
      i.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(termo)
    )
    if (item) return `${item.nome}: ${item.quantidade} ${item.unidade || 'unidade(s)'}.${item.estoque_minimo != null && item.quantidade <= item.estoque_minimo ? ' Estoque baixo!' : ''}`
    return `Nao encontrei "${buscaItem[1]}" no estoque.`
  }

  return `Para respostas completas, a integracao com a API da Kango precisa estar ativa. Por enquanto respondo perguntas basicas sobre clientes, receita e estoque.`
}
