import type { Metadata } from 'next'
import { RequestsView } from '@/components/app/requests-view'

export const metadata: Metadata = { title: 'Requests' }

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: openNew } = await searchParams
  return <RequestsView startOpen={openNew === '1'} />
}
