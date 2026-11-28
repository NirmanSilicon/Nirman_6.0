# FairPlay Lens — Decoding the Line Between Gaming and Gambling

An interactive "Digital Guardian" web platform by **Team ByteStorm** that empowers young gamers, parents, and educators to audit video game monetization, simulate gambling probability traps, preview selective RNG blocking without banning core gameplay, and discover ethical skill-based game alternatives.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Because the clarification step was bypassed in favor of adding full **WCAG ARIA accessibility**, the following recommended defaults are proposed for the build. You may request adjustments before approving.

- **Accessibility & ARIA Mandate (Confirmed)**: Every interactive UI component, tab, navigation link, toggle switch, simulator slider, wheel/roulette control, modal dialog, tooltip trigger, and form input will include explicit `aria-label`, `aria-describedby`, `role`, `aria-selected`, `aria-pressed`, `aria-checked`, `aria-live="polite"`, and keyboard focus management (`focus-visible`) for full screen reader and assistive technology compatibility.
- **Currency Default (Recommended Default)**: Interactive simulators and cost comparisons will default to a live **`₹ INR / $ USD` toggle** (defaulting to `₹ INR` to highlight regional Indian impact alongside global `$ USD` parity).
- **AI Scanner & Fallback Strategy (Recommended Default)**: Custom game title and policy scans will call a server-side Express endpoint backed by the **`@google/genai` (`gemini-4-hydrogen`)** SDK using structured JSON schema output, with an automatic deterministic dark-pattern analyzer fallback when no `GEMINI_API_KEY` is active so live hackathon demos never fail.
- **Community Reports & Checklist Persistence (Recommended Default)**: User-submitted predatory game reports and parental checklist progress will persist in browser `localStorage` across reloads alongside curated initial entries.

---

## 1. Overview & Core Concept

- **What It Does**: FairPlay Lens separates skill-based game progression from hidden gambling-like mechanics across five integrated workspaces:
  1. **Transparency Scanner**: Audits any game title or monetization description for dark patterns, outputting a 0–100 Predatory Risk Gauge, a Skill vs. Cosmetic vs. Gambling-Like breakdown chart, mechanic deconstructor cards, educational alerts, and a print-ready/PDF Risk Report.
  2. **Probability & House Edge Lab**: Three mathematical sandboxes—European vs. American Roulette Comparator (1,000-spin balance vs. house profit chart), Gacha & Loot Box "True Cost" Simulator ($1 - (1 - p)^n$ formula + real-world cost equivalents), and Weighted Spinning Wheel ("Near-Miss" Illusion with a "Reveal True Code Odds" code inspector).
  3. **FairPlay Shield**: Dual-mode live protection demo featuring **PC Game Companion Mode** (a playable mock RPG lobby where FairPlay Shield selectively intercepts and blurs only gambling popups while keeping core skill missions playable) and **Chrome Extension Mode** (a mock storefront page with an injected pre-download scanner popup).
  4. **Safe-Gaming Dashboard & Parental Hub**: Youth exposure metrics, an interactive parental quick-action checklist, a filterable directory of zero-gambling ethical games, and a live Community Report modal form.
  5. **Architecture & Future Roadmap**: Interactive system pipeline diagram and scalability cards (Chrome Web Store Extension, PC Overlay SDK, Crowdsourced Threat Database, and Regional Indian Language Pack).
- **Target Audience**: Teen and young adult gamers, non-technical parents evaluating games for their children, and hackathon judges evaluating technical depth and social impact.
- **Key Value**: Replaces abstract warnings with hands-on mathematical proof, plain-language psychological explanations, and non-destructive selective protection, with an instant **English / Hindi** toggle across UI labels and alerts.

---

## 2. User Experience & Visual Design

### Visual Identity & Theme
- **Aesthetic Direction**: Modern "Digital Guardian" telemetry and educational sandbox aesthetic—crisp, high-contrast, authoritative yet approachable for families.
- **Color Palette (60-30-10 Discipline)**:
  - **60% Dominant Neutral Canvas**: Deep Dark Slate (`#0B1120`) background field with subtle radial slate depth.
  - **30% Structural Surfaces**: Crisp Dark Card Surfaces (`#111827`), elevated nested panels (`#161F33`), and subtle hairline borders (`rgba(148, 163, 184, 0.16)`).
  - **10% Semantic & Action Accents**:
    - Primary Action: Electric Indigo (`#6366F1`)
    - Safe / Skill-Based: Safe Emerald (`#10B981`) — always paired with explicit text labels/icons
    - Caution / Medium Risk: Caution Amber (`#F59E0B`)
    - Predatory / High Risk: Predatory Crimson (`#EF4444`)
