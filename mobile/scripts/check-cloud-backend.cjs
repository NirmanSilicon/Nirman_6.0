// Check real capabilities, not just whether an arbitrary HTTPS URL responds.
async function main() {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (!configured) throw new Error("Set EXPO_PUBLIC_API_URL before a cloud build.");
  const origin = new URL(configured).origin;
  const ready = await fetch(origin + "/health/ready", {signal: AbortSignal.timeout(90000)});
  if (!ready.ok || !(await ready.json()).ready) throw new Error("The hosted backend/worker is not ready.");
  const capabilities = await fetch(origin + "/v1/info", {signal: AbortSignal.timeout(15000)});
  if (!capabilities.ok) throw new Error("Cannot read hosted backend capabilities.");
  const body = await capabilities.json();
  if (!body.accounts_available || !body.processing_jobs || !body.synthetic_demo_available)
    throw new Error("The hosted server does not support UQUAL accounts and processing jobs.");
  console.log("Hosted backend, personal accounts and ML worker are ready.");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
