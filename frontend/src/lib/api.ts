import { type Hospital, type Doctor } from "./mockData";

export const API_BASE_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) ||
  "http://localhost:5000/api";

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// STANDALONE AUTHENTICATION HELPERS
export async function loginUser(email: string, password: string) {
  const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!loginRes.ok) {
    const err = await loginRes.json().catch(() => ({}));
    throw new Error(err.message || "Failed to log in");
  }

  const authData = await loginRes.json();
  if (authData.token) {
    localStorage.setItem("token", authData.token);
    localStorage.setItem("user", JSON.stringify(authData.user));
    // Trigger custom event to notify components that auth status changed
    window.dispatchEvent(new Event("auth-changed"));
  }
  return authData;
}

export async function registerUser(signupData: any) {
  const registerRes = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signupData),
  });

  if (!registerRes.ok) {
    const err = await registerRes.json().catch(() => ({}));
    throw new Error(err.message || "Failed to sign up");
  }

  return await registerRes.json();
}

export function logoutUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth-changed"));
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("token");
}

// Fetch all hospitals and merge with mock data for aesthetic metadata
export async function fetchHospitals(): Promise<Hospital[]> {
  try {
    let res = await fetch(`${API_BASE_URL}/hospital/`);
    if (!res.ok) throw new Error("Fetch failed");

    let dbHospitals = await res.json();

    // If database is empty, seed it and refetch
    if (!Array.isArray(dbHospitals) || dbHospitals.length === 0) {
      console.log("Hospitals empty, seeding database...");
      await fetch(`${API_BASE_URL}/hospital/seed`, { method: "POST" });
      res = await fetch(`${API_BASE_URL}/hospital/`);
      dbHospitals = await res.json();
    }

    // Load mock hospitals to merge aesthetic fields (image, reviews, beds, distance)
    const { hospitals: mockHospitals } = await import("./mockData");

    return dbHospitals.map((dbH: any, idx: number) => {
      // Try to find a mock hospital with matching name prefix or address
      const mockH = mockHospitals.find(
        (m) =>
          m.name.toLowerCase().includes(dbH.name.toLowerCase()) ||
          dbH.name.toLowerCase().includes(m.name.toLowerCase())
      );

      return {
        id: dbH.hospital_id,
        name: dbH.name,
        city: dbH.location?.city || "Bhubaneswar",
        state: dbH.location?.state || "Odisha",
        address: dbH.address,
        rating: dbH.rating || 4.2,
        reviews: mockH?.reviews || 240 + (idx * 50),
        specialties: dbH.specialties || ["General Medicine"],
        beds: mockH?.beds || { total: 150, available: 45, icu: 25, icuAvailable: 8 },
        emergency: true,
        image: dbH.logo || mockH?.image || `https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80&auto=format`,
        distance: dbH.distance_km ?? mockH?.distance ?? parseFloat((1.5 + idx * 1.2).toFixed(1)),
        established: mockH?.established || 1990 + (idx * 3) % 30,
        lat: dbH.location?.lat,
        lng: dbH.location?.lng,
        phone: dbH.phone || "+91 674 238 6281",
        workingHours: dbH.workingHours || "24/7",
        crowdLevel: dbH.crowd_level || "Low",
      };
    });
  } catch (error) {
    console.error("fetchHospitals error:", error);
    return [];
  }
}

// Fetch single hospital detail and merge
export async function fetchHospitalDetail(id: string): Promise<{ hospital: Hospital; doctors: Doctor[] }> {
  try {
    const res = await fetch(`${API_BASE_URL}/hospital/${id}`);
    if (!res.ok) throw new Error("Hospital detail fetch failed");

    const dbH = await res.json();
    const allHospitals = await fetchHospitals();
    const mappedHospital = allHospitals.find((h) => h.id === id) || {
      id: dbH.hospital_id,
      name: dbH.name,
      city: dbH.location?.city || "Bhubaneswar",
      state: dbH.location?.state || "Odisha",
      address: dbH.address,
      rating: dbH.rating || 4.2,
      reviews: 320,
      specialties: dbH.specialties || ["General Medicine"],
      beds: { total: 150, available: 45, icu: 25, icuAvailable: 8 },
      emergency: true,
      image: dbH.logo || `https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80&auto=format`,
      distance: 2.5,
      established: 1995,
    };

    // Extract doctors from hospital detail
    const dbDoctors = dbH.doctors || [];
    const mappedDoctors: Doctor[] = dbDoctors.map((d: any, idx: number) => ({
      id: d.doctorId || `d_${id}_${idx}`,
      name: d.name,
      specialty: d.specialty || "General Medicine",
      hospitalId: id,
      experience: 8 + (idx * 2),
      rating: parseFloat((4.5 + (idx * 0.1) % 0.5).toFixed(1)),
      fee: 500 + (idx * 100),
      nextSlot: d.slots?.[0] || "Today, 5:00 PM",
      avatar: `https://i.pravatar.cc/200?img=${((idx + 5) * 7) % 70 + 1}`,
    }));

    return { hospital: mappedHospital, doctors: mappedDoctors };
  } catch (error) {
    console.error("fetchHospitalDetail error:", error);
    throw error;
  }
}

// Fetch active appointment of patient
export async function fetchActiveAppointment() {
  try {
    const res = await fetch(`${API_BASE_URL}/patient/active-appointment`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("Fetch active appointment failed");
    }
    return await res.json();
  } catch (error) {
    console.error("fetchActiveAppointment error:", error);
    return null;
  }
}

