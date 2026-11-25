import { useEffect, useId, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import { useAuth, useSession } from '../auth/useAuth'
import { Logo } from '../components/ui/Logo'
import { ThemeToggle } from '../theme/ThemeToggle'
import { useTheme } from '../theme/useTheme'
import { MOBILE_BAR_SIZE, ROLE_LABELS, navigationFor } from './navigation'
import type { NavItem } from './navigation'

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

/**
 * Estrutura das telas logadas (DESIGN.md, "Layout"):
 * - celular: barra superior + barra inferior com os quatro destinos principais e "Mais";
 * - tablet: barra lateral recolhida, só ícones;
 * - desktop: barra lateral completa.
 */
export function AppLayout() {
  const { user, business } = useSession()
  const items = navigationFor(user.role)

  return (
    <div className="min-h-dvh bg-bg md:flex">
      <aside className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col bg-brand px-3 py-5 text-white md:flex lg:w-60 lg:px-4">
        <div className="mb-8 flex justify-center lg:justify-start lg:px-2">
          <Logo className="[&>span:last-child]:hidden lg:[&>span:last-child]:inline" />
        </div>

        <nav aria-label="Navegação principal" className="flex flex-col gap-2">
          {items.map((item) => (
            <SidebarLink key={item.path} item={item} />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3 border-t border-white/15 pt-4">
          <div className="hidden min-w-0 lg:block lg:px-2">
            <p className="truncate font-medium">{business.name}</p>
            <p className="truncate text-sm text-white/80">
              {user.name} · {ROLE_LABELS[user.role]}
            </p>
          </div>
          <SidebarActions />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-hairline bg-surface px-4 md:hidden">
          <Logo className="text-xl" />
          <span className="truncate text-sm font-medium text-muted">{business.name}</span>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 pb-28 md:px-6 md:py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <MobileNav items={items} />
    </div>
  )
}

function SidebarLink({ item: { label, path, icon: Icon } }: { item: NavItem }) {
  return (
    <NavLink
      to={path}
      aria-label={label}
      className={({ isActive }) =>
        [
          'flex min-h-12 items-center justify-center gap-3 rounded-md px-3 lg:justify-start',
          focusRing,
          'focus-visible:outline-accent',
          isActive ? 'bg-accent font-semibold text-brand' : 'text-white hover:bg-white/10',
        ].join(' ')
      }
    >
      <Icon size={20} aria-hidden />
      <span className="hidden lg:inline">{label}</span>
    </NavLink>
  )
}

function SidebarActions() {
  const { logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  const buttonClass = [
    'flex min-h-12 items-center justify-center gap-3 rounded-md px-3 text-white hover:bg-white/10 lg:justify-start',
    focusRing,
    'focus-visible:outline-accent',
  ].join(' ')
  return (
    <>
      <button type="button" onClick={toggleTheme} className={buttonClass} aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}>
        {dark ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
        <span className="hidden lg:inline">{dark ? 'Tema claro' : 'Tema escuro'}</span>
      </button>
      <button type="button" onClick={() => void logout()} className={buttonClass} aria-label="Sair">
        <LogOut size={20} aria-hidden />
        <span className="hidden lg:inline">Sair</span>
      </button>
    </>
  )
}

function MobileNav({ items }: { items: NavItem[] }) {
  const location = useLocation()
  // O menu guarda em que página foi aberto: trocar de página o fecha, sem efeito extra.
  const [openAt, setOpenAt] = useState<string | null>(null)
  const open = openAt === location.pathname
  const setOpen = (value: boolean) => setOpenAt(value ? location.pathname : null)
  const sheetId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const primary = items.slice(0, MOBILE_BAR_SIZE)
  const more = items.slice(MOBILE_BAR_SIZE)
  const moreActive = more.some((item) => location.pathname.startsWith(item.path))

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenAt(null)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const tabClass = (active: boolean) =>
    [
      'flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md text-sm',
      focusRing,
      active ? 'bg-accent-bg font-semibold text-text' : 'text-muted',
    ].join(' ')

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-20 bg-brand/40 md:hidden" aria-hidden onClick={() => setOpen(false)} />
      ) : null}
      {open ? <MoreSheet id={sheetId} items={more} /> : null}

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 flex gap-1 border-t border-hairline bg-surface px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden"
      >
        {primary.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path} className={({ isActive }) => tabClass(isActive)}>
            <Icon size={20} aria-hidden />
            <span className="max-w-full truncate px-0.5">{label}</span>
          </NavLink>
        ))}
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls={sheetId}
          onClick={() => setOpen(!open)}
          className={tabClass(open || moreActive)}
        >
          {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          <span>Mais</span>
        </button>
      </nav>
    </>
  )
}

function MoreSheet({ id, items }: { id: string; items: NavItem[] }) {
  const { user } = useSession()
  const { logout } = useAuth()
  const rowClass = [
    'flex min-h-12 items-center gap-3 rounded-md px-3 text-text hover:bg-bg',
    focusRing,
  ].join(' ')

  return (
    <div
      id={id}
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 mx-2 mb-2 flex flex-col gap-1 rounded-md border border-float-border bg-surface p-2 shadow-float md:hidden"
    >
      <div className="px-3 py-2">
        <p className="font-medium">{user.name}</p>
        <p className="text-sm text-muted">{ROLE_LABELS[user.role]}</p>
      </div>
      {items.map(({ label, path, icon: Icon }) => (
        <NavLink key={path} to={path} className={rowClass}>
          <Icon size={20} aria-hidden />
          {label}
        </NavLink>
      ))}
      <div className="flex items-center justify-between gap-3 px-3">
        <span>Tema</span>
        <ThemeToggle />
      </div>
      <button type="button" onClick={() => void logout()} className={`${rowClass} text-danger`}>
        <LogOut size={20} aria-hidden />
        Sair
      </button>
    </div>
  )
}