- **Typography & Hierarchy**:
  - **Display & Headings**: `Plus Jakarta Sans` (SemiBold 600 / Bold 700) with `text-wrap: balance` to prevent orphan headline words.
  - **Body & Educational Prose**: `DM Sans` (Regular 400 / Medium 500, `15px–16px`, `1.6` line-height) for effortless reading by parents and students.
  - **Data, Odds & Financial Counters**: `JetBrains Mono` with `font-variant-numeric: tabular-nums` so spinning counters, roulette balances, and drop rates align without horizontal jitter.

### Layout, Top Bar & Component Discipline
- **Top Bar Contract (3-Zone Header)**:
  - *Left Zone*: Clean single-line **FairPlay Lens** wordmark with shield glyph.
  - *Center Zone*: Five single-line module navigation tabs (`Scanner`, `Probability Lab`, `FairPlay Shield`, `Parental Hub`, `Roadmap`) using `role="tablist"` and `whitespace-nowrap`.
  - *Right Zone*: Single primary **EN / हिं** language toggle action (`aria-label` announcing current and target language), keeping the header uncluttered and within mobile height limits. Currency toggle (`₹ INR / $ USD`) lives cleanly inside the workspace toolbar where cost metrics appear.
- **Two-Zone Educational Sandbox Layout (Tab 2)**:
  - *Left/Primary Zone (60–65%)*: Live visual stage (side-by-side Roulette boards + Recharts Balance vs. House Profit curve, Gacha summon arena, or 8-slice SVG spinning wheel with true-odds overlay).
  - *Right Zone (35–40%)*: Parameter sliders (each with visible label, current numeric value, unit, and `aria-valuetext`), action triggers, and real-time mathematical formula callouts.
- **Anti-Slop & Accessibility Guardrails**:
  - Zero static pill badge sandwiches on cards; metadata uses clean typographic separators (`·`).
  - Zero thick left accent borders (`border-l-4`) or fake telemetry tickers.
  - Every interactive tooltip (explaining jargon like *Variable-Ratio Reinforcement* and *House Edge*), slider, tab, preset button, and modal supports keyboard navigation (`Tab`, `Enter`, `Space`, `Escape`), visible focus rings (`focus-visible:ring-2 focus-visible:ring-indigo-500`), and screen reader announcements (`aria-live="polite"` for scan completions, spin outcomes, and shield interceptions).
- **Interactive Feedback & Motion**:
  - Transitions settle in $\le 200\text{ms}$ using compositor properties (`transform`, `opacity`), respecting `prefers-reduced-motion`.
  - Print stylesheet (`@media print`) cleanly formats the Tab 1 Risk Report for one-click "Download Risk Report (Print / PDF)" export.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Server-Side Gemini Proxy + Resilient Heuristic Fallback**
  - *Chosen Approach*: Express backend route (`/api/analyze`) calls `@google/genai` (`gemini-4-hydrogen`) with strict `responseSchema` JSON output, falling back seamlessly to a keyword-and-mechanic heuristic analyzer if `GEMINI_API_KEY` is unavailable or rate-limited.
  - *Why*: Protects the API key on the server while guaranteeing the Transparency Scanner works instantaneously both with live AI and offline/unauthenticated pitch setups.
  - *Alternatives Considered*: Client-side SDK calls (exposes key) or failing hard without a key (risky during a 3-minute live demo).
- **Decision 2: High-Precision SVG + Recharts Visual Simulators**
  - *Chosen Approach*: Use Recharts for the 1,000-spin Roulette Balance vs. House Profit line chart and Mechanic Classification donut chart, paired with custom accessible SVG animations for the Roulette wheels, Risk Gauge, and 8-slice Weighted Wheel.
  - *Why*: Ensures crisp vector scaling across mobile phones and 1080p/4K projector screens, while allowing direct DOM/ARIA labeling on SVG charts and wheel outcomes.
  - *Alternatives Considered*: Canvas-only rendering (harder for screen readers and responsive text scaling).
