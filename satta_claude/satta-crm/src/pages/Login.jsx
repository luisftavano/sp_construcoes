import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'

const FOTO = 'https://images.pexels.com/photos/577210/pexels-photo-577210.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'

const ERROS = {
  'auth/user-not-found':    'Email não encontrado.',
  'auth/wrong-password':    'Senha incorreta.',
  'auth/invalid-email':     'Email inválido.',
  'auth/invalid-credential':'Email ou senha incorretos.',
}

export default function Login() {
  const [email, setEmail]   = useState('')
  const [senha, setSenha]   = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, senha)
    } catch (err) {
      setErro(ERROS[err.code] || 'Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-bg">

      {/* Painel esquerdo */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 bg-surface">
        <div className="w-full max-w-sm">

          <img src="/logo-satta-branco.png" alt="Satta CRM" className="h-7 mb-10 object-contain object-left" />

          <h1 className="font-bricolage text-[1.75rem] font-semibold text-text leading-tight mb-1">
            Acesse sua conta
          </h1>
          <p className="text-text-2 text-sm mb-8">Entre para acompanhar seu negócio.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5 uppercase tracking-wide">
                E-mail
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email"
                placeholder="seu@email.com"
                className="w-full border border-border bg-bg rounded-md px-3.5 py-2.5 text-sm text-text focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-ink/20 transition-all placeholder:text-text-3"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5 uppercase tracking-wide">
                Senha
              </label>
              <div className="relative">
                <input
                  type={verSenha ? 'text' : 'password'} value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required autoComplete="current-password"
                  placeholder="Sua senha"
                  className="w-full border border-border bg-bg rounded-md px-3.5 py-2.5 pr-10 text-sm text-text focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-ink/20 transition-all placeholder:text-text-3"
                />
                <button
                  type="button" onClick={() => setVerSenha(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-2 transition-colors"
                >
                  {verSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {erro && (
              <p className="text-sm text-late-text bg-late-bg border border-late-text/20 rounded-md px-3 py-2">
                {erro}
              </p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-ink hover:bg-blue-hover text-white font-medium py-2.5 rounded-md text-sm transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Aguarde...' : 'Entrar na conta'}
            </button>
          </form>

          <p className="text-center text-sm text-text-2 mt-6">
            Não tem conta?{' '}
            <Link to="/criar-conta" className="text-ink font-medium hover:underline transition-colors">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>

      {/* Painel direito */}
      <div className="hidden lg:block relative flex-1 overflow-hidden">
        <img src={FOTO} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(30,58,95,0.82)' }} />
        <div className="relative h-full flex flex-col justify-between p-12">
          <img
            src="/logo-satta-branco.png" alt="Satta CRM"
            className="h-8 object-contain object-left brightness-0 invert"
          />
          <div>
            <p className="font-bricolage text-white text-2xl font-medium leading-snug mb-3 max-w-xs">
              Controle simples para quem trabalha de verdade.
            </p>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              CRM feito para barbearias, clínicas, salões e outros pequenos negócios brasileiros.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
