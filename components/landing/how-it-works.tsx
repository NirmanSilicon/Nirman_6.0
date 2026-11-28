import { HandHelping, Repeat, UserPlus, Users } from 'lucide-react'
import { Reveal, Section } from './section'

const steps = [
  { icon: UserPlus, title: 'Create one account', body: 'Set up your Personal Context Passport once and control exactly what each community sees.' },
  { icon: Users, title: 'Join your communities', body: 'Your college, hostel, apartment, neighbourhood and workplace, all in one place.' },
  { icon: HandHelping, title: 'Share or request', body: 'List unused resources or post a need. Our matching surfaces the nearest trusted people.' },
  { icon: Repeat, title: 'Exchange and earn', body: 'Request, approve and complete exchanges. Every contribution earns community credits.' },
]

export function HowItWorks() {
  return (
    <Section
      id="how"
      eyebrow="How it works"
      title="From need to neighbour in four steps"
      description="LINKNEST connects people who need resources with people who already have them, across every community you belong to."
    >
      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.08}>
            <li className="soft-shadow h-full rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <span className="brand-gradient flex size-11 items-center justify-center rounded-xl text-white">
                  <s.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-3xl font-extrabold text-secondary">0{i + 1}</span>
              </div>
              <h3 className="mt-5 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </Section>
  )
}
