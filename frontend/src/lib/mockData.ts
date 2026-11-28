export type Hospital = {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  rating: number;
  reviews: number;
  specialties: string[];
  beds: { total: number; available: number; icu: number; icuAvailable: number };
  emergency: boolean;
  image: string;
  distance: number;
  established: number;
  lat?: number;
  lng?: number;
  phone?: string;
  workingHours?: string;
  crowdLevel?: string;
};

export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  hospitalId: string;
  experience: number;
  rating: number;
  fee: number;
  nextSlot: string;
  avatar: string;
};

export type Booking = {
  id: string;
  hospitalName: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: "confirmed" | "completed" | "pending" | "cancelled";
  tokenNo: string;
};

export type MedicalRecord = {
  id: string;
  type: "prescription" | "lab-report" | "scan" | "discharge";
  title: string;
  doctor: string;
  hospital: string;
  date: string;
  summary: string;
};

const cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow"];
const specialtiesPool = ["Cardiology", "Neurology", "Orthopedics", "Oncology", "Pediatrics", "Gastroenterology", "Nephrology", "Pulmonology", "Dermatology", "Gynecology", "ENT", "General Medicine"];

const hospitalNames = [
  "Aarogya Multispeciality", "Sanjeevani Care", "Lifeline Medical Center", "Apex Heart Institute",
  "Nirvana Health City", "Suraksha Hospital", "Medi-Star General", "Pranaya Critical Care",
  "Asha Wellness Hospital", "Trinity Medical Center", "Shanti Hospital & Research", "Veda Multispeciality",
  "Citizen Care Hospital", "Vatsalya Mother & Child", "Aastha Cancer Institute", "Bodhi Neuro Center",
];

function pick<T>(arr: T[], n: number, seed: number): T[] {
  const result: T[] = [];
  const copy = [...arr];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = (seed + i * 7) % copy.length;
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

export const hospitals: Hospital[] = hospitalNames.map((name, i) => {
  const total = 80 + ((i * 37) % 400);
  const available = Math.floor(total * (0.1 + ((i * 13) % 50) / 100));
  const icu = 10 + (i % 30);
  return {
    id: `h${i + 1}`,
    name,
    city: cities[i % cities.length],
    state: ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Telangana", "West Bengal"][i % 6],
    address: `${100 + i * 7}, Sector ${5 + i}, ${cities[i % cities.length]}`,
    rating: Math.round((4 + ((i * 17) % 10) / 10) * 10) / 10,
    reviews: 200 + ((i * 89) % 4000),
    specialties: pick(specialtiesPool, 5 + (i % 4), i),
    beds: { total, available, icu, icuAvailable: Math.max(0, Math.floor(icu * 0.3) - (i % 4)) },
    emergency: true,
    image: `https://images.unsplash.com/photo-${["1586773860418-d37222d8fce3", "1551076805-e1869033e561", "1538108149393-fbbd81895907", "1519494026892-80bbd2d6fd0d"][i % 4]}?w=800&q=80&auto=format`,
    distance: Math.round(((i * 1.7) % 25) * 10) / 10,
    established: 1980 + (i * 2) % 40,
  };
});

const doctorNames = [
  "Dr. Anjali Sharma", "Dr. Rajesh Kumar", "Dr. Priya Menon", "Dr. Vikram Singh",
  "Dr. Neha Gupta", "Dr. Arun Verma", "Dr. Sneha Patel", "Dr. Karthik Iyer",
  "Dr. Ritu Desai", "Dr. Manish Joshi", "Dr. Pooja Reddy", "Dr. Sandeep Rao",
];

export const doctors: Doctor[] = doctorNames.flatMap((name, i) =>
  hospitals.slice(0, 6).map((h, j) => ({
    id: `d${i}_${j}`,
    name,
    specialty: specialtiesPool[(i + j) % specialtiesPool.length],
    hospitalId: h.id,
    experience: 5 + ((i + j * 3) % 25),
    rating: Math.round((4.2 + ((i * 7 + j) % 8) / 10) * 10) / 10,
    fee: 500 + (((i + j) * 100) % 1500),
    nextSlot: ["Today, 4:30 PM", "Tomorrow, 10:00 AM", "Today, 6:00 PM", "Tomorrow, 2:15 PM"][(i + j) % 4],
    avatar: `https://i.pravatar.cc/200?img=${(i * 6 + j) % 70 + 1}`,
  }))
);

export const userBookings: Booking[] = [
  { id: "b1", hospitalName: "Aarogya Multispeciality", doctorName: "Dr. Anjali Sharma", specialty: "Cardiology", date: "2026-06-18", time: "10:30 AM", status: "confirmed", tokenNo: "A-042" },
  { id: "b2", hospitalName: "Sanjeevani Care", doctorName: "Dr. Vikram Singh", specialty: "Orthopedics", date: "2026-06-22", time: "3:00 PM", status: "pending", tokenNo: "B-118" },
  { id: "b3", hospitalName: "Lifeline Medical Center", doctorName: "Dr. Priya Menon", specialty: "Neurology", date: "2026-05-30", time: "11:00 AM", status: "completed", tokenNo: "C-007" },
  { id: "b4", hospitalName: "Apex Heart Institute", doctorName: "Dr. Rajesh Kumar", specialty: "Cardiology", date: "2026-05-12", time: "9:15 AM", status: "completed", tokenNo: "D-201" },
];

export const userRecords: MedicalRecord[] = [
  { id: "r1", type: "prescription", title: "Hypertension follow-up", doctor: "Dr. Anjali Sharma", hospital: "Aarogya Multispeciality", date: "2026-05-30", summary: "Telmisartan 40mg once daily. BP monitoring weekly." },
  { id: "r2", type: "lab-report", title: "Lipid Profile & CBC", doctor: "Dr. Rajesh Kumar", hospital: "Apex Heart Institute", date: "2026-05-12", summary: "LDL 118 mg/dL · HDL 52 · Triglycerides 142 · Hb 14.2" },
  { id: "r3", type: "scan", title: "MRI - Lumbar Spine", doctor: "Dr. Vikram Singh", hospital: "Sanjeevani Care", date: "2026-04-20", summary: "Mild L4-L5 disc bulge. No nerve impingement." },
  { id: "r4", type: "discharge", title: "Discharge - Viral fever", doctor: "Dr. Sneha Patel", hospital: "Trinity Medical Center", date: "2026-03-08", summary: "3-day admission. Recovered, advised rest 1 week." },
  { id: "r5", type: "prescription", title: "Allergic rhinitis", doctor: "Dr. Neha Gupta", hospital: "Asha Wellness", date: "2026-02-14", summary: "Levocetirizine 5mg, nasal spray, follow-up in 2 weeks." },
];

export const user = {
  name: "Aarav Mehta",
  email: "aarav.mehta@example.com",
  phone: "+91 98765 43210",
  bloodGroup: "B+",
  age: 32,
  city: "Mumbai",
  avatar: "https://i.pravatar.cc/200?img=12",
  upcomingCount: userBookings.filter((b) => b.status === "confirmed" || b.status === "pending").length,
  recordsCount: userRecords.length,
};
