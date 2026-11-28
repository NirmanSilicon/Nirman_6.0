'use client'

import Link from 'next/link'
import { ME_ID, getPerson } from '@/lib/data'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { EmptyState, Pill, UserAvatar, statusTone } from './shared'

export function ExchangeList({ filter = 'all' }: { filter?: 'all' | 'incoming' | 'outgoing' }) {
  const { exchanges, resources, updateExchange } = useStore()
  const list = exchanges.filter((e) =>
    filter === 'incoming' ? e.ownerId === ME_ID : filter === 'outgoing' ? e.requesterId === ME_ID : true,
  )

  if (list.length === 0) {
    return <EmptyState title="No exchanges yet" body="Requests to borrow or share resources will show up here." />
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {list.map((e) => {
        const resource = resources.find((r) => r.id === e.resourceId)
        const incoming = e.ownerId === ME_ID
        const other = getPerson(incoming ? e.requesterId : e.ownerId)
        return (
          <li key={e.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <UserAvatar initials={other?.initials ?? '?'} />
              <div className="min-w-0">
                <p className="truncate text-sm">
                  <span className="font-semibold">{incoming ? other?.name : 'You'}</span>
                  {' requested '}
                  <Link href={`/resources/${resource?.id}`} className="font-medium text-primary hover:underline">
                    {resource?.title}
                  </Link>
                  {!incoming && <span className="text-muted-foreground">{` from ${other?.name}`}</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {e.date}
                  {e.note ? ` · “${e.note}”` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone={statusTone(e.status)}>{e.status}</Pill>
              {incoming && e.status === 'Requested' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => updateExchange(e.id, 'Declined')}>
                    Decline
                  </Button>
                  <Button size="sm" onClick={() => updateExchange(e.id, 'Approved')}>
                    Approve
                  </Button>
                </>
              )}
              {e.status === 'Approved' && (
                <Button size="sm" variant="outline" onClick={() => updateExchange(e.id, 'Completed')}>
                  Mark complete
                </Button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
