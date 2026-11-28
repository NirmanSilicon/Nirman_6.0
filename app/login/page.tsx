import type { Metadata } from 'next'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthForm } from '@/components/auth/auth-form'

export const metadata: Metadata = { title: 'Log in' }

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome back" description="Log in to continue sharing with your communities.">
      <AuthForm mode="login" />
    </AuthLayout>
  )
}
