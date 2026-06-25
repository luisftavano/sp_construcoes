import { useState, useEffect, useRef } from 'react'
import { auth, db } from '../firebase'
import {
  doc, getDoc, setDoc, updateDoc, collection,
  getDocs, deleteDoc, addDoc, serverTimestamp, query, where, orderBy,
} from 'firebase/firestore'
import {
  updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile,
} from 'firebase/auth'
import { useAuth } from '../contexts/AuthContext'
import { updateEmpresa } from '../lib/firestore'
import { getEquipe, getConvitesPendentes } from '../lib/team'
import { segmentos } from '../lib/nichos'
import {
  User, Shield, Bell, Monitor, Building2, Users, CreditCard,
  MessageCircle, Calendar, Clock, RefreshCw, FormInput, Tag, Settings2,
  Camera, Copy, Check, Lock, Eye, EyeOff, Smartphone, Laptop, Globe,
  Trash2, X, UserPlus, AlertTriangle, Loader2, CheckCircle2, XCircle,
  MapPin, Phone, Mail, Hash, Info, ChevronDown, Zap, ExternalLink,
  Save, MoreHorizontal, LogOut, Link2, QrCode, Share2, BarChart2,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import PlanGate from '../components/PlanGate'
import { usePlanFeatures } from '../hooks/usePlanFeatures'

/* ── API helpers ──────────────────────────────────────── */
const API = '/api'
async function apiHeaders() {
  const token = await auth.currentUser?.getIdToken()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}
async function apiGet(path) {
  const res = await fetch(API + path, { headers: await apiHeaders() })
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}
async function apiPost(path, body) {
  const res = await fetch(API + path, { method: 'POST', headers: await apiHeaders(), body: JSON.stringify(body) })
  return res.json()
}
async function apiPut(path, body) {
  const res = await fetch(API + path, { method: 'PUT', headers: await apiHeaders(), body: JSON.stringify(body) })
  return res.json()
}
async function apiDelete(path) {
  const res = await fetch(API + path, { method: 'DELETE', headers: await apiHeaders() })
  return res.json()
}

/* ── Shared primitives ────────────────────────────────── */
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-[22px] w-10 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 ${
        checked ? 'bg-ink' : 'bg-border-strong'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-[16px] w-[16px] transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-[19px]' : 'translate-x-[3px]'
      }`} />
    </button>
  )
}

function ToggleRow({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">{label}</p>
        {description && <p className="text-xs text-text-3 mt-0.5">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  )
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full border border-border rounded-md px-3 py-2 text-sm text-text bg-surface placeholder:text-text-3 focus:outline-none focus:border-ink transition-colors ${className}`}
      {...props}
    />
  )
}

function Label({ children }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wide text-text-2 mb-1.5">{children}</p>
}

function FieldGroup({ children }) {
  return <div className="space-y-4">{children}</div>
}

function SectionDivider({ label }) {
  return <p className="text-[10px] font-semibold uppercase tracking-wider text-text-3 mt-8 mb-3">{label}</p>
}

function SaveRow({ loading, saved, onSave, disabled }) {
  return (
    <div className="flex items-center gap-3 pt-6 border-t border-border mt-8">
      <button
        onClick={onSave}
        disabled={loading || disabled}
        className="flex items-center gap-2 bg-ink text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-ink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Salvar
      </button>
      {saved && (
        <span className="flex items-center gap-1.5 text-sm text-ok-text animate-fade-in">
          <CheckCircle2 size={14} />
          Salvo com sucesso
        </span>
      )}
    </div>
  )
}

