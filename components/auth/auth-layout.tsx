import Image from 'next/image'
import { CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/logo'

export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 md:px-12">
        <Logo />
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
          <div className="mt-8">{children}</div>
        </main>
      </div>
      <aside className="relative hidden overflow-hidden bg-[radial-gradient(ellipse_at_top_left,#e4dbff_0%,#f6f4ff_60%)] p-12 lg:flex lg:flex-col lg:justify-center">
        <div className="soft-shadow mx-auto max-w-md overflow-hidden rounded-3xl border border-white bg-card">
          <Image
            src="/images/hero-network.png"
            alt=""
            width={1024}
            height={1024}
            className="aspect-[4/3] w-full object-cover"
          />
          <div className="p-6">
            <p className="text-lg font-semibold">One account. Every community.</p>
            <ul className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
              {['Discover resources across nearby communities', 'Control what each community sees', 'Earn credits for every contribution'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  )
}
