'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Repeat, Users, Package, HandHelping } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { categories, communities } from '@/lib/data'
import { useStore } from '@/lib/store'
import { FadeIn, PageHeader, Panel, PanelTitle, Pill } from './shared'

const initialFlags = [
  { id: 'f-1', item: 'Listing: “iPhone 15 for 5 credits”', reason: 'Suspicious pricing', reporter: 'Kabir Singh', community: 'Aravali Hostel' },
  { id: 'f-2', item: 'Message thread #4821', reason: 'Spam / unsolicited links', reporter: 'Meera Nair', community: 'Nehru Place Co-work Hub' },
  { id: 'f-3', item: 'Help request: “Need notes urgently”', reason: 'Duplicate post', reporter: 'Auto-moderation', community: 'IIT Delhi Campus' },
]

const weekly = [42, 58, 51, 73, 66, 88, 94]
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function AdminView() {
  const { resources, requests, exchanges } = useStore()
  const [flags, setFlags] = useState(initialFlags)
  const members = communities.reduce((s, c) => s + c.members, 0)
  const max = Math.max(...weekly)
  const byCategory = categories.map((c) => ({ c, n: resources.filter((r) => r.category === c).length }))
  const catMax = Math.max(1, ...byCategory.map((b) => b.n))

  const stats = [
    { label: 'Total members', value: members.toLocaleString('en-IN'), icon: Users },
    { label: 'Active listings', value: resources.length, icon: Package },
    { label: 'Open requests', value: requests.filter((r) => r.status === 'Open').length, icon: HandHelping },
    { label: 'Exchanges', value: exchanges.length, icon: Repeat },
  ]

  return (
    <>
      <PageHeader title="Admin overview" description="Platform health, moderation and community growth." />
      <FadeIn className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="soft-shadow rounded-2xl border border-border bg-card p-5">
            <s.icon className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-3 text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </FadeIn>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelTitle>Exchanges this week</PanelTitle>
          <div className="flex h-48 items-end gap-3" role="img" aria-label={`Exchanges per day: ${days.map((d, i) => `${d} ${weekly[i]}`).join(', ')}`}>
            {weekly.map((v, i) => (
              <div key={days[i]} className="flex flex-1 flex-col items-center gap-2">
                <div className="brand-gradient w-full rounded-t-lg" style={{ height: `${(v / max) * 100}%` }} />
                <span className="text-xs text-muted-foreground">{days[i]}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelTitle>Listings by category</PanelTitle>
          <ul className="flex flex-col gap-2.5">
            {byCategory.map(({ c, n }) => (
              <li key={c} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-muted-foreground">{c}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="brand-gradient h-full rounded-full" style={{ width: `${(n / catMax) * 100}%` }} />
                </div>
                <span className="w-6 text-right font-medium">{n}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-6">
        <PanelTitle action={<Pill tone={flags.length ? 'warning' : 'success'}>{flags.length} pending</Pill>}>Moderation queue</PanelTitle>
        {flags.length === 0 ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <CheckCircle2 className="size-5 text-success" aria-hidden="true" /> Queue is clear. Nice work.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {flags.map((f) => (
              <li key={f.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center">
                <AlertTriangle className="hidden size-5 shrink-0 text-warning md:block" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{f.item}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.reason} · reported by {f.reporter} · {f.community}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setFlags((p) => p.filter((x) => x.id !== f.id))}>
                    Dismiss
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setFlags((p) => p.filter((x) => x.id !== f.id))}>
                    Remove content
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="mt-6 overflow-x-auto">
        <PanelTitle>Communities</PanelTitle>
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="pb-2 font-medium">Name</th>
              <th scope="col" className="pb-2 font-medium">Type</th>
              <th scope="col" className="pb-2 font-medium">Members</th>
              <th scope="col" className="pb-2 font-medium">Listings</th>
              <th scope="col" className="pb-2 font-medium">Trust</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {communities.map((c) => (
              <tr key={c.id}>
                <td className="py-2.5 font-medium">{c.name}</td>
                <td className="py-2.5"><Pill tone="brand">{c.type}</Pill></td>
                <td className="py-2.5">{c.members.toLocaleString('en-IN')}</td>
                <td className="py-2.5">{c.activeListings}</td>
                <td className="py-2.5 font-semibold text-success">{c.trust}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  )
}
