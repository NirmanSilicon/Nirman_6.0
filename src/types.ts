export type UserRole = 'USER' | 'AUDITOR' | 'ADMIN' | 'SUPER_ADMIN';

export type GenderOption = 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY' | 'OTHER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  gender?: GenderOption | string;
  avatarUrl?: string;
  badge?: string;
  certificationId?: string;
  joinedDate: string;
  savedDestinations: string[];
  offlineTripsCount: number;
  accessibilityNeeds: string[];
}

export interface AccessibilityProfile {
  wheelchairUser: boolean;
  limitedMobility: boolean;
  walkingAssistance: boolean;
  visualAssistance: boolean;
  hearingAssistance: boolean;
  cognitiveFriendly: boolean;
  elderFriendly: boolean;
  temporaryInjury: boolean;
  familyWithStroller: boolean;
  avoidStairs: boolean;
  maxWalkingDistanceMeters: number;
  accessibleToiletRequired: boolean;
  liftPreferred: boolean;
  crowdPreference: 'LOW' | 'NEUTRAL' | 'ANY';
  assistancePreferred: boolean;
  audioNavigationEnabled: boolean;
  largeTextEnabled: boolean;
  highContrastEnabled: boolean;
  voiceGuidanceEnabled: boolean;
  simpleMode: boolean;
  shareDataWithAuditors: boolean;
}

export type VerificationStatus =
  | 'VERIFIED'
  | 'COMMUNITY_REPORTED'
  | 'PENDING_VERIFICATION'
  | 'OUTDATED'
  | 'UNCERTAIN';

export interface AccessibilityFacilities {
  wheelchairEntrance: boolean;
  accessibleEntrance: boolean;
  ramp: boolean;
  stairs: boolean;
  elevatorLift: boolean;
  accessibleToilet: boolean;
  accessibleParking: boolean;
  accessiblePublicTransport: boolean;
  audioAssistance: boolean;
  visualSignage: boolean;
  brailleSignage: boolean;
  hearingAssistance: boolean;
  quietAreas: boolean;
  restAreas: boolean;
  seatingAvailable: boolean;
  assistanceAvailability: boolean;
  pathSurface: string; // 'Smooth Concrete' | 'Paved Stone' | 'Tactile Paving' | 'Gravel'
  entranceWidthCm: number;
  accessibilityNotes: string;
  verificationStatus: VerificationStatus;
  lastVerifiedDate: string;
  verifiedBy: string;
  confidence: number; // 0-100%
}

export interface AccessibilityScoreBreakdown {
  overall: number; // 0-100
  wheelchairAccess: number;
  ramp: number;
  lift: number;
  accessibleToilet: number;
  pathAccessibility: number;
  assistance: number;
  barrierStatus: number;
  disclaimer: string;
}

export type WeatherHazardLevel = 'OPTIMAL' | 'ADVISORY' | 'WARNING' | 'CRITICAL';
export type WeatherHazardType =
  | 'NONE'
  | 'RAIN_SLIP'
  | 'SNOW_ICE'
  | 'HIGH_WIND'
  | 'THUNDERSTORM'
  | 'EXTREME_HEAT'
  | 'EXTREME_COLD';

export interface HourlyWeatherPoint {
  time: string;
  tempC: number;
  precipitationProbability: number;
  precipitationMm: number;
  snowfallCm: number;
  condition: string;
  windSpeedKmh: number;
  isRaining: boolean;
  isSnowing: boolean;
  hazardLevel: WeatherHazardLevel;
}

export interface WeatherData {
  temperatureC: number;
  temperatureF: number;
  apparentTemperatureC?: number;
  condition: string; // 'Sunny' | 'Partly Cloudy' | 'Rainy' | 'Windy' | 'Storm' | 'Snowy'
  weatherCode?: number;
  rainProbability: number;
  precipitationMm?: number;
  snowfallCm?: number;
  windSpeedKmh: number;
  windGustsKmh?: number;
  relativeHumidity?: number;
  visibilityKm: number;
  accessibilityImpact: string;
  bestVisitWindow: string;
  warning?: string;
  hazardLevel?: WeatherHazardLevel;
  hazardType?: WeatherHazardType;
  hazardTitle?: string;
  hazardDescription?: string;
  delayMinutes?: number;
  surfaceTractionScore?: number; // 0-100%
  outdoorExposureRisk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  recommendedMitigation?: string;
  isRealTime?: boolean;
  lastUpdated?: string;
  hourlyForecast?: HourlyWeatherPoint[];
}

export type CrowdLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export interface CrowdData {
  currentLevel: CrowdLevel;
  trend: 'increasing' | 'stable' | 'decreasing';
  peakHours: string;
  quietHours: string;
  occupancyPercent: number;
}

