import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Emergency Alert Submitted",
      description:
        "EMS or referring facility submits structured alert: patient acuity, mechanism of injury, vitals, ETA, and special considerations.",
      icon: (
        <svg
          className="w-8 h-8"
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
    },
    {
      number: "02",
      title: "Hospital Capability Matching",
      description:
        "System matches alert to optimal receiving hospitals based on trauma level, surgical capacity, specialty availability, and current census.",
      icon: (
        <svg
          className="w-8 h-8"
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
    },
    {
      number: "03",
      title: "Hospital Receives Alert",
      description:
        "Receiving hospital dashboard displays alert with patient details, countdown timer, and auto-generated preparation checklist.",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
      ),
    },
    {
      number: "04",
      title: "Preparation Tasks Assigned",
      description:
        "Role-based tasks auto-assigned: trauma surgeon notification, OR setup, blood bank activation, imaging standby, anesthesia, nursing.",
      icon: (
        <svg
          className="w-8 h-8"
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
    },
    {
      number: "05",
      title: "Staff Claim & Complete Tasks",
      description:
        "Team members claim tasks in real-time. Completion updates readiness score. Mobile and desktop access for all staff.",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
    {
      number: "06",
      title: "Countdown & Deadline Monitoring",
      description:
        "Live countdown to patient arrival. Task deadlines tracked visually. At-risk tasks highlighted. Charge nurse sees full timeline.",
      icon: (
        <svg
          className="w-8 h-8"
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
    },
    {
      number: "07",
      title: "Overdue Escalation & Readiness Confirmation",
      description:
        "Overdue tasks auto-escalate to leads. Final readiness score displayed. Team confirms readiness before patient arrival.",
      icon: (
        <svg
          className="w-8 h-8"
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
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            The{" "}
            <span className="text-golden-500">
              7-Step Coordination Workflow
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            From emergency alert to patient arrival — every step designed for
            zero-friction hospital preparation.
          </p>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-16 left-1/2 transform -translate-x-1/2 w-0.5 h-3/4 bg-gradient-to-b from-golden-300 to-emerald-300" />

          <div className="space-y-12 md:space-y-16">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`relative flex flex-col md:flex-row ${index % 2 === 0 ? "md:items-start" : "md:items-end md:text-right"} animate-slide-up`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="relative z-10 flex items-center gap-4 md:gap-6 mb-4 md:mb-0 md:w-1/2">
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-golden-100 text-golden-600 flex items-center justify-center">
                    {step.icon}
                  </div>
                  <div>
                    <span className="text-golden-500 font-mono font-bold text-lg">
                      {step.number}
                    </span>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                      {step.title}
                    </h3>
                  </div>
                </div>
                <div
                  className={`md:w-1/2 md:pl-12 ${index % 2 === 1 ? "md:pr-12" : ""}`}
                >
                  <p className="text-gray-600 text-lg leading-relaxed">
                    {step.description}
                  </p>
                </div>
                <div
                  className="hidden lg:block absolute left-1/2 top-16 -translate-x-1/2 w-4 h-4 rounded-full bg-golden-400 border-4 border-white shadow-lg"
                  style={{ top: `${16 + index * 48}px` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
