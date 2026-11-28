'use client'

import Link from 'next/link'
import { ArrowRight, HandHelping, Plus, ShieldCheck, Sparkles, Users, Repeat } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ME_ID, getCommunity } from '@/lib/data'
import { useStore } from '@/lib/store'
import { FadeIn, PageHeader, Panel, PanelTitle } from './shared'
import { RequestCard, ResourceCard } from './cards'
import { ExchangeList } from './exchange-list'

export function DashboardView() {
  const { profile, credits, trustScore, exchanges, requests, resources } = useStore()
  const firstName = profile.name.split(' ')[0]
  const active = exchanges.filter((e) => e.status === 'Requested' || e.status === 'Approved').length
  const nearbyNeeds = requests.filter((r) => r.requesterId !== ME_ID && r.status === 'Open').slice(0, 2)
  const nearbyResources = resources
    .filter((r) => r.ownerId !== ME_ID && r.availability === 'Available')
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3)

  const stats = [
    { label: 'Contribution credits', value: credits, icon: Sparkles },
    { label: 'Trust score', value: `${trustScore}%`, icon: ShieldCheck },
    { label: 'Active exchanges', value: active, icon: Repeat },
    { label: 'Communities', value: profile.communityIds.length, icon: Users },
  ]

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here is what is happening across your communities today."
        actions={
          <>
            <Link href="/requests?new=1" className={cn(buttonVariants({ variant: 'outline' }), 'h-10 gap-2 bg-card px-4')}>
              <HandHelping className="size-4" aria-hidden="true" /> Ask for help
            </Link>
            <Link href="/resources/new" className={cn(buttonVariants(), 'brand-gradient h-10 gap-2 px-4')}>
              <Plus className="size-4" aria-hidden="true" /> Share a resource
            </Link>
          </>
        }
      />

      <FadeIn className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="soft-shadow rounded-2xl border border-border bg-card p-5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <s.icon className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </FadeIn>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <FadeIn delay={0.05}>
          <Panel>
            <PanelTitle
              action={
                <Link href="/requests" className="text-sm font-medium text-primary hover:underline">
                  View all
                </Link>
              }
            >
              Exchange requests
            </PanelTitle>
            <ExchangeList />
          </Panel>
        </FadeIn>
        <FadeIn delay={0.1}>
          <Panel className="h-full">
            <PanelTitle>Your communities</PanelTitle>
            <ul className="flex flex-col gap-3">
              {profile.communityIds.map((id) => {
                const c = getCommunity(id)
                if (!c) return null
                return (
                  <li key={id}>
                    <Link href={`/communities/${id}`} className="flex items-center justify-between gap-3 rounded-xl p-2 hover:bg-muted">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.type} · {c.activeListings} active listings
                        </p>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
            </ul>
            <Link href="/communities" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4 h-9 w-full')}>
              Explore communities
            </Link>
          </Panel>
        </FadeIn>
      </div>

      <section className="mt-8" aria-labelledby="needs-heading">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="needs-heading" className="text-lg font-semibold">
            People near you need help
          </h2>
          <Link href="/discover?tab=requests" className="text-sm font-medium text-primary hover:underline">
            See more
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {nearbyNeeds.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="nearby-heading">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="nearby-heading" className="text-lg font-semibold">
            Available nearby
          </h2>
          <Link href="/discover" className="text-sm font-medium text-primary hover:underline">
            Discover
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nearbyResources.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      </section>
    </>
  )
}
