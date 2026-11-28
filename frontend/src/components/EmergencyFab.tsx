import { Link } from "@tanstack/react-router";
import { Siren } from "lucide-react";

export function EmergencyFab() {
  return (
    <Link
      to="/emergency"
      className="fixed bottom-6 left-6 z-50 grid h-16 w-16 place-items-center rounded-full bg-gradient-emergency text-destructive-foreground shadow-glow animate-pulse-ring"
      aria-label="Emergency SOS"
    >
      <Siren className="h-7 w-7" />
    </Link>
  );
}
