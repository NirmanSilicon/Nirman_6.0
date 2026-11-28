/**
 * Landing Page Content & Configuration
 *
 * ALL visible strings, placeholders, and configuration values live here.
 */

export interface GorideLink {
  label: string;
  href: string;
}

export interface GorideCta extends GorideLink {
  hover: string;
}

export interface GorideBrand {
  name: string;
  href: string;
}

export interface GorideNav {
  links: GorideLink[];
  signIn: GorideLink;
  cta: GorideCta;
}

export interface GorideCopy {
  headline: string;
  phrases: string[];
  phraseEvery: number;
  lede: string;
  primary: GorideCta;
  secondary: GorideLink;
  stores: { id: string; label: string; href: string }[];
  rating: string;
  ratingNote: string;
  stat: { value: string; label: string };
  riders: { name: string; src: string }[];
}

export interface GorideLive {
  cities: { name: string; rides: number }[];
  every: number;
}

export interface GorideDriver {
  name: string;
  initials: string;
  rating: string;
  trips: string;
  plate: string;
  pin: string;
}

export interface GoridePayment {
  method: string;
  note: string;
}

export interface GorideRideType {
  id: string;
  label: string;
  price: number;
  vehicle: string;
}

export interface GorideDistrict {
  name: string;
  x: number;
  y: number;
}

export interface GoridePhoneLabels {
  time: string;
  userAvatar: string;
  pickupLabel: string;
  dropoffPlaceholder: string;
  chooseRide: string;
  rideToPrefix: string;
  minTripSuffix: string;
  nearbySuffix: string;
  nearestPrefix: string;
  findingDriver: string;
  holdToBookPrefix: string;
  holdToBookKeyHint: string;
  arrivingInPrefix: string;
  rideHere: string;
  pinPrefix: string;
  onTripHeader: string;
  minToPrefix: string;
  welcomePrefix: string;
  paidPrefix: string;
  withConjunction: string;
  thanksNote: string;
  ratePrefix: string;
  thanksFeedback: string;
  callAction: string;
  chatAction: string;
  shareAction: string;
  shareTripAction: string;
  safetyAction: string;
  cursorGoTo: string;
  availableOn: string;
  liveTag: string;
  ridesOnRoad: string;
  ridesLiveIn: string;
}

export interface GorideTheme {
  page: string;
  panel: string;
  card: string;
  ink: string;
  grey: string;
  line: string;
  accent: string;
  accentSoft: string;
  mapBlock: string;
  mapRoad: string;
  mapPark: string;
  mapWater: string;
  paperBlock: string;
  paperWater: string;
  paperPark: string;
}

export interface TourPoint {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tag: string;
}

export interface StepItem {
  step: string;
  title: string;
  description: string;
}

export interface AudienceItem {
  role: string;
  title: string;
  description: string;
  badge: string;
}

