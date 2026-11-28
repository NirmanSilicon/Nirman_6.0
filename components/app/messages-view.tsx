'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPerson } from '@/lib/data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { EmptyState, PageHeader, UserAvatar, fieldClass } from './shared'

export function MessagesView() {
  const { conversations, sendMessage, markConversationRead } = useStore()
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const active = conversations.find((c) => c.id === activeId)
  const person = active ? getPerson(active.personId) : undefined

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [active?.messages.length, activeId])

  function open(id: string) {
    setActiveId(id)
    setMobileOpen(true)
    markConversationRead(id)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!active || !text.trim()) return
    sendMessage(active.id, text.trim())
    setText('')
  }

  return (
    <>
      <PageHeader title="Messages" description="Coordinate pickups, returns and help sessions." />
      <div className="soft-shadow grid h-[calc(100dvh-14rem)] min-h-[460px] overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[300px_1fr]">
        <ul className={cn('flex flex-col overflow-y-auto border-r border-border', mobileOpen && 'hidden md:flex')} aria-label="Conversations">
          {conversations.map((c) => {
            const p = getPerson(c.personId)
            const last = c.messages.at(-1)
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => open(c.id)}
                  aria-current={c.id === activeId}
                  className={cn(
                    'flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition hover:bg-muted',
                    c.id === activeId && 'bg-accent/60',
                  )}
                >
                  <UserAvatar initials={p?.initials ?? '?'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{p?.name}</p>
                      {c.unread > 0 && (
                        <span className="brand-gradient rounded-full px-1.5 text-[10px] font-bold text-white">
                          {c.unread}
                          <span className="sr-only"> unread</span>
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{last?.text ?? c.topic}</p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>

        <div className={cn('flex min-h-0 flex-col', !mobileOpen && 'hidden md:flex')}>
          {active && person ? (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <button type="button" onClick={() => setMobileOpen(false)} className="md:hidden" aria-label="Back to conversations">
                  <ArrowLeft className="size-5" aria-hidden="true" />
                </button>
                <UserAvatar initials={person.initials} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{person.name}</p>
                  <p className="truncate text-xs text-muted-foreground">Re: {active.topic}</p>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
                {active.messages.length === 0 && (
                  <p className="m-auto text-sm text-muted-foreground">Say hello to start the conversation.</p>
                )}
                {active.messages.map((m, i) => (
                  <div key={i} className={cn('flex flex-col gap-1', m.from === 'me' ? 'items-end' : 'items-start')}>
                    <p
                      className={cn(
                        'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm',
                        m.from === 'me' ? 'brand-gradient rounded-br-sm text-white' : 'rounded-bl-sm bg-muted',
                      )}
                    >
                      {m.text}
                    </p>
                    <span className="text-[10px] text-muted-foreground">{m.time}</span>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
                <label htmlFor="msg" className="sr-only">
                  Message {person.name}
                </label>
                <input
                  id="msg"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a message"
                  className={fieldClass}
                  autoComplete="off"
                />
                <Button type="submit" size="icon" className="brand-gradient size-10 shrink-0" aria-label="Send message">
                  <Send className="size-4" aria-hidden="true" />
                </Button>
              </form>
            </>
          ) : (
            <div className="m-auto p-6">
              <EmptyState title="No conversation selected" body="Pick a conversation to start chatting." />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
