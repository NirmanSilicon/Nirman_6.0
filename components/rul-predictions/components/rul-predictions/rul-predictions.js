let ds05Chart;

export function mount(root, api) {
  const $ = id => root.querySelector(`#${id}`);
  const demo = api.getData();
  const API_BASE = (() => {
    try {
      return (localStorage.getItem('aerosentry-api-base-url') || window.AEROSENTRY_API_BASE || 'http://127.0.0.1:8000').replace(/\/+$/, '');
    } catch (_) {
      return (window.AEROSENTRY_API_BASE || 'http://127.0.0.1:8000').replace(/\/+$/, '');
    }
  })();

  let historyRows = [];
  let statusData = null;

  async function request(path) {
    const response = await fetch(`${API_BASE}${path}`, {headers: {'Accept': 'application/json'}});
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = body.detail;
      throw new Error(typeof detail === 'string' ? detail : detail?.message || JSON.stringify(detail || `Backend request failed (${response.status}).`));
    }
    return body;
  }

  function safeText(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function renderDemo() {
    $('predictionTableBody').innerHTML = demo.engines.slice().sort((a,b) => a.rul-b.rul).map(e =>
      `<tr><td><strong>${safeText(e.id)}</strong></td><td>${e.rul} cycles</td><td>${Number(e.anomaly).toFixed(2)}</td><td>${safeText(e.status)}</td></tr>`
    ).join('');
  }

  function renderStatus(data) {
    statusData = data;
    $('ds05ModelBadge').textContent = data.model_available ? 'MODEL AVAILABLE' : 'MODEL UNAVAILABLE';
    $('ds05ModelBadge').classList.toggle('is-ready', Boolean(data.model_available));
    $('ds05ModelMessage').textContent = data.model_available
      ? 'Final Phase 7 model and feature metadata are available through the FastAPI backend.'
      : 'The trained model is not currently available. Check the backend artifact paths.';
    $('ds05ExpectedFeatures').textContent = data.feature_count_expected ?? '—';
    $('ds05LoadedFeatures').textContent = data.feature_count_loaded ?? '—';
    $('ds05DevEngines').textContent = Array.isArray(data.training_engines) ? data.training_engines.join(', ') : '—';
    $('ds05TestEngines').textContent = Array.isArray(data.independent_test_engines) ? data.independent_test_engines.join(', ') : '—';
  }

  function renderHistory(data) {
    historyRows = data.predictions || [];
    $('ds05FlightCount').textContent = data.rows ?? historyRows.length;
    const last = historyRows.at(-1);
    $('ds05LastCycle').textContent = last?.cycle ?? '—';
    $('ds05LatestRaw').textContent = Number.isFinite(Number(last?.predicted_rul_cycles)) ? `${Number(last.predicted_rul_cycles).toFixed(2)} cycles` : '—';
    $('ds05LatestDisplay').textContent = Number.isFinite(Number(last?.predicted_rul_cycles)) ? `${Math.max(0, Number(last.predicted_rul_cycles)).toFixed(2)} cycles` : '—';

    $('ds05HistoryBody').innerHTML = historyRows.slice().reverse().map(row => {
      const raw = Number(row.predicted_rul_cycles);
      const actual = Number(row.actual_rul_for_development_analysis);
      return `<tr><td>${safeText(row.cycle)}</td><td>${Number.isFinite(actual) ? actual.toFixed(2) : '—'}</td><td>${Number.isFinite(raw) ? raw.toFixed(2) : '—'}</td><td>${Number.isFinite(raw) ? Math.max(0, raw).toFixed(2) : '—'}</td></tr>`;
    }).join('') || '<tr><td colspan="4">No prediction rows returned.</td></tr>';

    if (ds05Chart) ds05Chart.destroy();
    if (window.Chart && historyRows.length) {
      const css = getComputedStyle(document.documentElement);
      const text = css.getPropertyValue('--chart-text').trim() || '#8299aa';
      const grid = css.getPropertyValue('--chart-grid').trim() || '#edf2f6';
      ds05Chart = new Chart($('ds05RulChart'), {
        type: 'line',
        data: {
          labels: historyRows.map(row => row.cycle),
          datasets: [
            {label: 'Actual RUL · development label', data: historyRows.map(row => row.actual_rul_for_development_analysis), borderColor: '#8ba5bb', backgroundColor: 'rgba(139,165,187,.08)', borderWidth: 2, pointRadius: 0, tension: .15},
            {label: 'Predicted RUL · XGBoost', data: historyRows.map(row => row.predicted_rul_cycles), borderColor: '#399bd0', backgroundColor: 'rgba(57,155,208,.08)', borderWidth: 2, pointRadius: 0, tension: .15}
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: {mode: 'index', intersect: false},
          plugins: {legend: {labels: {color: text}}},
          scales: {
            x: {title: {display: true, text: 'Flight / cycle', color: text}, grid: {display: false}, ticks: {color: text, maxTicksLimit: 12}},
            y: {title: {display: true, text: 'RUL cycles', color: text}, grid: {color: grid}, ticks: {color: text}}
          }
        }
      });
    }
  }

  async function loadEngineHistory() {
    const engineId = Number($('ds05EngineSelect').value);
    if (!Number.isInteger(engineId)) return;
    $('ds05HistoryError').hidden = true;
    $('ds05HistoryBody').innerHTML = '<tr><td colspan="4">Loading historical predictions…</td></tr>';
    try {
      const data = await request(`/api/v1/rul/ds05/engine/${engineId}/history`);
      renderHistory(data);
    } catch (error) {
      $('ds05HistoryError').textContent = error.message;
      $('ds05HistoryError').hidden = false;
      $('ds05HistoryBody').innerHTML = '<tr><td colspan="4">Could not load engine history.</td></tr>';
    }
  }

  async function refreshModelData() {
    $('refreshPredictionsBtn').disabled = true;
    $('ds05HistoryError').hidden = true;
    try {
      const status = await request('/api/v1/rul/ds05/status');
      renderStatus(status);
      if (!status.model_available) throw new Error('DS05 model is unavailable.');
      const engineData = await request('/api/v1/rul/ds05/engines');
      const engines = engineData.engines || [];
      $('ds05EngineSelect').innerHTML = engines.map(item =>
        `<option value="${Number(item.engine_id)}">Engine ${String(item.engine_id).padStart(2, '0')} · ${Number(item.flight_count)} flights</option>`
      ).join('');
      $('ds05EngineSelect').disabled = engines.length === 0;
      if (engines.length) await loadEngineHistory();
      else throw new Error('No development engines were returned by the backend.');
    } catch (error) {
      $('ds05HistoryError').textContent = error.message;
      $('ds05HistoryError').hidden = false;
      $('ds05ModelBadge').textContent = 'CONNECTION ERROR';
      $('ds05ModelMessage').textContent = 'Could not retrieve DS05 model information from the backend.';
    } finally {
      $('refreshPredictionsBtn').disabled = false;
    }
  }

  $('ds05EngineSelect').addEventListener('change', loadEngineHistory);
  $('refreshPredictionsBtn').addEventListener('click', refreshModelData);
  $('exportPredictionsBtn').addEventListener('click', () => {
    if (!historyRows.length) { api.toast('Load a DS05 development engine before exporting.'); return; }
    const rows = [['Cycle','Actual RUL (development analysis)','Predicted RUL (raw)','Display estimate (non-negative)'],
      ...historyRows.map(row => [row.cycle, row.actual_rul_for_development_analysis, row.predicted_rul_cycles, Math.max(0, Number(row.predicted_rul_cycles))])];
    api.exportCSV(`ds05-engine-${$('ds05EngineSelect').value}-rul-history.csv`, rows);
  });
  $('compareModelsBtn').addEventListener('click', () => api.toast('Model comparison is unavailable because a second evaluated DS05 model is not connected.'));
  renderDemo();
  refreshModelData();
  return () => { if (ds05Chart) ds05Chart.destroy(); };
}
