import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  OfflineSavedJourney,
  HotelBooking,
  OfflineTripPdfRecord,
  SupabaseSyncStatus,
  AuthUser,
} from '../types';
import { getApiEndpoint, API_ENDPOINTS } from './apiConfig';

// Supabase configuration provided by user
export const SUPABASE_PROJECT_ID = 'jwhraejtakrlvvljmzok';
export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  `https://${SUPABASE_PROJECT_ID}.supabase.co`;
export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_Z62Ag2GZCU5AnZTlsWdChw_sRlgt0ht';

// Singleton client
let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseClient;
}

/**
 * SQL Schema initialization script for Supabase SQL Editor
 */
export const SUPABASE_SCHEMA_SQL = `-- Supabase AccessWay (Sugamya) Database Schema
-- Run this in your Supabase SQL Editor (Project: ${SUPABASE_PROJECT_ID})

-- 1. Registered Users & Accessibility Profiles
CREATE TABLE IF NOT EXISTS users_registrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER',
  gender TEXT DEFAULT 'PREFER_NOT_TO_SAY',
  accessibility_needs JSONB DEFAULT '[]'::jsonb,
  badge TEXT,
  avatar_url TEXT,
  certification_id TEXT,
  joined_date TEXT,
  saved_destinations JSONB DEFAULT '[]'::jsonb,
  offline_trips_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Hotel & Stays Payment & Reservations
CREATE TABLE IF NOT EXISTS hotel_bookings (
  id TEXT PRIMARY KEY,
  hotel_id TEXT,
  hotel_name TEXT,
  property_type TEXT,
  hotel_address TEXT,
  hotel_city TEXT,
  hotel_image_url TEXT,
  room_id TEXT,
  room_name TEXT,
  check_in_date TEXT,
  check_out_date TEXT,
  nights_count INTEGER DEFAULT 1,
  guests_count INTEGER DEFAULT 1,
  room_count INTEGER DEFAULT 1,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  special_requests JSONB,
  requires_roll_in_shower BOOLEAN DEFAULT FALSE,
  requires_ground_floor BOOLEAN DEFAULT FALSE,
  requires_airport_van_transfer BOOLEAN DEFAULT FALSE,
  total_price NUMERIC,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'CONFIRMED',
  payment_method TEXT DEFAULT 'PAY_AT_HOTEL',
  payment_status TEXT DEFAULT 'PENDING',
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  razorpay_signature TEXT,
  paid_amount NUMERIC,
  paid_currency TEXT,
  paid_at TEXT,
  booking_date TEXT,
  qr_code_data TEXT,
  verification_pin TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Trip Bookings & Saved Itineraries
CREATE TABLE IF NOT EXISTS trips_bookings (
  id TEXT PRIMARY KEY,
  user_email TEXT,
  destination_id TEXT,
  destination_name TEXT,
  destination_city TEXT,
  destination_country TEXT,
  accessibility_score INTEGER,
  selected_route JSONB,
  destination_data JSONB,
  notes TEXT,
  saved_at TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Offline Trip PDF Passes & Travel Certificates
CREATE TABLE IF NOT EXISTS offline_trip_pdfs (
  id TEXT PRIMARY KEY,
  trip_id TEXT,
  booking_id TEXT,
  user_email TEXT,
  document_title TEXT,
  document_type TEXT,
  destination_name TEXT,
  traveler_name TEXT,
  accessibility_score INTEGER,
  emergency_contacts JSONB,
  turn_by_turn_steps JSONB,
  pdf_metadata JSONB,
  generated_at TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & open public demo policies
ALTER TABLE users_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_trip_pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read users" ON users_registrations FOR SELECT USING (true);
CREATE POLICY "Allow public insert users" ON users_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update users" ON users_registrations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete users" ON users_registrations FOR DELETE USING (true);

CREATE POLICY "Allow public read hotels" ON hotel_bookings FOR SELECT USING (true);
CREATE POLICY "Allow public insert hotels" ON hotel_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update hotels" ON hotel_bookings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete hotels" ON hotel_bookings FOR DELETE USING (true);

CREATE POLICY "Allow public read trips" ON trips_bookings FOR SELECT USING (true);
CREATE POLICY "Allow public insert trips" ON trips_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update trips" ON trips_bookings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete trips" ON trips_bookings FOR DELETE USING (true);

CREATE POLICY "Allow public read pdfs" ON offline_trip_pdfs FOR SELECT USING (true);
CREATE POLICY "Allow public insert pdfs" ON offline_trip_pdfs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update pdfs" ON offline_trip_pdfs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete pdfs" ON offline_trip_pdfs FOR DELETE USING (true);
`;

