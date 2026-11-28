'use client'

import Link from 'next/link'
import { ArrowLeft, MapPin, ShieldCheck, Users } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { getCommunity, people } from '@/lib/data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { RequestCard, ResourceCard } from './cards'
import { EmptyState, FadeIn, Panel, PanelTitle, Pill, UserAvatar } from './shared'

export function CommunityDetail({ id }: { id: string }) {
  const { profile, toggleCommunity, resources, requests } = useStore()
  const community = getCommunity(id)

  if (!community) {
    return (
      <EmptyState
        title="Community not found"
        body="It may have been archived."
        action={
          <Link href="/communities" className={buttonVariants()}>
            All communities
          </Link>
        }
      />
    )
  }

  const joined = profile.communityIds.includes(id)
  const members = people.filter((p) => p.communityIds.includes(id))
  const listings = resources.filter((r) => r.communityId === id)
  const needs = requests.filter((r) => r.communityId === id && r.status !== 'Completed')

  return (
    <FadeIn>
      <Link href="/communities" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> All communities
      </Link>
      <div className="brand-gradient relative overflow-hidden rounded-3xl p-6 text-white md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Pill className="bg-white/20 text-white">{community.type}</Pill>
            <h1 className="mt-3 text-3xl font-bold text-balance">{community.name}</h1>
            <p className="mt-2 max-w-xl text-white/85">{community.description}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/90">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden="true" />
                {community.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="size-4" aria-hidden="true" />
                {community.members.toLocaleString('en-IN')} members
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-4" aria-hidden="true" />
                {community.trust}% trust score
              </span>
            </div>
          </div>
          <Button
            onClick={() => toggleCommunity(id)}
            aria-pressed={joined}
            className={cn('h-10 px-5', joined ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-white text-primary hover:bg-white/90')}
          >
            {joined ? 'Leave community' : 'Join community'}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="c-res">
            <h2 id="c-res" className="mb-4 text-lg font-semibold">
              Shared resources
            </h2>
            {listings.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {listings.map((r) => (
                  <ResourceCard key={r.id} resource={r} />
                ))}
              </div>
            ) : (
              <EmptyState title="No listings yet" body="Be the first to share something here." />
            )}
          </section>
          <section aria-labelledby="c-req">
            <h2 id="c-req" className="mb-4 text-lg font-semibold">
              Open needs
            </h2>
            {needs.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {needs.map((r) => (
                  <RequestCard key={r.id} request={r} />
                ))}
              </div>
            ) : (
              <EmptyState title="No open needs" body="Everyone here is sorted for now." />
            )}
          </section>
        </div>
        <Panel className="h-fit">
          <PanelTitle>Members you may know</PanelTitle>
          <ul className="flex flex-col gap-3">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <UserAvatar initials={m.initials} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                </div>
                <span className="text-xs font-semibold text-success">{m.trustScore}%</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {community.tags.map((t) => (
              <Pill key={t}>{t}</Pill>
            ))}
          </div>
        </Panel>
      </div>
    </FadeIn>
  )
}
