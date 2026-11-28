const $ = (id) => document.getElementById(id);
let engines = [];
async function loadEngines(){
  const res = await fetch('/api/demo/engines');
  if(!res.ok) throw new Error('Could not load FD001 engine units.');
  const data = await res.json(); engines = data.engines;
  $('engineSelect').innerHTML = engines.map(e=>`<option value="${e.engine_id}">Engine ${String(e.engine_id).padStart(3,'0')}</option>`).join('');
  updateCycleRange();
}
function updateCycleRange(){
  const engine = engines.find(e=>e.engine_id===Number($('engineSelect').value)) || engines[0];
  if(!engine) return;
  const max = engine.max_cycle;
  $('cycleRange').max = max;
  $('cycleRange').value = Math.min(Math.max(26,Number($('cycleRange').value)||26),max);
  $('cycleValue').textContent = $('cycleRange').value;
}
function displayResult(data){
  const alert = data.status === 'possible_anomaly';
  $('statusIcon').className = `status-icon ${alert?'alert':'clear'}`;
  $('statusIcon').textContent = alert ? '!' : '✓';
  $('statusTitle').textContent = alert ? 'Possible anomaly detected' : 'No configured anomaly rule triggered';
  $('statusText').textContent = alert ? 'The latest replay window contains one or more unusual sensor patterns. Review supporting evidence.' : 'The latest replay window did not cross the configured anomaly thresholds.';
  $('engineMeta').textContent = data.engine_id;
  $('cycleMeta').textContent = data.current_cycle;
  $('lofScore').textContent = data.scores.lof.toFixed(4);
  $('spikeScore').textContent = data.scores.maximum_sensor_deviation_z.toFixed(2)+' z';
  $('stuckScore').textContent = data.scores.flatline_score.toFixed(3);
  $('ifScore').textContent = data.scores.isolation_forest_reference.toFixed(4);
  const checks = [...data.triggered_checks.map(x=>({text:x.replaceAll('_',' '),kind:''})),...data.flagged_sensors.map(x=>({text:x,kind:'sensor'}))];
  $('checks').className = 'chips'+(checks.length?'':' empty');
  $('checks').innerHTML = checks.length ? checks.map(x=>`<span class="chip ${x.kind}">${x.text}</span>`).join('') : 'No checks triggered and no individual sensor was flagged.';
  $('checkCount').textContent = `${data.triggered_checks.length} TRIGGER${data.triggered_checks.length===1?'':'S'}`;
  $('interpretation').textContent = data.interpretation;
}
async function analyze(){
  const engine = Number($('engineSelect').value); const cycle=Number($('cycleRange').value);
  $('analyzeBtn').disabled=true; $('analyzeBtn').textContent='Analysing…'; $('errorBox').hidden=true;
  try{
    const res=await fetch(`/api/demo/analyze?engine_id=${engine}&end_cycle=${cycle}`);
    const data=await res.json(); if(!res.ok) throw new Error(data.detail||'Analysis request failed.');
    displayResult(data);
  }catch(err){$('errorBox').textContent=err.message;$('errorBox').hidden=false;}
  finally{$('analyzeBtn').disabled=false;$('analyzeBtn').innerHTML='Run anomaly analysis <span>↗</span>';}
}
$('engineSelect').addEventListener('change',updateCycleRange);
$('cycleRange').addEventListener('input',()=>{$('cycleValue').textContent=$('cycleRange').value;});
$('analyzeBtn').addEventListener('click',analyze);
loadEngines().catch(err=>{$('errorBox').textContent=err.message;$('errorBox').hidden=false;});
