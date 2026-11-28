export type CommunityType = 'College' | 'Hostel' | 'Residential' | 'Neighbourhood' | 'Workplace'
export type ResourceCategory =
  | 'Books'
  | 'Electronics'
  | 'Tools'
  | 'Furniture'
  | 'Sports'
  | 'Kitchen'
  | 'Skills'
export type ShareMode = 'Lend' | 'Give away' | 'Exchange'
export type Urgency = 'Low' | 'Medium' | 'High'
export type Visibility = 'Public' | 'Communities' | 'Private'

export interface Person {
  id: string
  name: string
  initials: string
  role: string
  communityIds: string[]
  trustScore: number
  skills: string[]
  credits: number
  bio: string
}

export interface Community {
  id: string
  name: string
  type: CommunityType
  members: number
  location: string
  description: string
  trust: number
  tags: string[]
  activeListings: number
}

export interface Resource {
  id: string
  title: string
  category: ResourceCategory
  description: string
  ownerId: string
  communityId: string
  distanceKm: number
  condition: 'New' | 'Like new' | 'Good' | 'Fair'
  availability: 'Available' | 'Reserved' | 'Lent'
  mode: ShareMode
  credits: number
  postedAt: string
}

export interface HelpRequest {
  id: string
  title: string
  description: string
  category: ResourceCategory | 'Guidance'
  urgency: Urgency
  requesterId: string
  communityId: string
  distanceKm: number
  status: 'Open' | 'Matched' | 'Completed'
  createdAt: string
  responses: number
}

export interface Exchange {
  id: string
  resourceId: string
  requesterId: string
  ownerId: string
  status: 'Requested' | 'Approved' | 'Completed' | 'Declined'
  date: string
  note?: string
}

export interface Message {
  from: 'me' | 'them'
  text: string
  time: string
}

export interface Conversation {
  id: string
  personId: string
  topic: string
  messages: Message[]
  unread: number
}

export interface Notification {
  id: string
  type: 'exchange' | 'request' | 'message' | 'community' | 'credit'
  title: string
  body: string
  time: string
  read: boolean
  href?: string
}

export const ME_ID = 'u-me'

export const people: Person[] = [
  {
    id: ME_ID,
    name: 'Riya Patel',
    initials: 'RP',
    role: 'B.Tech CSE, 3rd year',
    communityIds: ['c-iitd', 'c-aravali', 'c-greenpark'],
    trustScore: 92,
    skills: ['Python', 'Calculus tutoring', 'Figma'],
    credits: 340,
    bio: 'Hostel resident who loves lending books and helping juniors with coding.',
  },
  {
    id: 'u-arjun',
    name: 'Arjun Mehta',
    initials: 'AM',
    role: 'M.Tech, Robotics Lab',
    communityIds: ['c-iitd', 'c-aravali'],
    trustScore: 95,
    skills: ['Arduino', 'Soldering', '3D printing'],
    credits: 610,
    bio: 'Builds robots on weekends. Happy to lend lab tools.',
  },
  {
    id: 'u-sneha',
    name: 'Sneha Iyer',
    initials: 'SI',
    role: 'Product Designer',
    communityIds: ['c-greenpark', 'c-cowork'],
    trustScore: 89,
    skills: ['UX research', 'Portfolio reviews'],
    credits: 280,
    bio: 'Designer in Green Park. Offers portfolio reviews to students.',
  },
  {
    id: 'u-kabir',
    name: 'Kabir Singh',
    initials: 'KS',
    role: 'Hostel Warden Rep',
    communityIds: ['c-aravali'],
    trustScore: 97,
    skills: ['Event planning', 'First aid'],
    credits: 820,
    bio: 'Keeps Aravali Hostel running. Ask me about anything hostel-related.',
  },
  {
    id: 'u-meera',
    name: 'Meera Nair',
    initials: 'MN',
    role: 'Software Engineer',
    communityIds: ['c-cowork', 'c-greenpark'],
    trustScore: 91,
    skills: ['Interview prep', 'System design'],
    credits: 455,
    bio: 'Mentors students on placement prep.',
  },
  {
    id: 'u-dev',
    name: 'Dev Chauhan',
    initials: 'DC',
    role: 'B.Sc Physics, 1st year',
    communityIds: ['c-iitd'],
    trustScore: 78,
    skills: ['Guitar', 'Photography'],
    credits: 90,
    bio: 'New to campus, keen to meet people and share what I have.',
  },
]