export interface AssistancePoint {
  id: string;
  name: string;
  category: 'HELP_DESK' | 'ACCESSIBLE_TRANSIT' | 'MEDICAL_EMERGENCY' | 'ACCESSIBLE_RESTROOM' | 'WHEELCHAIR_SERVICE';
  location: string;
  coordinates: [number, number]; // [lat, lng]
  openingHours: string;
  services: string[];
  contactPhone: string;
  emergencyContact: string;
  verificationStatus: VerificationStatus;
  confidence: number;
  distanceMeters?: number;
}

export type DestinationCategory =
  | 'HERITAGE'
  | 'MUSEUM'
  | 'PARK'
  | 'TRANSPORT_HUB'
  | 'HOTEL'
  | 'RESTAURANT'
  | 'HOSPITAL'
  | 'RELIGIOUS'
  | 'NATURAL_ATTRACTION'
  | 'LANDMARK'
  | 'THEME_PARK'
  | 'BEACH'
  | 'VIEWPOINT'
  | string;

export interface Destination {
  id: string;
  name: string;
  localName?: string;
  country: string;
  state?: string;
  continent?: 'Asia' | 'Europe' | 'North America' | 'South America' | 'Africa' | 'Oceania' | string;
  city: string;
  category: DestinationCategory;
  attractionType?: string;
  tags?: string[];
  coordinates: [number, number];
  imageUrl: string;
  description: string;
  accessibilityScore: AccessibilityScoreBreakdown;
  facilities: AccessibilityFacilities;
  currentBarriersCount: number;
  crowd: CrowdData;
  weather: WeatherData;
  bestAccessibleTime: string;
  openingHours: string;
  address: string;
  assistancePoints: AssistancePoint[];
  verificationStatus: VerificationStatus;
  lastUpdated: string;
}

export type BarrierType =
  | 'BLOCKED_RAMP'
  | 'LIFT_NOT_WORKING'
  | 'ACCESSIBLE_ENTRANCE_CLOSED'
  | 'ROAD_OBSTRUCTION'
  | 'CONSTRUCTION'
  | 'ACCESSIBLE_TOILET_UNAVAILABLE'
  | 'BROKEN_PAVEMENT'
  | 'STAIRS_BLOCKING_ROUTE'
  | 'CROWDING'
  | 'TEMPORARY_PARKING_OBSTRUCTION'
  | 'TRANSPORT_ACCESSIBILITY_FAILURE'
  | 'OTHER';

export type BarrierStatus =
  | 'REPORTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'ACTIVE_BARRIER'
  | 'RESOLVED'
  | 'REVERIFIED';

export type EvidenceType = 'PHOTO' | 'VIDEO' | 'AUDIT_NOTE' | 'COMMUNITY_REPORT';

export interface AuditHistoryEntry {
  id: string;
  date: string;
  auditorName: string;
  action: 'REPORTED' | 'REVIEWED' | 'VERIFIED' | 'REJECTED' | 'REQUEST_MORE_EVIDENCE' | 'RESOLVED' | 'REVERIFIED';
  notes: string;
}

export interface BarrierReport {
  id: string;
  barrierType: BarrierType;
  title: string;
  description: string;
  destinationId?: string;
  destinationName: string;
  locationName: string;
  coordinates: [number, number];
  reportedDate: string;
  reportedTime: string;
  photoUrl?: string;
  evidenceType: EvidenceType;
  confidence: number; // 1-100
  status: BarrierStatus;
  reportedBy: {
    userId: string;
    userName: string;
    isAuditor?: boolean;
  };
  aiAnalysis?: {
    detectedIssues: string[];
    aiConfidence: number;
    disclaimer: string;
  };
  auditHistory: AuditHistoryEntry[];
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  isStepFree: boolean;
  hasRamp: boolean;
  hasElevator: boolean;
  surface: string;
  barrierWarning?: string;
  coordinates: [number, number];
}

export interface RouteOption {
  id: string;
  name: string;
  tag: 'FASTEST' | 'RECOMMENDED' | 'LOWEST_CROWD' | 'STEP_FREE_ALTERNATIVE' | 'ELEVATOR_PRIORITY';
  distanceKm: number;
  durationMinutes: number;
  accessibilityScore: number; // 0-100
  crowdLevel: CrowdLevel;
  stairsCount: number;
  rampAvailable: boolean;
  liftAvailable: boolean;
  currentBarriers: boolean;
  barrierDetails?: string;
  assistanceAvailable: boolean;
  isBestMatch: boolean;
  suitabilityNote: string;
  steps: RouteStep[];
  pathCoordinates: [number, number][];
  keyBenefits?: string[];
  tradeoffs?: string[];
  surfaceType?: string;
  transitType?: string;
  energyEffort?: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH';
  restStopsFrequency?: string;
  audioGuidanceReady?: boolean;
}