export interface UpcomingFeature {
  title: string;
  description: string;
  status: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface GorideProps {
  className?: string;
  theme?: Partial<GorideTheme>;
  brand?: Partial<GorideBrand>;
  nav?: Partial<GorideNav>;
  copy?: Partial<GorideCopy>;
  live?: Partial<GorideLive>;
  driver?: Partial<GorideDriver>;
  payment?: Partial<GoridePayment>;
  tagline?: string;
  reducedMotion?: boolean;
}

// COLOURS:
// Golden yellow #F5C518 as main accent
// Soft golden cream #FFF6D6 for backgrounds
// Charcoal #1F1C28 for text & dark buttons
export const THEME: GorideTheme = {
  page: "#FFF6D6",
  panel: "#FFF9E5",
  card: "#FFFFFF",
  ink: "#1F1C28",
  grey: "#615C70",
  line: "rgba(31, 28, 40, 0.12)",
  accent: "#F5C518",
  accentSoft: "#FDECA8",
  mapBlock: "#F5ECD0",
  mapRoad: "#FFFFFF",
  mapPark: "#E2ECC8",
  mapWater: "#D1E2EC",
  paperBlock: "#F7EFCF",
  paperWater: "#DDEAF0",
  paperPark: "#E8F0D3",
};

export const BRAND: GorideBrand = {
  name: "ParkSMART",
  href: "/",
};

export const NAV: GorideNav = {
  links: [
    { label: "Tour", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Portals", href: "#who-it-is-for" },
    { label: "FAQ", href: "#faq" },
    { label: "Register", href: "/register" },
  ],
  signIn: {
    label: "Log in",
    href: "/login",
  },
  cta: {
    label: "Try a Demo",
    hover: "Sign In",
    href: "/login",
  },
};

export const COPY: GorideCopy = {
  headline: "Parking, transformed",
  phrases: [
    "real-time spots",
    "predictive arrivals",
    "smart loading zones",
    "city-wide control",
  ],
  phraseEvery: 2.8,
  lede: "Unified smart parking infrastructure for urban spaces. Real-time slot detection, predictive analytics, and seamless operations for city administrators, field teams, business operators, and drivers.",
  primary: {
    label: "Access Portal",
    hover: "Sign In",
    href: "/login",
  },
  secondary: {
    label: "Register Account",
    href: "/register",
  },
  stores: [],
  rating: "",
  ratingNote: "",
  stat: {
    value: "",
    label: "",
  },
  riders: [],
};

export const LIVE: GorideLive = {
  cities: [
    { name: "Central Zone", rides: 84 },
    { name: "Commercial Hub", rides: 62 },
    { name: "Transit Plaza", rides: 95 },
  ],
  every: 3.2,
};

export const DRIVER: GorideDriver = {
  name: "Active Officer",
  initials: "PS",
  rating: "4.9",
  trips: "1.2k spots managed",
  plate: "OD-02-SMART",
  pin: "2480",
};

export const PAYMENT: GoridePayment = {
  method: "Smart Booking",
  note: "Pre-allocated stall reservation",
};

export const TAGLINE = "Smart parking infrastructure";

export const ROADS: string[] = [
  "Janpath",
  "Sachivalaya Marg",
  "Rajpath",
  "Bidyut Marg",
  "Madhusudan Marg",
  "Udyan Marg",
  "Ekra Road",
];

export const DISTRICTS: GorideDistrict[] = [
  { name: "Zone 1 - Central", x: 0.55, y: 0.26 },
  { name: "Zone 2 - Market Hub", x: 0.87, y: 0.2 },
  { name: "Zone 3 - Civic Centre", x: 0.66, y: 0.56 },
  { name: "Zone 4 - Station Plaza", x: 0.91, y: 0.66 },
  { name: "Zone 5 - Commercial North", x: 0.5, y: 0.84 },
  { name: "Zone 6 - Terminal South", x: 0.8, y: 0.93 },
];

export const RIDES: GorideRideType[] = [
  { id: "car", label: "Standard Bay", price: 1, vehicle: "Sedan / Hatchback" },
  { id: "xl", label: "Commercial Bay", price: 1.5, vehicle: "Loading / Heavy" },
  { id: "bike", label: "Two-Wheeler", price: 0.4, vehicle: "Motorcycle / EV" },
];

export const PHONE_LABELS: GoridePhoneLabels = {
  time: "9:41",
  userAvatar: "You",
  pickupLabel: "Location",
  dropoffPlaceholder: "Tap the city map to inspect bay",
  chooseRide: "Select Bay Type",
  rideToPrefix: "Bay at",
  minTripSuffix: "min access",
  nearbySuffix: "available nearby",
  nearestPrefix: "closest stall",
  findingDriver: "Allocating smart bay...",
  holdToBookPrefix: "Hold to Reserve",
  holdToBookKeyHint: "Press and hold to reserve spot",
  arrivingInPrefix: "Reserved stall active in",
  rideHere: "Bay reservation confirmed",
  pinPrefix: "BAY ID",
  onTripHeader: "Bay Navigation Active",
  minToPrefix: "min drive to",
  welcomePrefix: "Arrived at",
  paidPrefix: "Confirmed",
  withConjunction: "via",
  thanksNote: "stall secured safely",
  ratePrefix: "Rate Bay",
  thanksFeedback: "Thank you for parking responsibly!",
  callAction: "Contact",
  chatAction: "Support",
  shareAction: "Directions",
  shareTripAction: "Share Bay",
  safetyAction: "Security",
  cursorGoTo: "Inspect",
  availableOn: "",
  liveTag: "LIVE SENSORS",
  ridesOnRoad: "slots monitored in",
  ridesLiveIn: "slots free in",
};

// Section A: Feature Tour
export const TOUR_POINTS: TourPoint[] = [
  {
    id: "live-map",
    title: "Live Parking Map",
    subtitle: "Real-time occupancy across every municipal zone",
    description: "Camera feeds and magnetometer sensors report spot availability every few seconds. Interactive GIS color-coding highlights free, occupied, and loading-restricted stalls instantly.",
    tag: "Sub-Second Updates",
  },
  {
    id: "predictions",
    title: "Busy-Time Predictions",
    subtitle: "AI occupancy forecasting and turnover trends",
    description: "Anticipate parking congestion 2 to 6 hours ahead using historical machine learning models that factor in day-of-week trends, weather, civic events, and peak traffic corridors.",
    tag: "Predictive Analytics",
  },
  {
    id: "loading-zones",
    title: "Loading-Zone Booking",
    subtitle: "Scheduled curbside commercial bay allocations",
    description: "Local shopkeepers, delivery drivers, and freight couriers book time-stamped curbside loading slots to eliminate double-parking, avoid traffic penalties, and maintain smooth flow.",
    tag: "Commercial Logistics",
  },
  {
    id: "device-health",
    title: "Camera & Device Checks",
    subtitle: "Automated telemetry and sensor diagnostics",
    description: "Field operators track battery voltages, camera heartbeat health, network signal strength, and optical degradation from a centralized field dashboard with instant fault alerts.",
    tag: "Field Telemetry",
  },
];

// Section B: How It Works
export const HOW_IT_WORKS_STEPS: StepItem[] = [
  {
    step: "01",
    title: "Find Free Spots",
    description: "Check city zones on the real-time map or let the automated navigation guide you to the closest available on-street or multi-level parking bay.",
  },
  {
    step: "02",
    title: "Book & Reserve",
    description: "Commercial freight operators and registered users reserve specific stalls or dedicated loading zones with verified time windows.",
  },
  {
    step: "03",
    title: "Park with Confidence",
    description: "Drive directly to your reserved stall. Smart barrier sensors and optical detection log occupancy automatically without paper slips.",
  },
];

// Section C: Who It Is For
export const AUDIENCE_ITEMS: AudienceItem[] = [
  {
    role: "City Administrators",
    title: "Municipal & City Planners",
    description: "Monitor real-time revenue, curbside dwell duration, enforce parking rules cleanly, and plan urban mobility using objective occupancy data.",
    badge: "Municipal Portal",
  },
  {
    role: "Field Technicians",
    title: "IoT & Maintenance Crews",
    description: "Receive automated alerts on malfunctioning cameras, offline ultrasonic sensors, or low-battery edge nodes with precise GPS coordinates.",
    badge: "Field Operations",
  },
  {
    role: "Shopkeepers & Traders",
    title: "Commercial Businesses",
    description: "Book designated loading bays for supplier trucks and daily store inventory drop-offs without cluttering customer shopping lanes.",
    badge: "Business Portal",
  },
  {
    role: "Daily Commuters",
    title: "Everyday Drivers",
    description: "Stop circling the block. Glance at live availability maps, navigate directly to open bays, and eliminate parking anxiety during peak hours.",
    badge: "Driver App",
  },
];

// Section D: Driver App Preview
export const DRIVER_APP_CONTENT = {
  headline: "ParkSMART Mobile Companion",
  subheadline: "Real-time navigation, spot verification, and contactless entry in the palm of your hand.",
  points: [
    "Turn-by-turn guidance to free parking stalls",
    "Interactive parking zone color meters (Green / Orange / Red)",
    "Instant booking confirmation & bay timers",
    "Seamless direction sync with favorite map navigators",
  ],
};

// Section E: Coming Soon
export const UPCOMING_FEATURES: UpcomingFeature[] = [
  {
    title: "Online Digital Payments",
    description: "UPI, FASTag, credit card, and digital municipal wallet integrations for automated, ticketless departure.",
    status: "In Testing",
  },
  {
    title: "Instant Parking Alerts",
    description: "Proactive SMS and push notifications when favorite street slots free up or when parking meters near expiration.",
    status: "Next Release",
  },
  {
    title: "EV Charging Bay Integration",
    description: "Dedicated electric vehicle spot booking with real-time kilowatt charging status and plug availability.",
    status: "Development",
  },
  {
    title: "Odia & Hindi Language Support",
    description: "Complete localized accessibility for all citizen portals, mobile apps, and municipal public interfaces.",
    status: "Scheduled",
  },
];

// Section F: FAQ
export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How does ParkSMART detect open parking bays?",
    answer: "ParkSMART uses edge-computing camera sensors along with low-power magnetic surface sensors embedded in municipal bays. Occupancy states update securely every few seconds to reflect real-world vehicle movements.",
  },
  {
    question: "Who can access the different portals?",
    answer: "Municipal staff access the municipal dashboard for city analytics and pricing controls. Field teams use the devices portal to maintain hardware. Local businesses access loading zone booking, and drivers use the citizen interface.",
  },
  {
    question: "Can commercial delivery vans reserve loading bays?",
    answer: "Yes. Registered business operators and logistics logistics drivers can reserve designated loading bays in advance during permitted loading hours to prevent congestion.",
  },
  {
    question: "How do I test the platform right now?",
    answer: "You can click 'Try a Demo' or 'Log in' in the navigation bar to test the pre-configured Municipal, Field, and Business operator portals with one-click sandbox accounts.",
  },
  {
    question: "Does the system work during bad weather or network dropouts?",
    answer: "Yes. ParkSMART edge nodes buffer status telemetry locally. When network connection fluctuates, cached availability models predict turnover with high confidence until connectivity resumes.",
  },
];

