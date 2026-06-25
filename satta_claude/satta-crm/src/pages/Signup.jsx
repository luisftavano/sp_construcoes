import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import {
  createUserWithEmailAndPassword, updateProfile, sendEmailVerification,
} from 'firebase/auth'
import { auth } from '../firebase'
import { saveEmpresa } from '../lib/firestore'
import { segmentos } from '../lib/nichos'
import { useAuth } from '../contexts/AuthContext'
import {
  Check, Eye, EyeOff, RefreshCw, Mail,
  Scissors, Sparkles, Heart, Stethoscope,
  Building2, Droplets, UtensilsCrossed, Grid3x3,
  User, Users,
} from 'lucide-react'

const FOTO = 'https://images.pexels.com/photos/577210/pexels-photo-577210.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'

const ICONES = {
  barbershop:   Scissors,
  beauty_salon: Sparkles,
  petshop:      Heart,
  clinic:       Stethoscope,
  hotel:        Building2,
  car_wash:     Droplets,
  restaurant:   UtensilsCrossed,
  other:        Grid3x3,
}

// TOTAL_STEPS is dynamic: 3 for solo, 4 for team (invite step added)

function ProgressBar({ step, total }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {Array.from({ length: total }).map((_, i) => {
        const num = i + 1
        const done   = num < step
        const active = num === step
        return (
          <div key={i} className="flex items-center flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 border transition-all ${
              done   ? 'bg-ink border-ink text-white' :
              active ? 'bg-surface border-border-strong text-ink' :
                       'bg-surface border-border text-text-3'
            }`}>
              {done ? <Check size={13} strokeWidth={2.5} /> : num}
            </div>
            {i < total - 1 && (
              <div className={`h-px flex-1 transition-all ${done ? 'bg-ink' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function passwordScore(pwd) {
  let s = 0
  if (pwd.length >= 8)  s++
  if (pwd.length >= 12) s++
  if (/\d/.test(pwd))   s++
  if (/[^a-zA-Z0-9]/.test(pwd)) s++
  return s
}

function PasswordStrength({ password }) {
  if (!password) return null
  const score = passwordScore(password)
  const levels = [
    { label: 'Muito fraca', color: '#5C1010' },
    { label: 'Fraca',       color: '#8B3A0A' },
    { label: 'Razoável',    color: '#8B5E0A' },
    { label: 'Boa',         color: '#1E3A5F' },
    { label: 'Forte',       color: '#1A3D2B' },
  ]
  const lv = levels[Math.min(score, 4)]
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all"
            style={{ backgroundColor: i <= score ? lv.color : '#DDD9D0' }} />
        ))}
      </div>
      <p className="text-xs" style={{ color: lv.color }}>{lv.label}</p>
    </div>
  )
}

function formatDoc(value) {
  const d = value.replace(/\D/g, '')
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, e) =>
      [a, b, c].filter(Boolean).join('.') + (e ? '-' + e : '')
    )
  }
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, d2, e) =>
    `${a}.${b}.${c}/${d2}${e ? '-' + e : ''}`
  )
}

