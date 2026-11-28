import { LandingNav } from '@/components/landing/landing-nav'
import { Hero } from '@/components/landing/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Examples } from '@/components/landing/examples'
import { Benefits } from '@/components/landing/benefits'
import { TrustPrivacy } from '@/components/landing/trust-privacy'
import { Stats } from '@/components/landing/stats'
import { Footer } from '@/components/landing/footer'

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,#ece5ff_0%,#f6f4ff_45%,#ffffff_100%)]">
      <LandingNav />
      <main>
        <Hero />
        <HowItWorks />
        <Examples />
        <Benefits />
        <TrustPrivacy />
        <Stats />
      </main>
      <Footer />
    </div>
  )
}
