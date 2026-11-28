let autoTimer = null;
const API_URL_KEY = 'aerosentry-api-base-url';
const DEFAULT_API_URL = 'http://127.0.0.1:8000';
const REQUIRED_FD001_FILES = ['train_FD001.txt', 'test_FD001.txt', 'RUL_FD001.txt'];

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_API_URL).trim().replace(/\/+$/, '');
}

function formatError(payload, fallback) {
  const detail = payload?.detail ?? payload?.message;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object') return detail.message || JSON.stringify(detail);
  return fallback;
}

export function mount(root, api) {
  const $ = (id) => root.querySelector(`#${id}`);
  let backendConnected = false;
  let datasetStatus = null;
  let lastReport = null;
  let lastSummary = null;
  let ncmapssStatus = null;

  const getBaseUrl = () => normalizeBaseUrl($('fd001ApiUrl').value);
  const setMessage = (id, text, type = '') => {
    const node = $(id);
    if (!node) return;
    node.textContent = text;
    node.classList.remove('is-success', 'is-error');
    if (type) node.classList.add(type === 'success' ? 'is-success' : 'is-error');
  };
  const dispatchApiStatus = (connected, label) => {
    backendConnected = connected;
    document.dispatchEvent(new CustomEvent('aerosentry:api-status', {
      detail: { connected, label: label || (connected ? 'API CONNECTED' : 'API NOT CONNECTED') }
    }));
  };
  const setBusy = (buttonIds, busy, busyText = 'Working…') => {
    buttonIds.forEach((id) => {
      const button = $(id);
      if (!button) return;
      if (busy) {
        if (button.dataset.busy !== 'true') {
          button.dataset.originalText = button.textContent;
          button.dataset.originalDisabled = String(button.disabled);
        }
        button.dataset.busy = 'true';
        button.setAttribute('aria-busy', 'true');
        button.textContent = busyText;
        button.disabled = true;
      } else {
        if (button.dataset.originalText !== undefined) button.textContent = button.dataset.originalText;
        if (button.dataset.originalDisabled !== undefined) button.disabled = button.dataset.originalDisabled === 'true';
        delete button.dataset.originalText;
        delete button.dataset.originalDisabled;
        delete button.dataset.busy;
        button.removeAttribute('aria-busy');
      }
    });
  };
  async function request(path, options = {}, timeoutMs = 0) {
    let timeoutId = null;
    let controller = null;
    const fetchOptions = { ...options };
    if (timeoutMs > 0 && !fetchOptions.signal) {
      controller = new AbortController();
      fetchOptions.signal = controller.signal;
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }
    try {
      const response = await fetch(`${getBaseUrl()}${path}`, fetchOptions);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(formatError(payload, `Request failed (${response.status}).`));
      return payload;
    } catch (error) {
      if (controller && error?.name === 'AbortError') {
        throw new Error(`Connection check timed out after ${Math.round(timeoutMs / 1000)} seconds. Confirm that FastAPI is running and the API URL is correct.`);
      }
      throw error;
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId);
    }
  }
  function setButtonAvailability() {
    const allFilesPresent = datasetStatus?.dataset_available === true;
    const validated = datasetStatus?.validated === true;
    const selectedNames = Array.from($('fd001FileInput').files || []).map((file) => file.name);
    const selectedSetIsValid = selectedNames.length === 3 && REQUIRED_FD001_FILES.every((name) => selectedNames.includes(name));
    $('fd001Validate').disabled = !backendConnected || !allFilesPresent;
    $('fd001Upload').disabled = !backendConnected || !selectedSetIsValid;
    $('fd001Preprocess').disabled = !backendConnected || !validated;
    $('fd001ViewSummary').disabled = !backendConnected || datasetStatus?.preprocessed !== true;
  }
  function renderFileStatus(status) {
    const files = status?.files || {};
    root.querySelectorAll('.fd001-file-card').forEach((card) => {
      const name = card.dataset.file;
      const detail = files[name];
      const present = detail?.present === true;
      card.classList.toggle('is-present', present);
      card.classList.toggle('is-missing', !present);
      const label = card.querySelector('.file-state');
      if (label) label.textContent = present ? `${(detail.size_bytes / 1024).toFixed(1)} KB · Present` : 'Missing';
    });
    const badge = $('fd001OverallStatus');
    badge.classList.remove('is-connected', 'is-error');
    if (status?.preprocessed) {
      badge.textContent = 'Preprocessed';
      badge.classList.add('is-connected');
    } else if (status?.validated) {
      badge.textContent = 'Validated';
      badge.classList.add('is-connected');
    } else if (status?.dataset_available) {
      badge.textContent = 'Ready to validate';
    } else {
      badge.textContent = 'Files missing';
      badge.classList.add('is-error');
    }
  }
  function renderReport(report, summary = null) {
    if (!report && !summary) return;
    const source = summary || report;
    const inventory = report?.canonical_fd001_profile?.observed || report?.canonical_fd001_profile?.expected || {};
    const trainShape = summary?.windows?.train_shape || [];
    const valShape = summary?.windows?.validation_shape || [];
    const testShape = summary?.windows?.test_shape || [];
    const cards = [
      ['Training rows', inventory.training_rows ?? '—'],
      ['Training engines', inventory.training_engines ?? '—'],
      ['Test rows', inventory.test_rows ?? '—'],
      ['Test engines', inventory.test_engines ?? '—'],
      ['Test RUL labels', inventory.test_rul_labels ?? '—']
    ];
    if (summary) {
      cards.push(['Train windows', trainShape[0] ?? '—']);
      cards.push(['Validation windows', valShape[0] ?? '—']);
      cards.push(['Test windows', testShape[0] ?? '—']);
      cards.push(['Selected features', summary.features?.selected?.length ?? '—']);
    }
    $('fd001Metrics').innerHTML = cards.map(([label, value]) => `
      <div class="fd001-metric"><strong>${String(value)}</strong><span>${label}</span></div>
    `).join('');
    $('fd001Results').hidden = false;
    const combined = summary || report || source;
    $('fd001ReportJson').textContent = JSON.stringify(combined, null, 2);
    lastReport = report || lastReport;
    lastSummary = summary || lastSummary;
  }

  function renderNCMapssStatus(status) {
    ncmapssStatus = status;
    const badge = $('ncmapssOverallStatus');
    badge.classList.remove('is-connected', 'is-error');
    if (status?.preprocessed) {
      badge.textContent = 'Preprocessed'; badge.classList.add('is-connected');
    } else if (status?.inspection_complete) {
      badge.textContent = 'Inspected'; badge.classList.add('is-connected');
    } else if (status?.dataset_available) {
      badge.textContent = 'Ready to inspect';
    } else {
      badge.textContent = 'HDF5 missing'; badge.classList.add('is-error');
    }
    const devFlights = status?.preprocessing_summary?.splits?.dev?.rows ?? status?.report?.splits?.dev?.flight_count ?? '—';
    const testFlights = status?.preprocessing_summary?.splits?.test?.rows ?? status?.report?.splits?.test?.flight_count ?? '—';
    const size = status?.dataset_available ? `${(status.file_size_bytes / (1024 ** 3)).toFixed(2)} GB` : 'Missing';
    $('ncmapssMetrics').innerHTML = [
      ['DS05 HDF5', size],
      ['Inspection', status?.inspection_complete ? 'Passed' : status?.inspection_report_available ? 'Review' : 'Pending'],
      ['Development flights', devFlights],
      ['Test flights', testFlights]
    ].map(([label, value]) => `<div class="fd001-metric"><strong>${String(value)}</strong><span>${label}</span></div>`).join('');
    $('ncmapssInspect').disabled = !backendConnected || !status?.dataset_available;
    $('ncmapssPreprocess').disabled = !backendConnected || !status?.inspection_complete;
    $('ncmapssViewReport').disabled = !backendConnected || !status?.inspection_report_available;
    if (!status?.dataset_available) {
      const partial = status?.partial_archive_available ? ` A partial archive of ${(status.partial_archive_size_bytes / (1024 ** 3)).toFixed(2)} GB is present and can be resumed.` : '';
      setMessage('ncmapssMessage', 'DS05 HDF5 file not found. Put data_set.zip in phase4_ncmapss/data/raw and run the DS05 extraction command, then refresh status.' + partial);
    } else if (!status?.inspection_complete) {
      setMessage('ncmapssMessage', 'DS05 file found. Run HDF5 inspection and review the report before preprocessing.');
    } else if (!status?.preprocessed) {
      setMessage('ncmapssMessage', 'HDF5 inspection passed. Build development/test flight summaries next.', 'success');
    } else {
      setMessage('ncmapssMessage', 'DS05 inspection and flight-summary preprocessing are complete. Review the summary before using the N-CMAPSS telemetry replay.', 'success');
    }
  }

  async function refreshNCMapssStatus(showMessage = true) {
    try {
      const status = await request('/api/v1/datasets/ncmapss/ds05/status');
      renderNCMapssStatus(status);
      return status;
    } catch (error) {
      if (showMessage) setMessage('ncmapssMessage', error.message, 'error');
      $('ncmapssInspect').disabled = true;
      $('ncmapssPreprocess').disabled = true;
      $('ncmapssViewReport').disabled = true;
      return null;
    }
  }

  $('themeModeToggle').checked = api.getTheme() === 'dark';
  const syncThemeToggle = () => { $('themeModeToggle').checked = api.getTheme() === 'dark'; };
  $('themeModeToggle').addEventListener('change', (event) => {
    api.setTheme(event.target.checked ? 'dark' : 'light');
    $('settingsMessage').textContent = 'Appearance preference saved.';
  });
  document.addEventListener('aerosentry:themechange', syncThemeToggle);

  $('autoAdvanceToggle').addEventListener('change', (event) => {
    if (event.target.checked) {
      autoTimer = setInterval(() => api.advanceSimulation(), 5000);
      api.toast('Auto-advance enabled. The selected demo engine advances every five seconds.');
    } else {
      clearInterval(autoTimer);
      autoTimer = null;
      api.toast('Auto-advance paused.');
    }
  });
  $('noticeToggle').checked = api.getNoticeVisible();
  $('noticeToggle').addEventListener('change', (event) => {
    api.setNoticeVisible(event.target.checked);
    $('settingsMessage').textContent = 'Notice preference updated.';
  });
  $('resetDemoBtn').addEventListener('click', () => {
    api.resetDemo();
    $('settingsMessage').textContent = 'Demo data restored to initial values.';
    api.toast('Demo data reset.');
  });

  try {
    $('fd001ApiUrl').value = localStorage.getItem(API_URL_KEY) || DEFAULT_API_URL;
  } catch (_) {
    $('fd001ApiUrl').value = DEFAULT_API_URL;
  }

  $('fd001SaveUrl').addEventListener('click', () => {
    const url = getBaseUrl();
    try { localStorage.setItem(API_URL_KEY, url); } catch (_) { /* Continue for this session. */ }
    $('fd001ApiUrl').value = url;
    api.toast('FastAPI address saved in this browser.');
  });

  async function testConnection() {
    setBusy(['fd001TestConnection'], true, 'Testing…');
    setMessage('fd001ConnectionMessage', 'Checking the FastAPI health endpoint…');
    let connected = false;
    try {
      // Keep the connection test bounded. A stalled fetch must not leave the button
      // disabled indefinitely or keep the browser's wait cursor over it.
      const health = await request('/api/v1/health', {}, 8000);
      connected = true;
      dispatchApiStatus(true, 'API CONNECTED');
      setMessage('fd001ConnectionMessage', `Connected · ${health.service || 'AEROSENTRY API'} · Phase ${health.phase ?? 2}`, 'success');
      return true;
    } catch (error) {
      dispatchApiStatus(false, 'API NOT CONNECTED');
      setMessage('fd001ConnectionMessage', error.message || 'Unable to connect to FastAPI.', 'error');
      setButtonAvailability();
      return false;
    } finally {
      // Restore the button immediately after the lightweight health check.
      setBusy(['fd001TestConnection'], false);
      if (connected) {
        // Dataset status refreshes are independent of the health check. Do not
        // keep the Test connection control in its busy state while they complete.
        Promise.allSettled([refreshStatus(false), refreshNCMapssStatus(false)]);
      }
    }
  }

  async function refreshStatus(showMessage = true) {
    try {
      const status = await request('/api/v1/datasets/fd001/status');
      datasetStatus = status;
      renderFileStatus(status);
      setButtonAvailability();
      if (showMessage) {
        const presentCount = Object.values(status.files || {}).filter((item) => item.present).length;
        setMessage('fd001ValidationMessage', `${presentCount}/3 original FD001 files present. ${status.validated ? 'Validation report available.' : 'Validation not yet completed.'}`, status.validated ? 'success' : '');
        setMessage('fd001PreprocessMessage', status.preprocessed ? 'Processed windows and scaler metadata are available.' : 'Dataset must pass validation before preprocessing.');
      }
      return status;
    } catch (error) {
      if (showMessage) setMessage('fd001ValidationMessage', error.message, 'error');
      dispatchApiStatus(false, 'API NOT CONNECTED');
      return null;
    }
  }

  $('fd001TestConnection').addEventListener('click', testConnection);
  $('fd001Refresh').addEventListener('click', async () => {
    const connected = backendConnected || await testConnection();
    if (connected) {
      await refreshStatus();
      api.toast('FD001 dataset status refreshed.');
    }
  });
  $('fd001OpenDocs').addEventListener('click', () => window.open(`${getBaseUrl()}/docs`, '_blank', 'noopener'));
  $('fd001DownloadGuide').addEventListener('click', () => window.open('https://zenodo.org/records/15346912', '_blank', 'noopener'));

  $('fd001FileInput').addEventListener('change', (event) => {
    const files = Array.from(event.target.files || []);
    const names = files.map((file) => file.name);
    const missing = REQUIRED_FD001_FILES.filter((name) => !names.includes(name));
    const extra = names.filter((name) => !REQUIRED_FD001_FILES.includes(name));
    if (files.length === 0) {
      $('fd001SelectedFiles').textContent = 'No files selected.';
    } else if (files.length !== 3 || missing.length || extra.length) {
      $('fd001SelectedFiles').textContent = `Select exactly train_FD001.txt, test_FD001.txt and RUL_FD001.txt. Missing: ${missing.join(', ') || 'none'}. Unexpected: ${extra.join(', ') || 'none'}.`;
    } else {
      $('fd001SelectedFiles').textContent = names.join(' · ');
    }
    setButtonAvailability();
  });

  $('fd001Upload').addEventListener('click', async () => {
    const files = Array.from($('fd001FileInput').files || []);
    if (files.length !== 3) return;
    const form = new FormData();
    files.forEach((file) => form.append('files', file, file.name));
    setBusy(['fd001Upload'], true, 'Uploading…');
    setMessage('fd001ValidationMessage', 'Uploading files and validating their structure…');
    try {
      const result = await request('/api/v1/datasets/fd001/upload', { method: 'POST', body: form });
      lastReport = result.validation;
      renderReport(result.validation);
      await refreshStatus(false);
      setMessage('fd001ValidationMessage', 'Upload complete. Structural validation passed.', 'success');
      setMessage('fd001PreprocessMessage', 'Dataset is validated and ready for preprocessing.');
      $('fd001FileInput').value = '';
      $('fd001SelectedFiles').textContent = 'Files uploaded successfully.';
      api.toast('FD001 files uploaded and validated.');
    } catch (error) {
      setMessage('fd001ValidationMessage', error.message, 'error');
      api.toast(`FD001 upload failed: ${error.message}`);
    } finally {
      setBusy(['fd001Upload'], false);
      setButtonAvailability();
    }
  });

  $('fd001Validate').addEventListener('click', async () => {
    setBusy(['fd001Validate'], true, 'Validating…');
    setMessage('fd001ValidationMessage', 'Checking file structure, values, engine cycles and RUL labels…');
    try {
      const report = await request('/api/v1/datasets/fd001/validate', { method: 'POST' });
      lastReport = report;
      renderReport(report);
      await refreshStatus(false);
      const standard = report.canonical_fd001_profile?.matches_standard_profile;
      setMessage(
        'fd001ValidationMessage',
        standard === false
          ? 'Structural checks passed, but row counts differ from the standard FD001 inventory. Review the report before treating it as the benchmark dataset.'
          : 'FD001 validation passed. Standard dataset inventory matches.',
        standard === false ? '' : 'success'
      );
      setMessage('fd001PreprocessMessage', 'Validation passed. You can now generate model-ready windows.', 'success');
      api.toast('FD001 validation completed.');
    } catch (error) {
      setMessage('fd001ValidationMessage', error.message, 'error');
      api.toast(`Validation failed: ${error.message}`);
    } finally {
      setBusy(['fd001Validate'], false);
      setButtonAvailability();
    }
  });

  $('fd001Preprocess').addEventListener('click', async () => {
    const payload = {
      window_size: Number($('fd001WindowSize').value),
      rul_cap: Number($('fd001RulCap').value),
      validation_fraction: Number($('fd001ValidationFraction').value),
      random_state: Number($('fd001RandomState').value)
    };
    setBusy(['fd001Preprocess'], true, 'Preprocessing…');
    setMessage('fd001PreprocessMessage', 'Generating RUL labels, engine-level splits, scaled features and sliding windows…');
    try {
      const summary = await request('/api/v1/datasets/fd001/preprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      lastSummary = summary;
      renderReport(lastReport, summary);
      await refreshStatus(false);
      setMessage(
        'fd001PreprocessMessage',
        `Preprocessing complete. Train ${summary.windows.train_shape.join(' × ')}, validation ${summary.windows.validation_shape.join(' × ')}, test ${summary.windows.test_shape.join(' × ')}.`,
        'success'
      );
      api.toast('FD001 preprocessing completed. Model-ready data is available.');
    } catch (error) {
      setMessage('fd001PreprocessMessage', error.message, 'error');
      api.toast(`Preprocessing failed: ${error.message}`);
    } finally {
      setBusy(['fd001Preprocess'], false);
      setButtonAvailability();
    }
  });

  $('fd001ViewSummary').addEventListener('click', async () => {
    try {
      const summary = await request('/api/v1/datasets/fd001/metadata');
      lastSummary = summary;
      renderReport(lastReport, summary);
      $('fd001ReportJson').hidden = !$('fd001ReportJson').hidden;
    } catch (error) {
      api.toast(error.message);
    }
  });

  $('fd001DownloadReport').addEventListener('click', () => {
    const data = lastSummary || lastReport;
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = lastSummary ? 'aerosentry-fd001-preprocessing-summary.json' : 'aerosentry-fd001-validation-report.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  $('ncmapssRefresh').addEventListener('click', async () => {
    if (!backendConnected && !(await testConnection())) return;
    await refreshNCMapssStatus();
    api.toast('N-CMAPSS DS05 status refreshed.');
  });

  $('ncmapssCopyDownload').addEventListener('click', async () => {
    const command = 'python phase4_ncmapss\\scripts\\extract_ds05_from_nested_zip.py';
    try {
      await navigator.clipboard.writeText(command);
      setMessage('ncmapssMessage', `Copied: ${command}. Run it from the AEROSENTRY project root after data_set.zip is present.`, 'success');
    } catch (_) {
      setMessage('ncmapssMessage', `Run this from the AEROSENTRY project root in PowerShell: ${command}`, 'success');
    }
  });

  $('ncmapssInspect').addEventListener('click', async () => {
    setBusy(['ncmapssInspect'], true, 'Inspecting HDF5…');
    setMessage('ncmapssMessage', 'Inspecting DS05 arrays in chunks. This may take several minutes for the large file.');
    try {
      const report = await request('/api/v1/datasets/ncmapss/ds05/inspect', { method: 'POST' });
      $('ncmapssReport').textContent = JSON.stringify(report, null, 2);
      $('ncmapssReport').hidden = false;
      await refreshNCMapssStatus(false);
      setMessage('ncmapssMessage', 'N-CMAPSS DS05 HDF5 inspection passed. Review the schema and engine split before preprocessing.', 'success');
      api.toast('N-CMAPSS HDF5 inspection passed.');
    } catch (error) {
      const detail = error.message || 'Inspection failed.';
      setMessage('ncmapssMessage', detail, 'error');
      await refreshNCMapssStatus(false);
      api.toast(`N-CMAPSS inspection: ${detail}`);
    } finally {
      setBusy(['ncmapssInspect'], false);
      if (ncmapssStatus) renderNCMapssStatus(ncmapssStatus);
    }
  });

  $('ncmapssPreprocess').addEventListener('click', async () => {
    setBusy(['ncmapssPreprocess'], true, 'Building flight summaries…');
    setMessage('ncmapssMessage', 'Aggregating 1 Hz rows into flight-level summaries in chunks. Keep the API terminal open.');
    try {
      const status = await request('/api/v1/datasets/ncmapss/ds05/preprocess?chunk_rows=250000', { method: 'POST' });
      $('ncmapssReport').textContent = JSON.stringify(status.preprocessing_summary, null, 2);
      $('ncmapssReport').hidden = false;
      renderNCMapssStatus(status);
      setMessage('ncmapssMessage', 'Development and held-out test flight summaries were generated successfully.', 'success');
      api.toast('N-CMAPSS flight preprocessing completed.');
    } catch (error) {
      setMessage('ncmapssMessage', error.message || 'Preprocessing failed.', 'error');
      await refreshNCMapssStatus(false);
      api.toast(`N-CMAPSS preprocessing: ${error.message}`);
    } finally {
      setBusy(['ncmapssPreprocess'], false);
      if (ncmapssStatus) renderNCMapssStatus(ncmapssStatus);
    }
  });

  $('ncmapssViewReport').addEventListener('click', async () => {
    try {
      const report = await request('/api/v1/datasets/ncmapss/ds05/report');
      $('ncmapssReport').textContent = JSON.stringify(report, null, 2);
      $('ncmapssReport').hidden = !$('ncmapssReport').hidden;
    } catch (error) {
      api.toast(error.message);
    }
  });

  setButtonAvailability();
  testConnection();

  return () => {
    if (autoTimer) clearInterval(autoTimer);
    document.removeEventListener('aerosentry:themechange', syncThemeToggle);
  };
}