// Fetch all appointments of patient
export async function fetchAppointments() {
  try {
    const res = await fetch(`${API_BASE_URL}/patient/appointments`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Fetch appointments failed");
    return await res.json();
  } catch (error) {
    console.error("fetchAppointments error:", error);
    return [];
  }
}

// Book appointment
export async function bookAppointment(bookingData: {
  hospital_id: string;
  department: string;
  slot_time: string;
  doctor_id?: string;
  type?: string;
  symptoms?: string;
  paymentMode?: string;
}) {
  const res = await fetch(`${API_BASE_URL}/patient/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(bookingData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to book appointment");
  }

  return await res.json();
}

// Upload lab report/prescription
export async function uploadReport(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/patient/upload_report`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to upload report");
  }

  return await res.json();
}

// Fetch reports
export async function fetchReports() {
  try {
    const res = await fetch(`${API_BASE_URL}/patient/reports`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Fetch reports failed");
    return await res.json();
  } catch (error) {
    console.error("fetchReports error:", error);
    return [];
  }
}

// Send chat message
export async function sendChatMessage(message: string, patientContext: any = {}) {
  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, patient_context: patientContext }),
  });

  if (!res.ok) {
    throw new Error("Chat request failed");
  }

  return await res.json();
}

// Fetch patient profile
export async function fetchProfile() {
  const res = await fetch(`${API_BASE_URL}/patient/profile`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Fetch profile failed");
  return await res.json();
}

// Update patient profile
export async function updateProfile(profileData: Record<string, any>) {
  const res = await fetch(`${API_BASE_URL}/patient/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(profileData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update profile");
  }
  return await res.json();
}

// Search & AI-rank hospitals via backend recommendation engine
export async function searchHospitals(params: {
  disease?: string;
  state?: string;
  query?: string;
  lat?: number;
  lng?: number;
} = {}): Promise<Hospital[]> {
  try {
    const sp = new URLSearchParams();
    if (params.disease) sp.set("disease", params.disease);
    if (params.state) sp.set("state", params.state);
    if (params.query) sp.set("query", params.query);
    if (params.lat !== undefined) sp.set("lat", String(params.lat));
    if (params.lng !== undefined) sp.set("lng", String(params.lng));

    const res = await fetch(`${API_BASE_URL}/hospital/search?${sp.toString()}`);
    if (!res.ok) throw new Error("Hospital search failed");

    const dbHospitals = await res.json();
    if (!Array.isArray(dbHospitals)) return [];

    const { hospitals: mockHospitals } = await import("./mockData");
    return dbHospitals.map((dbH: any, idx: number) => {
      const mockH = mockHospitals.find(
        (m) =>
          m.name.toLowerCase().includes((dbH.name || "").toLowerCase()) ||
          (dbH.name || "").toLowerCase().includes(m.name.toLowerCase())
      );
      return {
        id: dbH.hospital_id,
        name: dbH.name,
        city: dbH.location?.city || "Bhubaneswar",
        state: dbH.location?.state || "Odisha",
        address: dbH.address,
        rating: dbH.rating || 4.2,
        reviews: mockH?.reviews || 240 + idx * 50,
        specialties: dbH.specialties || ["General Medicine"],
        beds: mockH?.beds || { total: 150, available: 45, icu: 25, icuAvailable: 8 },
        emergency: true,
        image: dbH.logo || mockH?.image || `https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80&auto=format`,
        distance: dbH.distance_km ?? mockH?.distance ?? parseFloat((1.5 + idx * 1.2).toFixed(1)),
        established: mockH?.established || 1990 + ((idx * 3) % 30),
        lat: dbH.location?.lat,
        lng: dbH.location?.lng,
        phone: dbH.phone || "+91 674 238 6281",
        workingHours: dbH.workingHours || "24/7",
        crowdLevel: dbH.crowd_level || "Low",
      };
    });
  } catch (error) {
    console.error("searchHospitals error:", error);
    return [];
  }
}

// Fetch live queue metrics per department for a hospital
export async function fetchHospitalQueue(hospitalId: string): Promise<
  Record<
    string,
    {
      total_in_queue: number;
      current_serving: number;
      avg_time_per_patient: number;
      wait_time_mins: number;
    }
  >
> {
  try {
    const res = await fetch(`${API_BASE_URL}/hospital/${hospitalId}/queue`);
    if (!res.ok) throw new Error("Fetch hospital queue failed");
    return await res.json();
  } catch (error) {
    console.error("fetchHospitalQueue error:", error);
    return {};
  }
}

// Fetch OSRM driving route to a hospital
export async function fetchHospitalRoute(
  hospitalId: string,
  startLat: number,
  startLng: number
) {
  const res = await fetch(
    `${API_BASE_URL}/hospital/${hospitalId}/route?start_lat=${startLat}&start_lng=${startLng}`
  );
  if (!res.ok) throw new Error("Route fetch failed");
  return await res.json();
}

// Reverse geocode coordinates via backend MapService
export async function reverseGeocode(lat: number, lng: number) {
  const res = await fetch(`${API_BASE_URL}/reverse-geocode?lat=${lat}&lng=${lng}`);
  if (!res.ok) throw new Error("Reverse geocode failed");
  return await res.json();
}

// Walk-in appointment booking (no patient login required)
export async function walkinBook(bookingData: {
  hospital_id: string;
  department: string;
  phone: string;
  slot_time?: string;
  symptoms?: string;
}) {
  const res = await fetch(`${API_BASE_URL}/walkin_book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bookingData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Walk-in booking failed");
  }
  return await res.json();
}

// Fetch single appointment detail
export async function fetchAppointmentDetail(bookingId: string) {
  const res = await fetch(`${API_BASE_URL}/patient/appointment/${bookingId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Fetch appointment detail failed");
  return await res.json();
}
