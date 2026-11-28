'use client'

import { motion } from 'framer-motion'
import {
  BookOpen,
  Cpu,
  Dumbbell,
  GraduationCap,
  Lightbulb,
  Sofa,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const categoryIcons: Record<string, LucideIcon> = {
  Books: BookOpen,
  Electronics: Cpu,
  Tools: Wrench,
  Furniture: Sofa,
  Sports: Dumbbell,
  Kitchen: UtensilsCrossed,
  Skills: GraduationCap,
  Guidance: Lightbulb,
}

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const Icon = categoryIcons[category] ?? Lightbulb
  return (
    <span
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground',
        className,
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </span>
  )
}

export function UserAvatar({
  initials,
  className,
}: {
  initials: string
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'brand-gradient flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
        className,
      )}
    >
      {initials}
    </span>
  )
}

export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground text-pretty">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn('soft-shadow rounded-2xl border border-border bg-card p-5', className)}>{children}</section>
  )
}

export function PanelTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="font-semibold">{children}</h2>
      {action}
    </div>
  )
}

const pillTones = {
  neutral: 'bg-muted text-muted-foreground',
  brand: 'bg-accent text-accent-foreground',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
}

export function Pill({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: keyof typeof pillTones
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        pillTones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function statusTone(status: string): keyof typeof pillTones {
  switch (status) {
    case 'Available':
    case 'Completed':
    case 'Approved':
      return 'success'
    case 'Reserved':
    case 'Requested':
    case 'Matched':
    case 'Medium':
      return 'warning'
    case 'Declined':
    case 'High':
    case 'Lent':
      return 'danger'
    case 'Open':
      return 'brand'
    default:
      return 'neutral'
  }
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export const fieldClass =
  'h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40'
