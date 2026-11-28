import { Link } from 'react-router-dom';
import {
  Building2,
  Camera,
  CheckCircle,
  ClipboardList,
  Globe,
  Map as MapIcon,
  Scale,
  ShieldCheck,
  Users,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Globe,
    title: '3D City Map',
    desc: 'Explore infrastructure projects on an interactive CesiumJS globe with 2D Leaflet fallback.',
    to: '/',
    color: 'bg-forest-green',
  },
  {
    icon: ClipboardList,
    title: 'Government Projects',
    desc: 'View officially reported budgets, timelines, departments and progress. Clearly marked demo vs official data.',
    to: '/projects',
    color: 'bg-secondary-green',
  },
  {
    icon: Camera,
    title: 'Evidence & Verification',
    desc: 'GPS photo capture, SHA-256 hashing, project-boundary validation, survey comparison and officer review.',
    to: '/evidence',
    color: 'bg-muted-blue',
  },
  {
    icon: Scale,
    title: 'Citizen Complaints',
    desc: 'Submit, track and resolve infrastructure complaints with photographic evidence and an audit trail.',
    to: '/complaints',
    color: 'bg-dark-blue-grey',
  },
  {
    icon: Building2,
    title: 'Future City 3D',
    desc: 'Design proposed roads, parks and buildings using Three.js. Compare proposed vs existing. Clearly labelled simulations.',
    to: '/future-city',
    color: 'bg-champagne',
  },
  {
    icon: ShieldCheck,
    title: 'Role Dashboards',
    desc: 'Tailored interfaces for Citizens, Officers, Contractors and Administrators with RBAC and RLS.',
    to: '/dashboard',
    color: 'bg-terracotta',
  },
];

const PRINCIPLES = [
  { icon: CheckCircle, text: 'All demo data clearly labelled — not official government data' },
  { icon: CheckCircle, text: 'GPS/timestamps indicate capture context, not authenticity' },
  { icon: CheckCircle, text: 'Evidence requires human officer verification before action' },
  { icon: CheckCircle, text: 'Service-role key never exposed in browser bundle' },
  { icon: CheckCircle, text: 'Row-Level Security enforced at database layer via Supabase RLS' },
];

export function HomePage() {
  return (
    <div className="space-y-10">
      {/* Demo Mode Banner */}
      <div className="bg-champagne/20 border border-champagne rounded-xl px-5 py-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-charcoal/70 uppercase tracking-wide">
          Demo Mode Active
        </span>
        <span className="text-sm text-charcoal">
          Running with labeled sample data. No Supabase credentials configured.{' '}
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noreferrer"
            className="text-muted-blue underline"
          >
            Connect a real database
          </a>{' '}
          to enable live data.
        </span>
      </div>

      {/* Hero */}
      <div className="bg-white rounded-2xl border border-charcoal/10 p-8 lg:p-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-forest-green/10 border border-forest-green/20 text-forest-green text-xs font-semibold mb-5">
            <MapIcon className="w-3.5 h-3.5" />
            Civic GIS Intelligence Platform · Hackathon MVP
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold text-forest-green leading-tight">
            NagarDrishti <span className="text-champagne">3D</span>
          </h1>
          <p className="mt-3 text-xl text-dark-blue-grey font-medium">
            Monitor Today's City. Visualize Tomorrow's City.
          </p>
          <p className="mt-4 text-base text-charcoal/80 leading-relaxed max-w-2xl">
            NagarDrishti 3D bridges government infrastructure reporting, independent
            field verification, citizen participation, and 3D urban-planning
            visualization — bringing transparent, evidence-based city governance to
            Bhubaneswar and beyond.
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              to="/map"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-forest-green text-white font-semibold text-sm hover:bg-secondary-green transition-colors"
            >
              <Globe className="w-4 h-4" />
              Explore 3D Map
            </Link>
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-champagne text-charcoal font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <ClipboardList className="w-4 h-4" />
              View Projects
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-charcoal/20 text-charcoal font-semibold text-sm hover:bg-warm-ivory transition-colors"
            >
              <Users className="w-4 h-4" />
              Register
            </Link>
          </div>
        </div>
      </div>

      {/* Four Pillars */}
      <div>
        <h2 className="text-lg font-semibold text-forest-green mb-4">Platform Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              to={f.to}
              className="group bg-white rounded-xl border border-charcoal/10 p-5 hover:border-secondary-green/40 hover:shadow-sm transition-all"
            >
              <div
                className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${f.color} text-white mb-4`}
              >
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-forest-green group-hover:text-secondary-green">
                {f.title}
              </h3>
              <p className="text-sm text-charcoal/70 mt-1 leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Ethical Commitments */}
      <div className="bg-white rounded-xl border border-charcoal/10 p-6">
        <h2 className="text-base font-semibold text-forest-green mb-4">
          Design & Transparency Commitments
        </h2>
        <ul className="space-y-2.5">
          {PRINCIPLES.map((p) => (
            <li key={p.text} className="flex items-start gap-3">
              <p.icon className="w-4 h-4 text-success-green mt-0.5 shrink-0" />
              <span className="text-sm text-charcoal/80">{p.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Tech Stack */}
      <div className="bg-white rounded-xl border border-charcoal/10 p-6">
        <h2 className="text-base font-semibold text-forest-green mb-4">Technology Stack</h2>
        <div className="flex flex-wrap gap-2">
          {[
            'React 18 + TypeScript',
            'Vite 6',
            'Tailwind CSS',
            'CesiumJS (3D Globe)',
            'Leaflet (2D Map)',
            'Three.js (3D Models)',
            'Node.js + Express',
            'Supabase PostgreSQL + PostGIS',
            'Supabase Auth + RLS',
            'Zod Validation',
            'Recharts',
            'Python FastAPI (optional)',
          ].map((t) => (
            <span
              key={t}
              className="text-xs px-2.5 py-1 rounded-full bg-warm-ivory border border-charcoal/15 text-charcoal"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
