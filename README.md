# GoldenHour

**We are not an ambulance, not even a doctor. We are those 12 minutes just before the emergency.**

GoldenHour is an Emergency Readiness Coordination System designed to help hospitals prepare before an emergency patient arrives.

It coordinates emergency alerts, hospital readiness, preparation tasks, countdown monitoring, and overdue task escalation.

The goal is to reduce coordination delays during the critical period before patient arrival.

---

## The Problem

When an emergency patient is on the way to a hospital, preparation must happen quickly.

However, important activities can remain disconnected:

- Emergency information may not reach the right hospital staff.
- Hospital readiness may be unclear.
- Preparation responsibilities may not be assigned.
- Critical tasks may be delayed or overlooked.
- Staff may lack a shared view of preparation progress.

GoldenHour aims to bring these activities into one coordinated workflow.

---

## Core Workflow

1. **Emergency Alert Intake** — Receive an emergency alert.
2. **Hospital Capability Matching** — Identify an appropriate hospital based on available capabilities.
3. **Hospital Alert** — Notify the selected hospital.
4. **Preparation Task Coordination** — Assign and claim preparation tasks.
5. **Countdown Monitoring** — Track the time remaining before patient arrival.
6. **Overdue Escalation** — Identify and escalate overdue preparation tasks.
7. **Hospital Readiness Tracking** — Monitor preparation progress before arrival.

---

## Tech Stack

| Technology     | Purpose                                |
| -------------- | -------------------------------------- |
| Next.js 15     | Application framework                  |
| React 19       | User interface                         |
| TypeScript     | Application development                |
| Tailwind CSS 3 | Styling                                |
| Supabase       | PostgreSQL database and authentication |
| Supabase SSR   | Server-side authentication integration |
| pnpm 9         | Package management                     |
| ESLint         | Code quality                           |
| Prettier       | Code formatting                        |

---

## Project Structure

```text
Golden-Hour/
├── docs/
├── public/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── shared/
│   │   └── ui/
│   ├── lib/
│   │   ├── auth/
│   │   ├── supabase/
│   │   └── utils/
│   └── types/
├── supabase/
│   ├── migrations/
│   └── tests/
├── .env.example
├── .gitignore
├── package.json
├── pnpm-lock.yaml
└── README.md
```

# GoldenHour

**The 12 minutes before emergency services arrive.**

GoldenHour is an emergency readiness coordination system that ensures your medical profile, emergency contacts, and nearest trauma centers are ready when seconds count.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.6
- **Styling**: Tailwind CSS 3.4
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with @supabase/ssr
- **Package Manager**: pnpm 9
- **Linting**: ESLint 9 + Prettier 3

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase account (for database and auth)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/goldenhour.git
cd goldenhour

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable                        | Description                                      | Required |
| ------------------------------- | ------------------------------------------------ | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL                        | Yes      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key                           | Yes      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key (server only)          | Yes      |
| `NEXT_PUBLIC_APP_URL`           | Application URL (default: http://localhost:3000) | No       |
| `NEXT_PUBLIC_APP_NAME`          | Application name (default: GoldenHour)           | No       |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/
│   ├── ui/                # Base UI components (Button, Card, etc.)
│   └── shared/            # Shared feature components (Hero, Features, etc.)
├── lib/
│   ├── supabase/          # Supabase clients (browser, server, service)
│   ├── auth/              # Auth helpers (session, user, requireAuth)
│   └── utils/             # Utility functions (cn, formatDate, etc.)
├── types/
│   ├── database.ts        # Generated Supabase types
│   └── index.ts           # Shared type exports
public/                    # Static assets
supabase/
├── migrations/            # SQL migrations
└── tests/                 # Database tests
docs/                      # Documentation
```

## Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript type checking
pnpm format       # Format with Prettier
pnpm format:check # Check formatting
```

## Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to `.env.local`
3. Run migrations (when available):
   ```bash
   pnpm supabase db push
   ```
4. Generate TypeScript types:
   ```bash
   pnpm supabase gen types typescript --local > src/types/database.ts
   ```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker

```bash
docker build -t goldenhour .
docker run -p 3000:3000 --env-file .env.local goldenhour
```

## Security

- Never commit `.env.local` or any file containing secrets
- Service role key only used in server-side code
- All client-side code uses anon key with RLS policies
- HIPAA-compliant infrastructure required for production

## Contributing

1. Create a feature branch from `main`
2. Make changes with tests
3. Run `pnpm lint`, `pnpm typecheck`, `pnpm format:check`
4. Submit PR

## License

MIT License — see [LICENSE](LICENSE) for details.

## Contact

- Website: [goldenhour.app](https://goldenhour.app)
- Email: hello@goldenhour.app
- Twitter: [@goldenhour](https://twitter.com/goldenhour)
