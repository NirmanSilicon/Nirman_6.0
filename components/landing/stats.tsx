import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Reveal } from './section'

const stats = [
  { value: '6.5k+', label: 'Members' },
  { value: '120+', label: 'Communities' },
  { value: '18k', label: 'Resources shared' },
  { value: '94%', label: 'Exchanges completed' },
]

export function Stats() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <Reveal>
        <div className="soft-shadow rounded-3xl border border-border bg-card p-8 md:p-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">LINKNEST in numbers</h2>
            <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
              Demo data, not real usage yet
            </span>
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-muted p-5">
                <dd className="text-3xl font-extrabold text-brand-gradient md:text-4xl">{s.value}</dd>
                <dt className="mt-1 text-sm text-muted-foreground">{s.label}</dt>
              </div>
            ))}
          </dl>
          <div className="brand-gradient mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl p-6 text-white md:flex-row md:items-center">
            <div>
              <p className="text-lg font-semibold">Ready to join your community network?</p>
              <p className="text-sm text-white/80">It takes less than two minutes to set up your passport.</p>
            </div>
            <Link
              href="/signup"
              className={cn(buttonVariants({ variant: 'secondary' }), 'h-11 gap-2 rounded-xl bg-white px-5 text-primary hover:bg-white/90')}
            >
              Join LINKNEST <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
