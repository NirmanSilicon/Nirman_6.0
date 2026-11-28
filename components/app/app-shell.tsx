'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  Compass,
  FolderHeart,
  HandHelping,
  IdCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { Logo } from '@/components/logo'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { UserAvatar } from './shared'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/requests', label: 'Requests', icon: HandHelping },
  { href: '/resources', label: 'Resources', icon: FolderHeart },
  { href: '/communities', label: 'Community', icon: Users },
  { href: '/passport', label: 'My Passport', icon: IdCard },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut, notifications, conversations, credits } = useStore()
  const unreadNotifs = notifications.filter((n) => !n.read).length
  const unreadMsgs = conversations.reduce((sum, c) => sum + c.unread, 0)

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-6">
        <Logo href="/dashboard" />
      </div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3">
        <ul className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const badge =
              item.href === '/notifications' ? unreadNotifs : item.href === '/messages' ? unreadMsgs : 0
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="brand-gradient absolute inset-y-2 left-0 w-1 rounded-full"
                    />
                  )}
                  <item.icon className="size-[18px]" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {badge > 0 && (
                    <span className="brand-gradient min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold text-white">
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={() => {
                signOut()
                router.push('/login')
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-[18px]" aria-hidden="true" />
              Logout
            </button>
          </li>
        </ul>
      </nav>
      <div className="p-4">
        <div className="brand-gradient relative overflow-hidden rounded-2xl p-4 text-white">
          <Sparkles className="size-5" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold">{credits} contribution credits</p>
          <p className="mt-0.5 text-xs text-white/80">Share more to unlock trusted-helper status.</p>
          <Link
            href="/admin"
            onClick={onNavigate}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-white underline-offset-2 hover:underline"
          >
            <ShieldCheck className="size-3.5" aria-hidden="true" /> Admin console
          </Link>
        </div>
      </div>
    </div>
  )
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter()
  const { profile, notifications } = useStore()
  const [q, setQ] = useState('')
  const unread = notifications.filter((n) => !n.read).length
  const initials = profile.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 md:px-8">
        <button
          type="button"
          onClick={onMenu}
          className="flex size-10 items-center justify-center rounded-xl border border-border bg-card lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <form
          role="search"
          className="relative flex-1 md:max-w-md"
          onSubmit={(e) => {
            e.preventDefault()
            router.push(`/discover${q ? `?q=${encodeURIComponent(q)}` : ''}`)
          }}
        >
          <label htmlFor="global-search" className="sr-only">
            Search resources, people and communities
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="global-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search resources, people, communities…"
            className="h-10 w-full rounded-xl border border-border bg-card pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </form>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/notifications"
            className="relative flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"
            aria-label={`Notifications, ${unread} unread`}
          >
            <Bell className="size-[18px]" aria-hidden="true" />
            {unread > 0 && <span className="brand-gradient absolute top-2 right-2 size-2 rounded-full" />}
          </Link>
          <Link href="/profile" className="flex items-center gap-2 rounded-xl py-1 pr-2 pl-1 hover:bg-card">
            <UserAvatar initials={initials} />
            <span className="hidden text-left text-sm leading-tight sm:block">
              <span className="block font-semibold">{profile.name}</span>
              <span className="block text-xs text-muted-foreground">View profile</span>
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top_right,#ece5ff_0%,transparent_55%)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent />
      </aside>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <motion.button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 w-72 bg-sidebar shadow-2xl"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute top-5 right-4 flex size-9 items-center justify-center rounded-lg hover:bg-muted"
                aria-label="Close navigation"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
      <div className="lg:pl-64">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}
