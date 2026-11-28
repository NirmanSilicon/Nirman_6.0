'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ME_ID, categories, communities, type HelpRequest, type Urgency } from '@/lib/data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { RequestCard } from './cards'
import { ExchangeList } from './exchange-list'
import { EmptyState, PageHeader, Panel, PanelTitle, fieldClass } from './shared'

function NewRequestForm({ onDone }: { onDone: () => void }) {
  const { addRequest, profile } = useStore()
  const [error, setError] = useState('')

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const d = new FormData(e.currentTarget)
    const title = String(d.get('title') ?? '').trim()
    const description = String(d.get('description') ?? '').trim()
    if (title.length < 5) return setError('Please describe what you need in at least 5 characters.')
    addRequest({
      title,
      description,
      category: d.get('category') as HelpRequest['category'],
      urgency: d.get('urgency') as Urgency,
      communityId: String(d.get('community')),
    })
    onDone()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="rq-title">What do you need?</Label>
        <input id="rq-title" name="title" className={fieldClass} placeholder="e.g. Need a ladder for an hour" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="rq-desc">Details</Label>
        <Textarea id="rq-desc" name="description" rows={3} placeholder="When, where and for how long" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="rq-cat">Category</Label>
          <select id="rq-cat" name="category" className={fieldClass}>
            {[...categories, 'Guidance'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="rq-urg">Urgency</Label>
          <select id="rq-urg" name="urgency" defaultValue="Medium" className={fieldClass}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="rq-com">Post to</Label>
          <select id="rq-com" name="community" className={fieldClass}>
            {communities
              .filter((c) => profile.communityIds.includes(c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" className="brand-gradient">
          Post request
        </Button>
      </div>
    </form>
  )
}

export function RequestsView({ startOpen }: { startOpen: boolean }) {
  const { requests } = useStore()
  const [open, setOpen] = useState(startOpen)
  const [exTab, setExTab] = useState<'incoming' | 'outgoing'>('incoming')
  const mine = requests.filter((r) => r.requesterId === ME_ID)
  const others = requests.filter((r) => r.requesterId !== ME_ID && r.status !== 'Completed')

  return (
    <>
      <PageHeader
        title="Requests"
        description="Manage exchanges, post what you need and help others nearby."
        actions={
          <Button className="brand-gradient h-10 gap-2 px-4" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? <X className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
            {open ? 'Close' : 'New help request'}
          </Button>
        }
      />

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Panel className="mb-6">
              <PanelTitle>Post a help request</PanelTitle>
              <NewRequestForm onDone={() => setOpen(false)} />
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      <Panel>
        <PanelTitle
          action={
            <div className="flex gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Exchange direction">
              {(['incoming', 'outgoing'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={exTab === t}
                  onClick={() => setExTab(t)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium capitalize',
                    exTab === t ? 'bg-card shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          }
        >
          Resource exchanges
        </PanelTitle>
        <ExchangeList filter={exTab} />
      </Panel>

      <section className="mt-8" aria-labelledby="my-req">
        <h2 id="my-req" className="mb-4 text-lg font-semibold">
          Your help requests
        </h2>
        {mine.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {mine.map((r) => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        ) : (
          <EmptyState title="No requests yet" body="Post a help request and we will match you with nearby people." />
        )}
      </section>

      <section className="mt-8" aria-labelledby="others-req">
        <h2 id="others-req" className="mb-4 text-lg font-semibold">
          Open requests in your network
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {others.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      </section>
    </>
  )
}
