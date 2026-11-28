'use client'

import Link from 'next/link'
import { useState } from 'react'
import { MapPin, ShieldCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { communities, type Community, type CommunityType } from '@/lib/data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { PageHeader, Pill } from './shared'

const types: ('All' | CommunityType)[] = ['All', 'College', 'Hostel', 'Residential', 'Neighbourhood', 'Workplace']

export function CommunityCard({ community }: { community: Community }) {
  const { profile, toggleCommunity } = useStore()
  const joined = profile.communityIds.includes(community.id)
  return (
    <article className="soft-shadow flex flex-col rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <Pill tone="brand">{community.type}</Pill>
        <span className="flex items-center gap-1 text-xs font-semibold text-success">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          {community.trust}% trust
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold">
        <Link href={`/communities/${community.id}`} className="hover:text-primary">
          {community.name}
        </Link>
      </h3>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="size-3.5" aria-hidden="true" />
        {community.location}
      </p>
      <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted-foreground">{community.description}</p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="size-4" aria-hidden="true" />
          {community.members.toLocaleString('en-IN')} members
        </span>
        <Button
          size="sm"
          variant={joined ? 'outline' : 'default'}
          className={cn(!joined && 'brand-gradient')}
          onClick={() => toggleCommunity(community.id)}
          aria-pressed={joined}
        >
          {joined ? 'Joined' : 'Join'}
        </Button>
      </div>
    </article>
  )
}

export function CommunitiesView() {
  const [type, setType] = useState<(typeof types)[number]>('All')
  const list = communities.filter((c) => type === 'All' || c.type === type)
  return (
    <>
      <PageHeader title="Communities" description="Join the trusted networks you belong to: college, hostel, neighbourhood or workplace." />
      <div className="mb-5 flex flex-wrap gap-2" aria-label="Filter by type">
        {types.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={type === t}
            onClick={() => setType(t)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
              type === t ? 'brand-gradient border-transparent text-white' : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => (
          <CommunityCard key={c.id} community={c} />
        ))}
      </div>
    </>
  )
}
