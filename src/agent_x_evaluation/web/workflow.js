(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const mount = byId('upload-workflow');
  if (!mount) return;
  let activeDocument = null, activeReview = null, mode = 'sample', working = false, capabilities = null;
  const blankInvoice = {vendor:'',date:'',currency:'',line_items:[{description:'',quantity:'',unit_price:''}],total:''};
  // Static interface only. All document/source values below are inserted with textContent.
  mount.innerHTML = `<section class="card upload-workflow" id="workflow-card">
    <div class="workflow-top"><div><span class="eyebrow-sm">Start with a source you can inspect</span><h2>Sample data, or your own document.</h2><p class="small">The built-in invoices are synthetic records authored in this repository. For your own data, upload a file, inspect extraction and references, then confirm the fields before any task is authorized.</p></div><div class="input-switch"><button type="button" id="input-sample" class="active">Use synthetic sample</button><button type="button" id="input-upload">Upload your document</button></div></div>
    <div class="workflow-steps"><span class="active" id="wf-step-1">01 · Choose source</span><span id="wf-step-2">02 · Inspect / extract</span><span id="wf-step-3">03 · Confirm task record</span><span id="wf-step-4">04 · Compare / inspect evidence</span></div>
    <div class="workflow-samples"><span class="small">Download a reproducible sample:</span>${['pdf','png','json','csv','txt'].map(format=>`<a href="/api/evaluation/samples/invoice-001/${format}">${format==='pdf'?'Clean invoice PDF':format.toUpperCase()} ↓</a>`).join('')}</div>
    <div class="workflow-body" id="workflow-body" hidden><div><div class="workflow-drop" id="drop-zone"><strong style="font-size:12px;font-weight:500">Drop an invoice here, or choose a file.</strong><div class="small">PDF, PNG, JPG, TXT, CSV, JSON, DOCX · up to 8 MB · one invoice per file</div><input id="upload-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.json,.docx" aria-label="Upload an invoice document"><button type="button" class="secondary" id="upload-document">Upload & inspect source ↗</button><p class="small">Local parsing runs first. No document is sent to a model during upload.</p></div><details><summary>Or paste invoice text / JSON</summary><textarea class="workflow-paste" id="paste-document" placeholder="Vendor: Your vendor&#10;Date: 2026-11-01&#10;Currency: USD&#10;Part | 2 | 12.50&#10;Total: 25.00" aria-label="Paste invoice text or JSON"></textarea><button type="button" class="secondary" id="upload-paste">Inspect pasted content</button></details><div class="workflow-original" id="workflow-original" hidden><h3 style="font:23px Georgia,serif">Original document & extracted text.</h3><p class="small" id="original-note"></p><div><a id="download-original" class="small" href="#" download>Download original ↗</a><select id="preview-page" aria-label="Source preview page"></select></div><img id="original-preview" alt="Raster preview of the original uploaded document" hidden><details open><summary>Extracted source lines</summary><div id="source-spans" class="workflow-text"></div></details></div></div>
    <div class="workflow-review" id="workflow-review" hidden><h3>Review before authorization.</h3><p class="small">These are suggested fields, not a delivered answer. Correct missing or misread values against the original. Do not change a wrong source total just to force a pass.</p><textarea class="workflow-editor" id="invoice-editor" spellcheck="false" aria-label="Review extracted invoice JSON"></textarea><div class="workflow-actions"><button class="secondary" type="button" id="validate-fields">Check fields & totals</button><button class="primary" type="button" id="confirm-fields">Confirm reviewed invoice ↗</button></div><p class="workflow-message" id="review-status" role="status"></p><div class="workflow-proof" id="confirmation-proof" hidden></div><details open><summary>Field references · value occurrences, not independent verification</summary><div class="field-evidence" id="field-evidence"></div></details><div class="workflow-model"><span class="eyebrow-sm">Optional model extraction / image OCR</span><p class="small" id="model-destination">Checking provider configuration…</p><label class="check"><input id="model-consent" type="checkbox">I agree to send this document’s extracted text or page images to my configured model provider for extraction.</label><button class="secondary" type="button" id="model-extract">Extract with configured model ↗</button><p class="small">OCR/model suggestions can be wrong and require review. Images and scanned PDF pages use model OCR; text PDFs use their extracted text.</p></div><button class="secondary" type="button" id="remove-upload">Remove this upload from local memory</button></div></div><p class="workflow-message" id="upload-status" role="status" aria-live="polite">Synthetic samples are generated in this repository, not sourced from a real vendor or external dataset.</p><div class="small">Uploads stay in temporary local memory for up to one hour or until restart. You can remove an upload earlier. Model extraction is optional and requires the checkbox above.</div></section>`;

  const sourceBox = document.createElement('div');
  for(const [label,path]of [['Invalid-total PDF','invalid-total'],['Prompt-injection PDF','source-instruction']]){const link=document.createElement('a');link.textContent=label+' ↓';link.href='/api/evaluation/negative-samples/'+path;mount.querySelector('.workflow-samples').append(link);}
  sourceBox.id = 'selected-source'; sourceBox.className = 'source-provenance';
  byId('source-note').before(sourceBox);
  function el(tag, text, cls) { const node=document.createElement(tag); if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node; }
  function message(text, isError=false, target='upload-status') { const node=byId(target); node.textContent=text; node.className='workflow-message'+(isError?' error':''); }
  async function call(path, body, method) {
    const options={method:method||(body?'POST':'GET')};
    if(body instanceof FormData)options.body=body;
    else if(body){options.headers={'Content-Type':'application/json'};options.body=JSON.stringify(body);}
    let response;
    try{response=await fetch('/api/evaluation/'+path,options);}
    catch{throw new Error('Cannot reach Agent-X. Start the presentation services with scripts/start-presentation.ps1 -SkipBuild, then retry. If services restarted, reload and upload/confirm the document again.');}
    const result=await response.json();
    if(!response.ok)throw new Error(result.message||(typeof result.detail==='string'?result.detail:'Request failed; inspect required field types.'));
    return result;
  }
  async function perform(label, action) {
    if(working)return;working=true;message(label);byId('workflow-card').classList.add('busy');
    const buttons=Array.from(document.querySelectorAll('#upload-workflow button,#upload-agent-panel button'));buttons.forEach(button=>button.disabled=true);
    try{await action();}catch(error){message(error.message,true);if(label.startsWith('Running the uploaded-record agent'))message('Agent run did not complete: '+error.message,true,'upload-agent-status');}finally{working=false;buttons.forEach(button=>button.disabled=false);byId('workflow-card').classList.remove('busy');byId('model-extract').disabled=!capabilities?.model_configured;}
  }
  function setMode(next){mode=next;byId('workflow-body').hidden=mode!=='upload';byId('input-sample').classList.toggle('active',mode==='sample');byId('input-upload').classList.toggle('active',mode==='upload');if(mode==='sample'){byId('invoice').value='invoice-001';update();byId('compare').disabled=false;if(byId('upload-agent-panel'))byId('upload-agent-panel').hidden=true;}else{byId('compare').disabled=!!activeDocument&&!activeReview;if(byId('upload-agent-panel'))byId('upload-agent-panel').hidden=!activeReview;}}
  function sourceView(){
    if(typeof catalog==='undefined'||!catalog)return;
    const source=catalog.sources?.[byId('invoice').value];sourceBox.replaceChildren();
    if(!source){sourceBox.append(el('p','Source metadata unavailable.'));return;}
    const uploaded=source.kind==='user_upload';sourceBox.append(el('span',uploaded?'YOUR UPLOAD · USER-REVIEWED':'SYNTHETIC FIXTURE · NOT REAL VENDOR DATA','source-kind'+(uploaded?' user':'')));
    sourceBox.append(el('h3',uploaded?source.filename:'Source: Agent-X repository fixture'),el('p',source.note),el('p','Extraction: '+source.extraction_method));
    if(source.repository_path)sourceBox.append(el('code',source.repository_path+' · INVOICES['+byId('invoice').value+']'));
    sourceBox.append(el('p','SHA-256 ('+(source.hash_representation||'original uploaded bytes')+')'),el('code',source.sha256));
    if(source.reviewed_at)sourceBox.append(el('p','Reviewed: '+source.reviewed_at+' · Scope uses an immutable record digest.'));
    const links=el('div',undefined,'source-links');
    for(const [label,url]of [[uploaded?'Download original':'Download source JSON',source.source_download],['Repository definition',source.source_url],['Sample PDF',source.sample_pdf]]){
      if(!url)continue;const link=el('a',label+' ↗');link.href=url;if(url.startsWith('https://')){link.target='_blank';link.rel='noopener noreferrer';}links.append(link);
    }sourceBox.append(links);
    if(uploaded){const note=el('p','The replay uses your confirmed fields. The incident proposal remains a fixed simulator action, not an observed instruction followed by a model.');sourceBox.append(note);}
  }
  const baseUpdate=update;
  update=function(){baseUpdate();sourceView();};
  byId('invoice').onchange=update;byId('annotation').onchange=update;
  function evidenceView(evidence){
    const holder=byId('field-evidence');holder.replaceChildren();
    if(!evidence.length){holder.append(el('p','No invoice fields located yet. Use model extraction or enter reviewed fields.','small'));return;}
    for(const item of evidence){const row=el('div',undefined,'evidence-row');row.append(el('code',item.field+' = '+String(item.value)));const refs=el('div');if(item.span_ids.length){for(const span of item.span_ids){const link=el('a',span);link.href='#source-'+span;refs.append(link);}}else refs.append(el('span','Not located · manual review required'));row.append(refs);holder.append(row);}
  }
  function showDocument(data){
    activeDocument=data;byId('workflow-review').hidden=false;byId('workflow-original').hidden=false;byId('confirmation-proof').hidden=true;
    byId('compare').disabled=true;byId('status').textContent='Review and confirm the uploaded fields before running this document.';
    byId('invoice-editor').value=JSON.stringify(Object.keys(data.candidate).length?data.candidate:blankInvoice,null,2);
    byId('original-note').textContent=data.filename+' · '+data.byte_count.toLocaleString()+' bytes · '+data.method+' · SHA-256 '+data.sha256;
    byId('download-original').href=data.original_url;
    const selector=byId('preview-page');selector.replaceChildren();
    for(const page of data.pages){const option=el('option','Page '+page.page);option.value=String(page.page);selector.append(option);}
    const hasPreview=data.media_type==='application/pdf'||data.media_type.startsWith('image/');
    selector.hidden=!hasPreview;byId('original-preview').hidden=!hasPreview;
    function preview(){if(hasPreview)byId('original-preview').src='/api/evaluation/documents/'+data.document_id+'/preview/'+selector.value;}
    selector.onchange=preview;preview();
    const text=byId('source-spans');text.replaceChildren();
    for(const span of data.spans){const line=el('div',undefined,'workflow-span');line.id='source-'+span.span_id;line.append(el('span',span.span_id,'span-label'),document.createTextNode(span.text));text.append(line);}
    if(!data.spans.length)text.append(el('p','No text layer available. Inspect the original and use optional model OCR or enter reviewed fields.'));
    evidenceView(data.field_evidence);message(data.validation.verdict==='PASS'?'Schema and totals look valid. Check the source references, then confirm.':'Fields need review: '+data.validation.rule_id+(data.validation.fields_to_review.length?' · '+data.validation.fields_to_review.join(', '):''),false,'review-status');
    message('Uploaded '+data.filename+'. '+data.warnings.join(' '));
    byId('wf-step-2').classList.add('active');byId('wf-step-3').classList.remove('active');
  }
  async function upload(file){const form=new FormData();form.append('file',file,file.name);showDocument(await call('documents',form));setMode('upload');}
  byId('input-sample').onclick=()=>setMode('sample');byId('input-upload').onclick=()=>setMode('upload');
  byId('upload-document').onclick=()=>perform('Uploading and reading the local source…',async()=>{const file=byId('upload-file').files[0];if(!file)throw new Error('Choose a document first.');await upload(file);});
  byId('upload-paste').onclick=()=>perform('Inspecting pasted source…',async()=>{const text=byId('paste-document').value;if(!text.trim())throw new Error('Paste invoice text or JSON first.');await upload(new File([text],text.trim().startsWith('{')?'pasted-invoice.json':'pasted-invoice.txt',{type:'text/plain'}));});
  const drop=byId('drop-zone');drop.ondragover=event=>{event.preventDefault();drop.classList.add('dragging');};drop.ondragleave=()=>drop.classList.remove('dragging');drop.ondrop=event=>{event.preventDefault();drop.classList.remove('dragging');const file=event.dataTransfer.files[0];if(file)perform('Uploading dropped document…',()=>upload(file));};
  function reviewedPayload(){if(!activeDocument)throw new Error('Upload and inspect a document first.');let invoice;try{invoice=JSON.parse(byId('invoice-editor').value);}catch{throw new Error('Review JSON is invalid. Check quotes and commas.');}return{invoice,revision:activeDocument.revision};}
  byId('validate-fields').onclick=()=>perform('Checking required fields and decimal totals…',async()=>{const data=await call('documents/'+activeDocument.document_id+'/validate',reviewedPayload());evidenceView(data.field_evidence);message(data.verdict+' · '+data.rule_id+(data.fields_to_review.length?' · '+data.fields_to_review.join(', '):'')+'. This check does not authorize execution.',data.verdict!=='PASS','review-status');message('Field and arithmetic check complete.');});
  byId('confirm-fields').onclick=()=>perform('Confirming an immutable task record…',async()=>{
    const confirmed=await call('documents/'+activeDocument.document_id+'/confirm',reviewedPayload());
    activeReview={record_id:confirmed.invoice.invoice_id,document_id:activeDocument.document_id};
    byId('upload-agent-panel').hidden=false;byId('upload-agent-status').textContent='Confirmed source selected. Start with a benign run, then select a negative case.';
    catalog=await call('catalog');byId('invoice').replaceChildren();for(const invoice of catalog.invoices){const option=el('option',invoice.invoice_id.startsWith('upload-')?'Your upload · '+invoice.vendor:invoice.invoice_id+' · '+invoice.vendor);option.value=invoice.invoice_id;byId('invoice').append(option);}byId('invoice').value=confirmed.invoice.invoice_id;update();byId('compare').disabled=false;
    const proof=byId('confirmation-proof');proof.hidden=false;proof.textContent='Confirmed. The task contract now permits read_invoice for this exact uploaded record only. Record digest: '+confirmed.contract.record_digest;
    evidenceView(confirmed.source.field_evidence);byId('wf-step-3').classList.add('active');message('Your confirmed invoice is selected below. Inspect its contract, then click Compare Off vs Enforce.');byId('status').textContent='Your upload is scoped and ready. Compare to inspect real policy decisions and mock effects.';
    byId('contract-record').scrollIntoView({behavior:'smooth',block:'center'});
  });
  byId('model-extract').onclick=()=>perform('Extracting with your configured provider; this may take a moment…',async()=>{if(!activeDocument)throw new Error('Upload a document first.');if(!byId('model-consent').checked)throw new Error('Confirm the model data-sharing checkbox first, or continue with local/manual extraction.');showDocument(await call('documents/'+activeDocument.document_id+'/extract',{consent_to_model:true}));message('Model extraction complete. Review suggestions against the original; no task is authorized yet.');});
  byId('remove-upload').onclick=()=>perform('Removing this upload from local memory…',async()=>{if(!activeDocument)return;await call('documents/'+activeDocument.document_id,null,'DELETE');activeDocument=null;activeReview=null;byId('upload-agent-panel').hidden=true;byId('workflow-review').hidden=true;byId('workflow-original').hidden=true;catalog=await call('catalog');byId('invoice').replaceChildren();for(const invoice of catalog.invoices){const option=el('option',invoice.invoice_id+' · '+invoice.vendor);option.value=invoice.invoice_id;byId('invoice').append(option);}update();message('Upload and its reviewed versions removed. Existing downloaded evidence is not changed.');});
  call('capabilities').then(data=>{capabilities=data;byId('model-destination').textContent=data.model_configured?'Configured provider: '+data.provider_host+' · model '+data.model+'. Text extraction supports up to 20 PDF pages; image/scanned OCR supports up to four.':'No model is configured. Local PDF/text/JSON/CSV/DOCX parsing and manual review remain available.';byId('model-extract').disabled=!data.model_configured;}).catch(error=>message(error.message,true));
  const layers=[
    ['1 · Product application','Source selection / upload / reviewed fields','app.py · documents.py','Handles your trusted selection, owns temporary session data, and records exactly which document you reviewed.'],
    ['2 · Ingestion & provenance','Original preview / extracted lines / field references','ingestion.py','Parses local document data, preserves a byte hash and spans, and labels optional model OCR. Extraction cannot authorize tools.'],
    ['3 · Task registry & compiler','Task Contract panel','core.py · compile_contract','Pins the exact selected invoice and reviewed record digest. A new review creates a new immutable scope.'],
    ['4 · Policy core','ALLOW / BLOCK and rule detail','core.py · check_call → agent_x_product/core/policy.py','Checks tool registration, strict arguments and exact record membership. The source text and the model never grant permission.'],
    ['5 · Guarded execution','Two timelines / actual mock inbox','core.py · run_demo / send_mock_attachment','Off executes predefined mock actions. Enforce executes only checked calls. Blocked calls never reach the mock sender.'],
    ['6 · Output & evidence','Validated invoice / evidence download','core.py · validate_result / compare_runs','Checks schema, dates and Decimal totals, including optional subtotal/tax/discount. The export includes source provenance and observed outcomes.']
  ];
  const architecture=document.createElement('details');architecture.className='architecture-map';architecture.append(el('summary','Architecture map · what each part implements'));architecture.append(el('p','Initial evaluation uses fixed proposal replay, not a live agent. In the extended lab, the agent chooses read tools and drafts an answer; the same policy boundary remains authoritative.','small'));
  const grid=el('div',undefined,'layer-grid');for(const[name,panel,path,description]of layers){const card=el('section',undefined,'layer-card');card.append(el('span',name,'eyebrow-sm'),el('strong',panel),el('p',description),el('code','src/agent_x_evaluation/'+path),el('p','Implemented for this local demo','layer-status'));grid.append(card);}architecture.append(grid);
  const agentNote=el('p','Agent work (extended lab): agents.py asks the configured model to select read_file calls and produce an invoice/quote answer. integrations/mcp.py mediates JSON-RPC tool calls; GuardedMockDispatcher obtains product authorization before local execution. A mandatory final-answer hook calls the product output gate. The test transfer probe is injected separately and labelled; it is not a model-generated attack. Production connectors, a scoped credential broker, remote MCP transport and externally anchored audit storage remain later work.','small');architecture.append(agentNote);
  document.querySelector('footer.footer').before(architecture);
  const agentPanel=el('section',undefined,'card upload-agent-panel');agentPanel.id='upload-agent-panel';agentPanel.hidden=true;
  agentPanel.innerHTML=`<span class="eyebrow-sm">Agent runtime · your confirmed upload</span><h2>Test the agent, including failures.</h2><p class="small">The agent may read only your confirmed invoice and draft an answer. The guard decides whether tool calls execute; the output gate checks the returned values against the reviewed record. Negative probes are injected by the test runner, not attributed to model behavior.</p><div class="upload-agent-controls"><label>Runtime<select id="upload-agent-provider"><option value="local">Local task agent · no provider call</option><option value="live">Live configured model</option></select></label><label>Case<select id="upload-agent-case"></select></label><button class="primary" id="upload-agent-run" type="button">Run guarded agent ↗</button></div><label class="check"><input id="upload-agent-consent" type="checkbox">For a live run, I agree to send the reviewed invoice and supporting extracted text to the configured model provider.</label><p class="small" id="negative-expectation"></p><p class="workflow-message" id="upload-agent-status" role="status"></p><div id="upload-agent-result"></div><button class="secondary" id="upload-agent-export" type="button" hidden>Download this agent evidence ↗</button>`;
  architecture.before(agentPanel);
  let cases=[],agentEvidence=null;
  call('negative-cases').then(data=>{cases=data.cases;for(const item of cases){const option=el('option',item.label+' · '+item.layer);option.value=item.id;byId('upload-agent-case').append(option);}expectedCase();}).catch(error=>message(error.message,true));
  function expectedCase(){const item=cases.find(item=>item.id===byId('upload-agent-case').value);byId('negative-expectation').textContent=item?'Expected: '+item.expected:'';}
  byId('upload-agent-case').onchange=expectedCase;
  byId('invoice-editor').addEventListener('input',()=>{activeReview=null;agentPanel.hidden=true;byId('compare').disabled=true;byId('confirmation-proof').hidden=true;message('Draft edited. Validate and confirm it again before running an agent; earlier confirmed records remain unchanged.');});
  const originalShowDocument=showDocument;
  showDocument=function(data){activeReview=null;agentPanel.hidden=true;originalShowDocument(data);};
  byId('upload-agent-run').onclick=()=>perform('Running the uploaded-record agent with policy enforcement…',async()=>{
    byId('upload-agent-status').textContent='Running guarded agent…';
    if(!activeReview)throw new Error('Confirm the reviewed invoice first.');
    const provider=byId('upload-agent-provider').value;
    if(provider==='live'&&!byId('upload-agent-consent').checked)throw new Error('Confirm model data sharing for the live run, or choose the local task agent.');
    const result=await call('documents/'+activeReview.document_id+'/agent',{record_id:activeReview.record_id,provider,negative_case:byId('upload-agent-case').value,consent_to_model:byId('upload-agent-consent').checked});
    agentEvidence=result;
    byId('upload-agent-status').textContent='Case '+result.test_assessment.verdict+' · Agent '+result.status+' · '+result.state.reads.length+' read(s), '+result.state.inbox.length+' deliveries · '+result.duration_ms+' ms';
    const holder=byId('upload-agent-result');holder.replaceChildren();
    holder.append(el('p',result.provider==='live'?(result.model_invoked?'Live model invoked: '+result.model:'Model not invoked: the run was stopped before dispatch'):'Local task agent; no model provider called','small'));
    if(result.error)holder.append(el('p','Outcome: '+result.error,'small'));
    const steps=el('div',undefined,'upload-agent-trace');for(const entry of result.trace){const row=el('div',undefined,'agent-trace-row');if(entry.tool_id){row.append(el('code',entry.tool_id),el('span',entry.decision.verdict+' · '+entry.decision.rule_id),el('small',entry.dispatched?'Observed: invoice read':'Observed: no effect'));}else if(entry.kind==='model.turn'){row.append(el('span','Model turn '+entry.turn+' · '+entry.tool_calls+' proposed call(s)'));}else{row.append(el('span',entry.label||entry.kind),el('small',entry.rule_id||''));}steps.append(row);}holder.append(steps);
    const output=el('details');output.open=true;output.append(el('summary',result.output?.verdict==='PASS'?'Validated delivered answer':'Output gate / withheld answer'));if(result.output)output.append(el('pre',JSON.stringify(result.output,null,2)));else output.append(el('p','No answer was released. Execution stopped before the final-output step.','small'));holder.append(output);
    byId('upload-agent-export').hidden=false;message('Agent test complete. Its assessment is computed from the actual trace, output gate and mock state.');
  });
  byId('upload-agent-export').onclick=()=>{if(!agentEvidence)return;const url=URL.createObjectURL(new Blob([JSON.stringify(agentEvidence,null,2)],{type:'application/json'}));const link=el('a');link.href=url;link.download='agent-x-upload-agent-'+agentEvidence.agent_id+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  if(typeof catalog!=='undefined'&&catalog)sourceView();
  else{const timer=setInterval(()=>{if(typeof catalog!=='undefined'&&catalog){clearInterval(timer);sourceView();}},100);setTimeout(()=>clearInterval(timer),10000);}
})();
