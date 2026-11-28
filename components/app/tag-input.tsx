'use client'

import { useId, useState } from 'react'
import { X } from 'lucide-react'
import { Label } from '@/components/ui/label'

export function TagInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const id = useId()
  const [text, setText] = useState('')

  function add() {
    const t = text.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setText('')
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card p-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
            {t}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} aria-label={`Remove ${t}`}>
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onBlur={add}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              add()
            }
          }}
          className="min-w-24 flex-1 bg-transparent px-1.5 text-sm outline-none"
        />
      </div>
      <p className="text-xs text-muted-foreground">Press Enter to add.</p>
    </div>
  )
}
