'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search, ShieldCheck } from 'lucide-react'
import { ME_ID, categories, communities, people } from '@/lib/data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { RequestCard, ResourceCard } from './cards'
import { EmptyState, PageHeader, Pill, UserAvatar, fieldClass } from './shared'

type Tab = 'resources' | 'requests' | 'people'

export function DiscoverView({ initialQuery, initialTab }: { initialQuery: string; initialTab: Tab }) {
  const { resources, requests, profile } = useStore()
  const [q, setQ] = useState(initialQuery)
  const [tab, setTab] = useState<Tab>(initialTab)
  const [category, setCategory] = useState<string>('All')
  const [community, setCommunity] = useState<string>('all')
  const [maxKm, setMaxKm] = useState(10)
  const [onlyMatches, setOnlyMatches] = useState(false)

  const term = q.trim().toLowerCase()
  const needTerms = profile.needs.map((n) => n.toLowerCase())
  const skillTerms = profile.skills.map((s) => s.toLowerCase())

  const filteredResources = useMemo(
    () =>
      resources
        .filter((r) => r.ownerId !== ME_ID)
        .filter((r) => (category === 'All' ? true : r.category === category))
        .filter((r) => (community === 'all' ? true : r.communityId === community))
        .filter((r) => r.distanceKm <= maxKm)
        .filter((r) => !term || `${r.title} ${r.description} ${r.category}`.toLowerCase().includes(term))
        .filter(
          (r) =>
            !onlyMatches ||
            needTerms.some((n) => n.split(' ').some((w) => w.length > 3 && `${r.title} ${r.description}`.toLowerCase().includes(w))),
        )
        .sort((a, b) => a.distanceKm - b.distanceKm),
    [resources, category, community, maxKm, term, onlyMatches, needTerms],
  )

  const filteredRequests = useMemo(
    () =>
      requests
        .filter((r) => r.requesterId !== ME_ID)
        .filter((r) => (category === 'All' ? true : r.category === category))
        .filter((r) => (community === 'all' ? true : r.communityId === community))
        .filter((r) => r.distanceKm <= maxKm)
        .filter((r) => !term || `${r.title} ${r.description}`.toLowerCase().includes(term))
        .filter(
          (r) =>
            !onlyMatches ||
            skillTerms.some((s) => s.split(' ').some((w) => w.length > 3 && `${r.title} ${r.description}`.toLowerCase().includes(w))) ||
            r.category === 'Guidance',
        ),
    [requests, category, community, maxKm, term, onlyMatches, skillTerms],
  )

  const filteredPeople = people
    .filter((p) => p.id !== ME_ID)
    .filter((p) => (community === 'all' ? true : p.communityIds.includes(community)))
    .filter((p) => !term || `${p.name} ${p.role} ${p.skills.join(' ')}`.toLowerCase().includes(term))

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'resources', label: 'Resources', count: filteredResources.length },
    { id: 'requests', label: 'Help requests', count: filteredRequests.length },
    { id: 'people', label: 'People', count: filteredPeople.length },
  ]

  return (
    <>
      <PageHeader title="Discover" description="Find resources, needs and people across nearby communities." />

      <div className="soft-shadow flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="relative">
          <label htmlFor="discover-search" className="sr-only">
            Search
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="discover-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Try “calculator”, “drill” or “interview”"
            className={cn(fieldClass, 'h-11 pl-9')}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="f-cat" className="mb-1 block text-xs font-medium text-muted-foreground">
              Category
            </label>
            <select id="f-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClass}>
              <option>All</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
              <option>Guidance</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-com" className="mb-1 block text-xs font-medium text-muted-foreground">
              Community
            </label>
            <select id="f-com" value={community} onChange={(e) => setCommunity(e.target.value)} className={fieldClass}>
              <option value="all">All communities</option>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-km" className="mb-1 block text-xs font-medium text-muted-foreground">
              Within {maxKm} km
            </label>
            <input
              id="f-km"
              type="range"
              min={1}
              max={10}
              value={maxKm}
              onChange={(e) => setMaxKm(Number(e.target.value))}
              className="h-10 w-full accent-primary"
            />
          </div>
          <label className="flex items-center gap-2 self-end rounded-lg border border-input px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={onlyMatches}
              onChange={(e) => setOnlyMatches(e.target.checked)}
              className="size-4 accent-primary"
            />
            Matches for me
          </label>
        </div>
      </div>

      <div role="tablist" aria-label="Discover results" className="mt-6 flex gap-1 rounded-xl bg-muted p-1 sm:w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none',
              tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label} <span className="text-xs text-muted-foreground">({t.count})</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-5">
        {tab === 'resources' &&
          (filteredResources.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredResources.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          ) : (
            <EmptyState title="No resources found" body="Try widening the distance or clearing filters." />
          ))}
        {tab === 'requests' &&
          (filteredRequests.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredRequests.map((r) => (
                <RequestCard key={r.id} request={r} />
              ))}
            </div>
          ) : (
            <EmptyState title="No help requests found" body="Nobody nearby needs help with this right now." />
          ))}
        {tab === 'people' &&
          (filteredPeople.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredPeople.map((p) => (
                <article key={p.id} className="soft-shadow rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-3">
                    <UserAvatar initials={p.initials} className="size-11 text-sm" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{p.name}</h3>
                      <p className="truncate text-xs text-muted-foreground">{p.role}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-semibold text-success">
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                      {p.trustScore}%
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.skills.map((s) => (
                      <Pill key={s} tone="brand">
                        {s}
                      </Pill>
                    ))}
                  </div>
                  <Link href="/messages" className="mt-4 block text-sm font-medium text-primary hover:underline">
                    Send a message
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No people found" body="Try a different search term." />
          ))}
      </div>
    </>
  )
}
