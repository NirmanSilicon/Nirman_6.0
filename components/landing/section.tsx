'use client'

import { motion } from 'framer-motion'

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id?: string
  eyebrow: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-28 px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl text-center"
      >
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance md:text-4xl">{title}</h2>
        {description && <p className="mt-4 text-muted-foreground text-pretty">{description}</p>}
      </motion.div>
      <div className="mt-12">{children}</div>
    </section>
  )
}

export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
