import type { Metadata } from 'next'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthForm } from '@/components/auth/auth-form'

export const metadata: Metadata = { title: 'Create account' }

export default function SignupPage() {
  return (
    <AuthLayout title="Join LINKNEST" description="Create one account and connect with every community you belong to.">
      <AuthForm mode="signup" />
    </AuthLayout>
  )
}
