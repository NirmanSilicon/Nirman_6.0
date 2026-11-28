import { mount as mountOverview } from './components/overview/overview.js';
import { mount as mountEngineAssets } from './components/engine-assets/engine-assets.js';
import { mount as mountSensorAnalytics } from './components/sensor-analytics/sensor-analytics.js';
import { mount as mountTelemetry } from './components/telemetry/telemetry.js';
import { mount as mountRulPredictions } from './components/rul-predictions/rul-predictions.js';
import { mount as mountAlertCentre } from './components/alert-centre/alert-centre.js';
import { mount as mountDiagnosticInsights } from './components/diagnostic-insights/diagnostic-insights.js';
import { mount as mountSettings } from './components/settings/settings.js';

const initialEngines = [
  {id:'AS-001',status:'Healthy',rul:118,cycle:142,anomaly:.12,note:'Sensor readings remain within the expected demo profile.'},
  {id:'AS-002',status:'Healthy',rul:96,cycle:164,anomaly:.19,note:'Minor variation observed; no persistent abnormal pattern in this demo.'},
  {id:'AS-003',status:'Monitor',rul:58,cycle:187,anomaly:.56,note:'A small group of channels is drifting. Continue monitoring the simulated trend.'},
  {id:'AS-004',status:'Monitor',rul:42,cycle:211,anomaly:.82,note:'Persistent multi-channel deviation in simulated telemetry; inspect supporting evidence.'},
  {id:'AS-005',status:'Healthy',rul:104,cycle:151,anomaly:.15,note:'Stable simulated sensor profile.'},
  {id:'AS-006',status:'Review',rul:19,cycle:238,anomaly:.91,note:'Low predicted RUL and elevated anomaly score in demo data. Requires careful review.'},
  {id:'AS-007',status:'Healthy',rul:86,cycle:170,anomaly:.22,note:'No significant deviation detected in the current demo window.'},
  {id:'AS-008',status:'Healthy',rul:69,cycle:193,anomaly:.28,note:'Readings are broadly stable in the current simulated window.'}
];
const initialAlerts = [
  {id:1,engine:'AS-006',title:'Low predicted RUL',severity:'high',description:'The demo RUL estimate is below the configured review threshold of 20 cycles.',time:'Just now',state:'open'},
  {id:2,engine:'AS-004',title:'Persistent multi-sensor deviation',severity:'medium',description:'Several simulated channels have shown a sustained deviation over recent cycles.',time:'12 min ago',state:'open'},
  {id:3,engine:'AS-003',title:'Sensor trend requires monitoring',severity:'medium',description:'A gradual change was observed in one selected channel.',time:'38 min ago',state:'acknowledged'},
  {id:4,engine:'AS-002',title:'Transient reading returned to baseline',severity:'low',description:'A short-lived demo deviation is no longer present.',time:'1 hr ago',state:'resolved'}
];
const state = {engines:structuredClone(initialEngines),alerts:structuredClone(initialAlerts),selectedEngine:'AS-004',currentPage:'overview',noticeVisible:true};
const THEME_STORAGE_KEY = 'aerosentry-theme';
const pages = {
  'overview':{title:'Fleet Performance Overview',mount:mountOverview},
  'engine-assets':{title:'Engine Assets',mount:mountEngineAssets},
  'sensor-analytics':{title:'Sensor Analytics',mount:mountSensorAnalytics},
  'telemetry':{title:'TELESENTRY Telemetry Operations',mount:mountTelemetry},
  'rul-predictions':{title:'RUL Predictions',mount:mountRulPredictions},
  'alert-centre':{title:'Alert Centre',mount:mountAlertCentre},
  'diagnostic-insights':{title:'Diagnostic Insights',mount:mountDiagnosticInsights},
  'settings':{title:'Global Settings',mount:mountSettings}
};
const $ = id => document.getElementById(id);
let activeCleanup = null;
let activeStyleLink = null;
let toastTimer = null;
let autoAdvanceTimer = null;

