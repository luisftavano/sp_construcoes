import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { Home, CalendarDays, Users, Tag, BarChart2, Wallet, Package, LifeBuoy, Settings, LogOut } from 'lucide-react'
import KangoFloat from './KangoFloat'

export default function Layout() {
  const { empresa } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut(auth)
    navigate('/login')
  }

  const nav = [
    { to: '/',          icon: Home,         label: 'Início',    end: true },
    { to: '/agenda',    icon: CalendarDays, label: 'Agenda',    end: false },
    { to: '/clientes',   icon: Users,     label: 'Clientes',   end: false },
    { to: '/servicos',   icon: Tag,       label: 'Serviços',   end: false },
    { to: '/estoque',    icon: Package,   label: 'Estoque',    end: false },
    { to: '/metricas',   icon: BarChart2, label: 'Métricas',   end: false },
    { to: '/financeiro',  icon: Wallet,    label: 'Financeiro', end: false },
    { to: '/suporte',     icon: LifeBuoy,  label: 'Suporte',    end: false },
    { to: '/configuracoes',  icon: Settings,  label: 'Configurações', end: false },
  ]

  return (
    <div className="flex min-h-screen bg-bg">

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-surface border-r border-border px-4 py-6 shrink-0">

        <div className="mb-7 px-1">
          <img src="/logo-satta-branco.png" alt="Satta CRM" className="h-7 object-contain object-left" />
          {empresa?.nome && (
            <p className="text-text-3 text-xs truncate mt-2 font-medium">{empresa.nome}</p>
          )}
        </div>

        <div className="border-t border-border mb-4" />

        <nav className="flex-1 space-y-0.5">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-ink-light text-ink'
                    : 'text-text-2 hover:text-text hover:bg-bg'
                }`
              }
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border pt-4 mt-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-text-2 hover:text-text hover:bg-bg transition-colors w-full"
          >
            <LogOut size={16} strokeWidth={1.75} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
          <div>
            <img src="/logo-satta-branco.png" alt="Satta CRM" className="h-6 object-contain object-left" />
            {empresa?.nome && (
              <p className="text-text-3 text-xs truncate mt-0.5">{empresa.nome}</p>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </main>

        {/* Bottom nav mobile */}
        <nav className="md:hidden flex border-t border-border bg-surface">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-ink' : 'text-text-3'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <KangoFloat />
    </div>
  )
}
