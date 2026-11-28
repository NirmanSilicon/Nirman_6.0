import { Button } from "@/components/ui";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-white to-golden-50">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23f59e0b%22 fill-opacity=%220.03%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-golden-300/20 rounded-full blur-3xl animate-pulse-slow" />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-300/20 rounded-full blur-3xl animate-pulse-slow"
        style={{ animationDelay: "1.5s" }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-golden-100 text-golden-800 text-sm font-medium mb-8 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-golden-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-golden-500" />
          </span>
          GoldenHour — Emergency Readiness Coordination System
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-gray-900 tracking-tight mb-6 animate-slide-up">
          Hospital preparation starts
          <br />
          <span className="text-golden-500">before the patient arrives.</span>
        </h1>

        <p
          className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          GoldenHour coordinates emergency alerts, hospital capability matching,
          and preparation task workflows — so trauma teams are ready when every
          second counts.
        </p>

        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up"
          style={{ animationDelay: "200ms" }}
        >
          <Button size="xl" className="w-full sm:w-auto">
            Submit Emergency Alert
          </Button>
          <Button variant="outline" size="xl" className="w-full sm:w-auto">
            Hospital Dashboard
          </Button>
        </div>

        <div
          className="mt-16 flex items-center justify-center gap-8 text-gray-500 animate-fade-in"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-golden-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">HIPAA Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-golden-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
              />
            </svg>
            <span className="font-medium">Audit Trails</span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-golden-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="font-medium">Real-Time Coordination</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <svg
          className="w-6 h-6 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
}
