import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui";

interface Capability {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const capabilities: Capability[] = [
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: "Emergency Alert Intake",
    description:
      "Structured alert submission with patient acuity, mechanism of injury, vital signs, and ETA. Standardized format reduces communication errors.",
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    title: "Hospital Capability Matching",
    description:
      "Match alerts to receiving hospitals based on trauma level, specialties, current capacity, and surgical availability. Automatic routing rules.",
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
    title: "Preparation Task Coordination",
    description:
      "Auto-generate preparation checklists: OR readiness, blood products, imaging, specialist notification. Tasks assigned to roles with claim workflow.",
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: "Countdown & Deadline Monitoring",
    description:
      "Live countdown to patient ETA. Visual timeline with task deadlines. Color-coded urgency indicators for at-risk tasks.",
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    title: "Automatic Overdue Escalation",
    description:
      "Tasks past deadline auto-escalate to charge nurse and department lead. Escalation log with timestamps for quality review.",
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    title: "Hospital Readiness Tracking",
    description:
      "Real-time dashboard showing task completion %, critical path status, and overall readiness score. Historical metrics for process improvement.",
  },
];

export function Features() {
  return (
    <section className="py-20 md:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Core Capabilities for{" "}
            <span className="text-golden-500">Hospital Coordination</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Six integrated modules covering the full emergency readiness
            lifecycle — from alert to patient arrival.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((capability, index) => (
            <Card
              key={capability.title}
              variant="outlined"
              padding="lg"
              className="hover:shadow-xl hover:border-golden-200 transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-golden-100 text-golden-600 flex items-center justify-center mb-4">
                {capability.icon}
              </div>
              <CardTitle className="text-lg">{capability.title}</CardTitle>
              <CardDescription className="text-base">
                {capability.description}
              </CardDescription>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
