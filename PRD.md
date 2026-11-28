# Ouroboros — Product Requirements Document

**AI-Powered E-Waste Intelligence & Circular Recovery Platform**
Team: Kernel Colonels (HackNation · Nirman 6.0)
Version: 1.0 · Status: Draft · Last updated: 28 Nov 2026

> **One phone photo in → value and next step out.**

---

## 1. Executive Summary

India generated ~1.75 MT of e-waste in FY24. Only ~43% was formally processed; ~57% (~990,000 t) remains untreated or goes through informal channels where printed circuit boards (PCBs) are shredded, burned, or acid-leached **before anyone checks what's on them**. Reusable chips are destroyed, sellers are paid by scrap weight instead of real value, and workers are exposed to toxic processes.

Ouroboros is a mobile-first AI tool. A user photographs a PCB, the system **detects and identifies components** (ICs, RAM, capacitors, connectors), **estimates value in ₹** (reusable parts plus recoverable metals), and **recommends the best recovery route** (Reuse / Desolder / Hydrometallurgy / Pyrometallurgy) scored on value, cost, energy, and CO₂. It then points the user to the **nearest authorised recycler**. Every scan creates a structured record that can feed EPR (Extended Producer Responsibility) reports and the EU Digital Product Passport (DPP).

**Strategy:** ship a narrow, reliable MVP (one board type, end-to-end) and then scale to many board types, B2B workflows, compliance reporting, and a marketplace.

---

## 2. Problem Statement

| Pain point | Today | Consequence |
|---|---|---|
| Boards shredded blindly | No inspection before shredding or burning | Working ICs and RAM destroyed |
| Value unknown | Priced by scrap weight | Sellers underpaid; no incentive to route boards correctly |
| Unsafe routes | Open burning, manual acid baths | Health hazards, pollution |
| No traceability | Informal, cash-based, unrecorded | EPR/DPP compliance gaps for producers and regulators |

**Evidence:** waste PCBs are ~30–50% metal by mass (Springer). Real-time component detection on waste PCBs is feasible (ScienceDirect 2024). The main barriers are scarce data, poor generalisation, and deployment (MDPI 2025 review).

---

## 3. Goals & Non-Goals

### 3.1 Goals
- **G1:** Turn a single photo into an itemised component list with confidence scores.
- **G2:** Show a ₹ value **range** per board before it is sold or processed.
- **G3:** Recommend a recovery route with a transparent, explainable score.
- **G4:** Direct users to authorised recyclers (CPCB-registered).
- **G5:** Log every scan as a structured record for later EPR/DPP use.
- **G6:** Work on low-end Android phones over weak networks, for informal-sector users.

### 3.2 Non-Goals (MVP)
- Fully automated sorting hardware or robotics.
- Exact (single-number) pricing guarantees.
- Electrical testing of whether a chip actually works (we flag *potentially* reusable parts only).
- Payments or marketplace transactions.
- Support for every board type (MVP covers one).

---

## 4. Users & Personas

| Persona | Description | Core need | Phase |
|---|---|---|---|
| **Raju, informal aggregator** (primary) | Buys scrap in bulk, low literacy, budget Android phone, often Hindi-speaking | "What is this board actually worth? Where should I sell it?" | MVP |
| **Authorised recycler operator** | Runs a CPCB-registered facility | Pre-sorting incoming lots, fair pricing, compliance logs | MVP (view) → V2 |
| **Refurbisher** | Repairs devices, harvests parts | Find resalable ICs and RAM | V2 |
| **Producer / PRO** (Producer Responsibility Org.) | Brand with EPR targets | Verifiable recovery records | V3 |
| **Regulator / researcher** | CPCB, state boards, academia | Aggregate flow data | V3 |

---

## 5. User Journey (End-to-End)

```
CAPTURE → DETECT → IDENTIFY → VALUE → DECIDE → REPORT
```