export interface JourneyPlanRequest {
  startLocation: string;
  startCoords?: [number, number];
  destinationId: string;
  destinationName?: string;
  destinationCoords?: [number, number];
  travelDate: string;
  startTime: string;
  endTime: string;
  travelersCount: number;
  profile: AccessibilityProfile;
  transportPreference: 'WALK_ROLL' | 'ACCESSIBLE_METRO' | 'WHEELCHAIR_TAXI' | 'BUS';
  crowdPreference: 'LOW' | 'NEUTRAL' | 'ANY';
  weatherPreference: boolean;
  assistanceRequired: boolean;
}

export interface NotificationItem {
  id: string;
  type: 'BARRIER_ALERT' | 'ROUTE_UPDATE' | 'WEATHER_ALERT' | 'ASSISTANCE_CONFIRMED' | 'VERIFICATION_UPDATE' | 'EMERGENCY_ALERT';
  title: string;
  message: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  read: boolean;
  relatedDestinationId?: string;
  hasAlternativeRoute?: boolean;
}

export interface AdminAnalytics {
  totalDestinations: number;
  verifiedLocations: number;
  pendingReports: number;
  activeBarriers: number;
  resolvedBarriers: number;
  unverifiedDestinations: number;
  averageAccessibilityScore: number;
  totalUsersServed: number;
  barrierTypesDistribution: { type: BarrierType; count: number }[];
  cityCoverage: { city: string; count: number; score: number }[];
  resolutionAverageHours: number;
  userSatisfactionRate: number;
}

// --- HOTEL & GUEST HOUSE BOOKING TYPES ---

export type PropertyType =
  | 'HOTEL'
  | 'GUEST_HOUSE'
  | 'RESORT'
  | 'HOMESTAY'
  | 'BOUTIQUE_LODGE'
  | 'HOSTEL'
  | 'VILLA'
  | 'MOTEL'
  | 'LODGE';

export type AccessibilityPriorityStatus = 'HIGHLY_ACCESSIBLE' | 'PARTIALLY_ACCESSIBLE' | 'UNAVAILABLE';

export interface RoomOption {
  id: string;
  name: string;
  type: string;
  pricePerNight: number;
  currency: string;
  capacity: number;
  bedType: string;
  doorWidthCm: number;
  rollInShower: boolean;
  showerChair: boolean;
  toiletGrabRails: boolean;
  emergencyPullCord: boolean;
  strobeAlarm: boolean;
  lowHeightControls: boolean;
  balconyStepFree: boolean;
  imageUrl: string;
  availableRooms: number;
  features: string[];
}

export interface HotelAccessibility {
  stepFreeEntrance: boolean;
  entranceRampGradient: string;
  elevatorWithBrailleAudio: boolean;
  elevatorDoorWidthCm: number;
  accessibleParkingSpots: number;
  accessibleRestaurant: boolean;
  brailleMenuAvailable: boolean;
  serviceAnimalReliefArea: boolean;
  trainedStaffPrm24_7: boolean;
  poolHoistLift: boolean;
  sensoryQuietLounge: boolean;
  emergencyEvacuationChair: boolean;
  wheelchairLoanOnsite: boolean;
  overallScore: number; // 0-100
  verifiedBy: string;
  verificationDate: string;
  confidence: number;
  // Detailed flag checklist
  hasStepFreeEntrance?: boolean | null;
  hasElevator?: boolean | null;
  hasRamp?: boolean | null;
  hasAccessibleBathroom?: boolean | null;
  hasAccessibleParking?: boolean | null;
  hasAccessibleTransit?: boolean | null;
  status?: AccessibilityPriorityStatus;
  disclaimer?: string;
}

export interface HotelReview {
  id: string;
  authorName: string;
  authorBadge: string;
  mobilityType: string;
  rating: number;
  date: string;
  comment: string;
  accessibilityHighlights: string[];
  verifiedStay: boolean;
}

export interface Hotel {
  id: string;
  name: string;
  propertyType: PropertyType;
  starRating?: number;
  tagline: string;
  description: string;
  city: string;
  state?: string;
  country: string;
  district?: string;
  postalCode?: string;
  address: string;
  coordinates: [number, number];
  proximityToDestinations: {
    destinationId: string;
    destinationName: string;
    distanceKm: number;
    stepFreePath: boolean;
  }[];
  pricePerNightStarting: number;
  currency: string;
  imageUrl: string;
  galleryImages: string[];
  accessibility: HotelAccessibility;
  accessibilityStatus?: AccessibilityPriorityStatus;
  accessibilityDisclaimer?: string;
  rooms: RoomOption[];
  amenities: string[];
  contactPhone: string;
  contactEmail: string;
  website?: string;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: string;
  reviewsCount: number;
  averageRating: number;
  reviews: HotelReview[];
  dataSource?: string;
}