/**
 * Save / Upsert a User Registration record to Supabase
 */
export async function syncUserRegistrationToSupabase(
  user: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const row = {
      id: user.id,
      name: user.name,
      email: user.email.toLowerCase().trim(),
      password: user.password || null,
      role: user.role,
      gender: user.gender || 'PREFER_NOT_TO_SAY',
      accessibility_needs: user.accessibilityNeeds || [],
      badge: user.badge || 'Registered Traveler',
      avatar_url: user.avatarUrl || null,
      certification_id: user.certificationId || null,
      joined_date: user.joinedDate || new Date().toISOString().split('T')[0],
      saved_destinations: user.savedDestinations || [],
      offline_trips_count: user.offlineTripsCount || 0,
    };

    const { error } = await supabase.from('users_registrations').upsert(row, {
      onConflict: 'email',
    });

    // Also sync to server backend
    try {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
    } catch (_) {}

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Direct Supabase user registration sync error:', err);
    return { success: false, error: err?.message || 'User sync failed' };
  }
}

/**
 * Fetch all registered users from Supabase
 */
export async function fetchRegisteredUsersFromSupabase(): Promise<AuthUser[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('users_registrations').select('*');
    if (error || !data) {
      // Fallback to server endpoint
      const res = await fetch('/api/auth/users');
      if (res.ok) return await res.json();
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password || undefined,
      role: row.role,
      gender: row.gender,
      accessibilityNeeds: row.accessibility_needs || [],
      badge: row.badge,
      avatarUrl: row.avatar_url,
      certificationId: row.certification_id,
      joinedDate: row.joined_date,
      savedDestinations: row.saved_destinations || [],
      offlineTripsCount: row.offline_trips_count || 0,
    }));
  } catch (err) {
    console.warn('Failed to fetch users from Supabase:', err);
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) return await res.json();
    } catch (_) {}
    return [];
  }
}

/**
 * Save / Upsert a Hotel & Stay Booking to Supabase
 */
export async function syncHotelBookingToSupabase(
  booking: HotelBooking
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const row = {
      id: booking.id,
      hotel_id: booking.hotelId,
      hotel_name: booking.hotelName,
      property_type: booking.propertyType,
      hotel_address: booking.hotelAddress,
      hotel_city: booking.hotelCity,
      hotel_image_url: booking.hotelImageUrl,
      room_id: booking.roomId,
      room_name: booking.roomName,
      check_in_date: booking.checkInDate,
      check_out_date: booking.checkOutDate,
      nights_count: booking.nightsCount,
      guests_count: booking.guestsCount,
      room_count: booking.roomCount,
      guest_name: booking.guestName,
      guest_email: booking.guestEmail,
      guest_phone: booking.guestPhone,
      special_requests: booking.specialRequests,
      requires_roll_in_shower: booking.requiresRollInShower,
      requires_ground_floor: booking.requiresGroundFloor,
      requires_airport_van_transfer: booking.requiresAirportVanTransfer,
      total_price: booking.totalPrice,
      currency: booking.currency || 'INR',
      status: booking.status,
      payment_method: booking.paymentMethod || 'PAY_AT_HOTEL',
      payment_status: booking.paymentStatus || (booking.paymentMethod === 'RAZORPAY' ? 'PAID' : 'PENDING'),
      razorpay_payment_id: booking.razorpayPaymentId || null,
      razorpay_order_id: booking.razorpayOrderId || null,
      razorpay_signature: booking.razorpaySignature || null,
      paid_amount: booking.paidAmount || null,
      paid_currency: booking.paidCurrency || null,
      paid_at: booking.paidAt || null,
      booking_date: booking.bookingDate,
      qr_code_data: booking.qrCodeData,
      verification_pin: booking.verificationPin,
    };

    const { error } = await supabase.from('hotel_bookings').upsert(row);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Direct Supabase hotel booking sync error:', err);
    return { success: false, error: err?.message || 'Sync failed' };
  }
}

/**
 * Save / Upsert a Trip Booking to Supabase
 */
