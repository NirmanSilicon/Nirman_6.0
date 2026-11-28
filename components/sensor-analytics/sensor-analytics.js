let chart;
export function mount(root, api) {
  const $ = id => root.querySelector(`#${id}`);
  const data = api.getData();
  $('sensorEngine').innerHTML = data.engines.map(e => `<option value="${e.id}">${e.id}</option>`).join('');
  $('sensorEngine').value = api.getSelectedEngine();
  const chartTheme = () => { const css=getComputedStyle(document.documentElement); return {text:css.getPropertyValue('--chart-text').trim()||'#8299aa',grid:css.getPropertyValue('--chart-grid').trim()||'#edf2f6'}; };
  const makeSeries = () => {
    const engine = data.engines.find(e => e.id === $('sensorEngine').value) || data.engines[0];
    const channel = $('sensorChannel').value;
    const windowSize = Number($('sensorWindow').value);
    const sensorNumber = Number(channel.slice(1));
    const seed = engine.cycle + sensorNumber * 17;
    const values = Array.from({length:windowSize},(_,i)=>{
      const t=i/windowSize;
      const base=0.44 + (sensorNumber%5)*0.035 + Math.sin((i+seed)*0.19)*0.035;
      const drift=engine.status==='Healthy'?t*0.015:t*0.12;
      return Number((base+drift).toFixed(3));
    });
    return {engine,values,labels:values.map((_,i)=>engine.cycle-windowSize+i+1)};
  };
  const render = () => {
    const {engine,values,labels}=makeSeries();
    const sensorName=`Sensor ${$('sensorChannel').value.slice(1)}`;
    $('sensorChartTitle').textContent=`${sensorName} trend · ${engine.id}`;
    if(chart)chart.destroy();
    const palette=chartTheme();
    if(window.Chart)chart=new Chart($('sensorChart'),{type:'line',data:{labels,datasets:[{label:sensorName,data:values,borderColor:'#459bd4',backgroundColor:'rgba(69,155,212,.10)',fill:true,tension:.3,pointRadius:0,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:8,color:palette.text}},y:{grid:{color:palette.grid},ticks:{color:palette.text}}}}});
    const first=values[0],last=values.at(-1),avg=values.reduce((a,b)=>a+b,0)/values.length;
    const delta=last-first;const trend=delta>.035?'Rising':delta<-.035?'Falling':'Stable';
    $('signalLatest').textContent=last.toFixed(3);$('signalAverage').textContent=avg.toFixed(3);$('signalTrend').textContent=trend;$('signalTrend').className=trend==='Stable'?'positive':'warning-text';
    $('signalFlag').textContent=engine.status==='Healthy'?'No demo flag':engine.anomaly>.7?'Elevated demo variation':'Monitor trend';$('signalFlag').className=engine.anomaly>.7?'warning-text':'positive';
  };
  render();
  ['sensorEngine','sensorChannel','sensorWindow'].forEach(id=>$(id).addEventListener('change',render));
  const onThemeChange=()=>render();document.addEventListener('aerosentry:themechange',onThemeChange);
  $('openDiagnostic').addEventListener('click',()=>{api.setSelectedEngine($('sensorEngine').value);api.navigate('diagnostic-insights');});
  $('exportSensorData').addEventListener('click',()=>{const {engine,values,labels}=makeSeries();api.exportCSV(`${engine.id.toLowerCase()}-sensor-demo.csv`,[['Cycle','Normalized illustrative reading'],...values.map((v,i)=>[labels[i],v])]);});
  return ()=>{document.removeEventListener('aerosentry:themechange',onThemeChange);if(chart)chart.destroy();};
}
