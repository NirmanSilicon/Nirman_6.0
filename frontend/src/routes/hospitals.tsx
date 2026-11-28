import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/hospitals")({
  component: HospitalsLayout,
});

function HospitalsLayout() {
  return <Outlet />;
}
