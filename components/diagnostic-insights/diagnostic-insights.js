export function mount(root, api) {
  const $=id=>root.querySelector(`#${id}`);const data=api.getData();
  $('diagnosticEngine').innerHTML=data.engines.map(e=>`<option value="${e.id}">${e.id}</option>`).join('');
  $('diagnosticEngine').value=api.getSelectedEngine();
  let currentFindingEngine=$('diagnosticEngine').value;
  const getFinding=()=>data.engines.find(e=>e.id===currentFindingEngine)||data.engines[0];
  const render=()=>{
    const e=getFinding();
    $('findingSubtitle').textContent=`Engine ${e.id} · Current cycle ${e.cycle} · Local demo data`;
    $('findingStatus').className=`finding-status ${e.status.toLowerCase()}`;
    $('findingStatus').textContent=`● ${e.status.toUpperCase()}`;
    $('evidenceAnomaly').textContent=e.anomaly.toFixed(2);
    $('evidenceRul').innerHTML=`${e.rul} <small>cycles</small>`;
    $('evidenceStatus').textContent=e.status;
    if(e.status==='Review'){
      $('findingTitle').textContent='Low predicted RUL with elevated anomaly score';
      $('problemStatement').textContent='The demo model indicates a low remaining-life estimate together with unusual sensor behaviour.';
      $('problemDescription').textContent='This combination warrants closer review of the engine history and underlying sensor evidence. It does not confirm a physical fault or a specific failed component.';
      $('problemIcon').textContent='!';
      $('reasonList').innerHTML=`<div class="reason-item"><strong>Low predicted RUL</strong><p>The illustrative estimate is ${e.rul} remaining cycles, below the demo review threshold.</p></div><div class="reason-item"><strong>Elevated anomaly score</strong><p>The demo anomaly score is ${e.anomaly.toFixed(2)}, indicating unusual input patterns in this example.</p></div><div class="reason-item"><strong>Engine status</strong><p>The local demo data classifies this engine as requiring review.</p></div>`;
    } else if(e.status==='Monitor'){
      $('findingTitle').textContent=e.id==='AS-004'?'Persistent multi-sensor deviation':'Sensor trend requires monitoring';
      $('problemStatement').textContent=e.id==='AS-004'?'Several simulated sensor channels show a sustained deviation from their expected pattern.':'The demo profile shows a change in sensor behaviour that should be watched over subsequent cycles.';
      $('problemDescription').textContent=e.note+' The available demo evidence is not enough to confirm a physical component failure.';
      $('problemIcon').textContent='⌁';
      $('reasonList').innerHTML=`<div class="reason-item"><strong>Unusual sensor pattern</strong><p>The anomaly score is ${e.anomaly.toFixed(2)} in the illustrative demo data.</p></div><div class="reason-item"><strong>Persistence indication</strong><p>The engine note describes a repeated or gradual sensor trend that needs follow-up.</p></div><div class="reason-item"><strong>Remaining useful life</strong><p>The current illustrative RUL estimate is ${e.rul} cycles and should be interpreted with model uncertainty.</p></div>`;
    } else {
      $('findingTitle').textContent='No significant deviation in the current demo profile';
      $('problemStatement').textContent='No active high-priority problem is represented for this engine in the current demo data.';
      $('problemDescription').textContent='Continue routine monitoring. This local status is not a certification of engine condition or airworthiness.';
      $('problemIcon').textContent='✓';
      $('reasonList').innerHTML=`<div class="reason-item"><strong>Sensor behaviour</strong><p>The current demo note does not describe a persistent abnormal pattern.</p></div><div class="reason-item"><strong>Anomaly score</strong><p>The illustrative score is ${e.anomaly.toFixed(2)}.</p></div><div class="reason-item"><strong>Predicted RUL</strong><p>The illustrative estimate is ${e.rul} cycles.</p></div>`;
    }
    $('nextChecks').innerHTML=['Review the selected sensor channels over the recent operating-cycle history.','Compare related channels and check whether the pattern persists across more than one observation.','Cross-check the finding with validated model outputs and the relevant maintenance records.'].map(s=>`<li>${s}</li>`).join('');
  };
  render();
  $('diagnosticEngine').addEventListener('change',()=>{currentFindingEngine=$('diagnosticEngine').value;api.setSelectedEngine(currentFindingEngine);render();});
  $('viewSensorEvidenceBtn').addEventListener('click',()=>{api.setSelectedEngine(currentFindingEngine);api.navigate('sensor-analytics');});
  $('viewEngineProfileBtn').addEventListener('click',()=>{api.setSelectedEngine(currentFindingEngine);api.navigate('engine-assets');});
  $('acknowledgeFindingBtn').addEventListener('click',()=>{
    const alert=data.alerts.find(a=>a.engine===currentFindingEngine&&a.state==='open');
    if(alert){api.updateAlert(alert.id,'acknowledged','Finding reviewed from Diagnostic Insights.');$('acknowledgeFindingBtn').textContent='Finding acknowledged';$('acknowledgeFindingBtn').disabled=true;api.toast(`${currentFindingEngine} finding acknowledged in the local demo.`);}
    else {api.toast('No open alert is available for acknowledgement for this engine.');}
  });
  $('exportDiagnosticBtn').addEventListener('click',()=>{const e=getFinding();api.exportCSV(`${e.id.toLowerCase()}-diagnostic-finding.csv`,[['Field','Value'],['Engine',e.id],['Status',e.status],['Cycle',e.cycle],['Illustrative anomaly score',e.anomaly.toFixed(2)],['Illustrative RUL cycles',e.rul],['Health note',e.note],['Data source','Local illustrative demo data']]);});

  // Phase 3 model-backed FD001 replay (separate from the illustrative fleet cards above).
  const apiBase = (() => { try { return (localStorage.getItem('aerosentry-api-base-url') || 'http://127.0.0.1:8000').replace(/\/+$/, ''); } catch (_) { return 'http://127.0.0.1:8000'; } })();
  let fd001Engines = [];
  const fd001Engine = $('fd001ReplayEngine');
  const fd001Cycle = $('fd001ReplayCycle');
  const fd001CycleValue = $('fd001ReplayCycleValue');
  const fd001Run = $('fd001ReplayRun');
  const fd001Result = $('fd001ReplayResult');
  function safeText(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  async function fd001Request(path) {
    const response = await fetch(`${apiBase}${path}`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = body.detail;
      throw new Error(typeof detail === 'string' ? detail : detail?.message || JSON.stringify(detail || `Request failed (${response.status}).`));
    }
    return body;
  }
  function syncFd001Cycle() {
    const engine = fd001Engines.find(item => item.engine_id === Number(fd001Engine.value));
    if (!engine) return;
    fd001Cycle.max = String(engine.max_cycle);
    fd001Cycle.min = '26';
    fd001Cycle.value = String(Math.min(Math.max(26, Number(fd001Cycle.value) || 26), engine.max_cycle));
    fd001CycleValue.textContent = fd001Cycle.value;
  }
  async function loadFd001Model() {
    try {
      const status = await fd001Request('/api/v1/anomaly/fd001/status');
      if (!status.model_available) throw new Error('Phase 3 model bundle is not available. Run python phase3_complete.py from the project root.');
      $('fd001ModelStatus').textContent = `${status.model_version} · ${status.feature_count} FEATURES`;
      const response = await fd001Request('/api/v1/anomaly/fd001/engines');
      fd001Engines = response.engines || [];
      fd001Engine.innerHTML = fd001Engines.map(item => `<option value="${item.engine_id}">Engine ${String(item.engine_id).padStart(3,'0')}</option>`).join('');
      syncFd001Cycle();
    } catch (error) {
      $('fd001ModelStatus').textContent = 'MODEL UNAVAILABLE';
      fd001Result.innerHTML = `<div class="fd001-error">${safeText(error.message)}</div>`;
      fd001Run.disabled = true;
    }
  }
  function renderFd001Result(data) {
    const alert = data.status === 'possible_anomaly';
    const scores = data.scores || {};
    const checks = (data.triggered_checks || []).map(item => `<span class="fd001-evidence-chip">${safeText(item.replaceAll('_',' '))}</span>`).join('');
    const sensors = (data.flagged_sensors || []).map(item => `<span class="fd001-evidence-chip sensor">${safeText(item)}</span>`).join('');
    fd001Result.innerHTML = `
      <div class="fd001-result-banner ${alert ? 'is-alert' : ''}">
        <div><strong>${alert ? 'Possible anomaly pattern detected' : 'No configured anomaly rule triggered'}</strong><p>API assessment: ${safeText(data.assessment)} · Engine ${safeText(data.engine_id)} · Cycle ${safeText(data.current_cycle)} · ${safeText(data.model_version)}</p><p>${safeText(data.interpretation)}</p></div>
        <span class="result-tag">${alert ? 'REVIEW PATTERN' : 'NO RULE TRIGGERED'}</span>
      </div>
      <div class="fd001-score-grid">
        <div class="fd001-score-card"><span>LOF score</span><strong>${Number(scores.lof).toFixed(4)}</strong></div>
        <div class="fd001-score-card"><span>Sensor deviation</span><strong>${Number(scores.maximum_sensor_deviation_z).toFixed(2)} z</strong></div>
        <div class="fd001-score-card"><span>Flatline score</span><strong>${Number(scores.flatline_score).toFixed(3)}</strong></div>
        <div class="fd001-score-card"><span>IF reference</span><strong>${Number(scores.isolation_forest_reference).toFixed(4)}</strong></div>
      </div>
      <div class="fd001-evidence-list">${checks || '<span class="muted">No checks triggered.</span>'}${sensors}</div>
    `;
  }
  async function runFd001Replay() {
    const engine = Number(fd001Engine.value);
    const cycle = Number(fd001Cycle.value);
    fd001Run.disabled = true; fd001Run.textContent = 'Analysing…';
    try {
      const data = await fd001Request(`/api/v1/anomaly/fd001/analyze?engine_id=${encodeURIComponent(engine)}&end_cycle=${encodeURIComponent(cycle)}`);
      // The engine and cycle in the UI are always taken from the same response.
      renderFd001Result(data);
    } catch (error) {
      fd001Result.innerHTML = `<div class="fd001-error">${safeText(error.message)}</div>`;
    } finally {
      fd001Run.disabled = false; fd001Run.textContent = 'Run FD001 anomaly analysis';
    }
  }
  fd001Engine.addEventListener('change', syncFd001Cycle);
  fd001Cycle.addEventListener('input', () => { fd001CycleValue.textContent = fd001Cycle.value; });
  fd001Run.addEventListener('click', runFd001Replay);
  loadFd001Model();
  return ()=>{};
}
