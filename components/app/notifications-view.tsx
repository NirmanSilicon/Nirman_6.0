'use client'

import Link from 'next/link'
import { Bell, HandHelping, MessageSquare, Repeat, Sparkles, Users, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Notification } from '@/lib/data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { EmptyState, PageHeader } from './shared'

const icons: Record<Notification['type'], LucideIcon> = {
  exchange: Repeat,
  request: HandHelping,
  message: MessageSquare,
  community: Users,
  credit: Sparkles,
}

export function NotificationsView() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useStore()
  const unread = notifications.filter((n) => !n.read).length

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread ? `You have ${unread} unread notification${unread > 1 ? 's' : ''}.` : 'You are all caught up.'}
        actions={
          <Button variant="outline" className="bg-card" onClick={markAllNotificationsRead} disabled={!unread}>
            Mark all as read
          </Button>
        }
      />
      {notifications.length === 0 ? (
        <EmptyState title="No notifications" body="Activity from your communities will appear here." />
      ) : (
        <ul className="soft-shadow divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {notifications.map((n) => {
            const Icon = icons[n.type] ?? Bell
            const content = (
              <div className={cn('flex gap-4 px-5 py-4 transition hover:bg-muted/60', !n.read && 'bg-accent/40')}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold">
                      {n.title}
                      {!n.read && <span className="sr-only"> (unread)</span>}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">{n.time}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                </div>
                {!n.read && <span aria-hidden="true" className="brand-gradient mt-1.5 size-2 shrink-0 rounded-full" />}
              </div>
            )
            return (
              <li key={n.id}>
                {n.href ? (
                  <Link href={n.href} onClick={() => markNotificationRead(n.id)} className="block">
                    {content}
                  </Link>
                ) : (
                  <button type="button" onClick={() => markNotificationRead(n.id)} className="block w-full text-left">
                    {content}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
