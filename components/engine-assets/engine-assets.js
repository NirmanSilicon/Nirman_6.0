export function mount(root, api) {
  const $ = id => root.querySelector(`#${id}`);
  let localSelected = api.getSelectedEngine();
  const data = api.getData();
  const render = () => {
    const q = $('engineSearch').value.trim().toLowerCase();
    const status = $('statusFilter').value;
    const rows = data.engines.filter(e => e.id.toLowerCase().includes(q) && (status === 'all' || e.status === status));
    $('engineRowCount').textContent = rows.length;
    $('engineTableBody').innerHTML = rows.map(e => `<tr><td><div class="engine-id"><span class="engine-mini">✈</span><strong>${e.id}</strong></div></td><td><span class="status-pill ${api.statusClass(e.status)}">● ${e.status}</span></td><td><strong>${e.rul} cycles</strong></td><td>${e.cycle}</td><td><button class="table-action" data-select="${e.id}" aria-label="Inspect ${e.id}">›</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty-state">No engines match your search.</td></tr>';
    const e = data.engines.find(x => x.id === localSelected) || data.engines[0];
    $('detailEngineName').textContent = e.id;
    $('detailStatus').className = `status-pill ${api.statusClass(e.status)}`;
    $('detailStatus').textContent = `● ${e.status}`;
    $('detailRul').textContent = e.rul;
    $('detailCycle').textContent = e.cycle;
    $('detailAnomaly').textContent = e.anomaly.toFixed(2);
    $('detailNote').textContent = e.note;
  };
  const select = id => { localSelected=id;api.setSelectedEngine(id);render(); };
  render();
  $('engineSearch').addEventListener('input', render);
  $('statusFilter').addEventListener('change', render);
  $('engineTableBody').addEventListener('click', event => {const button=event.target.closest('[data-select]');if(button)select(button.dataset.select);});
  $('advanceCycleBtn').addEventListener('click',()=>{select(localSelected);api.advanceSimulation();render();});
  $('runEngineDiagnostics').addEventListener('click',()=>{api.setSelectedEngine(localSelected);api.toast(`Diagnostic request prepared for ${localSelected}. FastAPI and ML inference are not connected yet.`);api.navigate('diagnostic-insights');});
  $('viewSensorAnalytics').addEventListener('click',()=>{api.setSelectedEngine(localSelected);api.navigate('sensor-analytics');});
  $('viewDiagnosticInsights').addEventListener('click',()=>{api.setSelectedEngine(localSelected);api.navigate('diagnostic-insights');});
  $('exportEngineReport').addEventListener('click',()=>api.exportEngine(localSelected));
  root.querySelector('[data-action="export"]').addEventListener('click',()=>api.exportFleet());
  return () => {};
}
