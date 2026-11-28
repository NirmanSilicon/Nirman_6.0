const localtunnel = require("localtunnel");

async function run() {
  while (true) {
    try {
      console.log("Connecting persistent tunnel to port 3000...");
      const tunnel = await localtunnel({
        port: 3000,
        subdomain: "goldenhour-patient"
      });

      console.log("\n========================================");
      console.log(`PUBLIC_TUNNEL_URL: ${tunnel.url}`);
      console.log("========================================\n");

      await new Promise((resolve) => {
        tunnel.on("close", () => {
          console.log("Tunnel closed, restarting loop...");
          resolve();
        });
        tunnel.on("error", (err) => {
          console.log("Tunnel error:", err.message);
          resolve();
        });
      });
    } catch (err) {
      console.error("Connection error:", err.message);
    }
    console.log("Reconnecting in 3 seconds...");
    await new Promise((r) => setTimeout(r, 3000));
  }
}

run();
