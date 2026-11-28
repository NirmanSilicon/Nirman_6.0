'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { categories, communities, type Resource, type ShareMode } from '@/lib/data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Panel, fieldClass } from './shared'

const modes: ShareMode[] = ['Lend', 'Give away', 'Exchange']

export function NewResourceForm() {
  const router = useRouter()
  const { addResource, profile } = useStore()
  const [mode, setMode] = useState<ShareMode>('Lend')
  const [error, setError] = useState('')

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const d = new FormData(e.currentTarget)
    const title = String(d.get('title') ?? '').trim()
    const description = String(d.get('description') ?? '').trim()
    const credits = Number(d.get('credits'))
    if (title.length < 3) return setError('Please add a title (at least 3 characters).')
    if (!Number.isInteger(credits) || credits < 0 || credits > 200) return setError('Credits must be a whole number from 0 to 200.')
    const id = addResource({
      title,
      description,
      category: d.get('category') as Resource['category'],
      condition: d.get('condition') as Resource['condition'],
      communityId: String(d.get('community')),
      mode,
      credits,
    })
    router.push(`/resources/${id}`)
  }

  return (
    <Panel>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="res-title">Title</Label>
          <input id="res-title" name="title" className={fieldClass} placeholder="e.g. Engineering Drawing kit" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="res-desc">Description</Label>
          <Textarea id="res-desc" name="description" rows={4} placeholder="Condition, pickup details, return expectations" />
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">How do you want to share it?</legend>
          <div className="grid grid-cols-3 gap-2">
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-sm font-medium transition',
                  mode === m ? 'border-primary bg-accent text-accent-foreground' : 'border-border hover:border-ring/50',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="res-cat">Category</Label>
            <select id="res-cat" name="category" className={fieldClass}>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="res-cond">Condition</Label>
            <select id="res-cond" name="condition" defaultValue="Good" className={fieldClass}>
              <option>New</option>
              <option>Like new</option>
              <option>Good</option>
              <option>Fair</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="res-com">Community</Label>
            <select id="res-com" name="community" className={fieldClass}>
              {communities
                .filter((c) => profile.communityIds.includes(c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="res-cred">Credits earned on completion</Label>
            <input id="res-cred" name="credits" type="number" min={0} max={200} defaultValue={20} className={fieldClass} />
          </div>
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" className="brand-gradient px-5">
            Publish listing
          </Button>
        </div>
      </form>
    </Panel>
  )
}
