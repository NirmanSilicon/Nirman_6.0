/* Minimal client that proves the stream. Open this page in two tabs and both
   must show the same seq and event_id for every event. */

const feed = document.getElementById("feed");
const lastEl = document.getElementById("last");
const alertEl = document.getElementById("alert");
const countEl = document.getElementById("count");
const connEl = document.getElementById("conn");
const dot = document.getElementById("dot");

let countdownTimer = null;

function setConn(state) {
  connEl.textContent = state;
  dot.className = "dot " + (state === "live" ? "on" : state === "lost" ? "off" : "");
}

function render(event) {
  lastEl.textContent = `${event.type}  #${event.seq}  ${event.event_id}`;

  const li = document.createElement("li");
  const time = new Date(event.t_server).toLocaleTimeString("en-IN", { hour12: false });
  li.innerHTML =
    `<span class="mono seq">#${event.seq}</span>` +
    `<span class="type">${event.type}</span>` +
    `<span class="src">${event.source}</span>` +
    `<span class="mono time">${time}</span>` +
    `<span class="data">${JSON.stringify(event.data)}</span>`;
  feed.prepend(li);
  while (feed.children.length > 60) feed.removeChild(feed.lastChild);

  if (event.type === "alert_call_started") {
    startCountdown(Number(event.data.countdown_s ?? 5));
  }
  if (event.type === "alert_confirmed") {
    stopCountdown();
    const level = String(event.data.level || "unknown");
    alertEl.textContent = level;
    alertEl.className = "badge " + (level === "high" ? "high" : level === "low" ? "low" : "none");
  }
  if (event.type === "impact_detected") {
    alertEl.textContent = "pending";
    alertEl.className = "badge pending";
  }
}

function startCountdown(seconds) {
  stopCountdown();
  const end = performance.now() + seconds * 1000;
  countdownTimer = setInterval(() => {
    const left = Math.max(0, (end - performance.now()) / 1000);
    countEl.textContent = left.toFixed(1);
    if (left <= 0) stopCountdown();
  }, 50);
}

function stopCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = null;
}

function connect() {
  setConn("connecting");
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.onopen = () => setConn("live");
  ws.onclose = () => {
    setConn("lost");
    setTimeout(connect, 1500);
  };
  ws.onerror = () => setConn("lost");
  ws.onmessage = (msg) => {
    const payload = JSON.parse(msg.data);
    if (payload.kind === "snapshot") {
      feed.innerHTML = "";
      payload.events.forEach(render);
      return;
    }
    if (payload.kind === "error") return;
    render(payload);
  };
}

connect();