1. **Capture:** the user opens the app and photographs the board, with on-screen guides for framing, lighting, and blur.
2. **Detect:** an object-detection model draws bounding boxes around components.
3. **Identify:** each box is classified (IC, RAM, capacitor, connector, and so on). Where possible, part markings are read with OCR.
4. **Value:** reuse value + metal value − processing cost gives a **₹ range**.
5. **Decide:** routes are scored and the top route is shown with a reason ("Desolder first: 2 RAM chips worth ₹180–260").
6. **Report:** a shareable summary card, the nearest recycler on a map, and the scan saved to history.

---

## 6. MVP Scope (Phase 1)

### 6.1 Scope Lock
- **One board type:** desktop **RAM modules** or **motherboards**. Recommendation: **RAM sticks**, because they have a uniform layout, high-value ICs, and plenty of public data. Final choice is made in the Foundation week.
- **Platform:** a responsive PWA (Progressive Web App, installable on Android) plus a backend API.
- **Languages:** English + Hindi UI.

### 6.2 Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| F1 | Capture or upload a photo (camera + gallery) with quality checks for blur and darkness | P0 |
| F2 | Detect components with bounding boxes overlaid on the image | P0 |
| F3 | Classify components into ≥6 classes (IC, RAM chip, capacitor, resistor, connector, crystal) | P0 |
| F4 | Show a confidence score per component and per board; flag "unseen board" when confidence is low | P0 |
| F5 | Material value table: an estimated mass of metal (Au, Ag, Cu, Pd, Sn) per board class × market price | P0 |
| F6 | Reuse value table: price ranges for reusable parts by class | P0 |
| F7 | Show a ₹ value **range** (low–high), split into Reuse and Recovered metal | P0 |
| F8 | Rule-based route scoring across 4 routes × 4 criteria (Value, Cost, Energy, CO₂) | P0 |
| F9 | Recommendation card with a top route and a one-line explanation | P0 |
| F10 | Nearest authorised recycler list (from a static, seeded CPCB dataset), with distance and contact | P1 |
| F11 | Scan history (local + server) | P1 |
| F12 | Shareable report (image or PDF) | P1 |
| F13 | Hindi localisation | P1 |
| F14 | Phone-number OTP login (anonymous mode allowed) | P2 |

### 6.3 Non-Functional Requirements

| Area | Target |
|---|---|
| Latency | Under 5 s from photo to result on 4G; under 10 s on 3G |
| Device | Works on Android 9+, 2 GB RAM, Chrome |
| Accuracy | Detection mAP@0.5 ≥ 0.75 on held-out test set for the MVP board type |
| Availability | 99% during demo/pilot |
| Privacy | Images stored only with consent; no PII in images |
| Explainability | Every number traceable to a table entry and its assumptions |

### 6.4 MVP Success Criteria
- An end-to-end demo works on **≥20 real boards**, each finishing in under 5 s.
- ≥75% of boards are correctly identified at board level.
- The value range contains the reference price (from a recycler quote or expert estimate) in ≥70% of cases.
- At least 3 informal recyclers try the app and give feedback.

---

## 7. System Architecture

### 7.1 High-Level

```
┌──────────────┐   HTTPS   ┌─────────────────────────────────────────┐
│ PWA (React)  │ ────────► │ API Gateway (FastAPI)                   │
│ Camera, UI,  │           │  ├─ /scan  → Inference Service          │
│ offline cache│ ◄──────── │  ├─ Valuation Engine (rules + tables)   │
└──────────────┘   JSON    │  ├─ Route Scorer                        │
                           │  ├─ Recycler Locator (PostGIS)          │
                           │  └─ Report Generator                    │
                           └──────┬───────────────┬──────────────────┘
                                  │               │
                        ┌─────────▼────┐   ┌──────▼────────┐
                        │ PostgreSQL + │   │ Object Store  │
                        │ PostGIS      │   │ (S3/R2) images│
                        └──────────────┘   └───────────────┘
```

