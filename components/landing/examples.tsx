import { BookOpen, Cpu, GraduationCap, MapPin, Sofa, Wrench, UtensilsCrossed } from 'lucide-react'
import { Reveal, Section } from './section'

const examples = [
  { icon: BookOpen, title: 'CLRS textbook', who: 'IIT Delhi → Aravali Hostel', km: '0.4 km', mode: 'Lend' },
  { icon: Cpu, title: 'Arduino starter kit', who: 'Robotics Lab → DTU Makers', km: '0.8 km', mode: 'Lend' },
  { icon: Wrench, title: 'Cordless drill', who: 'Green Park Residents', km: '2.1 km', mode: 'Lend' },
  { icon: Sofa, title: 'Study table', who: 'Aravali Hostel', km: '0.2 km', mode: 'Give away' },
  { icon: GraduationCap, title: 'Mock interview', who: 'Co-work Hub → IIT Delhi', km: '4.6 km', mode: 'Exchange' },
  { icon: UtensilsCrossed, title: 'Induction cooktop', who: 'Safdarjung Neighbours', km: '2.3 km', mode: 'Exchange' },
]

export function Examples() {
  return (
    <Section
      id="examples"
      eyebrow="Resource sharing"
      title="Everyday things, shared across communities"
      description="Books, gadgets, tools, furniture and even skills move between people who trust each other."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {examples.map((e, i) => (
          <Reveal key={e.title} delay={i * 0.05}>
            <div className="soft-shadow flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <e.icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{e.title}</p>
                <p className="truncate text-sm text-muted-foreground">{e.who}</p>
              </div>
              <div className="text-right text-xs">
                <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">{e.mode}</span>
                <p className="mt-1.5 flex items-center justify-end gap-1 text-muted-foreground">
                  <MapPin className="size-3" aria-hidden="true" />
                  {e.km}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
