import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { saveEmpresa } from '../lib/firestore'
import { nichos } from '../lib/nichos'

export default function Onboarding() {
  const { user, refreshEmpresa } = useAuth()
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [nicho, setNicho] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      await saveEmpresa(user.uid, { nome, nicho })
      const emp = await refreshEmpresa()
      if (emp) navigate('/')
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <img
          src="/logo-satta-branco.png"
          alt="Satta Analytics"
          className="h-9 mb-12 object-contain"
        />

        <div className="mb-8">
          <p className="text-slate-soft text-sm font-medium uppercase tracking-widest mb-3">Configuração inicial</p>
          <h1 className="text-navy text-3xl font-bold leading-tight">
            Conta sua empresa para o CRM
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-navy mb-2">
              Nome da empresa
            </label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
              autoFocus
              className="w-full border border-border rounded-xl px-4 py-3 text-sm text-navy focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/10 transition-all placeholder:text-slate-soft"
              placeholder="Ex: Barbearia do João"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy mb-3">
              Tipo de negócio
            </label>
            <div className="grid grid-cols-2 gap-2">
              {nichos.map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setNicho(n.id)}
                  className={`px-4 py-3 rounded-xl text-sm text-left font-medium transition-all border ${
                    nicho === n.id
                      ? 'bg-navy border-navy text-white'
                      : 'bg-white border-border text-slate-soft hover:border-navy/30 hover:text-navy'
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !nome || !nicho}
            className="w-full bg-blue hover:bg-blue-hover text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-40 shadow-sm"
          >
            {loading ? 'Salvando...' : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}