function toast(message){const element=$('toast');element.textContent=message;element.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>element.classList.remove('show'),3200);}
function statusClass(status){return status==='Healthy'?'healthy-pill':status==='Review'?'review-pill':'monitor-pill';}
function exportCSV(filename,rows){const csv=rows.map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);toast(`${filename} downloaded.`);}
function exportFleet(){exportCSV('aerosentry-demo-fleet-report.csv',[['Engine','Status','Predicted RUL cycles','Current cycle','Anomaly score'],...state.engines.map(e=>[e.id,e.status,e.rul,e.cycle,e.anomaly.toFixed(2)])]);}
function exportEngine(engineId){const e=state.engines.find(item=>item.id===engineId)||state.engines[0];exportCSV(`${e.id.toLowerCase()}-demo-report.csv`,[['Engine','Status','Predicted RUL cycles','Current cycle','Anomaly score','Health note'],[e.id,e.status,e.rul,e.cycle,e.anomaly.toFixed(2),e.note]]);}
function setSelectedEngine(id){if(state.engines.some(e=>e.id===id))state.selectedEngine=id;}
function getSelectedEngine(){return state.selectedEngine;}
function getData(){return state;}
function updateAlert(id,nextState,note=''){const alert=state.alerts.find(a=>a.id===id);if(!alert)return false;alert.state=nextState;if(note)alert.resolutionNote=note;return true;}
function removeResolvedAlerts(){const before=state.alerts.length;state.alerts.splice(0,state.alerts.length,...state.alerts.filter(a=>a.state!=='resolved'));return before-state.alerts.length;}
function advanceSimulation(){const e=state.engines.find(x=>x.id===state.selectedEngine)||state.engines[0];e.cycle+=1;e.rul=Math.max(1,e.rul-(Math.random()<.7?1:0));e.anomaly=Math.min(.99,Math.max(.05,e.anomaly+(Math.random()-.42)*.035));if(e.rul<=20&&e.status!=='Review'){e.status='Review';state.alerts.unshift({id:Date.now(),engine:e.id,title:'Predicted RUL entered review range',severity:'high',description:'The local demo estimate crossed the 20-cycle review threshold.',time:'Just now',state:'open'});}else if(e.anomaly>.72&&e.status==='Healthy'){e.status='Monitor';}toast(`${e.id}: demo simulation advanced to cycle ${e.cycle}.`);}
function runDemoAnalysis(){state.engines.forEach(e=>{e.anomaly=Math.min(.98,Math.max(.05,e.anomaly+(Math.random()-.5)*.025));if(e.anomaly>.88)e.status='Review';else if(e.anomaly>.48&&e.status==='Healthy')e.status='Monitor';});}
function resetDemo(){state.engines.splice(0,state.engines.length,...structuredClone(initialEngines));state.alerts.splice(0,state.alerts.length,...structuredClone(initialAlerts));state.selectedEngine='AS-004';}
function setNoticeVisible(visible){state.noticeVisible=visible;}
function getNoticeVisible(){return state.noticeVisible;}
function getTheme(){return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';}
function setTheme(theme){
  const nextTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = nextTheme;
  const isDark = nextTheme === 'dark';
  const toggle = $('themeToggle');
  const icon = $('themeToggleIcon');
  if(toggle){
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  }
  if(icon) icon.textContent = isDark ? '☀' : '☾';
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if(themeColor) themeColor.setAttribute('content', isDark ? '#101a27' : '#f3f8fd');
  try { localStorage.setItem(THEME_STORAGE_KEY, nextTheme); } catch (_) { /* Theme still works for this page load. */ }
  document.dispatchEvent(new CustomEvent('aerosentry:themechange', {detail:{theme:nextTheme}}));
  return nextTheme;
}

const api={toast,navigate,getData,getSelectedEngine,setSelectedEngine,statusClass,exportCSV,exportFleet,exportEngine,updateAlert,removeResolvedAlerts,advanceSimulation,runDemoAnalysis,resetDemo,setNoticeVisible,getNoticeVisible,getTheme,setTheme};
function updateBackendStatus(connected, label){
  const pill = $('apiStatusPill');
  const text = $('apiStatusText');
  const dot = pill?.querySelector('.api-status-dot');
  const sidebarCard = document.querySelector('.sidebar-api-card');
  const sidebarTitle = sidebarCard?.querySelector('strong');
  const sidebarDescription = sidebarCard?.querySelector('small');
  if(text) text.textContent = label || (connected ? 'API CONNECTED' : 'API NOT CONNECTED');
  if(pill){ pill.classList.toggle('is-connected', Boolean(connected)); pill.classList.toggle('is-disconnected', !connected); }
  if(dot){ dot.classList.toggle('is-connected', Boolean(connected)); dot.classList.toggle('is-disconnected', !connected); }
  if(sidebarTitle) sidebarTitle.textContent = connected ? 'FASTAPI CONNECTED' : 'LOCAL DEMO MODE';
  if(sidebarDescription) sidebarDescription.textContent = connected ? 'Phase 3/4 services available' : 'FastAPI not connected';
  document.documentElement.dataset.apiStatus = connected ? 'connected' : 'disconnected';
}

document.addEventListener('aerosentry:api-status', (event) => {
  const detail = event.detail || {};
  updateBackendStatus(Boolean(detail.connected), detail.label);
});


async function navigate(page){
  if(!pages[page]){toast('That page is not available.');return;}
  state.currentPage=page;
  document.querySelectorAll('.nav-item[data-page]').forEach(button=>button.classList.toggle('active',button.dataset.page===page));
  $('pageTitle').textContent=pages[page].title;
  $('breadcrumb').textContent=pages[page].title.toUpperCase();
  $('sidebar').classList.remove('open');
  if(activeCleanup){activeCleanup();activeCleanup=null;}
  if(activeStyleLink){activeStyleLink.remove();activeStyleLink=null;}
  const root=$('componentMount');root.innerHTML='<div class="loading-state">Loading workspace…</div>';
  try{
    const folder=page;
    const response=await fetch(`components/${folder}/${folder}.html`);
    if(!response.ok)throw new Error(`Unable to load ${folder} component (${response.status}).`);
    const html=await response.text();
    root.innerHTML=html;
    const style=document.createElement('link');style.rel='stylesheet';style.href=`components/${folder}/${folder}.css`;style.dataset.componentStyle=folder;document.head.appendChild(style);activeStyleLink=style;
    await new Promise((resolve,reject)=>{style.onload=resolve;style.onerror=()=>reject(new Error(`Unable to load ${folder} styles.`));});
    const cleanup=pages[page].mount(root,api);
    if(typeof cleanup==='function')activeCleanup=cleanup;
  }catch(error){root.innerHTML=`<div class="component-error"><strong>Unable to load this page.</strong><p>${error.message}</p><button class="btn btn-secondary" id="retryComponent">Try again</button></div>`;$('retryComponent')?.addEventListener('click',()=>navigate(page));}
}

function openHelp(){const modal=$('helpModal');modal.classList.add('show');modal.setAttribute('aria-hidden','false');}
function closeHelp(){const modal=$('helpModal');modal.classList.remove('show');modal.setAttribute('aria-hidden','true');}
function init(){
  const updateClock=()=>{$('liveClock').textContent=new Date().toLocaleTimeString();};updateClock();setInterval(updateClock,1000);
  document.querySelectorAll('.nav-item[data-page]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.page)));
  $('mobileMenu').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  setTheme(getTheme());
  $('themeToggle').addEventListener('click',()=>setTheme(getTheme()==='dark'?'light':'dark'));
  $('topAlertBtn').addEventListener('click',()=>navigate('alert-centre'));
  $('apiStatusPill')?.addEventListener('click',()=>navigate('settings'));
  $('apiStatusPill')?.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();navigate('settings');}});
  $('globalSearch').addEventListener('keydown',event=>{if(event.key!=='Enter')return;const query=event.target.value.trim().toUpperCase();if(!query)return;const found=state.engines.find(e=>e.id===query);if(found){setSelectedEngine(found.id);navigate('engine-assets');}else toast(`No engine found for “${query}”.`);});
  $('helpBtn').addEventListener('click',openHelp);$('closeHelp').addEventListener('click',closeHelp);$('understandBtn').addEventListener('click',closeHelp);$('helpModal').addEventListener('click',event=>{if(event.target===$('helpModal'))closeHelp();});
  $('profileInfo').addEventListener('click',()=>toast('Flight Operations · Demo operator · No account is connected.'));
  document.querySelector('.sidebar-profile')
  ?.addEventListener('click', () => $('profileInfo').click());
  navigate('overview');
}

document.addEventListener('DOMContentLoaded',init);
