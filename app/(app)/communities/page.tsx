import type { Metadata } from 'next'
import { CommunitiesView } from '@/components/app/communities-view'

export const metadata: Metadata = { title: 'Communities' }

export default function CommunitiesPage() {
  return <CommunitiesView />
}
