'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Compass, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-20 md:pt-24 lg:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-accent-foreground">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Connect People. Share Resources. Build Communities.
        </span>
        <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-balance md:text-6xl">
          Connect. Share. <span className="text-brand-gradient">Belong.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
          A trusted platform for resource sharing, peer guidance and a hyperlocal knowledge network, with your
          privacy always in control.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className={cn(buttonVariants(), 'brand-gradient h-12 gap-2 rounded-xl px-6 text-base shadow-lg shadow-primary/30')}
          >
            Join LINKNEST <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/discover"
            className={cn(buttonVariants({ variant: 'outline' }), 'h-12 gap-2 rounded-xl bg-card px-6 text-base')}
          >
            <Compass className="size-4" aria-hidden="true" /> Explore Network
          </Link>
        </div>
        <ul className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" /> Verified communities
          </li>
          <li className="flex items-center gap-2">
            <Users className="size-4 text-primary" aria-hidden="true" /> One account, many communities
          </li>
        </ul>
      </motion.div>

      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="soft-shadow overflow-hidden rounded-3xl border border-white bg-card">
          <Image
            src="/images/hero-network.png"
            alt="Illustration of communities connected by a network, exchanging books, laptops and tools"
            width={1024}
            height={1024}
            priority
            className="aspect-square w-full object-cover"
          />
        </div>
        <motion.div
          className="glass soft-shadow absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl p-3 md:-left-8"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="brand-gradient flex size-10 items-center justify-center rounded-xl text-white">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <div className="text-sm">
            <p className="font-semibold">Arduino kit lent</p>
            <p className="text-xs text-muted-foreground">0.8 km away · +35 credits</p>
          </div>
        </motion.div>
        <motion.div
          className="glass soft-shadow absolute -top-4 -right-2 rounded-2xl px-4 py-3 md:-right-6"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <p className="text-xs text-muted-foreground">Trust score</p>
          <p className="text-xl font-bold text-brand-gradient">96%</p>
        </motion.div>
      </motion.div>
    </section>
  )
}