### 7.2 Tech Stack (MVP)

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite PWA, Tailwind, i18next | Fast, installable, offline-capable |
| Backend | Python FastAPI | Same language as the ML code |
| Detection | YOLOv8n/YOLO11n (Ultralytics) | Small, real-time, easy to fine-tune |
| OCR (P1) | PaddleOCR | Reads chip markings |
| DB | PostgreSQL + PostGIS | Relational data + geo queries |
| Storage | Cloudflare R2 / S3 | Cheap image storage |
| Hosting | Render / Railway (API), Vercel (PWA), GPU optional (CPU inference fine for nano models) | Low cost |
| MLOps | Roboflow (labeling), Weights & Biases (experiments) | Speed |

### 7.3 Core Data Model

```
User(id, phone?, role, language, created_at)
Scan(id, user_id, image_url, board_type, board_confidence,
     value_low, value_high, top_route, lat, lng, created_at)
Detection(id, scan_id, class, confidence, bbox[x,y,w,h], ocr_text?, reusable_flag)
MaterialTable(board_type, metal, grams_low, grams_high, source)
PriceTable(item, unit, price_low, price_high, source, updated_at)
RouteRule(route, criterion, weight, formula_ref)
Recycler(id, name, cpcb_reg_no, address, geom, phone, accepts[])
```

### 7.4 API (MVP)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/scan` | Upload an image (multipart). Returns detections, value range, and route scores |
| GET | `/v1/scan/{id}` | Fetch a saved scan |
| GET | `/v1/scans?user=` | Scan history |
| GET | `/v1/recyclers?lat=&lng=&radius=` | Nearest authorised recyclers |
| GET | `/v1/scan/{id}/report` | Report as PDF or PNG |
| GET | `/v1/prices` | Current price tables (transparency) |

Sample `/v1/scan` response:
```json
{
  "scan_id": "scn_8f2",
  "board": {"type": "DDR4_RAM", "confidence": 0.91},
  "components": [
    {"class": "RAM_IC", "count": 8, "avg_conf": 0.88, "reusable": true}
  ],
  "value": {"currency": "INR", "low": 140, "high": 260,
            "breakdown": {"reuse": [100, 200], "metals": [40, 60]}},
  "routes": [
    {"route": "Reuse", "score": 0.82, "value": 4, "cost": 4, "energy": 5, "co2": 5},
    {"route": "Desolder", "score": 0.71},
    {"route": "Hydromet", "score": 0.48},
    {"route": "Pyromet", "score": 0.30}
  ],
  "recommendation": "Sell to a refurbisher: 8 reusable RAM chips."
}
```

---

## 8. AI / ML Approach

### 8.1 Data
- **Public:** FICS-PCB, the PCB DSLR dataset, and Roboflow PCB component sets.
- **Field (planned):** 300–500 photos of the MVP board type taken on budget phones in real lighting.
- **Augmentation:** rotation, blur, glare, low light, JPEG compression, colour jitter. This simulates scrapyard conditions.
- **Labeling:** Roboflow, with a unified class taxonomy mapped across datasets.

### 8.2 Models
1. **Board classifier** (MVP board vs. other/unknown). This gates the pipeline and drives the "unseen board" warning.
2. **Component detector:** YOLO nano, fine-tuned, input 640px.
3. **OCR on ICs (P1):** read part numbers, then look them up in a part-price table.

### 8.3 Evaluation
- mAP@0.5 and per-class recall (missing a high-value IC costs more than a false capacitor).
- Board-level count accuracy.
- Field test on unseen phones and lighting.

### 8.4 Confidence & Safety
- Below a 0.5 board confidence: show "We're not sure. Retake the photo or treat as generic scrap."
- Always show **ranges**, never single exact figures.

---

## 9. Valuation & Route Scoring Logic

### 9.1 Value

