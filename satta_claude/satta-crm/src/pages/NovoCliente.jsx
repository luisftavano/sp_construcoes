import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { addCliente } from '../lib/firestore'
import { nichoLabels, etapas } from '../lib/nichos'
import { ArrowLeft } from 'lucide-react'

export default function NovoCliente() {
  const { user, empresa } = useAuth()
  const navigate = useNavigate()
  const labels = nichoLabels[empresa?.nicho] || nichoLabels.outro

  const [form, setForm] = useState({
    nome: '', telefone: '', email: '', referencia: '', etapa: 'novo', origem: '', observacao: '',
  })
  const [loading, setLoading] = useState(false)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await addCliente(user.uid, form)
      navigate('/')
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-soft hover:text-navy text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> Voltar
      </button>

      <h1 className="text-navy text-xl font-bold mb-6">Novo {labels.cliente.toLowerCase()}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={`Nome *`}>
              <input
                type="text" required value={form.nome}
                onChange={e => set('nome', e.target.value)}
                className="input" placeholder={`Nome do ${labels.cliente.toLowerCase()}`}
              />
            </Field>
            <Field label="Telefone">
              <input
                type="tel" value={form.telefone}
                onChange={e => set('telefone', e.target.value)}
                className="input" placeholder="(11) 99999-9999"
              />
            </Field>
            <Field label="Email">
              <input
                type="email" value={form.email}
                onChange={e => set('email', e.target.value)}
                className="input" placeholder="email@exemplo.com"
              />
            </Field>
            <Field label={labels.referencia}>
              <input
                type="text" value={form.referencia}
                onChange={e => set('referencia', e.target.value)}
                className="input" placeholder={labels.referencia}
              />
            </Field>
            <Field label="Etapa">
              <select value={form.etapa} onChange={e => set('etapa', e.target.value)} className="input">
                {etapas.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </Field>
            <Field label="Origem">
              <input
                type="text" value={form.origem}
                onChange={e => set('origem', e.target.value)}
                className="input" placeholder="Instagram, indicação..."
              />
            </Field>
          </div>

          <Field label="Observação">
            <textarea
              value={form.observacao}
              onChange={e => set('observacao', e.target.value)}
              className="input resize-none" rows={3}
              placeholder="Anotações relevantes..."
            />
          </Field>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="flex-1 border border-border text-slate-soft hover:text-navy hover:border-navy py-2.5 rounded-xl text-sm transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="flex-1 bg-blue hover:bg-blue-hover text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 shadow-sm">
            {loading ? 'Salvando...' : 'Cadastrar'}
          </button>
        </div>
      </form>

      <style>{`.input { width: 100%; background: #F8FAFF; border: 1px solid #E2E8F0; color: #0D1B2E; border-radius: 0.75rem; padding: 0.625rem 1rem; font-size: 0.875rem; outline: none; transition: border-color 0.15s, box-shadow 0.15s; } .input:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); } .input::placeholder { color: #94A3B8; }`}</style>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy mb-1.5">{label}</label>
      {children}
    </div>
  )
}
