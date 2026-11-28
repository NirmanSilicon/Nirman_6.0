'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, CheckCircle2, MapPin, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ME_ID, getCommunity, getPerson } from '@/lib/data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { CategoryIcon, EmptyState, FadeIn, Panel, Pill, UserAvatar, statusTone } from './shared'

export function ResourceDetail({ id }: { id: string }) {
  const router = useRouter()
  const { resources, exchanges, requestExchange, startConversation } = useStore()
  const [note, setNote] = useState('')
  const resource = resources.find((r) => r.id === id)

  if (!resource) {
    return (
      <EmptyState
        title="Resource not found"
        body="This listing may have been removed."
        action={
          <Link href="/discover" className={buttonVariants()}>
            Back to discover
          </Link>
        }
      />
    )
  }

  const owner = getPerson(resource.ownerId)
  const community = getCommunity(resource.communityId)
  const isMine = resource.ownerId === ME_ID
  const existing = exchanges.find((e) => e.resourceId === id && e.requesterId === ME_ID && e.status !== 'Declined')

  const details = [
    ['Category', resource.category],
    ['Condition', resource.condition],
    ['Share mode', resource.mode],
    ['Posted', resource.postedAt],
  ]

  return (
    <FadeIn>
      <Link href="/discover" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Back
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel className="p-6 md:p-8">
          <div className="flex flex-wrap items-start gap-4">
            <CategoryIcon category={resource.category} className="size-14" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                <Pill tone={statusTone(resource.availability)}>{resource.availability}</Pill>
                <Pill tone="brand">{resource.mode}</Pill>
              </div>
              <h1 className="mt-2 text-2xl font-bold text-balance md:text-3xl">{resource.title}</h1>
            </div>
          </div>
          <p className="mt-6 leading-relaxed text-muted-foreground">{resource.description || 'No description provided.'}</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {details.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-muted p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 text-sm font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden="true" />
              {isMine ? 'Your listing' : `About ${resource.distanceKm} km away`} · {community?.name}
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-4" aria-hidden="true" />
              {resource.credits} credits to the owner on completion
            </span>
          </div>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel>
            <div className="flex items-center gap-3">
              <UserAvatar initials={owner?.initials ?? '?'} className="size-12 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{isMine ? 'You' : owner?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{owner?.role}</p>
              </div>
              <span className="flex items-center gap-1 text-sm font-semibold text-success">
                <ShieldCheck className="size-4" aria-hidden="true" />
                {owner?.trustScore}%
              </span>
            </div>
            {!isMine && (
              <Button
                variant="outline"
                className="mt-4 h-10 w-full gap-2"
                onClick={() => {
                  startConversation(resource.ownerId, resource.title)
                  router.push('/messages')
                }}
              >
                <MessageCircle className="size-4" aria-hidden="true" /> Message {owner?.name.split(' ')[0]}
              </Button>
            )}
          </Panel>

          <Panel>
            {isMine ? (
              <>
                <h2 className="font-semibold">This is your listing</h2>
                <p className="mt-1 text-sm text-muted-foreground">Incoming requests appear on your Requests page.</p>
                <Link href="/requests" className={cn(buttonVariants(), 'brand-gradient mt-4 h-10 w-full')}>
                  Manage requests
                </Link>
              </>
            ) : existing ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <CheckCircle2 className="size-10 text-success" aria-hidden="true" />
                <p className="font-semibold">Request {existing.status.toLowerCase()}</p>
                <p className="text-sm text-muted-foreground">Track progress from your Requests page.</p>
                <Link href="/requests" className="mt-1 text-sm font-medium text-primary hover:underline">
                  View requests
                </Link>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  requestExchange(resource.id, note.trim() || undefined)
                }}
                className="flex flex-col gap-3"
              >
                <h2 className="font-semibold">Request this resource</h2>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ex-note">Message to owner (optional)</Label>
                  <Textarea id="ex-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="When you need it and for how long" />
                </div>
                <Button type="submit" disabled={resource.availability !== 'Available'} className="brand-gradient h-10">
                  {resource.availability === 'Available' ? 'Send request' : `Currently ${resource.availability.toLowerCase()}`}
                </Button>
              </form>
            )}
          </Panel>
        </div>
      </div>
    </FadeIn>
  )
}
