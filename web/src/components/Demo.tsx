"use client";
import { useState } from "react";
const calls = [
  { name: "read_invoice", detail: "records/invoice-2048.pdf", verdict: "ALLOW", note: "Within task contract · read-only" },
  { name: "transfer_funds", detail: "recipient: external-wallet", verdict: "BLOCK", note: "Unapproved tool · untrusted destination" },
  { name: "move_draft", detail: "queue: Finance / External", verdict: "ASK HUMAN", note: "Side effect requires approved reviewer" },
];
export default function Demo() { const [active,setActive]=useState(0); const call=calls[active]; return <div className="demo"><div className="demo-tabs">{calls.map((item,i)=><button key={item.verdict} onClick={()=>setActive(i)} className={i===active?"chosen":""}>{item.verdict}</button>)}</div><div className="terminal"><span className="dim">agent.propose_tool(</span><br/><b>{call.name}</b><span className="dim">, {`{ ${call.detail} }`}</span><br/><span className="dim">)</span><div className={`verdict ${call.verdict.toLowerCase().replace(" ","-")}`}>{call.verdict}</div><p>{call.note}</p><div className="trace"><i/> contract scope verified <i/> policy evaluated <i className={call.verdict === "ALLOW" ? "on" : ""}/> {call.verdict === "ALLOW" ? "guarded dispatch" : "execution withheld"}</div></div></div>; }
