import type { Metadata } from 'next'
import { PassportView } from '@/components/app/passport-view'

export const metadata: Metadata = { title: 'My Passport' }

export default function PassportPage() {
  return <PassportView />
}