// Section G: Final CTA & Footer
export const FINAL_CTA = {
  badge: "Ready for Smarter Urban Mobility",
  title: "Experience ParkSMART Today",
  description: "Explore the live dashboard portals, examine zone telemetry, or test loading bay reservations directly in demo mode.",
  primaryButton: "Try a Demo",
  primaryHref: "/login",
  secondaryButton: "Register Account",
  secondaryHref: "/register",
};

export const FOOTER_CONTENT = {
  brand: "ParkSMART",
  tagline: "Intelligent Urban Parking Infrastructure",
  copyright: `© ${new Date().getFullYear()} ParkSMART System. All rights reserved.`,
  links: [
    { label: "Municipal Portal", href: "/login" },
    { label: "Field Operations", href: "/login" },
    { label: "Business Hub", href: "/login" },
    { label: "Register Account", href: "/register" },
  ],
};

export const DEFAULT_CONTENT = {
  brand: BRAND,
  nav: NAV,
  copy: COPY,
  live: LIVE,
  driver: DRIVER,
  payment: PAYMENT,
  tagline: TAGLINE,
  tourPoints: TOUR_POINTS,
  howItWorks: HOW_IT_WORKS_STEPS,
  audience: AUDIENCE_ITEMS,
  driverApp: DRIVER_APP_CONTENT,
  upcoming: UPCOMING_FEATURES,
  faq: FAQ_ITEMS,
  finalCta: FINAL_CTA,
  footer: FOOTER_CONTENT,
  reducedMotion: undefined as boolean | undefined,
};