export const communities: Community[] = [
  {
    id: 'c-iitd',
    name: 'IIT Delhi Campus',
    type: 'College',
    members: 2840,
    location: 'Hauz Khas, New Delhi',
    description:
      'Students, researchers and staff sharing textbooks, lab gear and academic guidance across departments.',
    trust: 94,
    tags: ['Textbooks', 'Lab gear', 'Mentoring'],
    activeListings: 312,
  },
  {
    id: 'c-aravali',
    name: 'Aravali Hostel',
    type: 'Hostel',
    members: 420,
    location: 'IIT Delhi, Block A',
    description:
      'A close-knit hostel community for day-to-day essentials, rides, and late-night study help.',
    trust: 96,
    tags: ['Essentials', 'Rides', 'Study groups'],
    activeListings: 86,
  },
  {
    id: 'c-greenpark',
    name: 'Green Park Residents',
    type: 'Residential',
    members: 1180,
    location: 'Green Park, New Delhi',
    description:
      'Families and professionals lending tools, appliances and sharing local recommendations.',
    trust: 90,
    tags: ['Tools', 'Appliances', 'Local tips'],
    activeListings: 154,
  },
  {
    id: 'c-cowork',
    name: 'Nehru Place Co-work Hub',
    type: 'Workplace',
    members: 640,
    location: 'Nehru Place, New Delhi',
    description:
      'Founders and remote workers exchanging equipment, referrals and career guidance.',
    trust: 88,
    tags: ['Equipment', 'Referrals', 'Careers'],
    activeListings: 97,
  },
  {
    id: 'c-safdarjung',
    name: 'Safdarjung Enclave Neighbours',
    type: 'Neighbourhood',
    members: 930,
    location: 'Safdarjung Enclave, New Delhi',
    description:
      'Neighbours helping neighbours with errands, kitchenware and weekend sports gear.',
    trust: 87,
    tags: ['Kitchen', 'Sports', 'Errands'],
    activeListings: 121,
  },
  {
    id: 'c-dtu',
    name: 'DTU Makers Club',
    type: 'College',
    members: 510,
    location: 'Rohini, New Delhi',
    description:
      'Hardware tinkerers sharing components, tools and project mentorship across colleges.',
    trust: 92,
    tags: ['Electronics', 'Projects', 'Workshops'],
    activeListings: 74,
  },
]

