'use client'

import { Award, Eye, MapPin, ShieldCheck, Sparkles } from 'lucide-react'
import { getCommunity, type Visibility } from '@/lib/data'
import { useStore, type Settings } from '@/lib/store'
import { cn } from '@/lib/utils'
import { FadeIn, PageHeader, Panel, PanelTitle, Pill, UserAvatar } from './shared'
import { TagInput } from './tag-input'

const levels: Visibility[] = ['Public', 'Communities', 'Private']
type Field = keyof Settings['visibility']

function VisibilityPicker({ field }: { field: Field }) {
  const { settings, updateSettings } = useStore()
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-0.5" role="radiogroup" aria-label={`Who can see your ${field}`}>
      {levels.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={settings.visibility[field] === l}
          onClick={() => updateSettings({ visibility: { ...settings.visibility, [field]: l } })}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-medium',
            settings.visibility[field] === l ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

function TagSection({ field, title, values, onChange, placeholder }: {
  field: Field
  title: string
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  return (
    <Panel>
      <PanelTitle action={<VisibilityPicker field={field} />}>{title}</PanelTitle>
      <TagInput label={title} value={values} onChange={onChange} placeholder={placeholder} />
    </Panel>
  )
}

export function PassportView() {
  const { profile, updateProfile, credits, trustScore, settings, exchanges } = useStore()
  const completed = exchanges.filter((e) => e.status === 'Completed').length
  const badges = [
    { label: 'Verified student', earned: profile.email.endsWith('.ac.in') },
    { label: 'Helpful neighbour', earned: credits >= 300 },
    { label: 'First exchange', earned: completed >= 1 },
    { label: 'Community builder', earned: profile.communityIds.length >= 3 },
  ]

  return (
    <>
      <PageHeader title="My Passport" description="Your portable community identity. You decide who sees what." />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <FadeIn>
          <div className="brand-gradient soft-shadow relative overflow-hidden rounded-3xl p-6 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-widest uppercase opacity-80">CommunityLink Passport</span>
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div className="mt-6 flex items-center gap-4">
              <UserAvatar initials={profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2)} className="size-16 bg-white/20 bg-none text-lg" />
              <div className="min-w-0">
                <p className="truncate text-xl font-bold">{profile.name}</p>
                <p className="truncate text-sm opacity-85">{profile.role}</p>
                {settings.visibility.location !== 'Private' && (
                  <p className="mt-1 flex items-center gap-1 text-xs opacity-85">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {profile.location}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 rounded-2xl bg-white/15 p-4 text-center">
              <div>
                <p className="text-xl font-bold">{trustScore}%</p>
                <p className="text-xs opacity-85">Trust</p>
              </div>
              <div>
                <p className="text-xl font-bold">{credits}</p>
                <p className="text-xs opacity-85">Credits</p>
              </div>
              <div>
                <p className="text-xl font-bold">{profile.communityIds.length}</p>
                <p className="text-xs opacity-85">Communities</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {profile.communityIds.map((id) => (
                <span key={id} className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs">
                  {getCommunity(id)?.name}
                </span>
              ))}
            </div>
          </div>

          <Panel className="mt-6">
            <PanelTitle>Badges</PanelTitle>
            <ul className="grid grid-cols-2 gap-3">
              {badges.map((b) => (
                <li
                  key={b.label}
                  className={cn('flex items-center gap-2 rounded-xl border p-3 text-sm', b.earned ? 'border-primary/30 bg-accent' : 'border-dashed border-border opacity-60')}
                >
                  <Award className={cn('size-4', b.earned ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
                  <span>{b.label}</span>
                  <span className="sr-only">{b.earned ? '(earned)' : '(not yet earned)'}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="mt-6">
            <PanelTitle>
              <span className="flex items-center gap-2">
                <Eye className="size-4" aria-hidden="true" /> What others see
              </span>
            </PanelTitle>
            <ul className="flex flex-col gap-2 text-sm">
              {(Object.keys(settings.visibility) as Field[]).map((f) => (
                <li key={f} className="flex items-center justify-between capitalize">
                  {f}
                  <Pill tone={settings.visibility[f] === 'Public' ? 'success' : settings.visibility[f] === 'Private' ? 'neutral' : 'brand'}>
                    {settings.visibility[f]}
                  </Pill>
                </li>
              ))}
            </ul>
          </Panel>
        </FadeIn>

        <FadeIn delay={0.05} className="flex flex-col gap-6">
          <TagSection
            field="skills"
            title="Skills I can offer"
            values={profile.skills}
            onChange={(skills) => updateProfile({ skills })}
            placeholder="Add a skill and press Enter"
          />
          <TagSection
            field="needs"
            title="Things I need"
            values={profile.needs}
            onChange={(needs) => updateProfile({ needs })}
            placeholder="Add a need and press Enter"
          />
          <TagSection
            field="interests"
            title="Interests"
            values={profile.interests}
            onChange={(interests) => updateProfile({ interests })}
            placeholder="Add an interest and press Enter"
          />
          <Panel>
            <PanelTitle action={<VisibilityPicker field="communities" />}>Community memberships</PanelTitle>
            <p className="text-sm text-muted-foreground">
              Membership in verified communities increases your trust score and unlocks community-only listings.
            </p>
            <div className="mt-3 flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="size-4" aria-hidden="true" />
              {profile.communityIds.length} verified memberships
            </div>
          </Panel>
          <Panel>
            <PanelTitle action={<VisibilityPicker field="location" />}>Location</PanelTitle>
            <p className="text-sm text-muted-foreground">
              Exact addresses are never shared. Others only see approximate distance.
            </p>
          </Panel>
        </FadeIn>
      </div>
    </>
  )
}
