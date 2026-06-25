import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import EscolherPlano from './pages/EscolherPlano'
import PagamentoSucesso from './pages/PagamentoSucesso'
import Onboarding from './pages/Onboarding'
import VerificacaoEmail from './pages/VerificacaoEmail'
import AceitarConvite from './pages/AceitarConvite'
import RecuperarSenha from './pages/RecuperarSenha'
import AgendarPublico from './pages/AgendarPublico'
import Notificacoes from './pages/Notificacoes'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Agenda from './pages/Agenda'
import NovoCliente from './pages/NovoCliente'
import DetalheCliente from './pages/DetalheCliente'
import Metricas from './pages/Metricas'
import Suporte from './pages/Suporte'
import Chat from './pages/Chat'
import Configuracoes from './pages/Configuracoes'
import Financeiro from './pages/Financeiro'
import Servicos from './pages/Servicos'
import Estoque from './pages/Estoque'
import Admin from './pages/Admin'
import Auditoria from './pages/Auditoria'
import WhatsappInbox from './pages/WhatsappInbox'
import Layout from './components/Layout'
import AcessoRestrito from './components/AcessoRestrito'

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-offwhite">
      <div className="w-8 h-8 border-2 border-blue rounded-full border-t-transparent animate-spin" />
    </div>
  )
}

function isTrialExpired(empresa) {
  if (!empresa || empresa.plano !== 'trial') return false
  const started = empresa.trialStartedAt?.toDate?.() ?? empresa.trialStartedAt
  if (!started) return false
  const days = (Date.now() - new Date(started).getTime()) / (1000 * 60 * 60 * 24)
  return days > 14
}

function PrivateRoute({ children }) {
  const { user, empresa, role, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (!empresa && !role) return <Navigate to="/onboarding" replace />
  if (isTrialExpired(empresa)) return <Navigate to="/escolher-plano" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, empresa, role, loading } = useAuth()
  if (loading) return <Spinner />
  if (user && (empresa || role)) return <Navigate to="/" replace />
  if (user && !empresa && !role) return <Navigate to="/onboarding" replace />
  return children
}

// Só verifica login — sem checar trial. Usado para páginas de billing.
function AuthOnlyRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireRole({ allowedRoles, children }) {
  const { role } = useAuth()
  if (!allowedRoles.includes(role)) return <AcessoRestrito />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"            element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/criar-conta"    element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/recuperar-senha" element={<PublicRoute><RecuperarSenha /></PublicRoute>} />
          <Route path="/agendar/:slug"  element={<AgendarPublico />} />
          <Route path="/verificar-email" element={<VerificacaoEmail />} />
          <Route path="/onboarding"     element={<Onboarding />} />
          <Route path="/aceitar-convite"   element={<AceitarConvite />} />
          <Route element={<AuthOnlyRoute><Layout /></AuthOnlyRoute>}>
            <Route path="/escolher-plano"    element={<EscolherPlano />} />
            <Route path="/pagamento-sucesso" element={<PagamentoSucesso />} />
          </Route>
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/"                element={<Dashboard />} />
            <Route path="/agenda"          element={<Agenda />} />
            <Route path="/clientes"        element={<Clientes />} />
            <Route path="/clientes/novo"   element={<NovoCliente />} />
            <Route path="/clientes/:id"    element={<DetalheCliente />} />
            <Route path="/metricas"        element={
              <RequireRole allowedRoles={['owner', 'admin']}><Metricas /></RequireRole>
            } />
            <Route path="/financeiro"      element={
              <RequireRole allowedRoles={['owner', 'admin']}><Financeiro /></RequireRole>
            } />
            <Route path="/servicos"        element={<Servicos />} />
            <Route path="/estoque"         element={<Estoque />} />
            <Route path="/notificacoes"    element={<Notificacoes />} />
            <Route path="/suporte"         element={<Suporte />} />
            <Route path="/admin"           element={<Admin />} />
            <Route path="/chat"            element={<Chat />} />
            <Route path="/whatsapp"        element={<WhatsappInbox />} />
            <Route path="/configuracoes"   element={
              <RequireRole allowedRoles={['owner', 'admin']}><Configuracoes /></RequireRole>
            } />
            <Route path="/auditoria"       element={
              <RequireRole allowedRoles={['owner', 'admin']}><Auditoria /></RequireRole>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
