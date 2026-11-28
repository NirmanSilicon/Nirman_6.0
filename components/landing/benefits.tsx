import { Building2, GraduationCap, Home, Leaf, Network, Trophy } from 'lucide-react'
import { Reveal, Section } from './section'

const benefits = [
  { icon: Network, title: 'Cross-community discovery', body: 'Find what you need beyond your own group, from communities that trust yours.' },
  { icon: GraduationCap, title: 'Peer guidance', body: 'Get mentoring, reviews and advice from seniors, alumni and professionals nearby.' },
  { icon: Trophy, title: 'Contribution credits', body: 'Every lend, give-away and helping hand is recognised with community credits.' },
  { icon: Leaf, title: 'Less waste', body: 'Unused items get a second life instead of gathering dust or going to landfill.' },
  { icon: Home, title: 'Hostels & residences', body: 'Day-to-day essentials and emergencies covered by the people next door.' },
  { icon: Building2, title: 'Workplaces', body: 'Share equipment, referrals and career knowledge with colleagues and co-workers.' },
]

export function Benefits() {
  return (
    <Section id="benefits" eyebrow="Community benefits" title="Stronger communities, built on sharing">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {benefits.map((b, i) => (
          <Reveal key={b.title} delay={i * 0.05}>
            <div className="h-full rounded-2xl border border-border bg-card/70 p-6">
              <b.icon className="size-6 text-primary" aria-hidden="true" />
              <h3 className="mt-4 font-semibold">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
