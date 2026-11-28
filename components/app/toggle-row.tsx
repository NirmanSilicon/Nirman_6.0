'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p id={`${id}-l`} className="text-sm font-medium">
          {label}
        </p>
        {description && (
          <p id={`${id}-d`} className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none',
          checked ? 'bg-primary' : 'bg-muted-foreground/30',
        )}
      >
        <span
          className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5.5' : 'translate-x-0.5')}
        />
      </button>
    </div>
  )
}