export const initialResources: Resource[] = [
  {
    id: 'r-1',
    title: 'Introduction to Algorithms (CLRS), 3rd Edition',
    category: 'Books',
    description:
      'Well-kept copy with light pencil notes in chapters 15–16. Perfect for DSA course or placement prep.',
    ownerId: ME_ID,
    communityId: 'c-iitd',
    distanceKm: 0.4,
    condition: 'Good',
    availability: 'Available',
    mode: 'Lend',
    credits: 20,
    postedAt: '2 days ago',
  },
  {
    id: 'r-2',
    title: 'Arduino Uno Starter Kit',
    category: 'Electronics',
    description:
      'Board, breadboard, jumper wires, sensors and LEDs. Great for first robotics project.',
    ownerId: 'u-arjun',
    communityId: 'c-iitd',
    distanceKm: 0.8,
    condition: 'Like new',
    availability: 'Available',
    mode: 'Lend',
    credits: 35,
    postedAt: '5 hours ago',
  },
  {
    id: 'r-3',
    title: 'Bosch Cordless Drill Set',
    category: 'Tools',
    description: '18V drill with two batteries and a full bit set. Return within 3 days please.',
    ownerId: 'u-sneha',
    communityId: 'c-greenpark',
    distanceKm: 2.1,
    condition: 'Good',
    availability: 'Available',
    mode: 'Lend',
    credits: 30,
    postedAt: '1 day ago',
  },
  {
    id: 'r-4',
    title: 'Study Table with Lamp',
    category: 'Furniture',
    description: 'Moving out of the hostel. Sturdy wooden study table, free to a good home.',
    ownerId: 'u-kabir',
    communityId: 'c-aravali',
    distanceKm: 0.2,
    condition: 'Fair',
    availability: 'Available',
    mode: 'Give away',
    credits: 15,
    postedAt: '3 days ago',
  },
  {
    id: 'r-5',
    title: 'Mock Interview Session (System Design)',
    category: 'Skills',
    description: '45-minute mock interview with written feedback. Evenings and weekends.',
    ownerId: 'u-meera',
    communityId: 'c-cowork',
    distanceKm: 4.6,
    condition: 'New',
    availability: 'Available',
    mode: 'Exchange',
    credits: 50,
    postedAt: '6 hours ago',
  },
  {
    id: 'r-6',
    title: 'Badminton Racquets (pair) + Shuttles',
    category: 'Sports',
    description: 'Yonex racquets with a tube of feather shuttles. Weekend use.',
    ownerId: 'u-dev',
    communityId: 'c-iitd',
    distanceKm: 0.6,
    condition: 'Good',
    availability: 'Reserved',
    mode: 'Lend',
    credits: 10,
    postedAt: '1 week ago',
  },
  {
    id: 'r-7',
    title: 'Induction Cooktop',
    category: 'Kitchen',
    description: 'Prestige induction cooktop, works perfectly. Ideal for hostel late-night maggi.',
    ownerId: 'u-sneha',
    communityId: 'c-greenpark',
    distanceKm: 2.3,
    condition: 'Like new',
    availability: 'Available',
    mode: 'Exchange',
    credits: 25,
    postedAt: '4 days ago',
  },
  {
    id: 'r-8',
    title: 'Graphing Calculator TI-84',
    category: 'Electronics',
    description: 'Handy for engineering maths exams. Batteries included.',
    ownerId: 'u-arjun',
    communityId: 'c-dtu',
    distanceKm: 9.2,
    condition: 'Good',
    availability: 'Lent',
    mode: 'Lend',
    credits: 20,
    postedAt: '2 weeks ago',
  },
]

export const initialRequests: HelpRequest[] = [
  {
    id: 'q-1',
    title: 'Need a scientific calculator for tomorrow’s exam',
    description: 'Forgot mine at home. Will return right after the 2pm exam.',
    category: 'Electronics',
    urgency: 'High',
    requesterId: 'u-dev',
    communityId: 'c-iitd',
    distanceKm: 0.5,
    status: 'Open',
    createdAt: '20 min ago',
    responses: 2,
  },
  {
    id: 'q-2',
    title: 'Looking for guidance on internship applications',
    description: 'Second-year student wanting advice on resume and where to apply for SWE internships.',
    category: 'Guidance',
    urgency: 'Medium',
    requesterId: ME_ID,
    communityId: 'c-iitd',
    distanceKm: 0,
    status: 'Matched',
    createdAt: '1 day ago',
    responses: 4,
  },
  {
    id: 'q-3',
    title: 'Ladder for fixing a ceiling fan',
    description: 'Need a 6ft ladder for an hour this Saturday morning.',
    category: 'Tools',
    urgency: 'Low',
    requesterId: 'u-sneha',
    communityId: 'c-greenpark',
    distanceKm: 2.0,
    status: 'Open',
    createdAt: '3 hours ago',
    responses: 1,
  },
  {
    id: 'q-4',
    title: 'Someone to review my product design portfolio',
    description: 'Applying for UX roles next month. Would love 30 minutes of feedback.',
    category: 'Guidance',
    urgency: 'Medium',
    requesterId: 'u-dev',
    communityId: 'c-iitd',
    distanceKm: 0.7,
    status: 'Open',
    createdAt: '5 hours ago',
    responses: 0,
  },
  {
    id: 'q-5',
    title: 'Extra mattress for visiting parents',
    description: 'Parents visiting for convocation, need a spare mattress for 2 nights.',
    category: 'Furniture',
    urgency: 'High',
    requesterId: 'u-kabir',
    communityId: 'c-aravali',
    distanceKm: 0.3,
    status: 'Open',
    createdAt: '1 hour ago',
    responses: 3,
  },
]

