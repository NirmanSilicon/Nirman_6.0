# 🩺 MediBridge (Sanjeevani Health Network)

MediBridge is a premium, high-fidelity, and feature-rich digital healthcare platform designed to connect patients with clinical services, real-time medical map telemetry, OPD scheduling, express pharmacy deliveries, and health records management. Built with a modern, glassmorphic design system and micro-interactions, the platform is engineered to deliver a cohesive, enterprise-grade healthcare experience.

---

## 🚀 Key Modules & Routes

### 1. 🏠 Geospatial Command Dashboard (`/`)
* **Live Interactive Map**: A geospatial visualization of nearby network hospitals, complete with live distance calculations, specialized departments, and real-time ICU/Oxygen bed availability counters.
* **What We Do Panel**: A dynamic tab-synchronized details deck highlighting emergency services, teleconsultations, and home diagnostics. Supports radial glow blurs and scaling hover animations.

### 2. 📅 OPD Booking Flow (`/book`)
* **6-Step Interactive Checkout**:
  1. *Select Specialty*: Choose from Cardiology, Pediatrics, Neurology, etc.
  2. *Select Doctor*: Comprehensive cards featuring ratings, fees, and credentials.
  3. *Select Slot*: Date calendar picker and time-of-day slots.
  4. *Patient Details*: Collect patient name, age, gender, and description.
  5. *Review & Checkout*: Coupon verification (`SANJEEVANI30` for 30% off) and transaction summary.
  6. *Payment Gateway*: Styled checkout containing UPI (with countdown timers), Netbanking, Insurance co-pay, and an interactive flipping 3D CSS credit card visualizer.
* **Token Confirmation**: Generates a secure clinical entry token after payment processing.

### 3. 💊 Sanjeevani Digital Pharmacy (`/pharmacy`)
* **E-Commerce Health Store**: Search, filter, and add medicines, OTC products, and home-diagnostics tests to your cart.
* **Groq Llama 3.3 Clinical Chatbot**: Ask questions about dosage, side effects, and drug-interactions, powered by Groq's high-speed Llama models.
* **Prescription Scanning Uploader**: A secure portal allowing patients to upload prescription scans with mock extraction rewards.
* **Multi-Step Cart Drawer Checkout**:
  * *Step 1: Delivery Details*: Capture name, phone, address, city, state, and pin code.
  * *Step 2: Payment Gateway*: Integrated checkout displaying UPI QR code, Netbanking, ABHA Claims, and flipping credit card mockup.
  * *Step 3: Secure Processing*: Transitions showing escrow locking animations and SSL security checks.
  * *Step 4: Order Confirmation*: Displays Order ID, summary invoice, and estimated delivery timer.

### 4. 🩻 Clinical Patient Portal (`/dashboard`)
* **Digital Health Card**: View and manage your simulated National Digital Health ID / ABHA card.
* **Vitals Logs**: Log and monitor blood pressure, heart rate, blood sugar, and temperature.
* **Medical Timeline**: View digital invoices, past doctor visits, active pharmacy orders, and diagnostics results.

### 5. 🚨 SOS Emergency Center (`/emergency`)
* **Ambulance Tracking**: Real-time mock map telemetry showcasing GPS coordinates and estimated arrival times of trauma dispatch vehicles.
* **First Aid Manuals**: Interactive instruction sheets for CPR, fractures, burns, and cardiac events.

---

## 🎨 Design System & Micro-Interactions

MediBridge implements a curated, harmonious custom design system:
* **Glassmorphism**: High-blur backdrops, thin light-reflecting borders (`border-white/10`), and soft drop shadows to create clean layer hierarchies.
* **Radial Glow Blurs**: Background decorative blobs that synchronize with interactive tab states for visual dynamism.
* **3D Card Flip**: Local CSS transitions (`perspective-1000`, `transform-style-3d`, `backface-hidden`) creating a highly realistic credit card validation interface.
* **Micro-Animations**: Hover-triggered translations, pulsing active status badges, and loading spinner overlays to keep the interface highly interactive.

---

## 🛠️ Tech Stack & Architecture

* **Frontend Framework**: React 18+ (Vite builder toolchain)
* **Routing**: TanStack Router (Typesafe, nested routes, and loader-driven state)
* **Styling**: Tailwind CSS & Vanilla CSS custom classes
* **Icons**: Lucide React
* **Build tool**: TypeScript (Strict typing enabled)

---

## 🏁 Getting Started

### Prerequisites
* Node.js (v18.0.0 or higher)
* npm or Bun packages manager

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd health-map-aid
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the local development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

4. Verify compilation and build output:
   ```bash
   npm run build
   ```
