export function mount(root, api) {
  const $=id=>root.querySelector(`#${id}`);const data=api.getData();
  const render=()=>{$('predictionTableBody').innerHTML=data.engines.slice().sort((a,b)=>a.rul-b.rul).map(e=>`<tr><td><strong>${e.id}</strong></td><td><strong>${e.rul} cycles</strong></td><td class="range-text">${Math.max(1,e.rul-5)}–${e.rul+6} cycles*</td><td>${e.anomaly.toFixed(2)}</td><td><span class="status-pill ${api.statusClass(e.status)}">● ${e.status}</span></td></tr>`).join('');};
  render();
  $('refreshPredictionsBtn').addEventListener('click',()=>{render();api.toast('Demo prediction values refreshed. Trained model inference is not connected.');});
  $('compareModelsBtn').addEventListener('click',()=>api.toast('XGBoost and LSTM comparison will be populated after both models are trained and evaluated.'));
  $('exportPredictionsBtn').addEventListener('click',()=>api.exportCSV('aerosentry-demo-rul-predictions.csv',[['Engine','Predicted RUL cycles','Anomaly score','Status'],...data.engines.map(e=>[e.id,e.rul,e.anomaly.toFixed(2),e.status])]));
  return ()=>{};
}