```
Reuse value  = Σ (count_i × reuse_price_i × reusable_prob_i)
Metal value  = Σ (grams_metal × market_price_metal × recovery_rate_route)
Board value  = range over low/high table entries
```

- Metal prices are refreshed **daily** (MVP: manual weekly update; V2: price feed).
- Each table row carries a `source` for auditability.

### 9.2 Route Scoring (rule-based, MVP)

Each route is rated 1–5 on each criterion ("more dots = better"):

| Route | Value | Cost (low=good) | Energy | CO₂ |
|---|---|---|---|---|
| Reuse | High if reusable ICs are present | Low | Very low | Very low |
| Desolder | Medium–High | Medium (labour) | Low | Low |
| Hydrometallurgy | Medium (metals) | Medium | Medium | Medium |
| Pyrometallurgy | Low–Medium | High | High | High |

`Score = Σ w_c × normalised(criterion_c)`. Default weights: Value 0.4, Cost 0.2, Energy 0.2, CO₂ 0.2. Users can pick a preset: "Max profit" or "Greenest".

Hard rules:
- Reuse is eligible only if ≥1 reusable component has confidence ≥0.6.
- Hydromet and Pyromet are always recommended **through authorised recyclers only**. The app never gives instructions for home processing.

---

## 10. UX Requirements

- **3 taps to result:** Open → Snap → Result.
- Large icons, minimal text, Hindi/English toggle, voice readout (V2).
- Result screen order: **₹ range (big)**, then **what to do**, then **where to go**, then details.
- Offline: queue scans and upload when back online.
- Colour-blind-safe route indicators (dots + labels).

---

## 11. Phased Roadmap — MVP First, Then Scale

### Phase 1: MVP (Hackathon + 4 weeks)

| Stage | Deliverables |
|---|---|
| **Foundation** | Lock one board type; collect and label data; baseline detector; draft material/price tables; seed recycler DB |
| **Build** | Photo → parts → value pipeline; rule-based route scoring; PWA with capture/result/history |
| **Test & Demo** | Test on 20+ real boards; report view; demo flow; pitch + **pre-recorded backup video** |

**Exit criteria:** the §6.4 success criteria are met.

