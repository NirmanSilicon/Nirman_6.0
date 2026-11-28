'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  ME_ID,
  initialConversations,
  initialExchanges,
  initialNotifications,
  initialRequests,
  initialResources,
  people,
  type Conversation,
  type Exchange,
  type HelpRequest,
  type Notification,
  type Resource,
  type Visibility,
} from './data'

export interface Profile {
  name: string
  email: string
  role: string
  location: string
  bio: string
  skills: string[]
  needs: string[]
  interests: string[]
  communityIds: string[]
}

export interface Settings {
  showExactLocation: boolean
  discoverableAcrossCommunities: boolean
  emailNotifications: boolean
  pushNotifications: boolean
  weeklyDigest: boolean
  visibility: Record<'skills' | 'needs' | 'interests' | 'location' | 'communities', Visibility>
}

interface StoreValue {
  isAuthed: boolean
  profile: Profile
  credits: number
  trustScore: number
  settings: Settings
  resources: Resource[]
  requests: HelpRequest[]
  exchanges: Exchange[]
  conversations: Conversation[]
  notifications: Notification[]
  signIn: (email: string, name?: string) => void
  signOut: () => void
  updateProfile: (patch: Partial<Profile>) => void
  updateSettings: (patch: Partial<Settings>) => void
  toggleCommunity: (communityId: string) => void
  addResource: (r: Omit<Resource, 'id' | 'ownerId' | 'postedAt' | 'availability' | 'distanceKm'>) => string
  addRequest: (r: Omit<HelpRequest, 'id' | 'requesterId' | 'createdAt' | 'status' | 'responses' | 'distanceKm'>) => string
  requestExchange: (resourceId: string, note?: string) => void
  updateExchange: (id: string, status: Exchange['status']) => void
  offerHelp: (requestId: string) => void
  sendMessage: (conversationId: string, text: string) => void
  startConversation: (personId: string, topic: string) => string
  markConversationRead: (conversationId: string) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

const me = people.find((p) => p.id === ME_ID)!

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(true)
  const [profile, setProfile] = useState<Profile>({
    name: me.name,
    email: 'riya.patel@iitd.ac.in',
    role: me.role,
    location: 'Hauz Khas, New Delhi',
    bio: me.bio,
    skills: me.skills,
    needs: ['Internship guidance', 'Arduino components'],
    interests: ['Robotics', 'Design', 'Badminton'],
    communityIds: me.communityIds,
  })
  const [credits, setCredits] = useState(me.credits)
  const [settings, setSettings] = useState<Settings>({
    showExactLocation: false,
    discoverableAcrossCommunities: true,
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: false,
    visibility: {
      skills: 'Public',
      needs: 'Communities',
      interests: 'Public',
      location: 'Communities',
      communities: 'Public',
    },
  })
  const [resources, setResources] = useState(initialResources)
  const [requests, setRequests] = useState(initialRequests)
  const [exchanges, setExchanges] = useState(initialExchanges)
  const [conversations, setConversations] = useState(initialConversations)
  const [notifications, setNotifications] = useState(initialNotifications)

  const pushNotification = useCallback((n: Omit<Notification, 'id' | 'time' | 'read'>) => {
    setNotifications((prev) => [
      { ...n, id: `n-${Date.now()}`, time: 'Just now', read: false },
      ...prev,
    ])
  }, [])

  const signIn = useCallback((email: string, name?: string) => {
    setIsAuthed(true)
    setProfile((p) => ({ ...p, email, ...(name ? { name } : {}) }))
  }, [])