export type GorideContent = typeof DEFAULT_CONTENT;

export const CITY = {
  spacing: 46,
  spacingSmall: 38,
  spacingLarge: 58,
  angle: -12,
  avenueEvery: 4,
  centerY: 0.55,
  roads: ROADS,
  districts: DISTRICTS,
  parks: [
    { x: 0.6, y: 0.4 },
    { x: 0.84, y: 0.82 },
    { x: 0.44, y: 0.62 },
    { x: 0.74, y: 0.12 },
  ],
};

export const LENS = {
  zoom: 1.45,
  pinY: 0.43,
};

export const CARS = {
  count: 12,
  cruise: 0.9,
  dispatch: 2.4,
  minutesPerBlock: 0.45,
  nearby: 6,
};

export const FARE = {
  base: 4.5,
  perBlock: 0.85,
  minutesPerBlock: 0.6,
};

export const CURRENCY = { locale: "en-US", code: "USD" };

export const BOOKING = {
  search: 1.2,
  pickup: 1.8,
  hold: 3.5,
  press: 0.7,
};

export const SPLASH = {
  hold: 1.7,
  shrink: 0.9,
  fade: 0.45,
  skip: "(max-width: 767px)",
};

export const INTRO_AT = SPLASH.hold + SPLASH.shrink * 0.6;

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