### Phase 2: Pilot (Months 2–4)
- Expand to **5 board types** (RAM, motherboard, phone mainboard, HDD controller, power supply).
- Chip-marking OCR and a part-number price lookup.
- Recycler dashboard: incoming lot pre-sorting and batch scans.
- Native Android app (Kotlin or React Native) with **on-device inference** (TFLite/ONNX) for offline use.
- Live metal price feed (MCX/LME-linked).
- Pilot with 2 authorised recyclers + 20 informal aggregators in one city (e.g., Delhi's Seelampur cluster).
- Active-learning loop: low-confidence scans are sent for human labeling.

### Phase 3: Platform (Months 5–12)
- **EPR/DPP module:** exportable compliance reports aligned with India's E-Waste (Management) Rules 2022 and the EU Digital Product Passport schema.
- **Marketplace (lite):** list harvested parts and lots; refurbishers buy; recyclers bid.
- Learned route scoring (ML using real outcome and price data) to replace pure rules.
- Multi-language support (Bengali, Tamil, Telugu, Marathi).
- Producer/PRO dashboards: traceable recovery volumes.
- Public API for recyclers and ERP integrations.

### Phase 4: Scale (Year 2+)
- 20+ board and device types; whole-device scanning.
- Integration with sorting lines (conveyor camera mode).
- Expansion to other markets with large informal sectors (SE Asia, Africa).
- Carbon credit / impact reporting (verified CO₂ avoided).
- Data partnerships with regulators (aggregate, anonymised flows).

---

## 12. Business Model (Post-MVP)

| Stream | Customer | Phase |
|---|---|---|
| Free app for informal users | Aggregators | All (growth engine) |
| SaaS dashboard (per seat or per scan volume) | Authorised recyclers, refurbishers | P2 |
| EPR/DPP compliance reports | Producers, PROs | P3 |
| Marketplace take rate (2–5%) | Part buyers/sellers | P3 |
| Data/insights licensing (anonymised) | Regulators, researchers | P4 |

---

## 13. Metrics & KPIs

| Category | Metric | MVP target | 12-month target |
|---|---|---|---|
| Product | Scans per week | 100 (pilot) | 50,000 |
| Product | Scan-to-result success rate | ≥90% | ≥97% |
| Model | Detection mAP@0.5 | ≥0.75 | ≥0.85 across types |
| Value | Avg ₹ uplift per board vs. scrap weight price | Measure baseline | +30% |
| Impact | Boards routed to authorised recyclers | Track | 25% of scans |
| Impact | Reusable ICs flagged | Track | 1M+ |
| Impact | CO₂ avoided (est.) | Track | Reported quarterly |
| Retention | Weekly active aggregators | 10 | 5,000 |

---

## 14. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Little training data | Public datasets + heavy augmentation + field collection + active learning |
| Unseen boards | Board classifier gate + confidence score + "unknown" fallback |
| Uncertain value | Show ranges, cite sources, refresh prices |
| Time crunch | Strict MVP: one board type, rule-based scoring |
| Demo failure | Pre-recorded backup run; cached sample scans |
| Poor phone cameras and lighting | Capture guides, quality checks, augmentation |
| Misuse (encouraging unsafe extraction) | Never provide chemical process instructions; route hazardous steps only to authorised recyclers |
| Adoption by informal sector | Hindi UI, simple UX, partnerships with aggregator associations and NGOs |
| Price volatility | Daily metal price updates; date-stamped estimates |
| Regulatory change | Modular compliance layer; track CPCB notifications |

---

## 15. Compliance, Privacy & Ethics
- Align with the **E-Waste (Management) Rules 2022** (CPCB): recommend only registered recyclers.
- **DPDP Act 2023** (India): consent for image storage, minimal PII, right to delete.
- Design the DPP export to follow the EU schema as it evolves.
- Transparent valuation: users can see how every number was calculated.
- Never shame or police informal workers. The tool is meant to increase their income and safety.

---

## 16. Dependencies & Assumptions
- Public datasets are licensed for this use (verify FICS-PCB and Roboflow licences).
- The CPCB authorised recycler list is accessible and can be geocoded.
- Metal content per board type can be estimated from the literature (PCBs are ~30–50% metal) and refined with recycler assay data.
- Users have a smartphone with a camera and intermittent internet.

---

## 17. Open Questions
1. Final MVP board type: RAM vs. motherboard?
2. What is the source of reference prices for validation (recycler partner quotes)?
3. How do we estimate "reusable probability" without electrical testing? (Heuristics: visible damage, age, part type.)
4. Should the MVP include login or stay fully anonymous?
5. Which pilot city and partner recyclers?

---

## 18. Team & Ownership (Proposed)

| Member | Ownership |
|---|---|
| Manish Prakash Sahu | Product lead, pitch, valuation tables |
| Mohit Kumar | ML: detection model, data pipeline |
| Trashi Sharma | Frontend PWA, UX, localisation |
| Mrikhil Mittal Mohanty | Backend API, DB, recycler locator |
| Pratyush Kumar Sahoo | Route scoring, testing, demo + backup video |

*(These are suggestions; reassign as needed.)*

---

## 19. References
- UN Global E-waste Monitor
- India E-Waste (Management) Rules 2022
- EU Digital Product Passport (ESPR)
- Springer: metal fraction of waste PCBs (~30–50%)
- ScienceDirect 2024: real-time component detection on waste PCBs
- MDPI 2025 review: data scarcity, generalisation, deployment
- Datasets: FICS-PCB, PCB DSLR, Roboflow PCB sets