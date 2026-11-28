# GoldenHour — Pre-Arrival Emergency Coordination Platform

GoldenHour is a zero-install, patient-first mobile web platform built with Next.js, TypeScript, and Tailwind CSS. It enables patients and families in Bhubaneswar to send immediate pre-arrival emergency notices to nearby hospitals before reaching the emergency room.

## Key Features (Patient & Family Perspective)

- **5 Emergency Categories**: Acute Chest Pain, Stroke Signs (FAST), Trauma & Major Bleeding, Severe Respiratory Distress, and **Not Sure / Other Emergency** (with custom symptom description).
- **Live Hospital Availability**: Real-time readiness status (`Available` / `Not Available`) across emergency beds, ICU beds, ventilators, oxygen support, blood bank, and cardiac cath lab without misleading bed numbers.
- **3-Tap Pre-Arrival Intake (`/start`)**: Zero-login, zero-PII emergency intake with multilingual support (English, Odia, Hindi) and text-to-speech accessibility.
- **Live Case Tracking (`/track`)**: Real-time hospital preparation checklist, allocated bay updates, and direct hospital emergency contact.
- **Hospital Directory & Radar (`/hospitals`)**: Interactive Bhubaneswar emergency facility lookup and map view.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (60-30-10 High-Contrast Palette: `#FFF6F2`, `#3B62AB`, `#DAE9C6`)
- **Icons**: Lucide React
- **Backend / Realtime**: Supabase (`@supabase/supabase-js`)

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env.local` and fill in your Supabase credentials if using live database sync.

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   npm run start
   ```
