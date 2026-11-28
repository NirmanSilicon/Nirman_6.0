import {
  Hero,
  Features,
  HowItWorks,
  HospitalReadiness,
  Footer,
} from "@/components/shared";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Emergency Readiness Coordination for Hospitals",
  description:
    "GoldenHour coordinates emergency alerts, hospital capability matching, and preparation task workflows — so trauma teams are ready before the patient arrives.",
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <HospitalReadiness />
      <Footer />
    </>
  );
}
