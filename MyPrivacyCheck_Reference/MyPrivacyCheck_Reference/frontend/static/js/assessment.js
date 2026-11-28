(() => {
 const app=document.getElementById("assessment-app"); if(!app)return;
 const groups=document.getElementById("question-groups"),msg=document.getElementById("assessment-message"),btn=document.getElementById("submit-assessment");
 let questions=[];
 const csrf=()=>{const m=document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);return m?decodeURIComponent(m[1]):"";};
 async function load(){
  try{
   const r=await fetch(app.dataset.questionsUrl,{credentials:"same-origin"}),d=await r.json();
   if(!r.ok)throw new Error(d.error||"Could not load questions.");
   questions=d.questions; const by={}; questions.forEach(q=>(by[q.category]??=[]).push(q)); groups.innerHTML="";
   Object.entries(by).forEach(([cat,items])=>{
    const section=document.createElement("section");section.className="panel";
    const h=document.createElement("h2");h.textContent=cat.replaceAll("_"," ");section.appendChild(h);
    items.forEach(q=>{
     const card=document.createElement("div");card.className="question";
     const p=document.createElement("p");p.textContent=q.text;card.appendChild(p);
     const opts=document.createElement("div");opts.className="options";
     [["yes","Yes"],["sometimes","Sometimes"],["no","No"],["not_sure","Not sure"]].forEach(([v,label])=>{
      const l=document.createElement("label"),i=document.createElement("input");i.type="radio";i.name="q"+q.id;i.value=v;l.append(i,document.createTextNode(" "+label));opts.appendChild(l);
     });card.appendChild(opts);section.appendChild(card);
    });groups.appendChild(section);
   });
  }catch(e){msg.textContent=e.message;}
 }
 btn.addEventListener("click",async()=>{
  const answers=[];
  for(const q of questions){const s=document.querySelector(`input[name="q${q.id}"]:checked`);if(!s){msg.textContent="Please answer every question.";return;}answers.push({question_id:q.id,response:s.value});}
  btn.disabled=true;msg.textContent="Submitting…";
  try{
   const r=await fetch(app.dataset.submitUrl,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-CSRFToken":csrf()},body:JSON.stringify({answers})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Submission failed.");
   location.href=`/reports/${d.assessment_id}/`;
  }catch(e){msg.textContent=e.message;btn.disabled=false;}
 });
 load();
})();