  const signOut = useCallback(() => setIsAuthed(false), [])

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfile((p) => ({ ...p, ...patch }))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }))
  }, [])

  const toggleCommunity = useCallback((communityId: string) => {
    setProfile((p) => ({
      ...p,
      communityIds: p.communityIds.includes(communityId)
        ? p.communityIds.filter((id) => id !== communityId)
        : [...p.communityIds, communityId],
    }))
  }, [])

  const addResource: StoreValue['addResource'] = useCallback(
    (r) => {
      const id = `r-${Date.now()}`
      setResources((prev) => [
        { ...r, id, ownerId: ME_ID, postedAt: 'Just now', availability: 'Available', distanceKm: 0 },
        ...prev,
      ])
      pushNotification({
        type: 'community',
        title: 'Your listing is live',
        body: `“${r.title}” is now discoverable to nearby communities.`,
        href: `/resources/${id}`,
      })
      return id
    },
    [pushNotification],
  )

  const addRequest: StoreValue['addRequest'] = useCallback(
    (r) => {
      const id = `q-${Date.now()}`
      setRequests((prev) => [
        { ...r, id, requesterId: ME_ID, createdAt: 'Just now', status: 'Open', responses: 0, distanceKm: 0 },
        ...prev,
      ])
      pushNotification({
        type: 'request',
        title: 'Help request posted',
        body: `We’re matching “${r.title}” with people who can help.`,
        href: '/requests',
      })
      return id
    },
    [pushNotification],
  )

  const requestExchange = useCallback(
    (resourceId: string, note?: string) => {
      const resource = resources.find((r) => r.id === resourceId)
      if (!resource) return
      setExchanges((prev) => [
        {
          id: `e-${Date.now()}`,
          resourceId,
          requesterId: ME_ID,
          ownerId: resource.ownerId,
          status: 'Requested',
          date: 'Today',
          note,
        },
        ...prev,
      ])
      pushNotification({
        type: 'exchange',
        title: 'Exchange request sent',
        body: `You requested “${resource.title}”. You’ll be notified once it’s approved.`,
        href: '/requests',
      })
    },
    [resources, pushNotification],
  )

  const updateExchange = useCallback(
    (id: string, status: Exchange['status']) => {
      const ex = exchanges.find((e) => e.id === id)
      if (!ex) return
      setExchanges((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)))
      const resource = resources.find((r) => r.id === ex.resourceId)
      if (status === 'Approved') {
        setResources((prev) => prev.map((r) => (r.id === ex.resourceId ? { ...r, availability: 'Reserved' } : r)))
      }
      if (status === 'Completed') {
        setResources((prev) => prev.map((r) => (r.id === ex.resourceId ? { ...r, availability: 'Available' } : r)))
        if (ex.ownerId === ME_ID && resource) {
          setCredits((c) => c + resource.credits)
          pushNotification({
            type: 'credit',
            title: `+${resource.credits} contribution credits`,
            body: `Thanks for sharing “${resource.title}”.`,
          })
        }
      }
    },
    [exchanges, resources, pushNotification],
  )

  const offerHelp = useCallback(
    (requestId: string) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, responses: r.responses + 1, status: 'Matched' } : r)),
      )
      setCredits((c) => c + 10)
      pushNotification({
        type: 'credit',
        title: '+10 contribution credits',
        body: 'Thanks for offering help to someone nearby.',
      })
    },
    [pushNotification],
  )

  const sendMessage = useCallback((conversationId: string, text: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, messages: [...c.messages, { from: 'me', text, time: nowTime() }] } : c,
      ),
    )
  }, [])

  const startConversation = useCallback(
    (personId: string, topic: string) => {
      const existing = conversations.find((c) => c.personId === personId)
      if (existing) return existing.id
      const id = `m-${Date.now()}`
      setConversations((prev) => [{ id, personId, topic, messages: [], unread: 0 }, ...prev])
      return id
    },
    [conversations],
  )

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)))
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      isAuthed,
      profile,
      credits,
      trustScore: me.trustScore,
      settings,
      resources,
      requests,
      exchanges,
      conversations,
      notifications,
      signIn,
      signOut,
      updateProfile,
      updateSettings,
      toggleCommunity,
      addResource,
      addRequest,
      requestExchange,
      updateExchange,
      offerHelp,
      sendMessage,
      startConversation,
      markConversationRead,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      isAuthed,
      profile,
      credits,
      settings,
      resources,
      requests,
      exchanges,
      conversations,
      notifications,
      signIn,
      signOut,
      updateProfile,
      updateSettings,
      toggleCommunity,
      addResource,
      addRequest,
      requestExchange,
      updateExchange,
      offerHelp,
      sendMessage,
      startConversation,
      markConversationRead,
      markNotificationRead,
      markAllNotificationsRead,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
