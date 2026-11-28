'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/lib/store'

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter()
  const { signIn } = useStore()
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    const name = String(data.get('name') ?? '').trim()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Please enter a valid email address.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (mode === 'signup' && name.length < 2) return setError('Please enter your full name.')
    setError('')
    setLoading(true)
    setTimeout(() => {
      signIn(email, mode === 'signup' ? name : undefined)
      router.push(mode === 'signup' ? '/onboarding' : '/dashboard')
    }, 500)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {mode === 'signup' && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" autoComplete="name" placeholder="Riya Patel" className="h-11" />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@college.edu" className="h-11" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          {mode === 'login' && (
            <span className="text-xs text-muted-foreground">Min. 8 characters</span>
          )}
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPw ? 'text' : 'password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="••••••••"
            className="h-11 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading} className="brand-gradient mt-2 h-11 rounded-xl text-base shadow-md shadow-primary/25">
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {mode === 'login' ? 'Log in' : 'Create account'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === 'login' ? 'New to LINKNEST? ' : 'Already have an account? '}
        <Link href={mode === 'login' ? '/signup' : '/login'} className="font-medium text-primary hover:underline">
          {mode === 'login' ? 'Create an account' : 'Log in'}
        </Link>
      </p>
    </form>
  )
}
