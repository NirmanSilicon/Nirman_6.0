import { Eye, EyeOff, Lock, MapPinOff, ShieldCheck, UserCheck } from 'lucide-react'
import { Reveal } from './section'

const points = [
  { icon: UserCheck, title: 'Community-level trust', body: 'Members are verified by their communities, and trust scores grow with every completed exchange.' },
  { icon: Eye, title: 'Field-level visibility', body: 'Choose Public, Communities-only or Private for every part of your passport.' },
  { icon: MapPinOff, title: 'Approximate location', body: 'We show distance, never your exact address, unless you choose to share it.' },
  { icon: Lock, title: 'You own your data', body: 'Export or delete your passport at any time from your settings.' },
]

export function TrustPrivacy() {
  return (
    <section id="trust" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-20">
      <div className="grid items-center gap-10 rounded-3xl bg-foreground p-8 text-background md:p-12 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm font-semibold tracking-wide text-[#c4b5fd] uppercase">Trust & privacy</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance md:text-4xl">
            Your privacy, always in your control
          </h2>
          <p className="mt-4 leading-relaxed text-white/70">
            Your Personal Context Passport travels with you across communities, but only the parts you allow.
          </p>
          <div className="mt-8 flex flex-col gap-3 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            {[
              { label: 'Skills', value: 'Public', icon: Eye },
              { label: 'Current needs', value: 'Communities', icon: ShieldCheck },
              { label: 'Exact location', value: 'Private', icon: EyeOff },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-white/80">
                  <r.icon className="size-4 text-[#c4b5fd]" aria-hidden="true" />
                  {r.label}
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium">{r.value}</span>
              </div>
            ))}
          </div>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2">
          {points.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.06}>
              <div className="h-full rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <p.icon className="size-5 text-[#c4b5fd]" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
