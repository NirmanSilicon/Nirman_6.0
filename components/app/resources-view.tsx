'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { ME_ID, categories } from '@/lib/data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ResourceCard } from './cards'
import { EmptyState, PageHeader } from './shared'

export function ResourcesView() {
  const { resources } = useStore()
  const [scope, setScope] = useState<'mine' | 'all'>('mine')
  const [category, setCategory] = useState('All')
  const list = resources
    .filter((r) => (scope === 'mine' ? r.ownerId === ME_ID : true))
    .filter((r) => category === 'All' || r.category === category)

  return (
    <>
      <PageHeader
        title="Resources"
        description="Your shared listings and everything available across your network."
        actions={
          <Link href="/resources/new" className={cn(buttonVariants(), 'brand-gradient h-10 gap-2 px-4')}>
            <Plus className="size-4" aria-hidden="true" /> Share a resource
          </Link>
        }
      />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Listing scope">
          {(
            [
              ['mine', 'My listings'],
              ['all', 'All resources'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={scope === id}
              onClick={() => setScope(id)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium',
                scope === id ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Filter by category">
          {['All', ...categories].map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition',
                category === c ? 'brand-gradient border-transparent text-white' : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nothing here yet"
          body="Share something you are not using and earn contribution credits."
          action={
            <Link href="/resources/new" className={cn(buttonVariants(), 'brand-gradient')}>
              Share a resource
            </Link>
          }
        />
      )}
    </>
  )
}
