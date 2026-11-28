import { HeroSection } from "@/components/home/HeroSection";
import { EmergencyCategoryTriage } from "@/components/home/EmergencyCategoryTriage";
import { MatchingLogicSection } from "@/components/home/MatchingLogicSection";
import { LiveHospitalRadar } from "@/components/home/LiveHospitalRadar";
import { EscalationProtocolSection } from "@/components/home/EscalationProtocolSection";
import { PilotMetricsSection } from "@/components/home/PilotMetricsSection";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <EmergencyCategoryTriage />
      <MatchingLogicSection />
      <LiveHospitalRadar />
      <EscalationProtocolSection />
      <PilotMetricsSection />
    </div>
  );
}