export interface HotelAutocompleteSuggestion {
  id: string;
  type: 'HOTEL' | 'CITY' | 'COUNTRY' | 'DESTINATION' | 'PROPERTY_TYPE' | 'CHAIN';
  title: string;
  subtitle: string;
  query: string;
  propertyType?: PropertyType;
  country?: string;
  city?: string;
  coordinates?: [number, number];
}

export interface WorldwideHotelSearchResponse {
  results: Hotel[];
  total: number;
  page: number;
  totalPages: number;
  query: string;
  countryFilter?: string;
  cityFilter?: string;
  propertyTypeFilter?: string;
  source: 'API_WORLDWIDE' | 'DATABASE';
}

export interface HotelBooking {
  id: string;
  hotelId: string;
  hotelName: string;
  propertyType: PropertyType;
  hotelAddress: string;
  hotelCity: string;
  hotelImageUrl: string;
  roomId: string;
  roomName: string;
  checkInDate: string;
  checkOutDate: string;
  nightsCount: number;
  guestsCount: number;
  roomCount: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  specialRequests: string[];
  requiresRollInShower: boolean;
  requiresGroundFloor: boolean;
  requiresAirportVanTransfer: boolean;
  totalPrice: number;
  currency: string;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
  paymentMethod?: 'RAZORPAY' | 'PAY_AT_HOTEL';
  paymentStatus?: 'PAID' | 'PENDING' | 'REFUNDED';
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  paidAmount?: number;
  paidCurrency?: string;
  paidAt?: string;
  bookingDate: string;
  qrCodeData: string;
  verificationPin: string;
}

export interface PlannedTrip {
  id: string;
  title: string;
  originName: string;
  originCoords: [number, number] | null;
  originMode: 'CURRENT_LOCATION' | 'CUSTOM';
  destinationId: string;
  destinationName: string;
  destinationCity?: string;
  destinationCountry?: string;
  destinationCoords: [number, number];
  destination: Destination;
  travelDate: string; // DD/MM/YYYY
  startTime: string;  // e.g. "09:30 AM"
  endTime?: string;   // e.g. "01:00 PM"
  travelersCount: number;
  accessibilityScore: number;
  selectedRoute: RouteOption;
  preferences?: {
    profile?: AccessibilityProfile;
    transportPreference?: 'WALK_ROLL' | 'ACCESSIBLE_METRO' | 'WHEELCHAIR_TAXI' | 'BUS';
    crowdPreference?: 'LOW' | 'NEUTRAL' | 'ANY';
    assistanceRequired?: boolean;
  };
  notes?: string;
  userEmail?: string;
  createdAt: string;
  savedAt: string;
  syncedToSupabase?: boolean;
}

export interface OfflineSavedJourney {
  id: string;
  savedAt: string;
  destination: Destination;
  selectedRoute: RouteOption;
  notes: string;
  userEmail?: string;
  syncedToSupabase?: boolean;
}

export interface OfflineTripPdfRecord {
  id: string;
  tripId?: string;
  bookingId?: string;
  userEmail: string;
  documentTitle: string;
  documentType: 'TRIP_PASS' | 'HOTEL_VOUCHER' | 'ACCESSIBILITY_CERTIFICATE' | 'FULL_GUIDE';
  destinationName: string;
  travelerName: string;
  accessibilityScore: number;
  emergencyContacts: { name: string; phone: string; location?: string }[];
  turnByTurnSteps: string[];
  generatedAt?: string;
  pdfMetadata: {
    generatedAt: string;
    stepCount?: number;
    distanceKm?: number;
    durationMinutes?: number;
    isStepFree: boolean;
    verificationPin?: string;
    qrCodeData?: string;
  };
  syncedToSupabase?: boolean;
  created_at?: string;
}

export interface SupabaseSyncStatus {
  isConnected: boolean;
  projectId: string;
  supabaseUrl: string;
  lastSyncAt: string | null;
  registeredUsersCount: number;
  tripsCount: number;
  hotelBookingsCount: number;
  offlinePdfsCount: number;
  tablesStatus: {
    users_registrations: boolean;
    trips_bookings: boolean;
    hotel_bookings: boolean;
    offline_trip_pdfs: boolean;
  };
  error?: string | null;
}

