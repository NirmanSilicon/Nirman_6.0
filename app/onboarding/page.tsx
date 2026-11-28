import type { Metadata } from 'next'
import { Logo } from '@/components/logo'
import { OnboardingFlow } from '@/components/auth/onboarding-flow'

export const metadata: Metadata = { title: 'Set up your profile' }

export default function OnboardingPage() {
  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,#ece5ff_0%,#f6f4ff_60%)] px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Logo />
        <main className="mt-10">
          <OnboardingFlow />
        </main>
      </div>
    </div>
  )
}
