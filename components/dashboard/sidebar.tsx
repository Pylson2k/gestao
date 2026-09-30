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
  Building2,
} from 'lucide-react'
import { useMemo, useState, type ComponentType } from 'react'
import { APP_DISPLAY_NAME } from '@/lib/app-constants'
import { useCompany } from '@/contexts/company-context'
import { useQuotes } from '@/contexts/quotes-context'
import { usePayments } from '@/contexts/payments-context'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

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
    <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-amber-500/15 px-1.5 text-[10px] font-semibold tabular-nums text-amber-800">
      {count > 99 ? '99+' : count}
    </span>
  )
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Visão geral',
    items: [
      { name: 'Painel', href: '/dashboard', icon: LayoutDashboard, showBadge: true },
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
      { name: 'Relatórios', href: '/financeiro/relatorios', icon: BarChart3 },
    ],
  },
  {
    label: 'Operação',
    items: [
      { name: 'Listas de materiais', href: '/operacao/listas-materiais', icon: Package },
      { name: 'Clientes', href: '/operacao/clientes', icon: UserCircle },
      { name: 'Serviços', href: '/operacao/servicos', icon: Wrench },
      { name: 'Gestão de equipe', href: '/getao/cadastro', icon: Users },
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

function SidebarContents({ onNavigate, mobile = false }: { onNavigate?: () => void; mobile?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { settings: companySettings } = useCompany()

  const handleLogout = async () => {
    await logout()
    onNavigate?.()
    router.push('/login')
  }

  return (
    <>
      <div className="flex min-h-[4.5rem] items-center gap-3 border-b border-sidebar-border px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] pr-14">
        {companySettings.logo ? (
          <img
            src={companySettings.logo}
            alt=""
            className="h-9 w-9 shrink-0 rounded-lg border border-border bg-white object-contain p-1"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {mobile ? (
            <SheetTitle className="truncate text-sm font-semibold tracking-tight">
              {companySettings.name || APP_DISPLAY_NAME}
            </SheetTitle>
          ) : (
            <p className="font-display truncate text-sm font-semibold tracking-tight">
              {companySettings.name || APP_DISPLAY_NAME}
            </p>
          )}
          {mobile ? (
            <SheetDescription className="truncate text-[11px] text-muted-foreground">
              Gestão operacional
            </SheetDescription>
          ) : (
            <p className="truncate text-[11px] text-muted-foreground">Gestão operacional</p>
          )}
        </div>
      </div>

      <nav
        className="compact-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4"
        aria-label="Principal"
      >
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6 last:mb-0">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = navActive(pathname, item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group flex min-h-11 items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-200',
                        active
                          ? 'nav-item-active bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-opacity duration-200',
                          active ? 'opacity-100 text-primary' : 'opacity-60 group-hover:opacity-90'
                        )}
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

      <div className="border-t border-sidebar-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{user?.name || 'Usuário'}</p>
            <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-11 w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex"
        aria-label="Navegação principal"
      >
        <SidebarContents />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="fixed left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex h-11 w-11 items-center justify-center rounded-lg border border-border/80 bg-card text-foreground shadow-[var(--shadow-soft)] transition-colors hover:bg-accent lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[min(86vw,var(--sidebar-width))] max-w-none gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SidebarContents mobile onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
