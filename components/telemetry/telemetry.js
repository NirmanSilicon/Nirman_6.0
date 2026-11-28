const API_BASE = (window.AEROSENTRY_API_BASE || 'http://127.0.0.1:8000').replace(/\/$/, '');

export function mount(root, api) {
  const $ = id => root.querySelector(`#${id}`);
  const processButton = $('loaderProcessBtn');
  const endButton = $('loaderEndBtn');
  const log = $('telemetryLog');
  let socket = null;
  let count = 0;
  let lastCycle = null;
  let sessionActive = false;
  const datasetSelect = $('telemetryDataset');
  const engineSelect = $('telemetryEngine');
  const savedApiBase = (() => { try { return (localStorage.getItem('aerosentry-api-base-url') || API_BASE).replace(/\/+$/, ''); } catch (_) { return API_BASE; } })();

  function addLog(message, type = '') {
    const row = document.createElement('div'); row.className = `telemetry-log-entry ${type}`;
    const time = document.createElement('time'); time.textContent = new Date().toLocaleTimeString();
    const text = document.createElement('span'); text.textContent = message; row.append(time, text); log.prepend(row);
    while (log.children.length > 60) log.lastElementChild.remove();
  }
  function setStatus(status) {
    $('telemetryStatusText').textContent = `LOADER ${String(status).toUpperCase()}`;
    $('telemetryStatusBadge').classList.toggle('is-running', status === 'running');
    $('telemetryStatusBadge').classList.toggle('is-ended', ['stopped', 'completed', 'idle'].includes(status));
    sessionActive = status === 'running' || status === 'paused';
    processButton.disabled = sessionActive; endButton.disabled = !sessionActive;
    $('telemetryFeedTag').textContent = status === 'running' ? 'STREAM ACTIVE' : status === 'completed' ? 'STREAM COMPLETED' : status === 'stopped' ? 'STREAM ENDED' : 'NO ACTIVE FEED';
  }
  function renderMessage(message) {
    count += 1; lastCycle = message.source_cycle ?? message.cycle ?? lastCycle;
    $('telemetryReadingCount').textContent = count.toLocaleString(); $('telemetryCurrentCycle').textContent = lastCycle ?? '—'; $('telemetryCurrentEngine').textContent = message.engine_id || '—';
    $('telemetryProgressBar').style.width = `${Math.min(100, count / 6 * 100)}%`; $('telemetryProgressText').textContent = `${count} readings received`;
    $('telemetrySocketState').textContent = 'CONNECTED';
    const values = {...(message.operating_conditions || {}), ...(message.sensors || {})}; const grid = $('telemetryReadingGrid'); grid.innerHTML = '';
    Object.entries(values).forEach(([name, value]) => { const card = document.createElement('div'); card.className = 'telemetry-reading-card'; const label = document.createElement('span'); label.textContent = name.replaceAll('_', ' ').toUpperCase(); const reading = document.createElement('strong'); reading.textContent = Number.isFinite(Number(value)) ? Number(value).toFixed(2) : String(value); const note = document.createElement('small'); note.textContent = name.toLowerCase().startsWith('setting') ? 'Operating condition' : 'Sensor measurement'; card.append(label, reading, note); grid.append(card); });
    addLog(`Received ${message.engine_id || 'engine'} · source cycle ${lastCycle}.`, 'is-success');
  }
  function connectSocket() {
    if (socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(socket.readyState)) return;
    const wsBase = API_BASE.replace(/^http/, 'ws'); socket = new WebSocket(`${wsBase}/api/v1/telemetry/ws`);
    socket.addEventListener('open', () => { $('telemetrySocketState').textContent = 'CONNECTED'; addLog('WebSocket connected; waiting for telemetry.'); });
    socket.addEventListener('message', event => { try { renderMessage(JSON.parse(event.data)); } catch { addLog('Received an unreadable telemetry message.', 'is-error'); } });
    socket.addEventListener('error', () => { $('telemetrySocketState').textContent = 'ERROR'; addLog('WebSocket connection error.', 'is-error'); });
    socket.addEventListener('close', () => { $('telemetrySocketState').textContent = 'DISCONNECTED'; });
  }
  async function request(path, options = {}) {
    const response = await fetch(`${savedApiBase}${path}`, {headers:{'Content-Type':'application/json', ...(options.headers || {})}, ...options}); const body = await response.json().catch(() => ({}));
    if (!response.ok) { const detail = body.detail; throw new Error(typeof detail === 'string' ? detail : detail?.message || JSON.stringify(detail || `Backend request failed (${response.status}).`)); } return body;
  }
  async function refreshDatasetOptions() {
    try {
      const status = await request('/api/v1/datasets/ncmapss/ds05/status');
      const option = datasetSelect.querySelector('option[value="ncmapss"]');
      if (option) { option.disabled = status.preprocessed !== true; option.textContent = status.preprocessed ? 'N-CMAPSS DS05 · processed flight summaries' : 'N-CMAPSS DS05 · preprocess required'; }
    } catch (_) { /* Keep the N-CMAPSS option disabled while the backend is unavailable. */ }
  }
  async function refreshEngineOptions() {
    const source = datasetSelect.value;
    const data = await request(`/api/v1/telemetry/engines?data_source=${encodeURIComponent(source)}`);
    const current = engineSelect.value;
    engineSelect.innerHTML = (data.engines || []).map(item => `<option value="${String(item.engine_id)}">${String(item.engine_id)}</option>`).join('');
    if ([...engineSelect.options].some(option => option.value === current)) engineSelect.value = current;
    if (!engineSelect.options.length) throw new Error('No engines are available in the selected telemetry source.');
  }
  async function refreshStatus() {
    try { const status = await request('/api/v1/telemetry/status'); setStatus(status.state || 'idle'); if (status.engine_id) $('telemetryCurrentEngine').textContent = status.engine_id; $('telemetryReadingCount').textContent = Number(status.sequence || 0).toLocaleString(); addLog(`Backend status: ${status.state || 'unknown'}.`); document.dispatchEvent(new CustomEvent('aerosentry:api-status', {detail:{connected:true,label:'API CONNECTED'}})); }
    catch (error) { addLog(`Backend unavailable: ${error.message}`, 'is-error'); document.dispatchEvent(new CustomEvent('aerosentry:api-status', {detail:{connected:false,label:'API NOT CONNECTED'}})); }
  }
  datasetSelect.addEventListener('change', async () => { try { await refreshEngineOptions(); addLog(`Loaded engine list for ${datasetSelect.value}.`, 'is-success'); } catch (error) { addLog(error.message, 'is-error'); api.toast(error.message); } });
  processButton.addEventListener('click', async () => {
    processButton.disabled = true;
    try { count = 0; lastCycle = null; $('telemetryReadingCount').textContent = '0'; $('telemetryCurrentCycle').textContent = '—'; $('telemetryReadingGrid').innerHTML = '<div class="telemetry-empty-state">Loader is processing the selected engine data…</div>'; connectSocket();
      const result = await request('/api/v1/telemetry/start', {method:'POST', body:JSON.stringify({engine_id:$('telemetryEngine').value, data_source:datasetSelect.value, interval_seconds:Number($('telemetryInterval').value)})}); setStatus(result.state || 'running'); $('telemetryCurrentEngine').textContent = $('telemetryEngine').value; addLog(`Loader processing started for ${$('telemetryEngine').value} from ${datasetSelect.value}.`, 'is-success');
    } catch (error) { setStatus('idle'); addLog(error.message, 'is-error'); api.toast(error.message); } finally { processButton.disabled = sessionActive; }
  });
  endButton.addEventListener('click', async () => { endButton.disabled = true; try { const result = await request('/api/v1/telemetry/stop', {method:'POST'}); setStatus(result.state || 'stopped'); addLog('Loader status ended. Telemetry processing stopped.', 'is-success'); if (socket) { socket.close(); socket = null; } } catch (error) { addLog(error.message, 'is-error'); api.toast(error.message); endButton.disabled = false; } });
  $('clearTelemetryLog').addEventListener('click', () => { log.innerHTML = ''; addLog('Activity log cleared.'); });
  refreshStatus().then(async () => { await refreshDatasetOptions(); await refreshEngineOptions().catch(error => addLog(error.message, 'is-error')); }); return () => { if (socket) socket.close(); };
}
