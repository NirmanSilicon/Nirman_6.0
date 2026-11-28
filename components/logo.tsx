import Link from 'next/link'
import { Network } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn('flex items-center gap-2.5', className)} aria-label="LINKNEST home">
      <span className="brand-gradient flex size-9 items-center justify-center rounded-xl text-white shadow-md shadow-primary/25">
        <Network className="size-5" aria-hidden="true" />
      </span>
      <span className="text-lg font-extrabold tracking-tight text-foreground">
        LINK<span className="text-brand-gradient">NEST</span>
      </span>
    </Link>
  )
}