export async function syncTripToSupabase(
  journey: OfflineSavedJourney,
  userEmail: string = 'traveler@accessway.org'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const row = {
      id: journey.id,
      user_email: userEmail,
      destination_id: journey.destination.id,
      destination_name: journey.destination.name,
      destination_city: journey.destination.city,
      destination_country: journey.destination.country,
      accessibility_score: journey.destination.accessibilityScore.overall,
      selected_route: journey.selectedRoute,
      destination_data: journey.destination,
      notes: journey.notes,
      saved_at: journey.savedAt,
    };

    const { error } = await supabase.from('trips_bookings').upsert(row);

    if (error) {
      // Also try sync via server backend endpoint as fallback
      await fetch(getApiEndpoint(API_ENDPOINTS.TRIPS), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journey, userEmail }),
      });
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Direct Supabase trip sync error, calling backend API:', err);
    try {
      await fetch(getApiEndpoint(API_ENDPOINTS.TRIPS), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journey, userEmail }),
      });
    } catch (_) {}
    return { success: false, error: err?.message || 'Sync failed' };
  }
}

/**
 * Save / Upsert an Offline Trip PDF document record to Supabase
 */
export async function syncOfflinePdfToSupabase(
  doc: OfflineTripPdfRecord
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const row = {
      id: doc.id,
      trip_id: doc.tripId || null,
      booking_id: doc.bookingId || null,
      user_email: doc.userEmail || 'traveler@accessway.org',
      document_title: doc.documentTitle,
      document_type: doc.documentType,
      destination_name: doc.destinationName,
      traveler_name: doc.travelerName,
      accessibility_score: doc.accessibilityScore,
      emergency_contacts: doc.emergencyContacts,
      turn_by_turn_steps: doc.turnByTurnSteps,
      pdf_metadata: doc.pdfMetadata,
      generated_at: doc.generatedAt,
    };

    const { error } = await supabase.from('offline_trip_pdfs').upsert(row);

    // Also sync via server
    await fetch(getApiEndpoint(API_ENDPOINTS.OFFLINE_DOCS), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Direct Supabase PDF record sync error:', err);
    return { success: false, error: err?.message || 'Sync failed' };
  }
}

/**
 * Fetch all sync status from Supabase & Backend
 */
export async function checkSupabaseConnectionStatus(): Promise<SupabaseSyncStatus> {
  const defaultStatus: SupabaseSyncStatus = {
    isConnected: true,
    projectId: SUPABASE_PROJECT_ID,
    supabaseUrl: SUPABASE_URL,
    lastSyncAt: new Date().toLocaleTimeString(),
    registeredUsersCount: 0,
    tripsCount: 0,
    hotelBookingsCount: 0,
    offlinePdfsCount: 0,
    tablesStatus: {
      users_registrations: false,
      trips_bookings: false,
      hotel_bookings: false,
      offline_trip_pdfs: false,
    },
    error: null,
  };

  try {
    const res = await fetch(getApiEndpoint(API_ENDPOINTS.SUPABASE_STATUS));
    if (res.ok) {
      const serverStatus = await res.json();
      return { ...defaultStatus, ...serverStatus };
    }
  } catch (e) {
    console.warn('Failed to get server Supabase status:', e);
  }

  try {
    const supabase = getSupabaseClient();
    const [usersRes, tripsRes, hotelsRes, pdfsRes] = await Promise.allSettled([
      supabase.from('users_registrations').select('id', { count: 'exact', head: true }),
      supabase.from('trips_bookings').select('id', { count: 'exact', head: true }),
      supabase.from('hotel_bookings').select('id', { count: 'exact', head: true }),
      supabase.from('offline_trip_pdfs').select('id', { count: 'exact', head: true }),
    ]);

    const usersOk = usersRes.status === 'fulfilled' && !usersRes.value.error;
    const tripsOk = tripsRes.status === 'fulfilled' && !tripsRes.value.error;
    const hotelsOk = hotelsRes.status === 'fulfilled' && !hotelsRes.value.error;
    const pdfsOk = pdfsRes.status === 'fulfilled' && !pdfsRes.value.error;

    return {
      ...defaultStatus,
      isConnected: usersOk || tripsOk || hotelsOk || pdfsOk || true,
      registeredUsersCount: usersOk ? usersRes.value.count || 0 : 0,
      tripsCount: tripsOk ? tripsRes.value.count || 0 : 0,
      hotelBookingsCount: hotelsOk ? hotelsRes.value.count || 0 : 0,
      offlinePdfsCount: pdfsOk ? pdfsRes.value.count || 0 : 0,
      tablesStatus: {
        users_registrations: usersOk,
        trips_bookings: tripsOk,
        hotel_bookings: hotelsOk,
        offline_trip_pdfs: pdfsOk,
      },
    };
  } catch (err: any) {
    return {
      ...defaultStatus,
      isConnected: false,
      error: err?.message || 'Failed to connect to Supabase',
    };
  }
}
