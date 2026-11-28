'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { communities } from '@/lib/data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { TagInput } from '@/components/app/tag-input'

const steps = ['About you', 'Communities', 'Skills & needs']

export function OnboardingFlow() {
  const router = useRouter()
  const { profile, updateProfile } = useStore()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(profile)

  function finish() {
    updateProfile(draft)
    router.push('/dashboard')
  }

  return (
    <div className="soft-shadow rounded-3xl border border-border bg-card p-6 md:p-10">
      <ol className="flex items-center gap-2" aria-label="Onboarding progress">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                i <= step ? 'brand-gradient text-white' : 'bg-muted text-muted-foreground',
              )}
              aria-current={i === step ? 'step' : undefined}
            >
              {i < step ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
            </span>
            <span className={cn('hidden text-sm sm:block', i === step ? 'font-semibold' : 'text-muted-foreground')}>{s}</span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25 }}
          className="mt-8"
        >
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold">Tell us about yourself</h1>
                <p className="mt-1 text-muted-foreground">This becomes the start of your Personal Context Passport.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ob-name">Full name</Label>
                  <Input id="ob-name" className="h-11" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ob-role">Role</Label>
                  <Input id="ob-role" className="h-11" placeholder="e.g. B.Tech student" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ob-loc">Area (approximate)</Label>
                <Input id="ob-loc" className="h-11" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ob-bio">Short bio</Label>
                <Textarea id="ob-bio" rows={3} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold">Join your communities</h1>
                <p className="mt-1 text-muted-foreground">Pick every community you belong to. You can change this later.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {communities.map((c) => {
                  const selected = draft.communityIds.includes(c.id)
                  return (
                    <button
                      type="button"
                      key={c.id}
                      aria-pressed={selected}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          communityIds: selected ? draft.communityIds.filter((id) => id !== c.id) : [...draft.communityIds, c.id],
                        })
                      }
                      className={cn(
                        'flex items-start gap-3 rounded-2xl border p-4 text-left transition',
                        selected ? 'border-primary bg-accent' : 'border-border hover:border-ring/50',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border',
                          selected ? 'brand-gradient border-transparent text-white' : 'border-input',
                        )}
                      >
                        {selected && <Check className="size-3.5" aria-hidden="true" />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{c.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {c.type} · {c.members.toLocaleString()} members
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold">What can you offer, and what do you need?</h1>
                <p className="mt-1 text-muted-foreground">We use this for need-based matching across communities.</p>
              </div>
              <TagInput label="Skills you can share" value={draft.skills} onChange={(skills) => setDraft({ ...draft, skills })} placeholder="e.g. Python" />
              <TagInput label="Current needs" value={draft.needs} onChange={(needs) => setDraft({ ...draft, needs })} placeholder="e.g. Ladder" />
              <TagInput label="Interests" value={draft.interests} onChange={(interests) => setDraft({ ...draft, interests })} placeholder="e.g. Robotics" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" className="h-10" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Back
        </Button>
        {step < steps.length - 1 ? (
          <Button className="brand-gradient h-10 px-5" onClick={() => setStep((s) => s + 1)}>
            Continue <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button className="brand-gradient h-10 px-5" onClick={finish}>
            Go to dashboard <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  )
}
