'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/lib/store'
import { PageHeader, Panel, PanelTitle, fieldClass } from './shared'
import { ToggleRow } from './toggle-row'

export function SettingsView() {
  const router = useRouter()
  const { profile, updateProfile, settings, updateSettings, signOut } = useStore()
  const [saved, setSaved] = useState(false)

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const d = new FormData(e.currentTarget)
    updateProfile({
      name: String(d.get('name')).trim() || profile.name,
      role: String(d.get('role')).trim(),
      location: String(d.get('location')).trim(),
      bio: String(d.get('bio')).trim(),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Manage your profile, privacy and notifications." />
      <div className="flex flex-col gap-6">
        <Panel>
          <PanelTitle>Profile</PanelTitle>
          <form onSubmit={onSave} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="s-name">Full name</Label>
                <input id="s-name" name="name" defaultValue={profile.name} className={fieldClass} autoComplete="name" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="s-email">Email</Label>
                <input id="s-email" value={profile.email} readOnly className={`${fieldClass} bg-muted text-muted-foreground`} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="s-role">Role or course</Label>
                <input id="s-role" name="role" defaultValue={profile.role} className={fieldClass} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="s-loc">Area</Label>
                <input id="s-loc" name="location" defaultValue={profile.location} className={fieldClass} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="s-bio">Bio</Label>
              <Textarea id="s-bio" name="bio" rows={3} defaultValue={profile.bio} />
            </div>
            <div className="flex items-center justify-end gap-3">
              {saved && (
                <span role="status" className="flex items-center gap-1 text-sm text-success">
                  <Check className="size-4" aria-hidden="true" /> Saved
                </span>
              )}
              <Button type="submit" className="brand-gradient">
                Save changes
              </Button>
            </div>
          </form>
        </Panel>

        <Panel>
          <PanelTitle>Privacy</PanelTitle>
          <div className="divide-y divide-border">
            <ToggleRow
              label="Show exact location"
              description="When off, others only see approximate distance."
              checked={settings.showExactLocation}
              onChange={(v) => updateSettings({ showExactLocation: v })}
            />
            <ToggleRow
              label="Discoverable across communities"
              description="Let members of communities you have not joined find your public listings."
              checked={settings.discoverableAcrossCommunities}
              onChange={(v) => updateSettings({ discoverableAcrossCommunities: v })}
            />
          </div>
        </Panel>

        <Panel>
          <PanelTitle>Notifications</PanelTitle>
          <div className="divide-y divide-border">
            <ToggleRow label="Email notifications" checked={settings.emailNotifications} onChange={(v) => updateSettings({ emailNotifications: v })} />
            <ToggleRow label="Push notifications" checked={settings.pushNotifications} onChange={(v) => updateSettings({ pushNotifications: v })} />
            <ToggleRow
              label="Weekly digest"
              description="A summary of new needs and resources near you."
              checked={settings.weeklyDigest}
              onChange={(v) => updateSettings({ weeklyDigest: v })}
            />
          </div>
        </Panel>

        <Panel className="border-destructive/30">
          <PanelTitle>Account</PanelTitle>
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-muted-foreground">Sign out of CommunityLink on this device.</p>
            <Button
              variant="destructive"
              onClick={() => {
                signOut()
                router.push('/login')
              }}
            >
              Sign out
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
