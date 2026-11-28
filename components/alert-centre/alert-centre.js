export function mount(root, api) {
  const $=id=>root.querySelector(`#${id}`);const data=api.getData();
  const render=()=>{
    const filter=$('alertFilter').value;
    const shown=data.alerts.filter(a=>filter==='all'||a.state===filter);
    $('openAlertSummary').textContent=data.alerts.filter(a=>a.state==='open').length;
    $('ackAlertSummary').textContent=data.alerts.filter(a=>a.state==='acknowledged').length;
    $('resolvedAlertSummary').textContent=data.alerts.filter(a=>a.state==='resolved').length;
    $('alertList').innerHTML=shown.map(a=>`<div class="alert-row"><span class="alert-mark ${a.severity==='high'?'red':''}">${a.severity==='high'?'!':'⌁'}</span><div class="alert-row-main"><strong>${a.engine} · ${a.title}</strong><p>${a.description}</p><span class="alert-meta">${a.time} · ${a.severity.toUpperCase()} PRIORITY · ${a.state.toUpperCase()}</span></div><div class="alert-actions">${a.state==='open'?`<button class="mini-btn" data-ack="${a.id}">Acknowledge</button>`:''}${a.state!=='resolved'?`<button class="mini-btn" data-resolve="${a.id}">Resolve</button>`:'<span class="status-pill healthy-pill">Resolved</span>'}</div></div>`).join('')||'<div class="empty-state">No alerts match this filter.</div>';
  };
  render();$('alertFilter').addEventListener('change',render);
  $('alertList').addEventListener('click',event=>{const ack=event.target.closest('[data-ack]');const resolve=event.target.closest('[data-resolve]');if(ack){api.updateAlert(Number(ack.dataset.ack),'acknowledged');render();api.toast('Alert acknowledged. This records review only.');}if(resolve){const note=window.prompt('Add a brief resolution note (demo record):','Reviewed by operator');if(note===null)return;api.updateAlert(Number(resolve.dataset.resolve),'resolved',note);render();api.toast('Alert marked resolved in this local demo.');}});
  $('clearResolvedBtn').addEventListener('click',()=>{const count=api.removeResolvedAlerts();render();api.toast(`${count} resolved alert(s) removed from this local demo view.`);});
  $('exportAlertsBtn').addEventListener('click',()=>api.exportCSV('aerosentry-demo-alerts.csv',[['Alert ID','Engine','Title','Severity','State','Time','Resolution note'],...data.alerts.map(a=>[a.id,a.engine,a.title,a.severity,a.state,a.time,a.resolutionNote||''])]));
  return ()=>{};
}