function SectionShell({ title, description, children }) {
  return (
    <div className="max-w-2xl py-8 px-8">
      <div className="mb-8">
        <h2 className="text-[17px] font-semibold text-text" style={{ fontFamily: 'Bricolage Grotesque, system-ui, sans-serif' }}>{title}</h2>
        {description && <p className="text-sm text-text-2 mt-1 leading-relaxed">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function ComingSoon({ label, description }) {
  return (
    <SectionShell title={label} description={description}>
      <div className="border border-dashed border-border rounded-xl p-10 text-center text-text-3">
        <Zap size={28} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium text-text-2">Em desenvolvimento</p>
        <p className="text-xs text-text-3 mt-1">Esta seção estará disponível em breve</p>
      </div>
    </SectionShell>
  )
}

/* ── Plano e cobrança ─────────────────────────────────── */
function PlanoSection() {
  const { empresa, user } = useAuth()
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [erroPortal, setErroPortal] = useState('')

  const plano     = empresa?.plano || 'trial'
  const isTrial   = plano === 'trial'
  const isPaid    = ['basic', 'pro', 'enterprise'].includes(plano)

  const NOMES = { trial: 'Teste grátis', basic: 'Básico', pro: 'Profissional', enterprise: 'Business' }
  const PRECOS = { basic: 'R$39,90/mês', pro: 'R$59,90/mês', enterprise: 'R$129,90/mês' }

  function trialDaysLeft() {
    const started = empresa?.trialStartedAt?.toDate?.() ?? empresa?.trialStartedAt
    if (!started) return 14
    const days = 14 - (Date.now() - new Date(started).getTime()) / (1000 * 60 * 60 * 24)
    return Math.max(0, Math.ceil(days))
  }

  async function abrirPortal() {
    setErroPortal('')
    setLoadingPortal(true)
    try {
      const token = await user.getIdToken()
      const res   = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro || 'Erro ao abrir portal.')
      window.location.href = data.url
    } catch (err) {
      setErroPortal(err.message)
    } finally {
      setLoadingPortal(false)
    }
  }

  const daysLeft = isTrial ? trialDaysLeft() : null

  return (
    <SectionShell title="Plano e cobrança" description="Seu plano atual e opções de pagamento.">
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-text-3 uppercase tracking-wide mb-1">Plano atual</p>
            <p className="text-lg font-semibold text-text">{NOMES[plano] || plano}</p>
            {isPaid && PRECOS[plano] && (
              <p className="text-sm text-text-2 mt-0.5">{PRECOS[plano]}</p>
            )}
            {isTrial && (
              <p className="text-sm mt-0.5" style={{ color: daysLeft <= 3 ? '#C03000' : undefined }}>
                {daysLeft > 0
                  ? `${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''} no teste`
                  : 'Período de teste encerrado'}
              </p>
            )}
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
            isTrial ? 'bg-ink-light text-ink' : 'bg-ok-bg text-ok-text'
          }`}>
            {isTrial ? 'Trial' : 'Ativo'}
          </span>
        </div>

        <div className="border-t border-border px-6 py-4 flex flex-wrap gap-3">
          <a
            href="/escolher-plano"
            className="text-sm font-medium px-4 py-2 rounded-md border border-border text-text hover:border-border-strong hover:bg-ink-light transition-colors"
          >
            {isTrial ? 'Escolher plano' : 'Mudar plano'}
          </a>
          {isPaid && (
            <button
              onClick={abrirPortal}
              disabled={loadingPortal}
              className="text-sm font-medium px-4 py-2 rounded-md bg-ink text-white hover:bg-blue-hover transition-colors disabled:opacity-50"
            >
              {loadingPortal ? 'Aguarde...' : 'Gerenciar assinatura'}
            </button>
          )}
        </div>

        {erroPortal && (
          <p className="px-6 pb-4 text-sm text-late-text">{erroPortal}</p>
        )}
      </div>

      <p className="text-xs text-text-3 mt-4">
        Pagamento e gerenciamento de cartão são feitos com segurança via Stripe.
      </p>
    </SectionShell>
  )
}

/* ── Avatar ───────────────────────────────────────────── */
function UserAvatar({ user, size = 80, onClick }) {
  const name = user?.displayName || user?.email || ''
  const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/50"
      style={{ width: size, height: size }}
      aria-label="Alterar foto de perfil"
    >
      {user?.photoURL ? (
        <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-white font-semibold select-none"
          style={{ backgroundColor: '#1E3A5F', fontSize: size * 0.3 }}
        >
          {initials || '?'}
        </div>
      )}
      <div className="absolute inset-0 rounded-full bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Camera size={size * 0.28} className="text-white" />
      </div>
    </button>
  )
}

/* ── Copy button ──────────────────────────────────────── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-text-2 hover:text-ink transition-colors ml-2"
      aria-label="Copiar"
    >
      {copied ? <Check size={12} className="text-ok-text" /> : <Copy size={12} />}
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  )
}

/* ── Password strength ─────────────────────────────────  */
function PwdStrength({ value }) {
  if (!value) return null
  let s = 0
  if (value.length >= 8) s++
  if (value.length >= 12) s++
  if (/\d/.test(value)) s++
  if (/[^a-zA-Z0-9]/.test(value)) s++
  const cols = ['#5C1010', '#8B3A0A', '#8B5E0A', '#1E3A5F', '#1A3D2B']
  const lbls = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte']
  const c = cols[Math.min(s, 4)] || cols[0]
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{ background: i < s ? c : '#DDD9D0' }} />
        ))}
      </div>
      <p className="text-[11px]" style={{ color: c }}>{lbls[Math.min(s, 4)]}</p>
    </div>
  )
}

/* ── Role badge ───────────────────────────────────────── */
function RoleBadge({ role }) {
  const labels = { owner: 'Dono', admin: 'Gerente', member: 'Funcionário' }
  return (
    <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded bg-ink-light text-ink">
      {labels[role] || role}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════
   SECTION: Perfil pessoal
══════════════════════════════════════════════════════════ */
function PerfilSection() {
  const { user, empresa, role, refreshAuth } = useAuth()
  const fileRef = useRef(null)
  const [nome, setNome] = useState(user?.displayName || '')
  const [telefone, setTelefone] = useState(empresa?.telefone || '')
  const [preview, setPreview] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  function fmtPhone(v) {
    const d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 2) return d
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setPreview(URL.createObjectURL(file))
  }

  function cancelPhoto() {
    setPreview(null)
    setPendingFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function salvar() {
    setLoading(true)
    try {
      if (nome !== user?.displayName) {
        await updateProfile(auth.currentUser, { displayName: nome })
      }
      if (empresa?.id) {
        await updateEmpresa(empresa.id, { telefone })
      }
      await refreshAuth()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionShell title="Perfil pessoal" description="Suas informações pessoais na SATTA CRM.">
      {/* Avatar */}
      <div className="flex items-center gap-5 mb-8">
        <div className="relative">
          <UserAvatar
            user={preview ? { ...user, photoURL: preview } : user}
            size={80}
            onClick={() => fileRef.current?.click()}
          />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
        <div>
          <p className="text-sm font-medium text-text">{user?.displayName || 'Sem nome'}</p>
          <p className="text-xs text-text-3 mt-0.5">{user?.email}</p>
          {pendingFile ? (
            <div className="flex items-center gap-2 mt-2">
              <button onClick={salvar} disabled={loading} className="text-xs font-medium text-ink hover:underline">
                Salvar foto
              </button>
              <span className="text-text-3 text-xs">·</span>
              <button onClick={cancelPhoto} className="text-xs text-text-3 hover:text-text">
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-text-2 hover:text-ink mt-1.5 transition-colors"
            >
              Alterar foto
            </button>
          )}
        </div>
      </div>

      <FieldGroup>
        {/* UID */}
        <div>
          <Label>ID do usuário</Label>
          <div className="flex items-center">
            <span className="text-xs font-mono text-text-3 bg-bg rounded px-2 py-1.5 border border-border truncate max-w-xs">
              {user?.uid || '—'}
            </span>
            {user?.uid && <CopyButton text={user.uid} />}
          </div>
        </div>

        {/* Nome */}
        <div>
          <Label>Nome completo</Label>
          <Input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Seu nome completo"
            autoComplete="name"
          />
        </div>

        {/* E-mail */}
        <div>
          <Label>E-mail</Label>
          <div className="relative">
            <Input value={user?.email || ''} readOnly className="pr-10 bg-bg cursor-not-allowed text-text-3" />
            <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3" />
          </div>
          <p className="text-[11px] text-text-3 mt-1">
            Para alterar o e-mail, entre em contato com o suporte.
          </p>
        </div>

        {/* Telefone */}
        <div>
          <Label>WhatsApp / Telefone</Label>
          <Input
            value={telefone}
            onChange={e => setTelefone(fmtPhone(e.target.value))}
            placeholder="(11) 99999-9999"
            type="tel"
            autoComplete="tel"
          />
        </div>

        {/* Papel */}
        <div>
          <Label>Função na conta</Label>
          <div className="flex items-center gap-2 mt-0.5">
            <RoleBadge role={role} />
            <span className="text-xs text-text-3">Papéis são gerenciados pelo dono da conta</span>
          </div>
        </div>
      </FieldGroup>

      <SaveRow loading={loading} saved={saved} onSave={salvar} />
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════
   SECTION: Segurança
══════════════════════════════════════════════════════════ */
function SegurancaSection() {
  const { user } = useAuth()

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [showAtual, setShowAtual] = useState(false)
  const [showNova, setShowNova] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pwdSaved, setPwdSaved] = useState(false)
  const [pwdErr, setPwdErr] = useState('')

  const [twoFA, setTwoFA] = useState(false)
  const [twoFALoading, setTwoFALoading] = useState(false)

  const [logoutAll, setLogoutAll] = useState(false) // confirmação inline

  useEffect(() => {
    async function load2FA() {
      try {
        const snap = await getDoc(doc(db, 'usuarios', user.uid))
        if (snap.exists()) setTwoFA(snap.data().twoFactorEnabled ?? false)
      } catch {}
    }
    if (user?.uid) load2FA()
  }, [user?.uid])

  async function alterarSenha() {
    setPwdErr('')
    if (novaSenha.length < 8) { setPwdErr('A nova senha deve ter pelo menos 8 caracteres.'); return }
    if (novaSenha !== confirmaSenha) { setPwdErr('As senhas não coincidem.'); return }
    setLoading(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, senhaAtual)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await updatePassword(auth.currentUser, novaSenha)
      setSenhaAtual(''); setNovaSenha(''); setConfirmaSenha('')
      setPwdSaved(true)
      setTimeout(() => setPwdSaved(false), 3000)
    } catch (e) {
      const msgs = {
        'auth/wrong-password': 'Senha atual incorreta.',
        'auth/invalid-credential': 'Senha atual incorreta.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde um momento.',
      }
      setPwdErr(msgs[e.code] || 'Erro ao alterar senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function toggle2FA(val) {
    setTwoFALoading(true)
    try {
      await setDoc(doc(db, 'usuarios', user.uid), { twoFactorEnabled: val }, { merge: true })
      setTwoFA(val)
    } catch {}
    finally { setTwoFALoading(false) }
  }

  async function sairTodosDispositivos() {
    try {
      // Deleta todas as sessões do usuário no Firestore
      const q = query(collection(db, 'sessions'), where('userId', '==', user.uid))
      const snap = await getDocs(q)
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
    } catch {}
    setLogoutAll(false)
  }

  return (
    <SectionShell title="Segurança" description="Gerencie sua senha e as opções de acesso à sua conta.">

      {/* Alterar senha */}
      <SectionDivider label="Alterar senha" />
      <FieldGroup>
        <div>
          <Label>Senha atual</Label>
          <div className="relative">
            <Input
              type={showAtual ? 'text' : 'password'}
              value={senhaAtual}
              onChange={e => setSenhaAtual(e.target.value)}
              placeholder="Sua senha atual"
              className="pr-10"
            />
            <button type="button" onClick={() => setShowAtual(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-2">
              {showAtual ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <Label>Nova senha</Label>
          <div className="relative">
            <Input
              type={showNova ? 'text' : 'password'}
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="pr-10"
            />
            <button type="button" onClick={() => setShowNova(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-2">
              {showNova ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <PwdStrength value={novaSenha} />
        </div>
        <div>
          <Label>Confirmar nova senha</Label>
          <Input
            type="password"
            value={confirmaSenha}
            onChange={e => setConfirmaSenha(e.target.value)}
            placeholder="Repita a nova senha"
          />
        </div>
        {pwdErr && (
          <div className="flex items-center gap-2 text-sm text-late-text bg-late-bg rounded px-3 py-2">
            <AlertTriangle size={13} /> {pwdErr}
          </div>
        )}
      </FieldGroup>
      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={alterarSenha}
          disabled={loading || !senhaAtual || !novaSenha || !confirmaSenha}
          className="flex items-center gap-2 bg-ink text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-ink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
          Alterar senha
        </button>
        {pwdSaved && (
          <span className="flex items-center gap-1.5 text-sm text-ok-text">
            <CheckCircle2 size={14} /> Senha alterada com sucesso
          </span>
        )}
      </div>

      {/* 2FA */}
      <SectionDivider label="Verificação em 2 etapas" />
      <div className="bg-surface border border-border rounded-xl p-5">
        <ToggleRow
          label="Verificação em 2 etapas"
          description="Ao ativar, você precisará confirmar um código enviado para o seu e-mail toda vez que fizer login."
          checked={twoFA}
          onChange={toggle2FA}
          disabled={twoFALoading}
        />
        {twoFA && (
          <div className="mt-3 flex items-center gap-2 text-xs text-ok-text bg-ok-bg rounded px-3 py-2">
            <CheckCircle2 size={12} /> Verificação em 2 etapas ativada para {user?.email}
          </div>
        )}
      </div>

      {/* Sair de todos */}
      <SectionDivider label="Sessões" />
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-text">Sair de todos os dispositivos</p>
            <p className="text-xs text-text-3 mt-0.5">Encerra todas as sessões abertas, incluindo a atual.</p>
          </div>
          <button
            onClick={() => setLogoutAll(true)}
            className="text-sm font-medium text-warn-text border border-warn-bg bg-warn-bg px-3 py-1.5 rounded-md hover:bg-warn-bg/80 transition-colors whitespace-nowrap"
          >
            Sair de todos
          </button>
        </div>
        {logoutAll && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm text-text mb-3">Você será desconectado de todos os dispositivos. Confirmar?</p>
            <div className="flex gap-2">
              <button onClick={sairTodosDispositivos}
                className="text-sm font-medium bg-warn-text text-white px-3 py-1.5 rounded-md hover:opacity-90">
                Confirmar
              </button>
              <button onClick={() => setLogoutAll(false)}
                className="text-sm text-text-2 border border-border px-3 py-1.5 rounded-md hover:bg-bg">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════
   SECTION: Sessões ativas
══════════════════════════════════════════════════════════ */
function parseUA(ua) {
  let browser = 'Navegador desconhecido'
  let os = 'Sistema desconhecido'
  let device = 'desktop'

  if (/iPhone|iPad|iPod/.test(ua)) { device = 'mobile'; os = /iPad/.test(ua) ? 'iPadOS' : 'iOS' }
  else if (/Android/.test(ua)) { device = 'mobile'; os = 'Android' }
  else if (/Mac/.test(ua)) os = 'macOS'
  else if (/Windows/.test(ua)) os = 'Windows'
  else if (/Linux/.test(ua)) os = 'Linux'

  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'

  return { browser, os, device }
}

function relTime(ts) {
  if (!ts) return 'Desconhecido'
  const secs = Math.floor((Date.now() - ts.toMillis()) / 1000)
  if (secs < 60) return 'Agora mesmo'
  if (secs < 3600) return `Há ${Math.floor(secs / 60)} min`
  if (secs < 86400) {
    const h = Math.floor(secs / 3600)
    return `Hoje às ${new Date(ts.toMillis()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  }
  if (secs < 172800) return 'Ontem'
  return new Date(ts.toMillis()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function DeviceIcon({ device }) {
  if (device === 'mobile') return <Smartphone size={18} className="text-text-3" />
  return <Laptop size={18} className="text-text-3" />
}

function SessoesSection() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const currentSessionId = useRef(null)

  useEffect(() => {
    if (!user?.uid) return

    async function load() {
      try {
        // Registra sessão atual se não existir
        const sessionKey = `satta_session_${user.uid}`
        let sessionId = sessionStorage.getItem(sessionKey)

        const ua = navigator.userAgent
        const { browser, os, device } = parseUA(ua)

        if (!sessionId) {
          const ref = await addDoc(collection(db, 'sessions'), {
            userId: user.uid,
            browser,
            os,
            device,
            ipAddress: null,
            lastUsedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          })
          sessionId = ref.id
          sessionStorage.setItem(sessionKey, sessionId)
        } else {
          // Atualiza lastUsedAt
          try {
            await updateDoc(doc(db, 'sessions', sessionId), { lastUsedAt: serverTimestamp() })
          } catch {}
        }
        currentSessionId.current = sessionId

        // Busca todas sessões do usuário
        const q = query(
          collection(db, 'sessions'),
          where('userId', '==', user.uid),
          orderBy('lastUsedAt', 'desc'),
        )
        const snap = await getDocs(q)
        setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.uid])

  async function encerrar(id) {
    await deleteDoc(doc(db, 'sessions', id))
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  return (
    <SectionShell title="Sessões ativas" description="Dispositivos e navegadores onde sua conta está conectada no momento.">
      {loading ? (
        <div className="flex items-center gap-2 text-text-3 text-sm py-8">
          <Loader2 size={16} className="animate-spin" /> Carregando sessões…
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-text-3 text-sm">
          <Monitor size={28} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma sessão registrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => {
            const isCurrent = s.id === currentSessionId.current
            return (
              <div
                key={s.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                  isCurrent ? 'bg-ink-light border-ink/20' : 'bg-surface border-border'
                }`}
              >
                <div className={`p-2 rounded-lg ${isCurrent ? 'bg-white' : 'bg-bg'}`}>
                  <DeviceIcon device={s.device} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text">
                      {s.browser}, {s.os}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink bg-white px-1.5 py-0.5 rounded">
                        Sessão atual
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-text-3">
                      {relTime(s.lastUsedAt)}
                    </span>
                    {s.ipAddress && (
                      <span className="text-xs text-text-3 flex items-center gap-0.5">
                        <Globe size={10} /> {s.ipAddress}
                      </span>
                    )}
                  </div>
                </div>
                {!isCurrent && (
                  <button
                    onClick={() => encerrar(s.id)}
                    className="text-xs font-medium text-late-text hover:text-late-text/80 border border-late-bg bg-late-bg px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap"
                  >
                    Encerrar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════
   SECTION: Notificações
══════════════════════════════════════════════════════════ */
function NotificacoesSection() {
  const { user, role } = useAuth()
  const [prefs, setPrefs] = useState({
    novoAgendamento: true,
    agendamentoCancelado: true,
    lembrete1h: true,
    novoCliente: false,
    clienteInativo: true,
    novaVenda: true,
    pagamentoConfirmado: true,
    pagamentoAtrasado: true,
    estoqueBaixo: true,
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'usuarios', user.uid))
        if (snap.exists()?.notificationPreferences) {
          setPrefs(p => ({ ...p, ...snap.data().notificationPreferences }))
        }
      } catch {}
    }
    if (user?.uid) load()
  }, [user?.uid])

  function set(key, val) { setPrefs(p => ({ ...p, [key]: val })) }

  async function salvar() {
    setLoading(true)
    try {
      await setDoc(doc(db, 'usuarios', user.uid), { notificationPreferences: prefs }, { merge: true })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    finally { setLoading(false) }
  }

  const isOwnerAdmin = role === 'owner' || role === 'admin'

  return (
    <SectionShell title="Notificações" description="Escolha quais eventos geram notificações para você dentro da SATTA CRM.">

      <SectionDivider label="Agendamentos" />
      <div className="bg-surface border border-border rounded-xl divide-y divide-border">
        <div className="px-5"><ToggleRow label="Novo agendamento criado" checked={prefs.novoAgendamento} onChange={v => set('novoAgendamento', v)} /></div>
        <div className="px-5"><ToggleRow label="Agendamento cancelado" checked={prefs.agendamentoCancelado} onChange={v => set('agendamentoCancelado', v)} /></div>
        <div className="px-5"><ToggleRow label="Lembrete 1 hora antes do agendamento" checked={prefs.lembrete1h} onChange={v => set('lembrete1h', v)} /></div>
      </div>

      <SectionDivider label="Clientes" />
      <div className="bg-surface border border-border rounded-xl divide-y divide-border">
        <div className="px-5"><ToggleRow label="Novo cliente cadastrado" checked={prefs.novoCliente} onChange={v => set('novoCliente', v)} /></div>
        <div className="px-5"><ToggleRow label="Cliente inativo identificado" checked={prefs.clienteInativo} onChange={v => set('clienteInativo', v)} /></div>
      </div>

      {isOwnerAdmin && (
        <>
          <SectionDivider label="Financeiro" />
          <div className="bg-surface border border-border rounded-xl divide-y divide-border">
            <div className="px-5"><ToggleRow label="Nova venda registrada" checked={prefs.novaVenda} onChange={v => set('novaVenda', v)} /></div>
            <div className="px-5"><ToggleRow label="Pagamento da assinatura confirmado" checked={prefs.pagamentoConfirmado} onChange={v => set('pagamentoConfirmado', v)} /></div>
            <div className="px-5"><ToggleRow label="Pagamento da assinatura atrasado" checked={prefs.pagamentoAtrasado} onChange={v => set('pagamentoAtrasado', v)} /></div>
          </div>
        </>
      )}

      <SectionDivider label="Estoque" />
      <div className="bg-surface border border-border rounded-xl px-5">
        <ToggleRow label="Item com estoque abaixo do mínimo" checked={prefs.estoqueBaixo} onChange={v => set('estoqueBaixo', v)} />
      </div>

      <SaveRow loading={loading} saved={saved} onSave={salvar} />
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════
   SECTION: Dados do negócio
══════════════════════════════════════════════════════════ */
const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const DIAS_KEYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']

// Migrates old nicho IDs ('barbearia', 'lavarapido', etc.) to new segment IDs
const NICHO_LEGACY = {
  barbearia:   'barbershop',
  lavarapido:  'car_wash',
  consultorio: 'clinic',
  restaurante: 'restaurant',
  loja:        'other',
  outro:       'other',
}
function normalizeNicho(v) { return NICHO_LEGACY[v] || v || '' }

function empresaToForm(e) {
  return {
    nome:         e?.nome          || '',
    nicho:        normalizeNicho(e?.nicho),
    cnpj:         e?.cnpj          || '',
    telefone:     e?.telefone      || '',
    email:        e?.email         || '',
    cep:          e?.endereco?.cep          || '',
    rua:          e?.endereco?.rua          || '',
    numero:       e?.endereco?.numero       || '',
    complemento:  e?.endereco?.complemento  || '',
    bairro:       e?.endereco?.bairro       || '',
    cidade:       e?.endereco?.cidade       || '',
    estado:       e?.endereco?.estado       || '',
    horarios:     e?.horarios      || {},
  }
}

function DadosNegocioSection() {
  const { empresa, accountId, refreshEmpresa } = useAuth()
  const [form, setForm] = useState(() => empresaToForm(empresa))
  const [cepLoading, setCepLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  // Sync form when empresa changes (e.g. after external refreshEmpresa call)
  useEffect(() => {
    setForm(empresaToForm(empresa))
  }, [empresa])

  function set(key, val) { setForm(p => ({ ...p, [key]: val })) }

  function fmtCNPJ(v) {
    const d = v.replace(/\D/g, '').slice(0, 14)
    if (d.length <= 2) return d
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
    if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  }

  function fmtPhone(v) {
    const d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 2) return d
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  }

  function fmtCEP(v) {
    const d = v.replace(/\D/g, '').slice(0, 8)
    if (d.length <= 5) return d
    return `${d.slice(0, 5)}-${d.slice(5)}`
  }

  async function buscarCEP() {
    const clean = form.cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(p => ({
          ...p,
          rua: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
        }))
      }
    } catch {}
    finally { setCepLoading(false) }
  }

  function setHorario(dia, key, val) {
    setForm(p => ({
      ...p,
      horarios: { ...p.horarios, [dia]: { ...(p.horarios[dia] || {}), [key]: val } },
    }))
  }

  async function salvar() {
    setLoading(true)
    try {
      await updateEmpresa(accountId, {
        nome: form.nome,
        nicho: form.nicho,
        cnpj: form.cnpj,
        telefone: form.telefone,
        email: form.email,
        endereco: {
          cep: form.cep,
          rua: form.rua,
          numero: form.numero,
          complemento: form.complemento,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
        },
        horarios: form.horarios,
      })
      await refreshEmpresa()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionShell title="Dados do negócio" description="Informações da sua empresa registradas na SATTA CRM.">

      {/* Código da SATTA */}
      {accountId && (
        <div className="bg-ink-light border border-ink/10 rounded-xl p-4 mb-8 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/60 mb-0.5">Código da SATTA CRM</p>
            <span className="font-mono text-sm font-medium text-ink">{accountId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CopyButton text={accountId} />
            <span className="text-xs text-text-3 hidden sm:block">Use ao falar com o suporte</span>
          </div>
        </div>
      )}

      <SectionDivider label="Identificação" />
      <FieldGroup>
        <div>
          <Label>Nome do negócio</Label>
          <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Barbearia do João" />
        </div>
        <div>
          <Label>Tipo de negócio</Label>
          <select
            value={form.nicho}
            onChange={e => set('nicho', e.target.value)}
            className="w-full border border-border rounded-md px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:border-ink transition-colors"
          >
            <option value="">Selecione o tipo</option>
            {segmentos.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <Label>CNPJ ou CPF</Label>
          <Input
            value={form.cnpj}
            onChange={e => set('cnpj', fmtCNPJ(e.target.value))}
            placeholder="00.000.000/0001-00"
          />
        </div>
      </FieldGroup>

      <SectionDivider label="Contato" />
      <FieldGroup>
        <div>
          <Label>Telefone / WhatsApp do negócio</Label>
          <Input
            value={form.telefone}
            onChange={e => set('telefone', fmtPhone(e.target.value))}
            placeholder="(11) 99999-9999"
            type="tel"
          />
        </div>
        <div>
          <Label>E-mail de contato</Label>
          <Input
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="contato@meuegocio.com.br"
            type="email"
          />
        </div>
      </FieldGroup>

      <SectionDivider label="Endereço" />
      <FieldGroup>
        <div>
          <Label>CEP</Label>
          <div className="flex gap-2">
            <Input
              value={form.cep}
              onChange={e => set('cep', fmtCEP(e.target.value))}
              onBlur={buscarCEP}
              placeholder="00000-000"
              className="max-w-[160px]"
            />
            {cepLoading && <Loader2 size={16} className="animate-spin self-center text-text-3" />}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <Label>Rua / Logradouro</Label>
            <Input value={form.rua} onChange={e => set('rua', e.target.value)} placeholder="Rua das Flores" />
          </div>
          <div>
            <Label>Número</Label>
            <Input value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="123" />
          </div>
        </div>
        <div>
          <Label>Complemento</Label>
          <Input value={form.complemento} onChange={e => set('complemento', e.target.value)} placeholder="Sala 2, Bloco B" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <Label>Bairro</Label>
            <Input value={form.bairro} onChange={e => set('bairro', e.target.value)} />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input value={form.cidade} onChange={e => set('cidade', e.target.value)} />
          </div>
          <div>
            <Label>Estado</Label>
            <Input value={form.estado} onChange={e => set('estado', e.target.value)} maxLength={2} placeholder="SP" className="uppercase" />
          </div>
        </div>
      </FieldGroup>

      <SectionDivider label="Horário de funcionamento" />
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {DIAS.map((dia, i) => {
          const key = DIAS_KEYS[i]
          const h = form.horarios[key] || { ativo: false, abertura: '09:00', fechamento: '18:00' }
          return (
            <div key={key} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
              <Toggle
                checked={h.ativo ?? false}
                onChange={v => setHorario(key, 'ativo', v)}
              />
              <span className="text-sm font-medium text-text w-20 shrink-0">{dia}</span>
              {h.ativo ? (
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="time"
                    value={h.abertura || '09:00'}
                    onChange={e => setHorario(key, 'abertura', e.target.value)}
                    className="border border-border rounded px-2 py-1 text-sm text-text bg-surface focus:outline-none focus:border-ink"
                  />
                  <span className="text-text-3 text-xs">até</span>
                  <input
                    type="time"
                    value={h.fechamento || '18:00'}
                    onChange={e => setHorario(key, 'fechamento', e.target.value)}
                    className="border border-border rounded px-2 py-1 text-sm text-text bg-surface focus:outline-none focus:border-ink"
                  />
                </div>
              ) : (
                <span className="ml-auto text-xs text-text-3">Fechado</span>
              )}
            </div>
          )
        })}
      </div>

      <SaveRow loading={loading} saved={saved} onSave={salvar} />
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════
   SECTION: Minha equipe
══════════════════════════════════════════════════════════ */
function EquipeSection() {
  const { user, accountId, role } = useAuth()
  const [membros, setMembros] = useState([])
  const [convites, setConvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState('member')
  const [invLoading, setInvLoading] = useState(false)
  const [invErr, setInvErr] = useState('')
  const [invOk, setInvOk] = useState('')

  const limite = 5

  async function carregar() {
    setLoading(true)
    try {
      const [m, c] = await Promise.all([getEquipe(accountId), getConvitesPendentes(accountId)])
      setMembros(m)
      setConvites(c)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { if (accountId) carregar() }, [accountId])

  async function convidar() {
    setInvErr(''); setInvOk('')
    if (!email) { setInvErr('Informe o e-mail.'); return }
    setInvLoading(true)
    try {
      const res = await apiPost('/team/invite', { email, role: papel })
      if (res.error) { setInvErr(res.error); return }
      setInvOk(`Convite enviado para ${email}`)
      setEmail('')
      carregar()
    } catch { setInvErr('Erro ao enviar convite. Tente novamente.') }
    finally { setInvLoading(false) }
  }

  async function remover(uid) {
    if (!confirm('Remover este membro da equipe?')) return
    try {
      await apiDelete(`/team/member/${uid}`)
      carregar()
    } catch {}
  }

  async function revogarConvite(token) {
    try {
      await apiDelete(`/team/invite/${token}`)
      carregar()
    } catch {}
  }

  const total = membros.length + convites.length
  const pct = Math.round((total / limite) * 100)
  const atingiuLimite = total >= limite

  function getInitials(nome, email) {
    const n = nome || email || ''
    return n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()
  }

  const roleLabels = { owner: 'Dono', admin: 'Gerente', member: 'Funcionário' }

  return (
    <SectionShell title="Minha equipe" description="Gerencie quem tem acesso à SATTA CRM do seu negócio.">

      {/* Contador */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-text">{total} de {limite} usuários</p>
          <span className="text-xs text-text-3">Plano Profissional</span>
        </div>
        <div className="h-1.5 bg-bg rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: atingiuLimite ? '#5C1010' : '#1E3A5F' }} />
        </div>
      </div>

      {atingiuLimite && (
        <div className="flex items-start gap-3 bg-warn-bg border border-warn-text/20 rounded-xl p-4 mb-6 text-sm text-warn-text">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <div>
            Você atingiu o limite de usuários do seu plano.
            <button className="font-semibold underline ml-1 hover:opacity-80">Fazer upgrade</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-text-3 text-sm py-6"><Loader2 size={16} className="animate-spin" /> Carregando…</div>
      ) : (
        <div className="space-y-3 mb-8">
          {membros.map(m => (
            <div key={m.uid} className="flex items-center gap-4 bg-surface border border-border rounded-xl p-4">
              <div className="h-10 w-10 rounded-full bg-ink flex items-center justify-center text-white text-sm font-semibold shrink-0">
                {getInitials(m.nome, m.email)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{m.nome || m.email}</p>
                <p className="text-xs text-text-3 truncate">{m.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-ink-light text-ink">
                  {roleLabels[m.role] || m.role}
                </span>
                {role === 'owner' && m.uid !== user?.uid && (
                  <button onClick={() => remover(m.uid)} className="p-1.5 text-text-3 hover:text-late-text transition-colors">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {convites.map(c => (
            <div key={c.token} className="flex items-center gap-4 bg-surface border border-dashed border-border rounded-xl p-4">
              <div className="h-10 w-10 rounded-full bg-done-bg flex items-center justify-center shrink-0">
                <Mail size={16} className="text-text-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{c.email}</p>
                <p className="text-xs text-done-text">Convite pendente</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-done-bg text-done-text">
                  {roleLabels[c.role] || 'Funcionário'}
                </span>
                {role === 'owner' && (
                  <button onClick={() => revogarConvite(c.token)} className="p-1.5 text-text-3 hover:text-late-text transition-colors">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {role === 'owner' && !atingiuLimite && (
        <div className="border-t border-border pt-6">
          <p className="text-sm font-medium text-text mb-3">Convidar novo membro</p>
          <div className="flex gap-2 flex-wrap">
            <Input
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && convidar()}
              placeholder="email@exemplo.com"
              type="email"
              className="flex-1 min-w-[200px]"
            />
            <select
              value={papel}
              onChange={e => setPapel(e.target.value)}
              className="border border-border rounded-md px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:border-ink"
            >
              <option value="admin">Gerente</option>
              <option value="member">Funcionário</option>
            </select>
            <button
              onClick={convidar}
              disabled={invLoading || !email}
              className="flex items-center gap-2 bg-ink text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-ink/90 transition-colors disabled:opacity-50"
            >
              {invLoading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Convidar
            </button>
          </div>
          {invErr && <p className="text-xs text-late-text mt-2">{invErr}</p>}
          {invOk && <p className="text-xs text-ok-text mt-2">{invOk}</p>}
        </div>
      )}
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════
   SECTION: WhatsApp
══════════════════════════════════════════════════════════ */

function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2)  return d
  if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function WhatsAppSection() {
  const { empresa, accountId, refreshEmpresa } = useAuth()
  const [phone, setPhone]           = useState('')
  const [requesting, setRequesting] = useState(false)
  const [erro, setErro]             = useState('')
  const [settings, setSettings]     = useState({
    notifyOnAppointment:     true,
    patternRemindersEnabled: false,
    autoReplyEnabled:        false,
  })

  const status = empresa?.whatsappStatus // undefined | 'pending' | 'active'

  useEffect(() => {
    if (empresa?.whatsappSettings) {
      setSettings(s => ({ ...s, ...empresa.whatsappSettings }))
    }
  }, [empresa])

  async function solicitar() {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) { setErro('Informe um número com DDD.'); return }
    setErro('')
    setRequesting(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/account/request-whatsapp-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: digits }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.erro || 'Erro ao enviar solicitação.'); return }
      await refreshEmpresa()
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setRequesting(false)
    }
  }

  async function toggleSetting(key, value) {
    const next = { ...settings, [key]: value }
    setSettings(next)
    try {
      await updateEmpresa(accountId, { whatsappSettings: next })
    } catch {
      setSettings(settings)
    }
  }

  /* ── Estado: Conectado ───────────────────────────────── */
  if (status === 'active') {
    return (
      <SectionShell
        title="WhatsApp Business"
        description="Receba e responda mensagens dos seus clientes direto na SATTA CRM."
      >
        <div className="bg-ok-bg border border-ok-text/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#25D366' }}>
            <MessageCircle size={16} className="text-white" fill="white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ok-text">Conectado</p>
            {empresa?.whatsappPhone && (
              <p className="text-xs text-text-3 mt-0.5">{empresa.whatsappPhone}</p>
            )}
          </div>
        </div>

        <SectionDivider label="Automações" />
        <div className="bg-surface border border-border rounded-xl divide-y divide-border mb-6">
          <div className="px-5">
            <ToggleRow
              label="Confirmar agendamentos automaticamente"
              description="A Kango envia uma mensagem de confirmação assim que o cliente agenda."
              checked={settings.notifyOnAppointment}
              onChange={v => toggleSetting('notifyOnAppointment', v)}
            />
          </div>
          <div className="px-5">
            <ToggleRow
              label="Lembrar clientes de voltar"
              description="A Kango entra em contato com clientes que estão há mais de 30 dias sem aparecer."
              checked={settings.patternRemindersEnabled}
              onChange={v => toggleSetting('patternRemindersEnabled', v)}
            />
          </div>
          <div className="px-5">
            <ToggleRow
              label="Responder mensagens automaticamente"
              description="A Kango responde perguntas dos clientes fora do horário de funcionamento."
              checked={settings.autoReplyEnabled}
              onChange={v => toggleSetting('autoReplyEnabled', v)}
            />
          </div>
        </div>

        <a
          href="/whatsapp"
          className="flex items-center justify-between bg-ink-light hover:bg-ink-light/80 rounded-xl px-5 py-4 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <MessageCircle size={17} className="text-ink" />
            <div>
              <p className="text-sm font-medium text-ink">Abrir inbox de mensagens</p>
              <p className="text-xs text-ink/70">Ver conversas e responder clientes</p>
            </div>
          </div>
          <ExternalLink size={14} className="text-ink/60 group-hover:text-ink transition-colors" />
        </a>
      </SectionShell>
    )
  }

  /* ── Estado: Solicitação enviada ─────────────────────── */
  if (status === 'pending') {
    return (
      <SectionShell
        title="WhatsApp Business"
        description="Receba e responda mensagens dos seus clientes direto na SATTA CRM."
      >
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <div className="h-14 w-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-amber-50">
            <Clock size={26} className="text-amber-600" />
          </div>
          <p className="text-sm font-semibold text-text mb-1">Solicitação enviada</p>
          <p className="text-xs text-text-3 max-w-xs mx-auto leading-relaxed">
            Recebemos sua solicitação para o número{' '}
            <span className="font-medium text-text">{empresa?.whatsappPhone}</span>.
            Nossa equipe ativará a conexão em até 24 horas.
          </p>
        </div>
      </SectionShell>
    )
  }

  /* ── Estado: Não conectado ───────────────────────────── */
  return (
    <SectionShell
      title="WhatsApp Business"
      description="Receba e responda mensagens dos seus clientes direto na SATTA CRM."
    >
      <div className="bg-surface border border-border rounded-xl p-8 text-center mb-6">
        <div className="h-14 w-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#E9F8EF' }}>
          <MessageCircle size={26} style={{ color: '#25D366' }} />
        </div>
        <p className="text-sm font-semibold text-text mb-1">WhatsApp não conectado</p>
        <p className="text-xs text-text-3 max-w-xs mx-auto leading-relaxed">
          Conecte o WhatsApp do seu negócio para que a Kango confirme agendamentos,
          envie lembretes e responda clientes automaticamente.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Número do WhatsApp do negócio</Label>
          <Input
            value={phone}
            onChange={e => { setPhone(maskPhone(e.target.value)); setErro('') }}
            placeholder="(11) 99999-9999"
            inputMode="numeric"
          />
          {erro && <p className="text-xs text-late-text mt-1">{erro}</p>}
        </div>
        <button
          onClick={solicitar}
          disabled={requesting || !phone.trim()}
          className="w-full flex items-center justify-center gap-2 bg-ink text-white text-sm font-medium py-2.5 rounded-md hover:bg-ink/90 transition-colors disabled:opacity-50"
        >
          {requesting ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
          Solicitar conexão
        </button>
        <p className="text-xs text-text-3 text-center">Nossa equipe ativará em até 24 horas.</p>
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════
   SECTION: Google Agenda
══════════════════════════════════════════════════════════ */
function GoogleAgendaSection() {
  return (
    <SectionShell title="Google Agenda" description="Sincronize agendamentos com o Google Agenda do seu celular.">
      <div className="bg-surface border border-border rounded-xl p-8 text-center">
        <div className="h-14 w-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#EEF2FF' }}>
          <Calendar size={26} className="text-ink" />
        </div>
        <p className="text-sm font-medium text-text mb-1">Google Agenda não conectado</p>
        <p className="text-xs text-text-3 mb-5 max-w-xs mx-auto">
          Seus agendamentos da SATTA CRM aparecem automaticamente no Google Agenda.
        </p>
        <button
          disabled
          className="flex items-center gap-2 mx-auto bg-bg border border-border text-text-3 text-sm font-medium px-5 py-2.5 rounded-md cursor-not-allowed"
        >
          <Calendar size={14} />
          Conectar com Google
        </button>
        <p className="text-xs text-text-3 mt-3">Disponível em breve</p>
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════
   LINK DE AGENDAMENTO ONLINE
══════════════════════════════════════════════════════════ */
function LinkAgendamentoSection() {
  const { empresa, refreshEmpresa } = useAuth()
  const { can } = usePlanFeatures()

  const [settings, setSettings]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [copied, setCopied]       = useState(false)
  const [regenerating, setRegen]  = useState(false)
  const [stats, setStats]         = useState({ mes: 0, ultimo: null })
  const [editSettings, setEdit]   = useState({})
  const [expandida, setExpandida] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/account/booking-settings', { headers: await apiHeaders() })
      const data = await res.json()
      setSettings(data)
      setEdit(data.bookingSettings || {})
    } catch {} finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    if (!empresa?.id && !empresa?.uid) return
    const accountId = empresa.id || empresa.uid
    try {
      const agSnap = await getDocs(query(
        collection(db, 'empresas', accountId, 'agendamentos'),
        where('source', '==', 'booking_link'),
      ))
      const docs = agSnap.docs.map(d => d.data())
      const mesAtual = new Date().toISOString().slice(0, 7)
      const mes = docs.filter(d => (d.data || '').startsWith(mesAtual)).length
      const datas = docs.map(d => d.data || '').filter(Boolean).sort().reverse()
      setStats({ mes, ultimo: datas[0] || null })
    } catch {}
  }

  useEffect(() => { if (can('booking_link')) { load(); loadStats() } }, [can])

  async function salvar() {
    setSaving(true)
    try {
      const res = await fetch('/api/account/booking-settings', {
        method: 'PATCH',
        headers: await apiHeaders(),
        body: JSON.stringify({ bookingEnabled: settings.bookingEnabled, bookingSettings: editSettings }),
      })
      const data = await res.json()
      if (data.ok) {
        await load()
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        refreshEmpresa?.()
      }
    } catch {} finally { setSaving(false) }
  }

  async function toggleEnabled(v) {
    setSaving(true)
    try {
      const res = await fetch('/api/account/booking-settings', {
        method: 'PATCH',
        headers: await apiHeaders(),
        body: JSON.stringify({ bookingEnabled: v, bookingSettings: editSettings }),
      })
      const data = await res.json()
      if (data.ok) { await load(); refreshEmpresa?.() }
    } catch {} finally { setSaving(false) }
  }

  async function regenerarSlug() {
    if (!confirm('Gerar nova URL? O link antigo vai parar de funcionar.')) return
    setRegen(true)
    try {
      const res = await fetch('/api/account/booking-settings/regenerate-slug', {
        method: 'POST', headers: await apiHeaders(),
      })
      const data = await res.json()
      if (data.ok) { await load() }
    } catch {} finally { setRegen(false) }
  }

  function handleCopy() {
    if (!settings?.publicUrl) return
    navigator.clipboard.writeText(settings.publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShare() {
    if (navigator.share && settings?.publicUrl) {
      navigator.share({ title: 'Agende aqui!', url: settings.publicUrl }).catch(() => {})
    } else handleCopy()
  }

  if (!can('booking_link')) {
    return (
      <SectionShell title="Link de agendamento online" description="Gere um link único para seus clientes agendarem online, 24h por dia.">
        <PlanGate feature="booking_link" />
      </SectionShell>
    )
  }

  if (loading) {
    return (
      <SectionShell title="Link de agendamento online">
        <div className="flex items-center gap-2 text-text-3 py-8">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      </SectionShell>
    )
  }

  const ativo = settings?.bookingEnabled
  const url = settings?.publicUrl

  return (
    <SectionShell
      title="Link de agendamento online"
      description="Gere um link único para seus clientes agendarem online, 24h por dia, sem precisar te chamar no WhatsApp."
    >
      {/* Toggle principal */}
      <div className="flex items-center justify-between gap-4 p-4 bg-bg border border-border rounded-xl mb-6">
        <div>
          <p className="text-sm font-medium text-text">
            {ativo ? 'Agendamentos online ativados' : 'Agendamentos online desativados'}
          </p>
          <p className="text-xs text-text-3 mt-0.5">
            {ativo
              ? 'Seu link está ativo e aceitando agendamentos.'
              : 'Ative para gerar seu link e começar a receber agendamentos.'}
          </p>
        </div>
        <Toggle checked={!!ativo} onChange={toggleEnabled} disabled={saving} />
      </div>

      {ativo && url && (
        <>
          {/* URL + ações */}
          <div className="space-y-3 mb-6">
            <Label>Seu link de agendamento</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 border border-border rounded-md px-3 py-2.5 bg-bg min-w-0">
                <Link2 size={13} className="text-text-3 shrink-0" />
                <span className="text-sm text-text-2 truncate font-mono text-xs">{url}</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm text-text-2 hover:bg-bg transition-colors shrink-0"
              >
                {copied ? <Check size={13} className="text-ok-text" /> : <Copy size={13} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(url, '_blank', 'noopener')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md border border-border text-sm text-text-2 hover:bg-bg transition-colors"
              >
                <ExternalLink size={13} />
                Abrir link
              </button>
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md border border-border text-sm text-text-2 hover:bg-bg transition-colors"
              >
                <Share2 size={13} />
                Compartilhar
              </button>
              <button
                onClick={regenerarSlug}
                disabled={regenerating}
                title="Gerar nova URL"
                className="p-2 rounded-md border border-border text-text-3 hover:bg-bg transition-colors disabled:opacity-50"
              >
                {regenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              </button>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3 p-5 bg-bg border border-dashed border-border rounded-xl mb-6">
            <QRCodeSVG value={url} size={140} bgColor="transparent" fgColor="#1E3A5F" />
            <div className="text-center">
              <p className="text-xs font-medium text-text">Imprima e coloque no balcão</p>
              <p className="text-[11px] text-text-3 mt-0.5">O cliente aponta a câmera e já abre o link</p>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-surface border border-border rounded-xl p-3.5">
              <p className="text-[11px] text-text-3 mb-0.5">Este mês</p>
              <p className="text-lg font-bold text-text tabular-nums">{stats.mes}</p>
              <p className="text-[11px] text-text-3">agendamento{stats.mes !== 1 ? 's' : ''} pelo link</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3.5">
              <p className="text-[11px] text-text-3 mb-0.5">Último agendamento</p>
              <p className="text-sm font-semibold text-text">
                {stats.ultimo
                  ? stats.ultimo.split('-').reverse().join('/')
                  : 'Nenhum ainda'}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Configurações avançadas */}
      {ativo && (
        <div className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandida(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-bg hover:bg-surface transition-colors text-left"
          >
            <span className="text-sm font-medium text-text">Configurações da página</span>
            <ChevronDown size={15} className={`text-text-3 transition-transform ${expandida ? 'rotate-180' : ''}`} />
          </button>

          {expandida && (
            <div className="px-4 py-4 space-y-4 border-t border-border">

              <div>
                <Label>Título da página</Label>
                <Input
                  value={editSettings.title ?? empresa?.nome ?? ''}
                  onChange={e => setEdit(p => ({ ...p, title: e.target.value }))}
                  placeholder={empresa?.nome || 'Nome do negócio'}
                  maxLength={200}
                />
              </div>

              <div>
                <Label>Descrição <span className="text-text-3 font-normal normal-case">(opcional)</span></Label>
                <textarea
                  value={editSettings.description ?? ''}
                  onChange={e => setEdit(p => ({ ...p, description: e.target.value }))}
                  placeholder="Ex: Agende seu horário online, rápido e fácil!"
                  rows={2}
                  maxLength={500}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm text-text bg-surface placeholder:text-text-3 focus:outline-none focus:border-ink resize-none"
                />
              </div>

              <ToggleRow
                label="Mostrar preços"
                description="Exibe o valor de cada serviço na página pública"
                checked={editSettings.showPrices !== false}
                onChange={v => setEdit(p => ({ ...p, showPrices: v }))}
              />

              <ToggleRow
                label="Exigir WhatsApp"
                description="Cliente precisa informar o número de WhatsApp para agendar"
                checked={editSettings.requirePhone !== false}
                onChange={v => setEdit(p => ({ ...p, requirePhone: v }))}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Antecedência mínima</Label>
                  <select
                    value={editSettings.minAdvanceHours ?? 1}
                    onChange={e => setEdit(p => ({ ...p, minAdvanceHours: Number(e.target.value) }))}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:border-ink"
                  >
                    <option value={1}>1 hora</option>
                    <option value={2}>2 horas</option>
                    <option value={4}>4 horas</option>
                    <option value={24}>24 horas</option>
                    <option value={48}>48 horas</option>
                  </select>
                </div>
                <div>
                  <Label>Dias disponíveis</Label>
                  <select
                    value={editSettings.advanceBookingDays ?? 30}
                    onChange={e => setEdit(p => ({ ...p, advanceBookingDays: Number(e.target.value) }))}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:border-ink"
                  >
                    <option value={7}>7 dias</option>
                    <option value={15}>15 dias</option>
                    <option value={30}>30 dias</option>
                    <option value={60}>60 dias</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>Intervalo entre horários</Label>
                <select
                  value={editSettings.slotDurationMinutes ?? 30}
                  onChange={e => setEdit(p => ({ ...p, slotDurationMinutes: Number(e.target.value) }))}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:border-ink"
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos</option>
                </select>
              </div>

              <SaveRow loading={saving} saved={saved} onSave={salvar} />
            </div>
          )}
        </div>
      )}
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════
   NAV config
══════════════════════════════════════════════════════════ */
const NAV_GROUPS = [
  {
    label: 'MINHA CONTA',
    items: [
      { id: 'perfil',         icon: User,          label: 'Perfil pessoal' },
      { id: 'seguranca',      icon: Shield,        label: 'Segurança' },
      { id: 'notificacoes',   icon: Bell,          label: 'Notificações' },
      { id: 'sessoes',        icon: Monitor,       label: 'Sessões ativas' },
    ],
  },
  {
    label: 'MEU NEGÓCIO',
    ownerAdmin: true,
    items: [
      { id: 'dados-negocio',      icon: Building2, label: 'Dados do negócio' },
      { id: 'equipe',             icon: Users,     label: 'Minha equipe' },
      { id: 'link-agendamento',   icon: Link2,     label: 'Link de agendamento' },
      { id: 'plano',              icon: CreditCard,label: 'Plano e cobrança' },
    ],
  },
  {
    label: 'AUTOMAÇÕES DA KANGO',
    items: [
      { id: 'whatsapp',       icon: MessageCircle, label: 'WhatsApp' },
      { id: 'google-agenda',  icon: Calendar,      label: 'Google Agenda' },
      { id: 'lembretes',      icon: Clock,         label: 'Lembretes automáticos' },
      { id: 'recuperacao',    icon: RefreshCw,     label: 'Recuperação de clientes' },
      { id: 'open-finance',   icon: Zap,           label: 'Open Finance', soon: true },
    ],
  },
  {
    label: 'PERSONALIZAÇÃO',
    items: [
      { id: 'campos-clientes',icon: FormInput,     label: 'Campos dos clientes' },
      { id: 'servicos-padrao',icon: Tag,           label: 'Serviços padrão' },
      { id: 'preferencias',   icon: Settings2,     label: 'Preferências' },
    ],
  },
]

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function Configuracoes() {
  const { role } = useAuth()
  const isOwnerAdmin = role === 'owner' || role === 'admin'

  const [section, setSection] = useState(() => {
    const h = window.location.hash.slice(1)
    return h || 'perfil'
  })

  function navigate(id) {
    setSection(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  // All items flat, respecting ownerAdmin filter
  const allItems = NAV_GROUPS.flatMap(g => {
    if (g.ownerAdmin && !isOwnerAdmin) return []
    return g.items
  })

  function renderSection() {
    switch (section) {
      case 'perfil':          return <PerfilSection />
      case 'seguranca':       return <SegurancaSection />
      case 'notificacoes':    return <NotificacoesSection />
      case 'sessoes':         return <SessoesSection />
      case 'dados-negocio':   return <DadosNegocioSection />
      case 'equipe':              return <EquipeSection />
      case 'link-agendamento':    return <LinkAgendamentoSection />
      case 'plano':               return <PlanoSection />
      case 'whatsapp':        return <WhatsAppSection />
      case 'google-agenda':   return <GoogleAgendaSection />
      case 'lembretes':       return <ComingSoon label="Lembretes automáticos" description="Configure lembretes automáticos enviados pela Kango." />
      case 'recuperacao':     return <ComingSoon label="Recuperação de clientes" description="A Kango identifica e contata clientes inativos." />
      case 'open-finance':    return <ComingSoon label="Open Finance" description="Conecte sua conta bancária para controle financeiro integrado." />
      case 'campos-clientes': return <ComingSoon label="Campos dos clientes" description="Adicione campos personalizados ao cadastro de clientes." />
      case 'servicos-padrao': return <ComingSoon label="Serviços padrão" description="Gerencie o catálogo de serviços e preços do negócio." />
      case 'preferencias':    return <ComingSoon label="Preferências" description="Ajuste o idioma, fuso horário e preferências do sistema." />
      default:                return <PerfilSection />
    }
  }

  const currentLabel = allItems.find(i => i.id === section)?.label || 'Configurações'

  return (
    <div className="flex min-h-full -m-4 md:-m-8">

      {/* Mobile: top select */}
      <div className="md:hidden w-full px-4 pt-4 pb-0 bg-surface border-b border-border fixed top-[57px] z-10">
        <div className="relative">
          <select
            value={section}
            onChange={e => navigate(e.target.value)}
            className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface appearance-none focus:outline-none focus:border-ink pr-8"
          >
            {NAV_GROUPS.map(g => {
              if (g.ownerAdmin && !isOwnerAdmin) return null
              return (
                <optgroup key={g.label} label={g.label}>
                  {g.items.map(item => (
                    <option key={item.id} value={item.id}>{item.label}{item.soon ? ' (Em breve)' : ''}</option>
                  ))}
                </optgroup>
              )
            })}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none" />
        </div>
      </div>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-border bg-surface overflow-y-auto py-6 px-3">
        <p className="text-xs font-semibold text-text-2 px-3 mb-4">Configurações</p>
        {NAV_GROUPS.map(g => {
          if (g.ownerAdmin && !isOwnerAdmin) return null
          return (
            <div key={g.label} className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-3 px-3 mb-1">{g.label}</p>
              <div className="space-y-0.5">
                {g.items.map(item => {
                  const Icon = item.icon
                  const active = section === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                        active
                          ? 'bg-ink-light text-ink font-medium border-l-2 border-ink pl-[10px]'
                          : 'text-text-2 hover:text-text hover:bg-bg'
                      }`}
                    >
                      <Icon size={14} strokeWidth={active ? 2 : 1.75} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.soon && (
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-text-3 bg-bg px-1 py-0.5 rounded">
                          Em breve
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto mt-[57px] md:mt-0">
        {renderSection()}
      </div>
    </div>
  )
}