export const initialExchanges: Exchange[] = [
  {
    id: 'e-1',
    resourceId: 'r-1',
    requesterId: 'u-dev',
    ownerId: ME_ID,
    status: 'Requested',
    date: 'Today',
    note: 'Need it for my DSA midterm next week.',
  },
  {
    id: 'e-2',
    resourceId: 'r-2',
    requesterId: ME_ID,
    ownerId: 'u-arjun',
    status: 'Approved',
    date: 'Yesterday',
  },
  {
    id: 'e-3',
    resourceId: 'r-5',
    requesterId: ME_ID,
    ownerId: 'u-meera',
    status: 'Completed',
    date: 'Last week',
  },
]

export const initialConversations: Conversation[] = [
  {
    id: 'm-1',
    personId: 'u-arjun',
    topic: 'Arduino Uno Starter Kit',
    unread: 2,
    messages: [
      { from: 'me', text: 'Hi Arjun! Is the Arduino kit still available?', time: '10:02' },
      { from: 'them', text: 'Yes! I approved your request. Pick it up from the robotics lab?', time: '10:15' },
      { from: 'them', text: 'I’ll be there till 6pm today.', time: '10:16' },
    ],
  },
  {
    id: 'm-2',
    personId: 'u-meera',
    topic: 'Internship guidance',
    unread: 0,
    messages: [
      { from: 'them', text: 'Saw your request about internships. Happy to help!', time: 'Yesterday' },
      { from: 'me', text: 'That would be amazing, thank you so much.', time: 'Yesterday' },
      { from: 'them', text: 'Share your resume and we can do a call on Sunday.', time: 'Yesterday' },
    ],
  },
  {
    id: 'm-3',
    personId: 'u-dev',
    topic: 'CLRS textbook',
    unread: 1,
    messages: [
      { from: 'them', text: 'Hey Riya, could I borrow your CLRS for a week?', time: '09:40' },
    ],
  },
]

export const initialNotifications: Notification[] = [
  {
    id: 'n-1',
    type: 'exchange',
    title: 'New exchange request',
    body: 'Dev Chauhan wants to borrow “Introduction to Algorithms (CLRS)”.',
    time: '12 min ago',
    read: false,
    href: '/requests',
  },
  {
    id: 'n-2',
    type: 'message',
    title: 'Arjun Mehta sent you a message',
    body: '“I’ll be there till 6pm today.”',
    time: '1 hour ago',
    read: false,
    href: '/messages',
  },
  {
    id: 'n-3',
    type: 'credit',
    title: '+50 contribution credits',
    body: 'Your exchange with Meera Nair was marked complete.',
    time: 'Yesterday',
    read: false,
  },
  {
    id: 'n-4',
    type: 'community',
    title: 'Aravali Hostel posted an update',
    body: 'Community study night this Friday at the common room.',
    time: '2 days ago',
    read: true,
    href: '/communities/c-aravali',
  },
  {
    id: 'n-5',
    type: 'request',
    title: 'A nearby need matches your skills',
    body: 'Dev Chauhan is looking for a portfolio review.',
    time: '3 days ago',
    read: true,
    href: '/discover',
  },
]

export const categories: ResourceCategory[] = [
  'Books',
  'Electronics',
  'Tools',
  'Furniture',
  'Sports',
  'Kitchen',
  'Skills',
]

export function getPerson(id: string) {
  return people.find((p) => p.id === id)
}

export function getCommunity(id: string) {
  return communities.find((c) => c.id === id)
}
