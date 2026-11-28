import type { Metadata } from 'next'
import { NewResourceForm } from '@/components/app/new-resource-form'
import { PageHeader } from '@/components/app/shared'

export const metadata: Metadata = { title: 'Share a resource' }

export default function NewResourcePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Share a resource" description="List something you can lend, give away or exchange." />
      <NewResourceForm />
    </div>
  )
}
