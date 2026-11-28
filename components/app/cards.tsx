'use client'

import Link from 'next/link'
import { Clock, MapPin, MessageCircle, Sparkles } from 'lucide-react'
import { getCommunity, getPerson, type HelpRequest, type Resource } from '@/lib/data'
import { useStore } from '@/lib/store'
import { CategoryIcon, Pill, UserAvatar, statusTone } from './shared'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function ResourceCard({ resource }: { resource: Resource }) {
  const owner = getPerson(resource.ownerId)
  const community = getCommunity(resource.communityId)
  return (
    <Link
      href={`/resources/${resource.id}`}
      className="soft-shadow group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-ring/50"
    >
      <div className="flex items-start justify-between gap-3">
        <CategoryIcon category={resource.category} />
        <Pill tone={statusTone(resource.availability)}>{resource.availability}</Pill>
      </div>
      <div className="flex-1">
        <h3 className="font-semibold leading-snug text-pretty group-hover:text-primary">{resource.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{resource.description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Pill tone="brand">{resource.mode}</Pill>
        <span className="flex items-center gap-1">
          <MapPin className="size-3.5" aria-hidden="true" />
          {resource.distanceKm === 0 ? 'You' : `${resource.distanceKm} km`}
        </span>
        <span className="flex items-center gap-1">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {resource.credits} credits
        </span>
      </div>
      <div className="flex items-center gap-2 border-t border-border pt-3">
        <UserAvatar initials={owner?.initials ?? '?'} className="size-7 text-[10px]" />
        <div className="min-w-0 text-xs">
          <p className="truncate font-medium">{owner?.name}</p>
          <p className="truncate text-muted-foreground">{community?.name}</p>
        </div>
      </div>
    </Link>
  )
}

export function RequestCard({ request }: { request: HelpRequest }) {
  const { offerHelp, startConversation } = useStore()
  const [offered, setOffered] = useState(false)
  const requester = getPerson(request.requesterId)
  const community = getCommunity(request.communityId)
  const isMine = request.requesterId === 'u-me'

  return (
    <article className="soft-shadow flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <CategoryIcon category={request.category} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={statusTone(request.urgency)}>{request.urgency} urgency</Pill>
            <Pill tone={statusTone(request.status)}>{request.status}</Pill>
          </div>
          <h3 className="mt-2 font-semibold leading-snug text-pretty">{request.title}</h3>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{request.description}</p>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="size-3.5" aria-hidden="true" />
          {request.distanceKm === 0 ? 'Your request' : `${request.distanceKm} km`}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden="true" />
          {request.createdAt}
        </span>
        <span>{request.responses} responses</span>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <UserAvatar initials={requester?.initials ?? '?'} className="size-7 text-[10px]" />
          <div className="min-w-0 text-xs">
            <p className="truncate font-medium">{isMine ? 'You' : requester?.name}</p>
            <p className="truncate text-muted-foreground">{community?.name}</p>
          </div>
        </div>
        {!isMine && request.status !== 'Completed' && (
          <div className="flex gap-1.5">
            <Link
              href="/messages"
              onClick={() => startConversation(request.requesterId, request.title)}
              className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
              aria-label={`Message ${requester?.name}`}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
            </Link>
            <Button
              size="sm"
              disabled={offered}
              onClick={() => {
                offerHelp(request.id)
                setOffered(true)
              }}
            >
              {offered ? 'Offered' : 'Offer help'}
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}
