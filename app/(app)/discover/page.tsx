import type { Metadata } from 'next'
import { DiscoverView } from '@/components/app/discover-view'

export const metadata: Metadata = { title: 'Discover' }

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>
}) {
  const { q, tab } = await searchParams
  return <DiscoverView key={`${q}-${tab}`} initialQuery={q ?? ''} initialTab={tab === 'requests' || tab === 'people' ? tab : 'resources'} />
}
