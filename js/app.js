/* Krushak Drishti - Main Application Controller (Null-Safe, Memory-Safe, Zero while-loops, Zero MutationObserver, Zero recursion) */
(function (global) {
  'use strict';

  var Data = global.KrishiData || {};
  var Media = global.KrishiMedia || {};

  var STORAGE_PASS = 'kr_farmer_pass_v1';
  var STORAGE_CHECKLIST = 'kr_aftercare_v1';
  var STORAGE_CASES = 'kr_case_logbook_v1';

  // Corrupted Storage Auto-Cleaner: runs BEFORE reading any saved state
  (function cleanCorruptedLocalStorage() {
    try {
      if (!global.localStorage) {
        return;
      }
      var ls = global.localStorage;
      var knownAppKeys = [STORAGE_PASS, STORAGE_CHECKLIST, STORAGE_CASES];
      for (var i = ls.length - 1; i >= 0; i -= 1) {
        var key = ls.key(i);
        if (!key) { continue; }
        var isAppKey = (key.indexOf('kr_') === 0 || key.indexOf('krishi') === 0 || knownAppKeys.indexOf(key) !== -1);
        var val = ls.getItem(key);
        if (typeof val === 'string') {
          var isOversized = val.length > 20480;
          var hasRawBase64 = val.indexOf('data:image/') !== -1;
          if (isOversized || hasRawBase64) {
            if (isAppKey || isOversized) {
              ls.removeItem(key);
            }
            continue;
          }
          if (isAppKey) {
            try {
              JSON.parse(val);
            } catch (parseErr) {
              ls.removeItem(key);
            }
          }
        }
      }
    } catch (e) {
      // Never block or crash startup if localStorage is restricted
    }
  })();

  // Boolean lock preventing circular language-change events
  var isApplyingLanguage = false;

  var state = {
    lang: 'en',
    activeTab: 'scan',
    diseaseId: 'early_blight',
    stage: 'early',
    cropId: '',
    cropCategory: 'All',
    cropSearch: '',
    tankSize: 16,
    tankCount: 2,
    scanSource: 'Sample Leaf',
    confidence: 88,
    metrics: { healthy: 48, yellowing: 27, lesion: 25 },
    confirmAnswers: [null, null],
    cameraRunning: false,
    cameraPaused: false,
    gateValid: false,
    gateReason: 'no_leaf',
    gateTimerId: null,
    invalidReason: '',
    weather: {
      pin: '751024',
      location: 'Patia, Khordha, Odisha — PIN 751024',
      verdict: 'Caution — High Wind/Humidity',
      rainStatus: 'Safe: 4+ hr dry window',
      windStatus: 'Low (9 km/h, gusts 14 km/h)',
      dewStatus: 'Elevated Fungal Risk (RH 80%)',
      sprayWindow: 'Today 16:30 – 18:30',
      safeToSpray: true
    },
    lastBotReply: '',
    checklist: [false, false, false, false, false, false, false],
    cases: []
  };

  function byId(id) {
    return (typeof document !== 'undefined' && id) ? document.getElementById(id) : null;
  }

  function qsAll(selector, root) {
    var scope = root || (typeof document !== 'undefined' ? document : null);
    if (!scope || typeof scope.querySelectorAll !== 'function') {
      return [];
    }
    return scope.querySelectorAll(selector);
  }

  function setText(id, text) {
    var el = byId(id);
    if (el) {
      el.textContent = text;
    }
  }

  function getValue(id, fallback) {
    var el = byId(id);
    if (!el || typeof el.value !== 'string') {
      return fallback || '';
    }
    return el.value;
  }

  function setValue(id, val) {
    var el = byId(id);
    if (el) {
      el.value = val;
    }
  }

  function setWidth(id, pct) {
    var el = byId(id);
    if (el && el.style) {
      el.style.width = pct;
    }
  }

  function toggleClass(id, cls, force) {
    var el = byId(id);
    if (el && el.classList) {
      el.classList.toggle(cls, Boolean(force));
    }
  }

  function onEvent(id, eventName, handler) {
    var el = byId(id);
    if (el && typeof el.addEventListener === 'function') {
      el.addEventListener(eventName, handler);
    }
  }

  function sanitizeTextField(val, maxLen) {
    var str = String(val || '').trim();
    if (str.indexOf('data:image/') !== -1) {
      return '';
    }
    if (maxLen && str.length > maxLen) {
      return str.slice(0, maxLen);
    }
    return str;
  }

  function safeReadJSON(key, fallback) {
    try {
      if (!global.localStorage) {
        return fallback;
      }
      var raw = global.localStorage.getItem(key);
      if (!raw || raw.indexOf('data:image/') !== -1) {
        return fallback;
      }
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function safeWriteJSON(key, value) {
    try {
      if (!global.localStorage) {
        return;
      }
      var serialized = JSON.stringify(value);
      if (serialized.indexOf('data:image/') !== -1) {
        return;
      }
      global.localStorage.setItem(key, serialized);
    } catch (e) {
      // Ignore blocked storage or quota errors
    }
  }

  function t(key) {
    var map = Data.I18N_MAP || {};
    var en = Data.EN_STRINGS || {};
    var dict = map[state.lang] || en;
    return dict[key] || en[key] || key;
  }

  // Instant full-page translation across all 30 languages with boolean re-entry lock
  function applySiteLanguage(langCode) {
    if (isApplyingLanguage) {
      return;
    }
    isApplyingLanguage = true;
    try {
      state.lang = langCode || 'en';
      var map = Data.I18N_MAP || {};
      var en = Data.EN_STRINGS || {};
      var dict = map[state.lang] || en;

      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.lang = state.lang;
      }

      var langSelect = byId('lang-select');
      if (langSelect && langSelect.value !== state.lang) {
        langSelect.value = state.lang;
      }

      var nodes = qsAll('[data-i18n]');
      for (var i = 0; i < nodes.length; i += 1) {
        var node = nodes[i];
        if (!node) { continue; }
        var key = node.getAttribute('data-i18n');
        var translated = dict[key] || en[key];
        if (translated) {
          node.textContent = translated;
        }
      }

      var phNodes = qsAll('[data-i18n-placeholder]');
      for (var j = 0; j < phNodes.length; j += 1) {
        var phNode = phNodes[j];
        if (!phNode) { continue; }
        var phKey = phNode.getAttribute('data-i18n-placeholder');
        var phVal = dict[phKey] || en[phKey];
        if (phVal) {
          phNode.setAttribute('placeholder', phVal);
        }
      }

      var pauseBtn = byId('btn-pause-cam');
      if (pauseBtn) {
        pauseBtn.textContent = state.cameraPaused ? t('btn_resume_cam') : t('btn_pause_cam');
      }

      var gateTextEl = byId('leaf-gate-text');
      if (gateTextEl) {
        gateTextEl.textContent = getLiveGateText(state.gateValid, state.gateReason);
      }

      renderScanResults();
    } catch (err) {
      // Never crash UI on translation switch
    } finally {
      isApplyingLanguage = false;
    }
  }

  function populateSelectors() {
    var langSelect = byId('lang-select');
    var langs = Data.LANGUAGES || [];
    if (langSelect) {
      for (var i = 0; i < langs.length; i += 1) {
        var opt = document.createElement('option');
        opt.value = langs[i].code;
        opt.textContent = langs[i].name;
        langSelect.appendChild(opt);
      }
    }

    var medDiseaseSelect = byId('med-disease-select');
    var diseases = Data.DISEASES || {};
    if (medDiseaseSelect) {
      var keys = Object.keys(diseases);
      for (var j = 0; j < keys.length; j += 1) {
        var d = diseases[keys[j]];
        if (!d) { continue; }
        var dOpt = document.createElement('option');
        dOpt.value = d.id;
        dOpt.textContent = d.name;
        medDiseaseSelect.appendChild(dOpt);
      }
      medDiseaseSelect.value = state.diseaseId;
    }
  }

  function switchTab(tabName) {
    state.activeTab = tabName;
    var tabButtons = qsAll('.tab-btn');
    for (var i = 0; i < tabButtons.length; i += 1) {
      var btn = tabButtons[i];
      if (!btn) { continue; }
      var isMatch = btn.getAttribute('data-tab') === tabName;
      btn.classList.toggle('is-active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    }

    var panels = qsAll('.tab-panel');
    for (var j = 0; j < panels.length; j += 1) {
      var panel = panels[j];
      if (!panel) { continue; }
      var pMatch = panel.id === 'panel-' + tabName;
      panel.classList.toggle('is-active', pMatch);
      if (pMatch) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', 'hidden');
      }
    }

    if (tabName !== 'scan') {
      stopLeafGateInterval();
    } else if (state.cameraRunning && !state.cameraPaused) {
      startLeafGateInterval();
    }
  }

  function loadFarmerPass() {
    var saved = safeReadJSON(STORAGE_PASS, null);
    if (saved) {
      setValue('pass-name', sanitizeTextField(saved.name, 60));
      setValue('pass-village', sanitizeTextField(saved.village, 60));
      setValue('pass-crop', sanitizeTextField(saved.crop, 40));
      setText('pass-id-badge', sanitizeTextField(saved.passId, 24) || 'KR-IN-0001');
    }
  }

  function saveFarmerPass(evt) {
    if (evt && typeof evt.preventDefault === 'function') {
      evt.preventDefault();
    }
    var name = sanitizeTextField(getValue('pass-name', ''), 60);
    var village = sanitizeTextField(getValue('pass-village', ''), 60);
    var crop = sanitizeTextField(getValue('pass-crop', ''), 40);
    var existing = safeReadJSON(STORAGE_PASS, {});
    var codeNum = (name.length * 17 + village.length * 13 + 101) % 9000 + 1000;
    var passId = (existing && existing.passId) ? sanitizeTextField(existing.passId, 24) : ('KR-IN-' + codeNum);

    safeWriteJSON(STORAGE_PASS, {
      passId: passId,
      name: name,
      village: village,
      crop: crop
    });
    setText('pass-id-badge', passId);
    setText('pass-status', 'Saved locally');
    renderTreatmentTab();
  }

  // --- COMPLETE 6-DIGIT INDIAN PIN-CODE WEATHER ENGINE ---
  function decodeWmo(code) {
    var map = Data.WMO_CODES || {};
    var num = Number(code);
    return map[num] || 'Partly Cloudy';
  }

  function degToCompass(deg) {
    var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    var idx = Math.round(((Number(deg) || 0) % 360) / 45) % 8;
    return dirs[idx];
  }

  function formatShortTime(isoStr) {
    if (!isoStr || typeof isoStr !== 'string') {
      return '--:--';
    }
    var tIdx = isoStr.indexOf('T');
    return tIdx !== -1 ? isoStr.slice(tIdx + 1, tIdx + 6) : isoStr;
  }

  function formatShortDate(isoDate) {
    if (!isoDate || typeof isoDate !== 'string') {
      return '--';
    }
    var parts = isoDate.split('-');
    if (parts.length === 3) {
      return parts[2] + '/' + parts[1];
    }
    return isoDate;
  }

  function getPin2Profile(pin) {
    var cleanPin = sanitizeTextField(pin, 6) || '751024';
    var pin2Map = Data.PIN2_REGIONS || {};
    var p2 = cleanPin.slice(0, 2);
    if (pin2Map[p2]) {
      return pin2Map[p2];
    }
    var p1 = cleanPin.charAt(0) || '7';
    var pin1Map = Data.PIN_FALLBACK_REGIONS || {};
    var r1 = pin1Map[p1] || pin1Map['7'] || { region: 'Eastern India', lat: 20.2961, lon: 85.8245, temp: 28, rh: 78, dew: 23, wind: 9, rainProb: 32 };
    return {
      state: r1.region,
      district: 'PIN ' + cleanPin + ' Region',
      lat: r1.lat,
      lon: r1.lon,
      temp: r1.temp,
      rh: r1.rh,
      dew: r1.dew,
      wind: r1.wind,
      gust: r1.wind + 5,
      cloud: 30,
      pressure: 1013,
      soilTemp: Math.max(10, r1.temp - 2),
      soilMoisture: 0.28,
      rainProb: r1.rainProb,
      uv: 6.2
    };
  }

  function fetchWithTimeout(url, ms) {
    if (typeof fetch !== 'function') {
      return Promise.reject(new Error('fetch unavailable'));
    }
    var hasAbort = typeof AbortController === 'function';
    var controller = hasAbort ? new AbortController() : null;
    var timerId = setTimeout(function () {
      if (controller) {
        controller.abort();
      }
    }, ms);
    var opts = controller ? { signal: controller.signal } : {};
    return fetch(url, opts)
      .then(function (res) {
        clearTimeout(timerId);
        if (!res || !res.ok) {
          throw new Error('HTTP error');
        }
        return res.json();
      })
      .catch(function (err) {
        clearTimeout(timerId);
        throw err;
      });
  }

  function buildOfflineForecastPayload(locInfo, profile) {
    var hourlyTimes = [];
    var hourlyTemps = [];
    var hourlyRh = [];
    var hourlyDew = [];
    var hourlyProb = [];
    var hourlyPrecip = [];
    var hourlyWind = [];
    var hourlyGust = [];
    var hourlySoilT = [];
    var hourlySoilM = [];

    var baseHour = 6;
    for (var h = 0; h < 24; h += 1) {
      var hr = (baseHour + h) % 24;
      var hrStr = (hr < 10 ? '0' : '') + hr + ':00';
      var offset = (hr >= 12 && hr <= 16) ? 3 : ((hr >= 0 && hr <= 6) ? -3 : 0);
      hourlyTimes.push('2026-11-28T' + hrStr);
      hourlyTemps.push(Math.round((profile.temp + offset) * 10) / 10);
      hourlyRh.push(Math.max(25, Math.min(96, profile.rh - offset * 3)));
      hourlyDew.push(profile.dew);
      hourlyProb.push(profile.rainProb);
      hourlyPrecip.push(profile.rainProb >= 60 ? 1.2 : 0.0);
      hourlyWind.push(profile.wind);
      hourlyGust.push(profile.gust);
      hourlySoilT.push(Math.round((profile.soilTemp + offset * 0.5) * 10) / 10);
      hourlySoilM.push(profile.soilMoisture);
    }

    var dailyDates = [];
    var dailyCodes = [];
    var dailyMax = [];
    var dailyMin = [];
    var dailyRain = [];
    var dailyProb = [];
    var dailyWind = [];
    var dailyGust = [];
    var dailyUv = [];
    var dailySunrise = [];
    var dailySunset = [];

    for (var d = 0; d < 7; d += 1) {
      var dayNum = 28 + d;
      var month = dayNum > 30 ? '12' : '11';
      var dom = dayNum > 30 ? (dayNum - 30) : dayNum;
      var domStr = (dom < 10 ? '0' : '') + dom;
      dailyDates.push('2026-' + month + '-' + domStr);
      dailyCodes.push(profile.rainProb >= 50 ? 80 : (profile.cloud >= 40 ? 2 : 1));
      dailyMax.push(profile.temp + 3);
      dailyMin.push(profile.temp - 6);
      dailyRain.push(profile.rainProb >= 50 ? 4.2 : 0.0);
      dailyProb.push(profile.rainProb);
      dailyWind.push(profile.wind);
      dailyGust.push(profile.gust);
      dailyUv.push(profile.uv);
      dailySunrise.push('2026-' + month + '-' + domStr + 'T06:02');
      dailySunset.push('2026-' + month + '-' + domStr + 'T17:12');
    }

    return {
      isLive: false,
      locInfo: locInfo,
      current: {
        temperature_2m: profile.temp,
        relative_humidity_2m: profile.rh,
        apparent_temperature: profile.temp + 2,
        is_day: 1,
        precipitation: 0,
        rain: 0,
        weather_code: profile.cloud >= 40 ? 2 : 1,
        cloud_cover: profile.cloud,
        surface_pressure: profile.pressure,
        wind_speed_10m: profile.wind,
        wind_direction_10m: 135,
        wind_gusts_10m: profile.gust
      },
      hourly: {
        time: hourlyTimes,
        temperature_2m: hourlyTemps,
        relative_humidity_2m: hourlyRh,
        dew_point_2m: hourlyDew,
        precipitation_probability: hourlyProb,
        precipitation: hourlyPrecip,
        wind_speed_10m: hourlyWind,
        wind_gusts_10m: hourlyGust,
        soil_temperature_0cm: hourlySoilT,
        soil_moisture_0_to_1cm: hourlySoilM
      },
      daily: {
        time: dailyDates,
        weather_code: dailyCodes,
        temperature_2m_max: dailyMax,
        temperature_2m_min: dailyMin,
        precipitation_sum: dailyRain,
        precipitation_probability_max: dailyProb,
        wind_speed_10m_max: dailyWind,
        wind_gusts_10m_max: dailyGust,
        uv_index_max: dailyUv,
        sunrise: dailySunrise,
        sunset: dailySunset
      }
    };
  }

  function renderAreaWeatherDashboard(payload) {
    var loc = payload.locInfo || {};
    var cur = payload.current || {};
    var hourly = payload.hourly || {};
    var daily = payload.daily || {};

    // 1. Resolved Location Header
    var placeParts = [];
    if (loc.locality) { placeParts.push(loc.locality); }
    if (loc.block && loc.block !== loc.locality && loc.block !== 'NA') { placeParts.push(loc.block); }
    if (loc.district) { placeParts.push(loc.district); }
    if (loc.state) { placeParts.push(loc.state); }
    var headerTitle = (placeParts.length ? placeParts.join(', ') : 'India') + (loc.pin ? (' — PIN ' + loc.pin) : '');
    setText('weather-loc-primary', headerTitle);

    var latVal = typeof loc.lat === 'number' ? loc.lat.toFixed(4) : '--';
    var lonVal = typeof loc.lon === 'number' ? loc.lon.toFixed(4) : '--';
    setText('weather-loc-coords', 'Lat ' + latVal + ', Lon ' + lonVal);

    var srcBadge = byId('weather-source-badge');
    if (srcBadge) {
      srcBadge.textContent = payload.isLive ? 'Live Open-Meteo' : 'Offline Regional Fallback';
      srcBadge.className = 'pill-badge ' + (payload.isLive ? 'pill-mint' : 'pill-neutral');
    }

    // Extract current & 4-hour rainfastness metrics
    var temp = Number(cur.temperature_2m || 28);
    var appTemp = Number(cur.apparent_temperature || temp);
    var rh = Number(cur.relative_humidity_2m || 70);
    var wind = Number(cur.wind_speed_10m || 9);
    var gust = Number(cur.wind_gusts_10m || wind);
    var windDir = degToCompass(cur.wind_direction_10m);
    var cloud = Number(cur.cloud_cover || 25);
    var pressure = Number(cur.surface_pressure || 1013);
    var precipNow = Number(cur.precipitation || cur.rain || 0);
    var skyDesc = decodeWmo(cur.weather_code);

    var hProb = hourly.precipitation_probability || [];
    var hPrecip = hourly.precipitation || [];
    var hDew = hourly.dew_point_2m || [];
    var hSoilT = hourly.soil_temperature_0cm || [];
    var hSoilM = hourly.soil_moisture_0_to_1cm || [];

    var max4HrProb = 0;
    var sum4HrRain = 0;
    var checkHours = Math.min(4, hProb.length);
    for (var i = 0; i < checkHours; i += 1) {
      var pVal = Number(hProb[i] || 0);
      var rVal = Number(hPrecip[i] || 0);
      if (pVal > max4HrProb) { max4HrProb = pVal; }
      sum4HrRain += rVal;
    }

    var dewNow = hDew.length ? Number(hDew[0]) : Math.round(temp - ((100 - rh) / 5));
    var soilTempNow = hSoilT.length ? Number(hSoilT[0]) : Math.round(temp - 2);
    var soilMoistNow = hSoilM.length ? Number(hSoilM[0]) : 0.26;
    var dewSpread = temp - dewNow;

    // 2. Agronomy Spray Safety Verdict Banner
    var rainBlocked = precipNow > 0.2 || sum4HrRain > 0.6 || max4HrProb >= 60;
    var gustHigh = gust > 15 || wind > 15;
    var fungalHigh = rh >= 80 || dewSpread <= 2.5;

    var verdictTitle = 'Safe to Spray';
    var verdictReason = '4-hour dry rainfastness window available with low wind drift.';
    var verdictClass = 'verdict-safe';
    var safeToSpray = true;

    if (rainBlocked) {
      verdictTitle = 'Do Not Spray — Rain Risk';
      verdictReason = 'Active rain or ' + Math.round(max4HrProb) + '% rain chance within next 4 hours; spray wash-off likely.';
      verdictClass = 'verdict-stop';
      safeToSpray = false;
    } else if (gustHigh || fungalHigh) {
      verdictTitle = 'Caution — High Wind/Humidity';
      var reasons = [];
      if (gustHigh) { reasons.push('Wind gusts ' + Math.round(gust) + ' km/h (>15 km/h drift risk)'); }
      if (fungalHigh) { reasons.push('High RH ' + Math.round(rh) + '% / narrow dewpoint spread (' + dewSpread.toFixed(1) + '°C)'); }
      verdictReason = reasons.join(' • ');
      verdictClass = 'verdict-caution';
      if (gust > 22) { safeToSpray = false; }
    }

    var banner = byId('spray-verdict-banner');
    if (banner) {
      banner.className = 'spray-verdict-banner ' + verdictClass;
    }
    setText('w-verdict-title', verdictTitle);
    setText('w-verdict-reason', verdictReason);
    setText('w-verdict-badge', safeToSpray ? 'Spray Window Open' : 'Delay Spray');

    var rainStatus = rainBlocked
      ? ('Hold: ' + Math.round(max4HrProb) + '% rain / ' + sum4HrRain.toFixed(1) + ' mm in 4h')
      : (max4HrProb >= 35 ? ('Caution: Add sticker (' + Math.round(max4HrProb) + '% in 4h)') : 'Safe: 4+ hr dry window');
    var windStatus = gustHigh
      ? ('Drift Alert: ' + Math.round(wind) + ' km/h, gusts ' + Math.round(gust) + ' km/h')
      : ('Low (' + Math.round(wind) + ' km/h, gusts ' + Math.round(gust) + ' km/h)');
    var dewStatus = fungalHigh
      ? ('High Fungal Alert (RH ' + Math.round(rh) + '%, Dew ' + Math.round(dewNow) + '°C)')
      : ('Normal (RH ' + Math.round(rh) + '%, Dew ' + Math.round(dewNow) + '°C)');
    var sprayWindow = rainBlocked
      ? 'Tomorrow 06:00 – 08:30 (After rain clears)'
      : (gust > 18 ? 'Today 17:30 – 19:00 (Wait for wind drop)' : (temp > 33 ? 'Today 17:15 – 18:45' : 'Today 16:30 – 18:30'));

    setText('w-rain', rainStatus);
    setText('w-wind', windStatus);
    setText('w-dew', dewStatus);
    setText('w-window', sprayWindow);

    // 3. Current Conditions Grid
    var uvArr = daily.uv_index_max || [];
    var srArr = daily.sunrise || [];
    var ssArr = daily.sunset || [];
    var uvToday = uvArr.length ? Number(uvArr[0]).toFixed(1) : '6.0';
    var sunWindow = (srArr.length && ssArr.length)
      ? (formatShortTime(srArr[0]) + '–' + formatShortTime(ssArr[0]))
      : '06:02–17:12';

    setText('wc-temp', Math.round(temp) + '°C / ' + Math.round(appTemp) + '°C');
    setText('wc-sky', skyDesc);
    setText('wc-rh', Math.round(rh) + '% RH • ' + Math.round(cloud) + '% Cloud');
    setText('wc-wind', Math.round(wind) + ' km/h ' + windDir + ' (' + Math.round(gust) + ' km/h gust)');
    setText('wc-press', Math.round(pressure) + ' hPa • ' + precipNow.toFixed(1) + ' mm');
    setText('wc-soil', Math.round(soilTempNow) + '°C • ' + soilMoistNow.toFixed(2) + ' m³/m³');
    setText('wc-sun', 'UV ' + uvToday + ' • ' + sunWindow);

    // 4. Soil & Hourly Spray Outlook (Next 12 hours in 3-hour steps = 4 cards)
    var hourlyGrid = byId('weather-hourly-grid');
    if (hourlyGrid) {
      hourlyGrid.innerHTML = '';
      var hTimes = hourly.time || [];
      var hTemps = hourly.temperature_2m || [];
      var hWinds = hourly.wind_speed_10m || [];
      var hGusts = hourly.wind_gusts_10m || [];
      for (var step = 0; step < 4; step += 1) {
        var idx = step * 3;
        if (idx >= hTimes.length) { break; }
        var cell = document.createElement('div');
        cell.className = 'forecast-cell';
        var tEl = document.createElement('strong');
        tEl.textContent = formatShortTime(hTimes[idx]) + ' • ' + Math.round(Number(hTemps[idx] || temp)) + '°C';
        var l1 = document.createElement('span');
        l1.textContent = 'Rain ' + Math.round(Number(hProb[idx] || 0)) + '% • Gust ' + Math.round(Number(hGusts[idx] || hWinds[idx] || gust)) + ' km/h';
        var l2 = document.createElement('span');
        l2.textContent = 'Soil ' + Math.round(Number(hSoilT[idx] || soilTempNow)) + '°C • ' + Number(hSoilM[idx] || soilMoistNow).toFixed(2);
        cell.appendChild(tEl);
        cell.appendChild(l1);
        cell.appendChild(l2);
        hourlyGrid.appendChild(cell);
      }
    }

    // 5. 7-Day Area Forecast Strip (4–7 compact cards)
    var dailyGrid = byId('weather-daily-grid');
    if (dailyGrid) {
      dailyGrid.innerHTML = '';
      var dTimes = daily.time || [];
      var dMax = daily.temperature_2m_max || [];
      var dMin = daily.temperature_2m_min || [];
      var dProb = daily.precipitation_probability_max || [];
      var dRain = daily.precipitation_sum || [];
      var dCodes = daily.weather_code || [];
      var dCount = Math.min(7, dTimes.length);
      for (var dIdx = 0; dIdx < dCount; dIdx += 1) {
        var dCell = document.createElement('div');
        dCell.className = 'forecast-cell';
        var dHead = document.createElement('strong');
        dHead.textContent = formatShortDate(dTimes[dIdx]) + ' • ' + Math.round(Number(dMin[dIdx] || 18)) + '–' + Math.round(Number(dMax[dIdx] || 30)) + '°C';
        var dSky = document.createElement('span');
        dSky.textContent = decodeWmo(dCodes[dIdx]);
        var dMeta = document.createElement('span');
        dMeta.textContent = 'Rain ' + Math.round(Number(dProb[dIdx] || 0)) + '% (' + Number(dRain[dIdx] || 0).toFixed(1) + ' mm)';
        dCell.appendChild(dHead);
        dCell.appendChild(dSky);
        dCell.appendChild(dMeta);
        dailyGrid.appendChild(dCell);
      }
    }

    state.weather = {
      pin: loc.pin || getValue('pin-input', '751024'),
      location: headerTitle,
      verdict: verdictTitle,
      rainStatus: rainStatus,
      windStatus: windStatus,
      dewStatus: dewStatus,
      sprayWindow: sprayWindow,
      safeToSpray: safeToSpray
    };

    renderTreatmentTab();
  }

  function applyOfflinePinWeather(pin) {
    var cleanPin = sanitizeTextField(pin, 6) || '751024';
    var profile = getPin2Profile(cleanPin);
    var locInfo = {
      pin: cleanPin,
      locality: profile.district,
      block: '',
      district: profile.district,
      state: profile.state,
      lat: profile.lat,
      lon: profile.lon
    };
    renderAreaWeatherDashboard(buildOfflineForecastPayload(locInfo, profile));
  }

  function fetchStepCOpenMeteo(locInfo, fallbackProfile) {
    var url = 'https://api.open-meteo.com/v1/forecast' +
      '?latitude=' + encodeURIComponent(locInfo.lat) +
      '&longitude=' + encodeURIComponent(locInfo.lon) +
      '&timezone=auto' +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
      '&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,soil_temperature_0cm,soil_moisture_0_to_1cm' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,sunrise,sunset';

    return fetchWithTimeout(url, 5000)
      .then(function (omJson) {
        if (!omJson || !omJson.current) {
          throw new Error('Incomplete Open-Meteo response');
        }
        renderAreaWeatherDashboard({
          isLive: true,
          locInfo: locInfo,
          current: omJson.current,
          hourly: omJson.hourly || {},
          daily: omJson.daily || {}
        });
      })
      .catch(function () {
        renderAreaWeatherDashboard(buildOfflineForecastPayload(locInfo, fallbackProfile));
      });
  }

  function checkAgroWeather() {
    var pin = getValue('pin-input', '').trim();
    if (!/^[1-8][0-9]{5}$/.test(pin)) {
      setText('weather-loc-primary', 'Enter a valid 6-digit Indian PIN code (e.g., 751024, 110001).');
      return;
    }

    var fallbackProfile = getPin2Profile(pin);

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      applyOfflinePinWeather(pin);
      return;
    }

    setText('weather-loc-primary', 'Resolving PIN ' + pin + ' & fetching live Open-Meteo area forecast...');
    setText('weather-loc-coords', 'Step A/B/C in progress (5s timeout)...');

    // Step A: PIN -> Post Office / Locality, Block, District, State
    fetchWithTimeout('https://api.postalpincode.in/pincode/' + pin, 5000)
      .then(function (pinJson) {
        var loc = {
          pin: pin,
          locality: fallbackProfile.district,
          block: '',
          district: fallbackProfile.district,
          state: fallbackProfile.state,
          lat: fallbackProfile.lat,
          lon: fallbackProfile.lon
        };

        if (pinJson && pinJson[0] && pinJson[0].Status === 'Success' && pinJson[0].PostOffice && pinJson[0].PostOffice[0]) {
          var po = pinJson[0].PostOffice[0];
          loc.locality = po.Name || po.District || loc.locality;
          loc.block = po.Block || '';
          loc.district = po.District || loc.district;
          loc.state = po.State || loc.state;
        }
        return loc;
      })
      .catch(function () {
        return {
          pin: pin,
          locality: fallbackProfile.district,
          block: '',
          district: fallbackProfile.district,
          state: fallbackProfile.state,
          lat: fallbackProfile.lat,
          lon: fallbackProfile.lon
        };
      })
      .then(function (loc) {
        // Step B: District, State -> Coordinates via Open-Meteo Geocoding
        var queryPrimary = loc.district + (loc.state ? (',' + loc.state) : '');
        var geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(queryPrimary) + '&count=1&countryCode=IN';
        return fetchWithTimeout(geoUrl, 5000)
          .then(function (geoJson) {
            if (geoJson && geoJson.results && geoJson.results[0]) {
              loc.lat = geoJson.results[0].latitude;
              loc.lon = geoJson.results[0].longitude;
              return loc;
            }
            // Retry with District name alone if District,State returned empty
            var geoFallbackUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(loc.district) + '&count=1&countryCode=IN';
            return fetchWithTimeout(geoFallbackUrl, 5000)
              .then(function (geoJson2) {
                if (geoJson2 && geoJson2.results && geoJson2.results[0]) {
                  loc.lat = geoJson2.results[0].latitude;
                  loc.lon = geoJson2.results[0].longitude;
                }
                return loc;
              })
              .catch(function () {
                return loc;
              });
          })
          .catch(function () {
            return loc;
          });
      })
      .then(function (resolvedLoc) {
        // Step C: Full Open-Meteo Forecast
        return fetchStepCOpenMeteo(resolvedLoc, fallbackProfile);
      })
      .catch(function () {
        applyOfflinePinWeather(pin);
      });
  }

  function checkGpsWeather() {
    if (typeof navigator === 'undefined' || !navigator.geolocation || typeof navigator.geolocation.getCurrentPosition !== 'function') {
      setText('weather-loc-primary', 'GPS unavailable in this browser. Using PIN forecast instead.');
      checkAgroWeather();
      return;
    }

    setText('weather-loc-primary', 'Detecting GPS farm coordinates...');
    var pin = getValue('pin-input', '751024').trim() || '751024';
    var fallbackProfile = getPin2Profile(pin);

    try {
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          var coords = (pos && pos.coords) ? pos.coords : null;
          if (!coords) {
            applyOfflinePinWeather(pin);
            return;
          }
          var gpsLoc = {
            pin: pin,
            locality: 'GPS Field Location',
            block: '',
            district: 'Live Coordinates',
            state: 'India',
            lat: coords.latitude,
            lon: coords.longitude
          };
          fetchStepCOpenMeteo(gpsLoc, fallbackProfile);
        },
        function () {
          setText('weather-loc-primary', 'GPS permission denied or timed out. Falling back to PIN ' + pin + ' forecast.');
          checkAgroWeather();
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    } catch (geoErr) {
      setText('weather-loc-primary', 'GPS unavailable on this protocol. Using PIN ' + pin + ' forecast.');
      checkAgroWeather();
    }
  }

  function getDiseaseOrDefault(diseaseId) {
    var diseases = Data.DISEASES || {};
    return diseases[diseaseId] || diseases.early_blight || {
      id: 'early_blight',
      name: 'Early Blight',
      pathogen: 'Alternaria solani',
      severityDefault: 'early',
      summary: '',
      sampleMetrics: { healthy: 48, yellowing: 27, lesion: 25 },
      confirmQuestions: ['Check rings', 'Check lower leaves'],
      nutrientRuleOut: { title: 'Rule Out Nutrient Deficiency', detail: '' },
      regimens: {
        early: { modeLabel: 'Contact Shield', modeType: 'contact', chemical: 'Mancozeb 75% WP', dosePerLiter: 2.5, unit: 'g', interval: '', phiDays: 7, notes: '' },
        late: { modeLabel: 'Systemic Cure', modeType: 'systemic', chemical: 'Azoxystrobin + Tebuconazole', dosePerLiter: 1.5, unit: 'ml', interval: '', phiDays: 14, notes: '' }
      },
      organic: '',
      viralAlert: ''
    };
  }

  // Tab 1 Rendering & Actions
  function renderScanResults() {
    var disease = getDiseaseOrDefault(state.diseaseId);

    setText('diag-disease-name', disease.name);
    setText('diag-pathogen', disease.pathogen);
    setText('diag-summary', disease.summary);
    setText('diag-source-tag', state.scanSource);

    var yesCount = 0;
    for (var i = 0; i < state.confirmAnswers.length; i += 1) {
      if (state.confirmAnswers[i] === true) {
        yesCount += 1;
      }
    }
    var adjustedConfidence = Math.min(99, state.confidence + yesCount * 5);
    setText('diag-confidence-badge', 'Confidence: ' + adjustedConfidence + '%');

    setText('pct-healthy-val', state.metrics.healthy + '%');
    setWidth('bar-healthy', state.metrics.healthy + '%');
    setText('pct-yellow-val', state.metrics.yellowing + '%');
    setWidth('bar-yellow', state.metrics.yellowing + '%');
    setText('pct-lesion-val', state.metrics.lesion + '%');
    setWidth('bar-lesion', state.metrics.lesion + '%');

    toggleClass('stage-early-btn', 'is-selected', state.stage === 'early');
    toggleClass('stage-late-btn', 'is-selected', state.stage === 'late');
    toggleClass('med-stage-early', 'is-selected', state.stage === 'early');
    toggleClass('med-stage-late', 'is-selected', state.stage === 'late');

    if (disease.nutrientRuleOut) {
      setText('nutrient-title', disease.nutrientRuleOut.title);
      setText('nutrient-detail', disease.nutrientRuleOut.detail);
    }

    var listEl = byId('confirm-questions-list');
    if (listEl) {
      listEl.innerHTML = '';
      var answeredCount = 0;
      var questions = disease.confirmQuestions || [];
      for (var qIdx = 0; qIdx < questions.length; qIdx += 1) {
        var ans = state.confirmAnswers[qIdx];
        if (ans !== null) {
          answeredCount += 1;
        }

        var item = document.createElement('div');
        item.className = 'confirm-item';

        var qText = document.createElement('span');
        qText.textContent = (qIdx + 1) + '. ' + questions[qIdx];
        item.appendChild(qText);

        var btnGroup = document.createElement('div');
        btnGroup.className = 'confirm-btn-group';

        var yesBtn = document.createElement('button');
        yesBtn.type = 'button';
        yesBtn.className = 'pill-switch-btn' + (ans === true ? ' is-selected' : '');
        yesBtn.textContent = t('btn_yes');
        yesBtn.setAttribute('data-q-index', String(qIdx));
        yesBtn.setAttribute('data-q-val', 'yes');

        var noBtn = document.createElement('button');
        noBtn.type = 'button';
        noBtn.className = 'pill-switch-btn' + (ans === false ? ' is-selected' : '');
        noBtn.textContent = t('btn_no');
        noBtn.setAttribute('data-q-index', String(qIdx));
        noBtn.setAttribute('data-q-val', 'no');

        btnGroup.appendChild(yesBtn);
        btnGroup.appendChild(noBtn);
        item.appendChild(btnGroup);
        listEl.appendChild(item);
      }
      setText('confirm-status-badge', answeredCount + ' / 2 Verified');
    }

    setValue('med-disease-select', state.diseaseId);
  }

  function getLiveGateText(isValid, reason) {
    if (isValid) { return t('leaf_detected_ready'); }
    if (reason === 'face_detected' || reason === 'person_detected') { return t('face_detected_hint'); }
    if (reason === 'moving') { return t('moving_leaf_hint'); }
    return t('no_leaf_live_hint');
  }

  function formatGateReason(reason) {
    if (reason === 'face_detected' || reason === 'person_detected' || reason === 'skin') {
      return t('face_detected_hint') + ' (Detected human skin/hand/face tones in frame).';
    }
    if (reason === 'moving') { return t('moving_leaf_hint') + ' (Frame motion exceeded 14%).'; }
    if (reason === 'no_veins') {
      return 'Surface looks uniform/flat (wall, cloth, or smooth plastic) without organic leaf-vein texture.';
    }
    return 'Insufficient botanical pixels in segmented foreground leaf area.';
  }

  // Render deep 6-metric analysis card below existing result bars
  function renderDeepAnalysisCard(deepMetrics) {
    var card = byId('deep-analysis-card');
    if (!card) { return; }
    if (!deepMetrics) { card.setAttribute('hidden', 'hidden'); return; }
    card.removeAttribute('hidden');

    var patternLabel = t(deepMetrics.patternKey || 'pattern_scattered_spots');

    var rows = [
      {
        label: t('deep_isolation'),
        value: deepMetrics.compactness + '% — ' + (deepMetrics.shapeOk ? t('deep_shape_ok') : t('deep_shape_warn')),
        pct:   deepMetrics.compactness,
        cls:   deepMetrics.shapeOk ? 'fill-green' : 'fill-amber'
      },
      {
        label: t('deep_chlorophyll'),
        value: deepMetrics.chlorophyllIdx + '%',
        pct:   deepMetrics.chlorophyllIdx,
        cls:   deepMetrics.chlorophyllIdx > 55 ? 'fill-green' : 'fill-amber'
      },
      {
        label: t('deep_chlorosis'),
        value: deepMetrics.chlorosisIdx + '%' + (deepMetrics.chlorosisIdx > 20 ? ' ⚠' : ''),
        pct:   deepMetrics.chlorosisIdx,
        cls:   deepMetrics.chlorosisIdx > 30 ? 'fill-red' : 'fill-amber'
      },
      {
        label: t('deep_necrotic'),
        value: deepMetrics.necroticIdx + '% | ' + deepMetrics.spotCount + ' ' + t('deep_spots'),
        pct:   deepMetrics.necroticIdx,
        cls:   deepMetrics.necroticIdx > 15 ? 'fill-red' : (deepMetrics.necroticIdx > 5 ? 'fill-amber' : 'fill-green')
      },
      {
        label: t('deep_pattern'),
        value: patternLabel,
        pct:   null,
        cls:   null
      },
      {
        label: t('deep_vein_texture'),
        value: deepMetrics.veinSharpness + '/100 (' + (deepMetrics.veinSharpness > 55 ? t('deep_sharp') : t('deep_soft')) + ')',
        pct:   deepMetrics.veinSharpness,
        cls:   deepMetrics.veinSharpness > 55 ? 'fill-green' : 'fill-amber'
      }
    ];

    var html = '<h4 class="deep-card-title" data-i18n="deep_card_title">' + t('deep_card_title') + '</h4>';
    html += '<div class="deep-metric-grid">';
    for (var ri = 0; ri < rows.length; ri += 1) {
      var row = rows[ri];
      html += '<div class="deep-metric-row">';
      html += '<div class="deep-metric-label">' + row.label + '</div>';
      html += '<div class="deep-metric-value">' + row.value + '</div>';
      if (row.pct !== null) {
        html += '<div class="progress-track deep-metric-bar">';
        html += '<div class="progress-fill ' + row.cls + '" style="width:' + Math.min(100, row.pct) + '%"></div>';
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
    card.innerHTML = html;
  }

  function showInvalidObjectCard(reason) {
    state.invalidReason = reason || 'no_leaf';
    var validContent = byId('diag-valid-content');
    var invalidCard = byId('diag-invalid-card');
    if (validContent) {
      validContent.setAttribute('hidden', 'hidden');
    }
    if (invalidCard) {
      invalidCard.removeAttribute('hidden');
    }
    setText('diag-confidence-badge', 'Blocked: Non-Leaf');
    setText('diag-invalid-reason', formatGateReason(reason));
  }

  function clearInvalidObjectCard() {
    state.invalidReason = '';
    var validContent = byId('diag-valid-content');
    var invalidCard = byId('diag-invalid-card');
    if (invalidCard) {
      invalidCard.setAttribute('hidden', 'hidden');
    }
    if (validContent) {
      validContent.removeAttribute('hidden');
    }
  }

  function updateLeafGateUI(gateRes) {
    var pill = byId('leaf-gate-pill');
    var textEl = byId('leaf-gate-text');
    var captureBtn = byId('btn-capture-scan');
    var isValid = Boolean(gateRes && gateRes.valid);
    var reason = (gateRes && gateRes.reason) ? gateRes.reason : 'no_leaf';
    state.gateValid = isValid;
    state.gateReason = reason;

    if (pill) {
      pill.removeAttribute('hidden');
      pill.classList.toggle('gate-valid', isValid);
      pill.classList.toggle('gate-invalid', !isValid);
    }
    if (textEl) {
      textEl.textContent = getLiveGateText(isValid, reason);
    }
    if (captureBtn) {
      captureBtn.disabled = !state.cameraRunning || (!state.cameraPaused && !isValid);
    }
  }

  function stopLeafGateInterval() {
    if (state.gateTimerId !== null) {
      clearInterval(state.gateTimerId);
      state.gateTimerId = null;
    }
  }

  function startLeafGateInterval() {
    stopLeafGateInterval();
    var videoEl = byId('leaf-video');
    if (!videoEl || typeof Media.validateLeafFrame !== 'function') {
      return;
    }
    var runCheck = function () {
      if (!videoEl || videoEl.paused || videoEl.ended || !videoEl.srcObject) {
        stopLeafGateInterval();
        return;
      }
      var res = Media.validateLeafFrame(videoEl, 'camera');
      updateLeafGateUI(res);
    };
    runCheck();
    state.gateTimerId = setInterval(runCheck, 750);
  }

  function applySampleLeaf(sampleId) {
    var diseases = Data.DISEASES || {};
    var disease = diseases[sampleId];
    if (!disease) {
      return;
    }
    clearInvalidObjectCard();
    state.diseaseId = sampleId;
    state.stage = disease.severityDefault;
    state.scanSource = 'Sample: ' + disease.name;
    state.confidence = 91;
    state.metrics = {
      healthy: disease.sampleMetrics.healthy,
      yellowing: disease.sampleMetrics.yellowing,
      lesion: disease.sampleMetrics.lesion
    };
    state.confirmAnswers = [null, null];

    var cards = qsAll('.sample-card');
    for (var i = 0; i < cards.length; i += 1) {
      if (cards[i]) {
        cards[i].classList.toggle('is-selected', cards[i].getAttribute('data-sample') === sampleId);
      }
    }

    var canvasEl = byId('leaf-canvas');
    if (canvasEl && typeof Media.drawSampleLeafToCanvas === 'function') {
      Media.drawSampleLeafToCanvas(sampleId, canvasEl);
    }
    renderScanResults();
    renderTreatmentTab();
  }

  function applyCanvasClassification(result, sourceLabel) {
    if (!result) {
      return;
    }
    clearInvalidObjectCard();
    state.diseaseId = result.diseaseId;
    state.stage = result.stageGuess;
    state.scanSource = sourceLabel;
    state.confidence = result.confidence;
    state.metrics = {
      healthy: result.healthyPct,
      yellowing: result.yellowingPct,
      lesion: result.lesionPct
    };
    state.confirmAnswers = [null, null];

    var cards = qsAll('.sample-card');
    for (var i = 0; i < cards.length; i += 1) {
      if (cards[i]) {
        cards[i].classList.remove('is-selected');
      }
    }

    renderScanResults();
    renderTreatmentTab();
  }

  function updateCameraButtons() {
    var startBtn = byId('btn-start-cam');
    var pauseBtn = byId('btn-pause-cam');
    var stopBtn = byId('btn-stop-cam');
    var captureBtn = byId('btn-capture-scan');

    if (startBtn) { startBtn.disabled = state.cameraRunning && !state.cameraPaused; }
    if (pauseBtn) {
      pauseBtn.disabled = !state.cameraRunning;
      pauseBtn.textContent = state.cameraPaused ? t('btn_resume_cam') : t('btn_pause_cam');
    }
    if (stopBtn) { stopBtn.disabled = !state.cameraRunning; }
    if (captureBtn) {
      captureBtn.disabled = !state.cameraRunning || (!state.cameraPaused && !state.gateValid);
    }
  }

  function findCropById(cropId) {
    var crops = Data.CROPS || [];
    if (!cropId) {
      return null;
    }
    for (var i = 0; i < crops.length; i += 1) {
      if (crops[i].id === cropId) {
        return crops[i];
      }
    }
    return null;
  }

  // Tab 2 Rendering & Calculator
  function renderTreatmentTab() {
    var disease = getDiseaseOrDefault(state.diseaseId);
    var regimen = (disease.regimens && (disease.regimens[state.stage] || disease.regimens.early)) || {
      modeLabel: 'Contact Shield', modeType: 'contact', chemical: '', dosePerLiter: 0, unit: 'ml', interval: '', phiDays: 0, notes: ''
    };
    var crop = findCropById(state.cropId);

    setText('med-crop-context', crop
      ? ('Crop Focus: ' + crop.name + ' (' + crop.category + ') — ' + crop.note)
      : 'General Crop Guidance (Select any crop in Tab 3 to customize)');

    var modeBadge = byId('med-mode-badge');
    if (modeBadge) {
      modeBadge.textContent = '[' + regimen.modeLabel + ']';
      modeBadge.className = 'mode-badge ' + (regimen.modeType === 'systemic' ? 'mode-systemic' : 'mode-contact');
    }

    setText('med-phi-days', regimen.phiDays + ' Days');
    setText('med-chemical-name', regimen.chemical);
    setText('med-dose-rate', regimen.dosePerLiter > 0
      ? ('Standard Dose: ' + regimen.dosePerLiter + ' ' + regimen.unit + ' per Liter of water')
      : 'No chemical fungicide dose required');
    setText('med-interval-text', 'Schedule: ' + regimen.interval);
    setText('med-notes-text', regimen.notes);
    setText('med-organic-text', disease.organic);
    setText('med-viral-text', disease.viralAlert);

    var tanks = Math.max(1, Math.min(25, parseInt(state.tankCount, 10) || 1));
    var perTankDose = Math.round(regimen.dosePerLiter * state.tankSize * 10) / 10;
    var totalDose = Math.round(perTankDose * tanks * 10) / 10;
    var totalWater = state.tankSize * tanks;
    var stickerPerTank = Math.round(state.tankSize * 0.5);

    setText('calc-per-tank-liters', String(state.tankSize));
    setText('calc-total-tanks', String(tanks));
    setText('calc-per-tank-dose', perTankDose + ' ' + regimen.unit);
    setText('calc-total-dose', totalDose + ' ' + regimen.unit);
    setText('calc-total-water', totalWater + ' L');
    setText('calc-sticker-dose', stickerPerTank + ' ml per tank');

    var passBadgeEl = byId('pass-id-badge');
    var passId = (passBadgeEl && passBadgeEl.textContent) ? passBadgeEl.textContent : 'KR-IN-0001';
    var farmerName = getValue('pass-name', '').trim() || 'Farmer';
    var cropLabel = crop ? crop.name : (getValue('pass-crop', '').trim() || 'General Crop');

    var slipLines = [
      '=== Krushak Drishti — Agri-Shop Prescription Slip ===',
      'Pass: ' + passId + ' (' + farmerName + ') | Crop: ' + cropLabel,
      'Location: ' + state.weather.location,
      'Diagnosis: ' + disease.name + ' [' + (state.stage === 'late' ? 'Late Stage' : 'Early Stage') + ']',
      'Chemical [' + regimen.modeLabel + ']: ' + regimen.chemical,
      'Dose Rate: ' + regimen.dosePerLiter + ' ' + regimen.unit + '/L',
      'Sprayer Mix (' + state.tankSize + 'L x ' + tanks + ' tanks): ' + perTankDose + ' ' + regimen.unit + '/tank (Total: ' + totalDose + ' ' + regimen.unit + ')',
      'Organic Option: ' + disease.organic,
      'PHI Safety Wait: ' + regimen.phiDays + ' Days before harvest',
      'Spray Verdict: ' + state.weather.verdict + ' | Window: ' + state.weather.sprayWindow
    ];
    setText('agri-slip-preview', slipLines.join('\n'));
  }

  function fallbackCopy(text, statusEl) {
    if (!document || !document.body) {
      return;
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      if (statusEl) { statusEl.textContent = 'Agri-Shop Slip copied!'; }
    } catch (e) {
      if (statusEl) { statusEl.textContent = 'Select and copy the slip box above.'; }
    }
    document.body.removeChild(ta);
  }

  function copyAgriSlip() {
    var preEl = byId('agri-slip-preview');
    var statusEl = byId('copy-slip-status');
    var text = preEl ? preEl.textContent : '';
    if (!text) {
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        navigator.clipboard.writeText(text)
          .then(function () {
            if (statusEl) { statusEl.textContent = 'Agri-Shop Slip copied!'; }
          })
          .catch(function () {
            fallbackCopy(text, statusEl);
          });
        return;
      } catch (clipErr) {
        fallbackCopy(text, statusEl);
        return;
      }
    }
    fallbackCopy(text, statusEl);
  }

  // Tab 3: 45+ Crops Directory
  function renderCropsGrid() {
    var grid = byId('crops-grid');
    if (!grid) {
      return;
    }
    var crops = Data.CROPS || [];
    var diseases = Data.DISEASES || {};
    var query = state.cropSearch.toLowerCase().trim();
    var cat = state.cropCategory;
    grid.innerHTML = '';

    var visibleCount = 0;
    for (var i = 0; i < crops.length; i += 1) {
      var crop = crops[i];
      if (!crop) { continue; }
      if (cat !== 'All' && crop.category !== cat) {
        continue;
      }
      if (query && crop.name.toLowerCase().indexOf(query) === -1 && crop.note.toLowerCase().indexOf(query) === -1 && crop.category.toLowerCase().indexOf(query) === -1) {
        continue;
      }

      visibleCount += 1;
      var primaryDisease = diseases[crop.primaryDisease];

      var card = document.createElement('div');
      card.className = 'crop-card';

      var top = document.createElement('div');
      top.className = 'crop-card-top';

      var title = document.createElement('h3');
      title.className = 'crop-name';
      title.textContent = crop.name;

      var catBadge = document.createElement('span');
      catBadge.className = 'pill-badge pill-neutral';
      catBadge.textContent = crop.category;

      top.appendChild(title);
      top.appendChild(catBadge);

      var diseaseMeta = document.createElement('p');
      diseaseMeta.className = 'crop-note';
      var riskStrong = document.createElement('strong');
      riskStrong.textContent = 'Key Risk: ';
      diseaseMeta.appendChild(riskStrong);
      diseaseMeta.appendChild(document.createTextNode(primaryDisease ? primaryDisease.name : crop.primaryDisease));

      var note = document.createElement('p');
      note.className = 'crop-note';
      note.textContent = crop.note;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline btn-sm';
      btn.textContent = 'Open Treatment in Tab 2';
      btn.setAttribute('data-crop-id', crop.id);

      card.appendChild(top);
      card.appendChild(diseaseMeta);
      card.appendChild(note);
      card.appendChild(btn);
      grid.appendChild(card);
    }

    setText('crops-count-badge', visibleCount + ' Crops');
  }

  // Tab 4: Voice & Care Assistant, 7-Day Checklist, Farmer Case Logbook
  function appendChatMessage(text, role) {
    var log = byId('assistant-chat-log');
    if (!log) {
      return;
    }
    var msg = document.createElement('div');
    msg.className = 'chat-msg ' + (role === 'user' ? 'chat-user' : 'chat-bot');
    msg.textContent = text;
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
  }

  function buildAssistantReply(question) {
    var q = String(question || '').toLowerCase();
    var disease = getDiseaseOrDefault(state.diseaseId);
    var regimen = (disease.regimens && (disease.regimens[state.stage] || disease.regimens.early)) || {
      modeLabel: 'Contact Shield', chemical: '', dosePerLiter: 0, unit: 'ml', phiDays: 0
    };

    if (q.indexOf('mix') !== -1 || q.indexOf('order') !== -1 || q.indexOf('tank') !== -1) {
      return 'Tank Mixing Order (WALES): 1) Fill tank half with clean water. 2) Add Wettable Powders/WDG (' + regimen.chemical + ') first and stir well. 3) Add Liquid/SC/EC formulations next. 4) Add non-ionic sticker (' + Math.round(state.tankSize * 0.5) + ' ml for ' + state.tankSize + 'L). 5) Top up remaining water to ' + state.tankSize + 'L.';
    }
    if (q.indexOf('nutrient') !== -1 || q.indexOf('deficien') !== -1 || q.indexOf('yellow') !== -1) {
      return disease.nutrientRuleOut.title + ': ' + disease.nutrientRuleOut.detail;
    }
    if (q.indexOf('rain') !== -1 || q.indexOf('wind') !== -1 || q.indexOf('weather') !== -1 || q.indexOf('safe') !== -1) {
      return 'Area Weather (' + state.weather.location + '): ' + state.weather.verdict + '. ' + state.weather.rainStatus + '; Wind: ' + state.weather.windStatus + '; ' + state.weather.dewStatus + '. Next Best Spray Window: ' + state.weather.sprayWindow + '.';
    }
    if (q.indexOf('organic') !== -1 || q.indexOf('bio') !== -1 || q.indexOf('neem') !== -1) {
      return 'Organic option for ' + disease.name + ': ' + disease.organic;
    }
    if (q.indexOf('virus') !== -1 || q.indexOf('viral') !== -1 || q.indexOf('curl') !== -1) {
      return disease.viralAlert;
    }
    return 'Active Diagnosis: ' + disease.name + ' (' + (state.stage === 'late' ? 'Late Stage' : 'Early Stage') + '). Recommended [' + regimen.modeLabel + ']: ' + regimen.chemical + ' @ ' + regimen.dosePerLiter + ' ' + regimen.unit + '/L (' + Math.round(regimen.dosePerLiter * state.tankSize * 10) / 10 + ' ' + regimen.unit + ' per ' + state.tankSize + 'L tank). PHI: ' + regimen.phiDays + ' days. ' + disease.organic;
  }

  function handleAssistantAsk(text) {
    var clean = String(text || '').trim();
    if (!clean) {
      return;
    }
    appendChatMessage(clean, 'user');
    var reply = buildAssistantReply(clean);
    state.lastBotReply = reply;
    appendChatMessage(reply, 'bot');
  }

  function renderChecklist() {
    var listEl = byId('aftercare-list');
    var days = Data.AFTERCARE_DAYS || [];
    if (!listEl) {
      return;
    }
    listEl.innerHTML = '';
    var doneCount = 0;

    for (var i = 0; i < days.length; i += 1) {
      var item = days[i];
      var checked = Boolean(state.checklist[i]);
      if (checked) {
        doneCount += 1;
      }

      var label = document.createElement('label');
      label.className = 'aftercare-item';

      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = checked;
      cb.setAttribute('data-day-index', String(i));

      var textWrap = document.createElement('div');
      var title = document.createElement('span');
      title.className = 'aftercare-title';
      title.textContent = item.title;
      var detail = document.createElement('span');
      detail.className = 'aftercare-detail';
      detail.textContent = item.detail;

      textWrap.appendChild(title);
      textWrap.appendChild(detail);
      label.appendChild(cb);
      label.appendChild(textWrap);
      listEl.appendChild(label);
    }

    var totalDays = days.length > 0 ? days.length : 7;
    var pct = Math.round((doneCount / totalDays) * 100);
    setWidth('checklist-progress-bar', pct + '%');
    setText('checklist-progress-text', doneCount + ' of ' + totalDays + ' days completed');
  }

  function renderCaseLogbook() {
    var listEl = byId('case-logbook-list');
    if (!listEl) {
      return;
    }
    listEl.innerHTML = '';
    if (!state.cases.length) {
      var empty = document.createElement('p');
      empty.className = 'muted-text';
      empty.textContent = 'No saved field cases yet. Click "Save Current Case" to store your scan & dosage.';
      listEl.appendChild(empty);
      return;
    }

    for (var i = 0; i < state.cases.length; i += 1) {
      var entry = state.cases[i];
      if (!entry) { continue; }
      var row = document.createElement('div');
      row.className = 'logbook-item';

      var meta = document.createElement('div');
      meta.className = 'logbook-meta';
      var strongTitle = document.createElement('strong');
      strongTitle.textContent = sanitizeTextField(entry.diseaseName, 60);
      meta.appendChild(strongTitle);
      meta.appendChild(document.createTextNode(' (' + sanitizeTextField(entry.stageLabel, 30) + ') • ' + sanitizeTextField(entry.cropName, 50)));
      meta.appendChild(document.createElement('br'));
      var subSpan = document.createElement('span');
      subSpan.className = 'muted-text';
      subSpan.textContent = sanitizeTextField(entry.date, 30) + ' • ' + sanitizeTextField(entry.tankMix, 30) + ' • PIN ' + sanitizeTextField(entry.pin, 6);
      meta.appendChild(subSpan);

      var actions = document.createElement('div');
      actions.className = 'logbook-actions';

      var openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'btn btn-outline btn-sm';
      openBtn.textContent = 'Load';
      openBtn.setAttribute('data-case-load', String(i));

      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-secondary btn-sm';
      delBtn.textContent = 'Delete';
      delBtn.setAttribute('data-case-del', String(i));

      actions.appendChild(openBtn);
      actions.appendChild(delBtn);
      row.appendChild(meta);
      row.appendChild(actions);
      listEl.appendChild(row);
    }
  }

  function saveCurrentCase() {
    var disease = getDiseaseOrDefault(state.diseaseId);
    var regimen = (disease.regimens && (disease.regimens[state.stage] || disease.regimens.early)) || { dosePerLiter: 0, unit: 'ml' };
    var crop = findCropById(state.cropId);
    var perTankDose = Math.round(regimen.dosePerLiter * state.tankSize * 10) / 10;

    var entry = {
      date: new Date().toLocaleDateString(),
      diseaseId: sanitizeTextField(state.diseaseId, 40),
      diseaseName: sanitizeTextField(disease.name, 60),
      stage: sanitizeTextField(state.stage, 16),
      stageLabel: state.stage === 'late' ? 'Late Stage' : 'Early Stage',
      cropId: sanitizeTextField(state.cropId, 40),
      cropName: sanitizeTextField(crop ? crop.name : (getValue('pass-crop', '').trim() || 'General Crop'), 50),
      tankMix: perTankDose + ' ' + regimen.unit + '/' + state.tankSize + 'L',
      pin: sanitizeTextField(state.weather.pin, 6)
    };

    state.cases.unshift(entry);
    if (state.cases.length > 20) {
      state.cases.length = 20;
    }
    safeWriteJSON(STORAGE_CASES, state.cases);
    renderCaseLogbook();
  }

  function bindEvents() {
    onEvent('lang-select', 'change', function (evt) {
      if (evt && evt.target) {
        applySiteLanguage(evt.target.value);
      }
    });

    onEvent('farmer-pass-form', 'submit', saveFarmerPass);
    onEvent('btn-check-weather', 'click', checkAgroWeather);
    onEvent('btn-use-gps', 'click', checkGpsWeather);
    onEvent('pin-input', 'keydown', function (evt) {
      if (evt && evt.key === 'Enter') {
        evt.preventDefault();
        checkAgroWeather();
      }
    });

    var tabButtons = qsAll('.tab-btn');
    for (var i = 0; i < tabButtons.length; i += 1) {
      if (tabButtons[i]) {
        tabButtons[i].addEventListener('click', function () {
          switchTab(this.getAttribute('data-tab'));
        });
      }
    }

    var videoEl = byId('leaf-video');
    var canvasEl = byId('leaf-canvas');

    onEvent('btn-start-cam', 'click', function () {
      if (typeof Media.startCamera !== 'function') {
        return;
      }
      setText('camera-status-text', 'Starting camera...');
      Media.startCamera(
        videoEl,
        function () {
          state.cameraRunning = true;
          state.cameraPaused = false;
          state.gateValid = false;
          updateCameraButtons();
          startLeafGateInterval();
          setText('camera-status-text', 'Camera active. Hold a plant leaf steadily in front of the camera.');
        },
        function (errMsg) {
          stopLeafGateInterval();
          state.cameraRunning = false;
          state.cameraPaused = false;
          state.gateValid = false;
          updateCameraButtons();
          setText('camera-status-text', 'Camera unavailable: ' + errMsg);
        }
      );
    });

    onEvent('btn-pause-cam', 'click', function () {
      if (typeof Media.togglePauseCamera !== 'function') {
        return;
      }
      stopLeafGateInterval();
      Media.togglePauseCamera(
        videoEl,
        canvasEl,
        state.cameraPaused,
        function () {
          state.cameraRunning = true;
          state.cameraPaused = false;
          updateCameraButtons();
          startLeafGateInterval();
          setText('camera-status-text', 'Camera preview resumed.');
        },
        function () {
          state.cameraRunning = true;
          state.cameraPaused = true;
          updateCameraButtons();
          setText('camera-status-text', 'Camera paused and stream tracks released. Press Resume or Capture & Scan Leaf.');
        },
        function (errMsg) {
          stopLeafGateInterval();
          state.cameraRunning = false;
          state.cameraPaused = false;
          updateCameraButtons();
          setText('camera-status-text', 'Could not resume camera: ' + errMsg);
        }
      );
    });

    onEvent('btn-stop-cam', 'click', function () {
      stopLeafGateInterval();
      if (typeof Media.stopCamera === 'function') {
        Media.stopCamera(videoEl);
      }
      state.cameraRunning = false;
      state.cameraPaused = false;
      state.gateValid = false;
      var gatePill = byId('leaf-gate-pill');
      if (gatePill) {
        gatePill.setAttribute('hidden', 'hidden');
      }
      updateCameraButtons();
      setText('camera-status-text', 'Camera stopped cleanly.');
    });

    onEvent('btn-capture-scan', 'click', function () {
      if (!state.cameraRunning || typeof Media.captureVideoToCanvas !== 'function') {
        return;
      }
      var outcome = Media.captureVideoToCanvas(videoEl, canvasEl);
      if (!outcome || !outcome.gate || !outcome.gate.valid || !outcome.scan) {
        updateLeafGateUI(outcome ? outcome.gate : { valid: false, reason: 'non_leaf' });
        showInvalidObjectCard(outcome && outcome.gate ? outcome.gate.reason : 'non_leaf');
        setText('camera-status-text', t('no_leaf_live_hint'));
        return;
      }
      applyCanvasClassification(outcome.scan, state.cameraPaused ? 'Paused Frame 224×224' : 'Live Camera 224×224');
      setText('camera-status-text', 'Leaf frame scanned on 224×224 canvas.');
    });

    onEvent('leaf-file-input', 'change', function (evt) {
      var file = evt && evt.target && evt.target.files ? evt.target.files[0] : null;
      if (!file || typeof Media.loadFileToCanvas !== 'function') {
        return;
      }
      setText('camera-status-text', 'Validating & analyzing uploaded photo...');
      Media.loadFileToCanvas(
        file,
        canvasEl,
        function (outcome) {
          if (!outcome || !outcome.gate || !outcome.gate.valid || !outcome.scan) {
            showInvalidObjectCard(outcome && outcome.gate ? outcome.gate.reason : 'non_leaf');
            setText('camera-status-text', t('invalid_object_title'));
            return;
          }
          applyCanvasClassification(outcome.scan, 'Uploaded Photo 224×224');
          setText('camera-status-text', 'Uploaded leaf analyzed successfully.');
        },
        function (errMsg) {
          setText('camera-status-text', errMsg);
        }
      );
    });

    onEvent('samples-grid', 'click', function (evt) {
      var target = evt && evt.target ? evt.target.closest('.sample-card') : null;
      if (!target) {
        return;
      }
      applySampleLeaf(target.getAttribute('data-sample'));
    });

    function setStage(newStage) {
      state.stage = newStage;
      renderScanResults();
      renderTreatmentTab();
    }
    onEvent('stage-early-btn', 'click', function () { setStage('early'); });
    onEvent('stage-late-btn', 'click', function () { setStage('late'); });
    onEvent('med-stage-early', 'click', function () { setStage('early'); });
    onEvent('med-stage-late', 'click', function () { setStage('late'); });

    onEvent('confirm-questions-list', 'click', function (evt) {
      var btn = evt && evt.target ? evt.target.closest('button[data-q-index]') : null;
      if (!btn) {
        return;
      }
      var idx = parseInt(btn.getAttribute('data-q-index'), 10);
      var val = btn.getAttribute('data-q-val') === 'yes';
      state.confirmAnswers[idx] = val;
      renderScanResults();
    });

    onEvent('btn-goto-tab2', 'click', function () {
      switchTab('meds');
      renderTreatmentTab();
    });

    onEvent('med-disease-select', 'change', function (evt) {
      if (evt && evt.target) {
        state.diseaseId = evt.target.value;
        renderScanResults();
        renderTreatmentTab();
      }
    });

    onEvent('tank-size-pills', 'click', function (evt) {
      var btn = evt && evt.target ? evt.target.closest('button[data-tank]') : null;
      var container = byId('tank-size-pills');
      if (!btn || !container) {
        return;
      }
      state.tankSize = parseInt(btn.getAttribute('data-tank'), 10) || 16;
      var all = qsAll('button', container);
      for (var k = 0; k < all.length; k += 1) {
        if (all[k]) {
          all[k].classList.toggle('is-selected', all[k] === btn);
        }
      }
      renderTreatmentTab();
    });

    onEvent('tank-count-input', 'input', function (evt) {
      if (evt && evt.target) {
        state.tankCount = evt.target.value;
        renderTreatmentTab();
      }
    });

    onEvent('btn-copy-slip', 'click', copyAgriSlip);

    onEvent('crops-search-input', 'input', function (evt) {
      if (evt && evt.target) {
        state.cropSearch = evt.target.value;
        renderCropsGrid();
      }
    });

    onEvent('crop-category-pills', 'click', function (evt) {
      var btn = evt && evt.target ? evt.target.closest('button[data-cat]') : null;
      var container = byId('crop-category-pills');
      if (!btn || !container) {
        return;
      }
      state.cropCategory = btn.getAttribute('data-cat');
      var all = qsAll('button', container);
      for (var c = 0; c < all.length; c += 1) {
        if (all[c]) {
          all[c].classList.toggle('is-selected', all[c] === btn);
        }
      }
      renderCropsGrid();
    });

    onEvent('crops-grid', 'click', function (evt) {
      var btn = evt && evt.target ? evt.target.closest('button[data-crop-id]') : null;
      if (!btn) {
        return;
      }
      var crop = findCropById(btn.getAttribute('data-crop-id'));
      if (!crop) {
        return;
      }
      state.cropId = crop.id;
      state.diseaseId = crop.primaryDisease;
      var dObj = getDiseaseOrDefault(crop.primaryDisease);
      state.stage = dObj.severityDefault || 'early';
      renderScanResults();
      renderTreatmentTab();
      switchTab('meds');
    });

    onEvent('quick-prompts', 'click', function (evt) {
      var chip = evt && evt.target ? evt.target.closest('button[data-prompt]') : null;
      if (!chip) {
        return;
      }
      handleAssistantAsk(chip.getAttribute('data-prompt'));
    });

    onEvent('assistant-form', 'submit', function (evt) {
      if (evt && typeof evt.preventDefault === 'function') {
        evt.preventDefault();
      }
      var val = getValue('assistant-input', '');
      handleAssistantAsk(val);
      setValue('assistant-input', '');
    });

    onEvent('btn-voice-input', 'click', function () {
      if (typeof Media.startVoiceRecognition !== 'function') {
        return;
      }
      Media.startVoiceRecognition(
        state.lang,
        function (transcript) {
          setValue('assistant-input', transcript);
          handleAssistantAsk(transcript);
        },
        function (msg) {
          setText('voice-status', msg);
        }
      );
    });

    onEvent('btn-speak-reply', 'click', function () {
      if (typeof Media.speakText !== 'function') {
        return;
      }
      var msg = state.lastBotReply || 'Select a leaf diagnosis or ask an agronomy question first.';
      Media.speakText(msg, state.lang, function (status) {
        setText('voice-status', status);
      });
    });

    onEvent('aftercare-list', 'change', function (evt) {
      var cb = evt ? evt.target : null;
      if (!cb || cb.type !== 'checkbox') {
        return;
      }
      var idx = parseInt(cb.getAttribute('data-day-index'), 10);
      state.checklist[idx] = cb.checked;
      safeWriteJSON(STORAGE_CHECKLIST, state.checklist);
      renderChecklist();
    });

    onEvent('btn-reset-checklist', 'click', function () {
      state.checklist = [false, false, false, false, false, false, false];
      safeWriteJSON(STORAGE_CHECKLIST, state.checklist);
      renderChecklist();
    });

    onEvent('btn-save-case', 'click', saveCurrentCase);

    onEvent('case-logbook-list', 'click', function (evt) {
      var loadBtn = evt && evt.target ? evt.target.closest('button[data-case-load]') : null;
      if (loadBtn) {
        var idx = parseInt(loadBtn.getAttribute('data-case-load'), 10);
        var entry = state.cases[idx];
        if (entry) {
          state.diseaseId = entry.diseaseId;
          state.stage = entry.stage;
          state.cropId = entry.cropId || '';
          renderScanResults();
          renderTreatmentTab();
          switchTab('meds');
        }
        return;
      }
      var delBtn = evt && evt.target ? evt.target.closest('button[data-case-del]') : null;
      if (delBtn) {
        var delIdx = parseInt(delBtn.getAttribute('data-case-del'), 10);
        state.cases.splice(delIdx, 1);
        safeWriteJSON(STORAGE_CASES, state.cases);
        renderCaseLogbook();
      }
    });
  }

  function init() {
    try { populateSelectors(); } catch (e1) { /* non-fatal */ }
    try { loadFarmerPass(); } catch (e2) { /* non-fatal */ }

    try {
      var savedChecklist = safeReadJSON(STORAGE_CHECKLIST, null);
      if (Array.isArray(savedChecklist) && savedChecklist.length === 7) {
        state.checklist = savedChecklist;
      }
      var savedCases = safeReadJSON(STORAGE_CASES, null);
      if (Array.isArray(savedCases)) {
        state.cases = savedCases;
      }
    } catch (e3) {
      // Ignore storage init error
    }

    try { bindEvents(); } catch (e4) { /* non-fatal */ }
    try { applySampleLeaf('early_blight'); } catch (e5) { /* non-fatal */ }
    try { applyOfflinePinWeather('751024'); } catch (e6) { /* non-fatal */ }
    try { renderCropsGrid(); } catch (e7) { /* non-fatal */ }
    try { renderChecklist(); } catch (e8) { /* non-fatal */ }
    try { renderCaseLogbook(); } catch (e9) { /* non-fatal */ }
    try {
      appendChatMessage('Welcome to Krushak Drishti Agronomy Care. Ask about mixing order, dosage, organic bio-control, or rainfastness.', 'bot');
    } catch (e10) { /* non-fatal */ }
  }

  global.applySiteLanguage = applySiteLanguage;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})(window);
