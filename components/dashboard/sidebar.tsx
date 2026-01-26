'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import {
  Zap,
  LayoutDashboard,
  FileText,
  History,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  DollarSign,
  Receipt,
  BarChart3,
  Shield,
  Users,
  UserCircle,
  Wrench,
  Wallet,
  Calendar,
  CreditCard,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useCompany } from '@/contexts/company-context'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Novo Orcamento', href: '/dashboard/novo-orcamento', icon: FileText },
  { name: 'Historico', href: '/dashboard/historico', icon: History },
  { name: 'Faturamento', href: '/dashboard/faturamento', icon: DollarSign },
  { name: 'Pagamentos', href: '/dashboard/pagamentos', icon: CreditCard },
  { name: 'Clientes', href: '/dashboard/clientes', icon: UserCircle },
  { name: 'Servicos', href: '/dashboard/servicos', icon: Wrench },
  { name: 'Funcionarios', href: '/dashboard/funcionarios', icon: Users },
  { name: 'Fechamento de Caixa', href: '/dashboard/fechamento-caixa', icon: Wallet },
  { name: 'Relatorios de Fechamentos', href: '/dashboard/relatorios-fechamentos', icon: Calendar },
  { name: 'Despesas', href: '/dashboard/despesas', icon: Receipt },
  { name: 'Relatorios Financeiros', href: '/dashboard/relatorios-financeiros', icon: BarChart3 },
  { name: 'Auditoria', href: '/dashboard/auditoria', icon: Shield },
  { name: 'Configuracoes', href: '/dashboard/configuracoes', icon: Settings },
  { name: 'Perfil', href: '/dashboard/perfil', icon: User },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { settings: companySettings } = useCompany()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        className="fixed top-4 left-4 z-50 lg:hidden p-3 rounded-lg bg-sidebar text-sidebar-foreground min-w-[48px] min-h-[48px] touch-manipulation shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-sidebar text-sidebar-foreground flex flex-col z-40 transition-transform duration-300',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-6 border-b border-sidebar-border">
          {companySettings.logo ? (
            <img 
              src={companySettings.logo} 
              alt={companySettings.name || 'Logo'}
              className="w-10 h-10 object-contain rounded-lg bg-white/10 p-1.5"
            />
          ) : (
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
          )}
          <span className="text-xl font-bold text-white tracking-tight">
            {companySettings.name || 'ServiPro'}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 sm:p-4 space-y-1 sm:space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 sm:py-2.5 rounded-xl text-base sm:text-sm font-medium transition-all duration-200 group min-h-[48px] touch-manipulation',
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white hover:translate-x-1 active:scale-[0.98]'
                )}
              >
                <item.icon className={cn(
                  'w-6 h-6 sm:w-5 sm:h-5 transition-transform shrink-0',
                  isActive ? 'scale-110' : 'group-hover:scale-110'
                )} />
                <span className={cn(
                  'transition-all',
                  isActive ? 'font-semibold' : ''
                )}>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-800/50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <span className="text-sm font-bold text-white">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'Usuário'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all min-h-[48px] text-base sm:text-sm touch-manipulation"
            onClick={handleLogout}
          >
            <LogOut className="w-6 h-6 sm:w-5 sm:h-5 mr-3" />
            Sair
          </Button>
        </div>
      </aside>
    </>
  )
}