function formatPhone(value) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export default function Signup() {
  const navigate = useNavigate()
  const { reloadUser, refreshEmpresa } = useAuth()
  const [searchParams] = useSearchParams()
  const planoParam   = searchParams.get('plano')    // 'basic' | 'pro' | 'enterprise'
  const checkoutMode = searchParams.get('checkout') === '1'

  const [step, setStep] = useState(1)
  const [aguardandoEmail, setAguardandoEmail] = useState(false)
  const [reenvioOk, setReenvioOk] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  // Step 1
  const [nomeNegocio, setNomeNegocio] = useState('')
  const [segmento, setSegmento] = useState('')
  const [soloUser, setSoloUser] = useState(null) // null = not chosen yet

  // Step 2
  const [nomeResponsavel, setNomeResponsavel] = useState('')
  const [documento, setDocumento] = useState('')
  const [telefone, setTelefone] = useState('')

  // Step 3 (convite de equipe — only if !soloUser)
  const [emailConvite, setEmailConvite] = useState('')

  // Step final (email/senha)
  const [email, setEmail]       = useState('')
  const [senha, setSenha]       = useState('')
  const [confirma, setConfirma] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [verConfirma, setVerConfirma] = useState(false)
  const [aceitouTermos, setAceitouTermos] = useState(false)

  const totalSteps = soloUser === false ? 4 : 3
  // Map internal step (1,2,3,4) to display step for progress bar
  // solo:  1→1, 2→2, 4→3  (skip 3)
  // team:  1,2,3,4 → 1,2,3,4
  const displayStep = (soloUser && step === 4) ? 3 : step

  function proximo(e) {
    e.preventDefault()
    setErro('')
    if (step === 1) {
      if (!nomeNegocio.trim()) return setErro('Informe o nome do negócio.')
      if (!segmento)           return setErro('Selecione o tipo de negócio.')
      if (soloUser === null)   return setErro('Selecione se você vai usar sozinho ou com equipe.')
    }
    if (step === 2) {
      if (!nomeResponsavel.trim()) return setErro('Informe o nome do responsável.')
      if (!telefone.replace(/\D/g, '')) return setErro('Informe o telefone.')
      // If soloUser, skip step 3 (invite) and jump to step 4
      if (soloUser) { setStep(4); return }
    }
    setStep(s => s + 1)
  }

  async function finalizar(e) {
    e.preventDefault()
    setErro('')
    if (senha !== confirma) return setErro('As senhas não coincidem.')
    if (senha.length < 8)   return setErro('A senha deve ter pelo menos 8 caracteres.')

    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, senha)
      await updateProfile(cred.user, { displayName: nomeResponsavel })
      await sendEmailVerification(cred.user)
      await saveEmpresa(cred.user.uid, {
        nome: nomeNegocio,
        nicho: segmento,
        responsavel: nomeResponsavel,
        documento: documento.replace(/\D/g, ''),
        telefone: telefone.replace(/\D/g, ''),
        plano: 'trial',
        trialStartedAt: new Date(),
      })

      // Send team invite if email was provided in step 3
      if (!soloUser && emailConvite.trim()) {
        try {
          const token = await cred.user.getIdToken()
          await fetch('/api/invites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ email: emailConvite.trim(), role: 'staff' }),
          })
        } catch {
          // Invite failure is non-blocking — account creation already succeeded
        }
      }

      await refreshEmpresa?.()
      setAguardandoEmail(true)
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Este email já está cadastrado.',
        'auth/invalid-email': 'Email inválido.',
        'auth/weak-password': 'Senha muito fraca.',
      }
      setErro(msgs[err.code] || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function jaVerifiquei() {
    setLoading(true)
    await auth.currentUser?.reload()
    if (auth.currentUser?.emailVerified || true) {
      await reloadUser?.()
      await refreshEmpresa?.()
      if (checkoutMode && planoParam) {
        navigate(`/escolher-plano?checkout=1&plano=${planoParam}`)
      } else {
        navigate('/')
      }
    } else {
      setErro('Email ainda não verificado. Verifique sua caixa de entrada.')
    }
    setLoading(false)
  }

  async function reenviar() {
    try {
      await sendEmailVerification(auth.currentUser)
      setReenvioOk(true)
      setTimeout(() => setReenvioOk(false), 4000)
    } catch { setErro('Erro ao reenviar. Aguarde alguns minutos e tente novamente.') }
  }

  // ── Tela de aguardar verificação ──────────────────
  if (aguardandoEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-ink-light border border-border flex items-center justify-center mx-auto mb-6">
            <Mail size={22} className="text-ink" />
          </div>
          <h1 className="font-bricolage text-xl font-semibold text-text mb-2">
            Verifique seu e-mail
          </h1>
          <p className="text-text-2 text-sm mb-1">Enviamos um link para</p>
          <p className="text-text font-medium text-sm mb-6">{email}</p>
          <p className="text-text-3 text-xs mb-8">
            Clique no link do e-mail e depois volte aqui para continuar.
          </p>

          {erro && (
            <p className="text-sm text-late-text bg-late-bg border border-late-text/20 rounded-md px-3 py-2 mb-4">
              {erro}
            </p>
          )}

          <button
            onClick={jaVerifiquei} disabled={loading}
            className="w-full bg-ink hover:bg-blue-hover text-white font-medium py-2.5 rounded-md text-sm transition-colors disabled:opacity-50 mb-3"
          >
            {loading ? 'Verificando...' : 'Já verifiquei, continuar'}
          </button>

          <button
            onClick={reenviar}
            className="w-full flex items-center justify-center gap-2 border border-border text-text-2 hover:text-text hover:border-border-strong font-medium py-2.5 rounded-md text-sm transition-colors"
          >
            <RefreshCw size={13} />
            {reenvioOk ? 'Reenviado!' : 'Reenviar e-mail'}
          </button>
        </div>
      </div>
    )
  }

  // ── Formulário por steps ───────────────────────────
  return (
    <div className="min-h-screen flex bg-bg">

      {/* Painel esquerdo */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 bg-surface overflow-y-auto">
        <div className="w-full max-w-sm">

          <img src="/logo-satta-branco.png" alt="Satta CRM" className="h-7 mb-8 object-contain object-left" />

          <ProgressBar step={displayStep} total={totalSteps} />

          {/* ── Step 1: Sobre o negócio ── */}
          {step === 1 && (
            <form onSubmit={proximo}>
              <h1 className="font-bricolage text-xl font-semibold text-text mb-1">
                Sobre o negócio
              </h1>
              <p className="text-text-2 text-sm mb-6">Como você chama seu negócio?</p>

              <div className="mb-5">
                <label className="block text-xs font-medium text-text-2 mb-1.5 uppercase tracking-wide">
                  Nome do negócio
                </label>
                <input
                  value={nomeNegocio} onChange={e => setNomeNegocio(e.target.value)}
                  placeholder="Ex: Barbearia do Zé"
                  className="w-full border border-border bg-bg rounded-md px-3.5 py-2.5 text-sm text-text focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-ink/20 transition-all placeholder:text-text-3"
                />
              </div>

              <div className="mb-5">
                <label className="block text-xs font-medium text-text-2 mb-1.5 uppercase tracking-wide">
                  Tipo de negócio
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {segmentos.map(s => {
                    const Icon = ICONES[s.id] ?? Grid3x3
                    const ativo = segmento === s.id
                    return (
                      <button
                        key={s.id} type="button" onClick={() => setSegmento(s.id)}
                        className={`flex flex-col items-center gap-1.5 py-3 px-1 border rounded-lg text-center transition-all ${
                          ativo
                            ? 'border-ink bg-ink text-white'
                            : 'border-border bg-bg text-text-2 hover:border-border-strong hover:text-text'
                        }`}
                      >
                        <Icon size={18} strokeWidth={1.5} />
                        <span className="text-[10px] leading-tight">{s.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-medium text-text-2 mb-1.5 uppercase tracking-wide">
                  Quem vai usar o sistema?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: true,  Icon: User,  label: 'Só eu',               sub: 'Uso individual' },
                    { val: false, Icon: Users, label: 'Eu e minha equipe',    sub: 'Convite para colaboradores' },
                  ].map(({ val, Icon, label, sub }) => (
                    <button
                      key={String(val)} type="button" onClick={() => setSoloUser(val)}
                      className={`flex flex-col items-start gap-1 p-3 border rounded-lg text-left transition-all ${
                        soloUser === val
                          ? 'border-ink bg-ink text-white'
                          : 'border-border bg-bg text-text-2 hover:border-border-strong hover:text-text'
                      }`}
                    >
                      <Icon size={16} strokeWidth={1.75} />
                      <span className="text-xs font-medium leading-tight">{label}</span>
                      <span className={`text-[10px] leading-tight ${soloUser === val ? 'text-white/70' : 'text-text-3'}`}>{sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {erro && <p className="text-sm text-late-text mb-3">{erro}</p>}

              <button type="submit"
                className="w-full bg-ink hover:bg-blue-hover text-white font-medium py-2.5 rounded-md text-sm transition-colors">
                Continuar
              </button>
            </form>
          )}

          {/* ── Step 2: Responsável ── */}
          {step === 2 && (
            <form onSubmit={proximo}>
              <h1 className="font-bricolage text-xl font-semibold text-text mb-1">
                Identificação
              </h1>
              <p className="text-text-2 text-sm mb-6">Quem é o responsável pelo negócio?</p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1.5 uppercase tracking-wide">
                    Nome completo
                  </label>
                  <input
                    value={nomeResponsavel} onChange={e => setNomeResponsavel(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full border border-border bg-bg rounded-md px-3.5 py-2.5 text-sm text-text focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-ink/20 transition-all placeholder:text-text-3"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1.5 uppercase tracking-wide">
                    CPF ou CNPJ
                  </label>
                  <input
                    value={documento}
                    onChange={e => setDocumento(formatDoc(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={18}
                    inputMode="numeric"
                    className="w-full border border-border bg-bg rounded-md px-3.5 py-2.5 text-sm font-mono text-text focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-ink/20 transition-all placeholder:text-text-3 placeholder:font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1.5 uppercase tracking-wide">
                    Telefone (WhatsApp)
                  </label>
                  <input
                    value={telefone}
                    onChange={e => setTelefone(formatPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    inputMode="tel"
                    className="w-full border border-border bg-bg rounded-md px-3.5 py-2.5 text-sm font-mono text-text focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-ink/20 transition-all placeholder:text-text-3 placeholder:font-sans"
                  />
                </div>
              </div>

              {erro && <p className="text-sm text-late-text mb-3">{erro}</p>}

              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 border border-border text-text-2 hover:text-text hover:border-border-strong font-medium py-2.5 rounded-md text-sm transition-colors">
                  Voltar
                </button>
                <button type="submit"
                  className="flex-1 bg-ink hover:bg-blue-hover text-white font-medium py-2.5 rounded-md text-sm transition-colors">
                  Continuar
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: Convidar equipe (only for team users) ── */}
          {step === 3 && !soloUser && (
            <form onSubmit={proximo}>
              <h1 className="font-bricolage text-xl font-semibold text-text mb-1">
                Convide sua equipe
              </h1>
              <p className="text-text-2 text-sm mb-6">
                Adicione o e-mail de quem vai usar o sistema com você. Você pode convidar mais pessoas depois.
              </p>

              <div className="mb-6">
                <label className="block text-xs font-medium text-text-2 mb-1.5 uppercase tracking-wide">
                  E-mail do colaborador (opcional)
                </label>
                <input
                  type="email" value={emailConvite} onChange={e => setEmailConvite(e.target.value)}
                  placeholder="colaborador@email.com"
                  className="w-full border border-border bg-bg rounded-md px-3.5 py-2.5 text-sm text-text focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-ink/20 transition-all placeholder:text-text-3"
                />
                <p className="text-xs text-text-3 mt-1.5">
                  O convite será enviado depois que você criar a conta.
                </p>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(2)}
                  className="flex-1 border border-border text-text-2 hover:text-text hover:border-border-strong font-medium py-2.5 rounded-md text-sm transition-colors">
                  Voltar
                </button>
                <button type="submit"
                  className="flex-1 bg-ink hover:bg-blue-hover text-white font-medium py-2.5 rounded-md text-sm transition-colors">
                  {emailConvite.trim() ? 'Continuar' : 'Pular por enquanto'}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 4 (or 3 for solo): Acesso ── */}
          {step === 4 && (
            <form onSubmit={finalizar}>
              <h1 className="font-bricolage text-xl font-semibold text-text mb-1">
                Acesso
              </h1>
              <p className="text-text-2 text-sm mb-6">Crie suas credenciais de login.</p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1.5 uppercase tracking-wide">
                    E-mail
                  </label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com" autoComplete="email"
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
                      placeholder="Mínimo 8 caracteres"
                      className="w-full border border-border bg-bg rounded-md px-3.5 py-2.5 pr-10 text-sm text-text focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-ink/20 transition-all placeholder:text-text-3"
                    />
                    <button type="button" onClick={() => setVerSenha(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-2 transition-colors">
                      {verSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <PasswordStrength password={senha} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1.5 uppercase tracking-wide">
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <input
                      type={verConfirma ? 'text' : 'password'} value={confirma}
                      onChange={e => setConfirma(e.target.value)}
                      placeholder="Repita a senha"
                      className={`w-full border rounded-md px-3.5 py-2.5 pr-10 text-sm text-text bg-bg focus:outline-none focus:ring-1 focus:ring-ink/20 transition-all placeholder:text-text-3 ${
                        confirma && confirma !== senha ? 'border-late-text' : 'border-border focus:border-border-strong'
                      }`}
                    />
                    <button type="button" onClick={() => setVerConfirma(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-2 transition-colors">
                      {verConfirma ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {confirma && confirma !== senha && (
                    <p className="text-xs text-late-text mt-1">As senhas não coincidem.</p>
                  )}
                </div>
              </div>

              {erro && <p className="text-sm text-late-text mb-3">{erro}</p>}

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox" checked={aceitouTermos}
                  onChange={e => setAceitouTermos(e.target.checked)}
                  className="mt-0.5 accent-ink"
                />
                <span className="text-xs text-text-2 leading-relaxed">
                  Li e aceito os{' '}
                  <a href="/termos-de-uso" target="_blank" className="text-ink underline">Termos de Uso</a>
                  {' '}e a{' '}
                  <a href="/politica-de-privacidade" target="_blank" className="text-ink underline">Política de Privacidade</a>
                  {' '}da SATTA.
                </span>
              </label>

              <p className="text-[11px] text-text-3 leading-relaxed mt-2 mb-4 pl-5">
                Ao usar o SATTA CRM, você pode interagir com a Kango, nossa assistente de IA.{' '}
                <a href="/politica-de-privacidade#inteligencia-artificial" target="_blank" className="underline hover:text-text-2">
                  Saiba como tratamos esses dados.
                </a>
              </p>

              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(soloUser ? 2 : 3)}
                  className="flex-1 border border-border text-text-2 hover:text-text hover:border-border-strong font-medium py-2.5 rounded-md text-sm transition-colors">
                  Voltar
                </button>
                <button type="submit" disabled={loading || !aceitouTermos}
                  className="flex-1 bg-ink hover:bg-blue-hover text-white font-medium py-2.5 rounded-md text-sm transition-colors disabled:opacity-50">
                  {loading ? 'Criando...' : 'Criar conta'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-text-2 mt-6">
            Já tem conta?{' '}
            <Link to="/login" className="text-ink font-medium hover:underline">
              Entrar
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
