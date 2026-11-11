
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import {
  ChartNoAxesCombined,
  CreditCard,
  LayoutGrid,
  Package,
  ShoppingCart,
  Store,
  Moon,
  Sun,
} from 'lucide-react'

const navigation = [
  { label: 'Dashboard', path: '/', icon: ChartNoAxesCombined },
  { label: 'PDV', path: '/pdv', icon: ShoppingCart },
  { label: 'Pedidos', path: '/pedidos', icon: LayoutGrid },
  { label: 'Caixa', path: '/caixa', icon: CreditCard },
  { label: 'Produtos', path: '/produtos', icon: Package },
]

export function AppLayout() {
  const [dark, setDark] = useState(false)

  function toggleTheme() {
    const next = !dark
    setDark(next)

    document.documentElement.dataset.theme =
      next ? 'dark' : 'light'
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col bg-brand p-5 text-white md:flex">
        <div className="mb-10 flex items-center gap-3">
          <Store className="text-accent" />
          <span className="text-2xl font-bold">
            Pontoa<span className="text-accent">.</span>
          </span>
        </div>

        <nav aria-label="Navegação principal" className="flex flex-col gap-2">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-xl px-4 py-3',
                  'transition',
                  isActive
                    ? 'bg-accent font-semibold text-brand'
                    : 'text-slate-200 hover:bg-white/10',
                ].join(' ')
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-8 text-xs text-slate-400">
          Pontoa · MVP 0.1
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-17 items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 md:px-8">
          <div className="flex items-center gap-2">
            <Store className="text-accent md:hidden" size={24} />
            <span className="font-bold md:hidden">Pontoa.</span>
            <span className="hidden font-semibold md:inline">
              Painel do estabelecimento
            </span>
          </div>

          <button
            type="button"
            aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}
            onClick={toggleTheme}
            className="rounded-xl border border-[var(--app-border)] p-2"
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        <main className="mx-auto max-w-7xl p-4 pb-24 md:p-8">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Navegação móvel"
        className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-[var(--app-border)] bg-[var(--app-surface)] px-1 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
      >
        {navigation.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              [
                'flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[10px]',
                isActive
                  ? 'bg-accent/15 font-semibold text-[var(--app-text)]'
                  : 'text-[var(--app-muted)]',
              ].join(' ')
            }
          >
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
