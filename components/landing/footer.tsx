import Link from 'next/link'
import { Logo } from '@/components/logo'

const groups = [
  { title: 'Product', links: [{ href: '/discover', label: 'Discover' }, { href: '/resources', label: 'Resources' }, { href: '/communities', label: 'Communities' }] },
  { title: 'Account', links: [{ href: '/signup', label: 'Sign up' }, { href: '/login', label: 'Log in' }, { href: '/passport', label: 'My Passport' }] },
  { title: 'Company', links: [{ href: '#trust', label: 'Privacy' }, { href: '#how', label: 'How it works' }, { href: '/admin', label: 'Admin' }] },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Connect People. Share Resources. Build Communities.
          </p>
        </div>
        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <h3 className="text-sm font-semibold">{g.title}</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              {g.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted-foreground">
          © 2026 LINKNEST · Built by Team Motion Matrix
        </p>
      </div>
    </footer>
  )
}
