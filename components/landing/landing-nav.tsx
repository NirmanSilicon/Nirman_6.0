import Link from 'next/link'
import { Logo } from '@/components/logo'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const links = [
  { href: '#how', label: 'How it works' },
  { href: '#examples', label: 'Examples' },
  { href: '#benefits', label: 'Benefits' },
  { href: '#trust', label: 'Trust & privacy' },
]

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <div className="glass soft-shadow mx-auto flex h-16 max-w-6xl items-center justify-between rounded-2xl px-4 md:px-6">
        <Logo />
        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-7 text-sm font-medium text-muted-foreground">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="hover:text-foreground">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: 'ghost' }), 'h-10 px-4')}>
            Log in
          </Link>
          <Link
            href="/signup"
            className={cn(buttonVariants(), 'brand-gradient h-10 px-4 shadow-md shadow-primary/25')}
          >
            Join LINKNEST
          </Link>
        </div>
      </div>
    </header>
  )
}