- **Decision 3: Unified Bilingual Dictionary (English & Hindi)**
  - *Chosen Approach*: Centralize UI labels, navigation, key alerts, dark-pattern summaries, and parental tips in a typed `en` / `hi` translation dictionary.
  - *Why*: Switching languages updates the entire interface instantaneously without reloading or losing simulator state.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         FAIRPLAY LENS WEB CLIENT                           │
│  ┌──────────────────┐   ┌────────────────────────────────────────────────┐ │
│  │  Global Context  │   │             Accessible 5-Tab Shell             │ │
│  │ • Lang (EN / HI) │──▶│ • Top Bar (Wordmark · 5 Tabs · Lang Switch)    │ │
│  │ • Currency (₹/$) │   │ • Live Region Announcer (aria-live="polite")   │ │
│  │ • Reports Store  │   │ • Footer (Team ByteStorm Attribution)          │ │
│  └──────────────────┘   └───────────────────────┬────────────────────────┘ │
│                                                 │                          │
│     ┌───────────────────┬───────────────────────┼───────────────┬────────┐ │
│     ▼                   ▼                       ▼               ▼        ▼ │
│ ┌────────┐        ┌───────────┐           ┌───────────┐   ┌─────────┐ ┌──┐ │
│ │ Tab 1  │        │   Tab 2   │           │   Tab 3   │   │  Tab 4  │ │5 │ │
│ │Scanner │        │ Prob Lab  │           │  Shield   │   │ParentHub│ │RM│ │
│ │Presets │        │• Roulette │           │• PC Lobby │   │• Stats  │ │  │ │
│ │Gauge   │        │• Gacha    │           │• Ext Mock │   │• Checks │ │  │ │
│ │Donut   │        │• Wheel    │           │• Intercept│   │• Games  │ │  │ │
│ │Print   │        │• Recharts │           │  Overlay  │   │• Report │ │  │ │
│ └───┬────┘        └───────────┘           └───────────┘   └─────────┘ └──┘ │
└─────┼──────────────────────────────────────────────────────────────────────┘
      │ POST /api/analyze { title, description, language }
      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        EXPRESS API SERVER (server.ts)                      │
│  ┌───────────────────────────────────┐    ┌─────────────────────────────┐  │
│  │    Gemini SDK (@google/genai)     │    │  Structured Rule Fallback   │  │
│  │  Model: gemini-4-hydrogen         │───▶│  Triggered if key absent    │  │
│  │  Strict Type.OBJECT responseSchema│    │  or upstream unavailable    │  │
│  └───────────────────────────────────┘    └─────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Interactive State Mapping
- **Risk Analysis Report (`RiskReport`)**: Stores `gameTitle`, `riskScore` (0–100), `riskLevel` (`LOW` | `MEDIUM` | `HIGH`), `breakdown` (`skillPct`, `cosmeticPct`, `gamblingPct`), `detectedPatterns` (pattern title, severity, psychological mechanism, plain-English explanation), `gamerAlert`, `parentAlert`, and `analysisSource` (`gemini` | `heuristic`).
- **Probability Lab State**:
  - *Roulette*: Tracks bet type (Red/Black or straight number), wager (`₹` or `$`), European vs. American balances, spin history array (`spinIndex`, `euBalance`, `usBalance`, `euHouseProfit`, `usHouseProfit`), and live single-spin pocket animation state.
  - *Gacha*: Tracks drop rate `p`, cost per pull, pity limit, total pulls, pity counter, wins, virtual gems spent, real currency spent, cumulative probability $1 - (1 - p)^n$, and real-world cost comparison tiers.
  - *Weighted Wheel*: Tracks total spins, net balance, near-misses triggered, visual equal-slice layout vs. hidden backend probability weights (`0.5%` Grand Prize, `85%` filler, intentional adjacent near-miss targeting), and "Reveal True Code Odds" toggle.
- **FairPlay Shield State**: Tracks active simulation mode (`pc` | `extension`), `shieldEnabled` boolean, active modal (`null` | `mission` | `arena` | `customize` | `gambling-raw` | `shield-blocked` | `math-breakdown`), and blocked-attempts counter.
- **Parental Hub State**: Persists checklist completion (`Record<string, boolean>`) and community-reported games (`CommunityReport[]`) in `localStorage`, plus live filter state (`All`, `Zero Microtransactions`, `Indie`, `Co-op / Story`) for the Ethical Games Directory.
