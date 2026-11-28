import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui";
import { Button } from "@/components/ui";

export function HospitalReadiness() {
  const readinessMetrics = [
    {
      label: "Task Completion",
      value: "94%",
      description: "Average across network",
    },
    {
      label: "On-Time Readiness",
      value: "91%",
      description: "Before patient arrival",
    },
    {
      label: "Escalation Rate",
      value: "3.2%",
      description: "Tasks requiring escalation",
    },
    {
      label: "Avg. Prep Time",
      value: "18 min",
      description: "Alert to readiness",
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Hospital Readiness{" "}
            <span className="text-golden-500">Dashboard</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Real-time visibility into preparation status. Every role sees their
            tasks, every lead sees the full picture.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {readinessMetrics.map((metric, index) => (
            <Card
              key={metric.label}
              variant="outlined"
              padding="lg"
              className="animate-slide-up text-center"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-3xl md:text-4xl font-bold text-golden-600 mb-2">
                {metric.value}
              </div>
              <div className="font-semibold text-gray-900 mb-1">
                {metric.label}
              </div>
              <CardDescription className="text-sm">
                {metric.description}
              </CardDescription>
            </Card>
          ))}
        </div>

        <Card variant="elevated" padding="lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <CardTitle className="text-2xl mb-2">
                Trauma Team Preparation View
              </CardTitle>
              <CardDescription className="text-lg">
                Live dashboard showing task assignments, claim status, countdown
                timer, and readiness score. Charge nurse monitors critical path.
                All updates sync in real-time across devices.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button size="lg">View Dashboard Demo</Button>
              <Button variant="outline" size="lg">
                See Task Workflow
              </Button>
            </div>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Task Board",
                desc: "Kanban-style task tracking with role filters, claim buttons, and completion timestamps.",
              },
              {
                title: "Countdown Timer",
                desc: "Prominent ETA countdown with color-coded urgency zones (green/yellow/red).",
              },
              {
                title: "Readiness Score",
                desc: "Weighted score based on critical path tasks. Auto-calculates as tasks complete.",
              },
            ].map((item, index) => (
              <div key={item.title} className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {item.title}
                </h4>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
