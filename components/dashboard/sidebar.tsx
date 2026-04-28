'use client'

import { Link } from '@/components/app-link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import {
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
  AlertTriangle,
  Package,
  HardHat,
  Building2,
  Calculator,
} from 'lucide-react'
import { useState, useMemo, type ComponentType } from 'react'
import { APP_DISPLAY_NAME } from '@/lib/app-constants'
import { useCompany } from '@/contexts/company-context'
import { useQuotes } from '@/contexts/quotes-context'
import { usePayments } from '@/contexts/payments-context'

type NavItem = {
  name: string
  href: string
  icon: ComponentType<{ className?: string }>
  showBadge?: boolean
}

function navActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function PendingCountBadge() {
  const { quotes } = useQuotes()
  const { payments } = usePayments()
  const count = useMemo(() => {
    const totalByQuote = new Map<string, number>()
    for (const payment of payments) {
      totalByQuote.set(payment.quoteId, (totalByQuote.get(payment.quoteId) ?? 0) + payment.amount)
    }

    let n = 0
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    quotes.forEach((q) => {
      if (q.status === 'sent' && new Date(q.createdAt) < threeDaysAgo) n++
      if (q.status === 'approved') n++
      if (q.status === 'approved' || q.status === 'in_progress' || q.status === 'completed') {
        const paid = totalByQuote.get(q.id) ?? 0
        if (q.inDelinquencyList && q.total - paid > 0) n++
      }
    })
    return n
  }, [quotes, payments])
  if (count === 0) return null
  return (
    <span className="flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white tabular-nums">
      {count > 99 ? '99+' : count}
    </span>
  )
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Visão geral',
    items: [
      { name: 'Painel', href: '/dashboard', icon: LayoutDashboard, showBadge: true },
      { name: 'Calculadora', href: '/calculadora', icon: Calculator },
      { name: 'Novo orçamento', href: '/orcamentos/novo', icon: FileText },
      { name: 'Histórico', href: '/orcamentos/historico', icon: History },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { name: 'Faturamento', href: '/financeiro/faturamento', icon: DollarSign },
      { name: 'Pagamentos', href: '/financeiro/pagamentos', icon: CreditCard },
      { name: 'Inadimplentes', href: '/financeiro/inadimplentes', icon: AlertTriangle },
      { name: 'Despesas', href: '/financeiro/despesas', icon: Receipt },
      { name: 'Relatórios financeiros', href: '/financeiro/relatorios', icon: BarChart3 },
    ],
  },
  {
    label: 'Operação',
    items: [
      { name: 'Listas de materiais', href: '/operacao/listas-materiais', icon: Package },
      { name: 'Clientes', href: '/operacao/clientes', icon: UserCircle },
      { name: 'Serviços', href: '/operacao/servicos', icon: Wrench },
      { name: 'GETAO', href: '/getao/cadastro', icon: Users },
      { name: 'Fechamento de caixa', href: '/operacao/fechamento-caixa', icon: Wallet },
      { name: 'Relatórios de fechamentos', href: '/operacao/relatorios-fechamentos', icon: Calendar },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { name: 'Auditoria', href: '/dashboard/auditoria', icon: Shield },
      { name: 'Configurações', href: '/dashboard/configuracoes', icon: Settings },
      { name: 'Perfil', href: '/dashboard/perfil', icon: User },
    ],
  },
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
      <button
        type="button"
        className={cn(
          'fixed z-50 flex touch-target items-center justify-center rounded-xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm transition-colors',
          'left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.75rem,env(safe-area-inset-top))]',
          'lg:hidden',
          'hover:bg-sidebar-accent'
        )}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside
        role="navigation"
        aria-label="Navegação principal"
        className={cn(
          'fixed left-0 top-0 z-40 flex h-full w-[min(86vw,var(--sidebar-width))] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out lg:w-[var(--sidebar-width)]',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-4 lg:py-5">
          {companySettings.logo ? (
            <img
              src={companySettings.logo}
              alt=""
              className="h-10 w-10 shrink-0 rounded-md border border-sidebar-border bg-card object-contain p-1"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight tracking-tight">
              {companySettings.name || APP_DISPLAY_NAME}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/50">Gestão</p>
          </div>
        </div>

        <nav className="compact-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-2 py-3" aria-label="Principal">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4 last:mb-0">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = navActive(pathname, item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex touch-target items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                          active
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                            : 'text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <item.icon
                          className={cn('h-4 w-4 shrink-0 opacity-90', active && 'opacity-100')}
                        />
                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                        {item.showBadge ? <PendingCountBadge /> : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border bg-sidebar/95 p-3">
          <div className="mb-3 flex items-center gap-3 rounded-md border border-sidebar-border/80 bg-card/50 px-2.5 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{user?.name || 'Usuário'}</p>
              <p className="truncate text-xs text-sidebar-foreground/55">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>
    </>
  )
}
