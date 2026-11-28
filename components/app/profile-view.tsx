'use client'

import Link from 'next/link'
import { MapPin, Pencil, ShieldCheck } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { ME_ID, getCommunity } from '@/lib/data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ResourceCard } from './cards'
import { EmptyState, FadeIn, Panel, PanelTitle, Pill, UserAvatar } from './shared'

export function ProfileView() {
  const { profile, credits, trustScore, resources, exchanges } = useStore()
  const listings = resources.filter((r) => r.ownerId === ME_ID)
  const completed = exchanges.filter((e) => e.status === 'Completed').length
  const initials = profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2)

  return (
    <FadeIn>
      <Panel className="p-6 md:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <UserAvatar initials={initials} className="size-20 text-2xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            <p className="text-muted-foreground">{profile.role}</p>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden="true" />
              {profile.location}
            </p>
          </div>
          <Link href="/settings" className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}>
            <Pencil className="size-4" aria-hidden="true" /> Edit profile
          </Link>
        </div>
        <p className="mt-5 max-w-2xl leading-relaxed">{profile.bio}</p>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Trust score', `${trustScore}%`],
            ['Credits', credits],
            ['Listings', listings.length],
            ['Completed exchanges', completed],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-muted p-4">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="mt-1 text-xl font-bold">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel>
          <PanelTitle>Skills</PanelTitle>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((s) => (
              <Pill key={s} tone="brand">
                {s}
              </Pill>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelTitle>Interests</PanelTitle>
          <div className="flex flex-wrap gap-1.5">
            {profile.interests.map((s) => (
              <Pill key={s}>{s}</Pill>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelTitle>Communities</PanelTitle>
          <ul className="flex flex-col gap-2">
            {profile.communityIds.map((id) => (
              <li key={id} className="flex items-center gap-2 text-sm">
                <ShieldCheck className="size-4 text-success" aria-hidden="true" />
                <Link href={`/communities/${id}`} className="hover:text-primary">
                  {getCommunity(id)?.name}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <section className="mt-8" aria-labelledby="p-list">
        <h2 id="p-list" className="mb-4 text-lg font-semibold">
          Shared by {profile.name.split(' ')[0]}
        </h2>
        {listings.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        ) : (
          <EmptyState title="No listings" body="Nothing shared yet." />
        )}
      </section>
    </FadeIn>
  )
}
