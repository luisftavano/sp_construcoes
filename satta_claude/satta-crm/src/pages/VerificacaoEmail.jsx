import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendEmailVerification, signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { Mail, RefreshCw, LogOut } from 'lucide-react'

export default function VerificacaoEmail() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [erro, setErro] = useState('')
  const [reenviado, setReenviado] = useState(false)

  const email = auth.currentUser?.email

  async function checar() {
    setLoading(true)
    setErro('')
    try {
      await auth.currentUser.reload()
      if (auth.currentUser.emailVerified) {
        navigate('/')
      } else {
        setErro('Email ainda não verificado. Clique no link que enviamos.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function reenviar() {
    setReenviando(true)
    try {
      await sendEmailVerification(auth.currentUser)
      setReenviado(true)
    } finally {
      setReenviando(false)
    }
  }

  async function sair() {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        <img src="/logo-satta-branco.png" alt="Satta Analytics" className="h-8 mb-12 object-contain" />

        <div className="w-14 h-14 bg-blue-light border border-border rounded-2xl flex items-center justify-center mb-6">
          <Mail size={26} className="text-blue" />
        </div>

        <h1 className="text-navy text-2xl font-bold mb-2">Verifique seu email</h1>
        <p className="text-slate-soft text-sm mb-1">Enviamos um link de confirmação para:</p>
        <p className="text-navy font-semibold text-sm mb-6">{email}</p>
        <p className="text-slate-soft text-sm mb-8 leading-relaxed">
          Clique no link que enviamos antes de continuar. Verifique também a pasta de spam.
        </p>

        {erro && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
            {erro}
          </div>
        )}

        {reenviado && (
          <div className="bg-green/10 border border-green/20 text-green text-sm px-4 py-3 rounded-xl mb-4">
            Email reenviado com sucesso.
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={checar}
            disabled={loading}
            className="w-full bg-blue hover:bg-blue-hover text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Verificando...' : 'Já verifiquei, continuar'}
          </button>

          <button
            onClick={reenviar}
            disabled={reenviando}
            className="w-full border border-border text-slate-soft hover:text-navy hover:border-navy/30 py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} className={reenviando ? 'animate-spin' : ''} />
            {reenviando ? 'Enviando...' : 'Reenviar email'}
          </button>

          <button
            onClick={sair}
            className="w-full text-slate-soft hover:text-navy py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={14} />
            Sair e usar outra conta
          </button>
        </div>
      </div>
    </div>
  )
}
