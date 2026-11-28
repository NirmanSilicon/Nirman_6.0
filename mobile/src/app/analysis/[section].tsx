import React, { useEffect, useState } from "react";
import { Pressable, Share, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Body, Button, Card, Label, Screen, Section, u } from "../../components/ui";
import { C, FONT, money } from "../../theme";
import { useSession } from "../../session";
import { observedProfile, request, type PassportLink } from "../../api";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export default function AnalysisSection() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { analysis } = useSession();
  const profile = observedProfile(analysis);
  const behaviour = analysis?.financial_behaviour;
  if (!analysis) return <Screen backTo="/insights" title="Analysis"><Card><Body>Add a statement to generate your analysis.</Body><Button title="Add a statement" onPress={() => router.push("/upload")} /></Card></Screen>;
  const title = section === "score" ? "Score explanation" : section === "cashflow" ? "Where your money goes" : section === "behaviour" ? "Financial Behaviour Index" : section === "coach" ? "Credit improvement coach" : section === "passport" ? "Financial passport" : "Score factors";
  return <Screen backTo="/insights" title={title} subtitle="A focused view of one part of your financial profile.">
    {section === "score" && <>
      <Card style={{ backgroundColor: "#102E62" }}><Label>SYNTHETIC MODEL INDEX · 0–100</Label><Text style={{ fontFamily: FONT.heavy, fontSize: 48, color: "#FFF" }}>{analysis.synthetic_risk_index?.toFixed(2) ?? "—"}</Text><Body muted={false}>{analysis.score_explanation?.evidence_note ?? "The model uses cashflow features from your statement."}</Body></Card>
      {[["Raised simulated risk", analysis.score_explanation?.risk_increasing_features, C.red], ["Lowered simulated risk", analysis.score_explanation?.risk_decreasing_features, C.green]].map(([heading, items, color]) => <Card key={String(heading)}><Text style={[u.section,{color:String(color)}]}>{String(heading)}</Text>{(items as any[] ?? []).map((item:any)=><View key={item.feature} style={{paddingVertical:9,borderBottomWidth:1,borderColor:C.line}}><Body muted={false}>{item.feature.replaceAll("_"," ")}</Body><Label>Observed {Number(item.value).toFixed(2)} · contribution {item.shap_contribution > 0 ? "+" : ""}{item.shap_contribution.toFixed(3)}</Label></View>)}</Card>)}
    </>}
    {section === "cashflow" && <>
      <Card><Label>OBSERVED CASHFLOW</Label><Text style={u.number}>{money(profile?.net_cashflow ?? 0)}</Text><Body>Income {money(profile?.total_credits ?? 0)} · Spending {money(profile?.total_debits ?? 0)}</Body></Card>
      <Section title="Spending categories" />
      {Object.entries((analysis.score_explanation?.supporting_transactions ?? []).filter((x) => x.direction.toLowerCase().includes("debit")).reduce<Record<string, number>>((all, row) => { all[row.category] = (all[row.category] ?? 0) + row.amount; return all; }, {})).sort((a,b)=>b[1]-a[1]).map(([category, amount])=><Card key={category} style={{padding:15}}><View style={u.between}><Body muted={false}>{category.replaceAll("_"," ")}</Body><Text style={u.section}>{money(amount)}</Text></View><View style={{height:7,backgroundColor:C.line,borderRadius:4,marginTop:8}}><View style={{height:7,width:`${Math.min(100, amount/Math.max(1,profile?.total_debits ?? amount)*100)}%`,backgroundColor:C.purple,borderRadius:4}}/></View></Card>)}
      <Body>Categories are based on statement narration and may include rent, groceries, bills, transfers or other spending. Review uncertain labels before relying on them.</Body>
    </>}
    {section === "behaviour" && <><Card style={{backgroundColor:"#EAF6FF"}}><Label>DESCRIPTIVE INDEX · 0–100</Label><Text style={u.number}>{behaviour?.index?.toFixed(1) ?? "—"}</Text><Body>{behaviour?.meaning ?? behaviour?.reason ?? "Behaviour analysis is unavailable."}</Body></Card>{behaviour?.factors.map((item)=><Card key={item.key} style={{padding:16}}><View style={u.between}><Text style={u.section}>{item.label}</Text><Text style={u.section}>{item.factor_score.toFixed(1)}</Text></View><Body>{item.measure}</Body><Label>Observed {(item.observed_ratio*100).toFixed(1)}% · weight {Math.round(item.weight*100)}%</Label></Card>)}</>}
    {section === "coach" && <><Card><Label>HOW THE COACH WORKS</Label><Body>Recommendations use the lowest factor scores from income consistency, spending pressure, savings, recurring obligations and cashflow stability. They are suggestions, not a lending decision.</Body></Card>{(behaviour?.coach ?? []).map((tip)=><Card key={tip.factor}><Text style={u.section}>{tip.factor.replaceAll("_"," ")}</Text><Body>{tip.message}</Body></Card>)}</>}
    {section === "passport" && <FinancialPassport />}
    {section === "factors" && <>{Object.entries(analysis.evidence ?? {}).map(([key,value])=><Card key={key} style={{padding:16}}><View style={u.between}><Text style={u.section}>{key.replaceAll("_"," ")}</Text><Text style={u.section}>{Number(value).toFixed(2)}</Text></View><Label>Whole-statement model input · magnitude only</Label></Card>)}</>}
  </Screen>;
}

function FinancialPassport() {
  const { analysis, records, session, perform, setError } = useSession();
  const saved = records.find((record) => record.analysis.assessment_id === analysis?.assessment_id);
  const [links, setLinks] = useState<PassportLink[]>([]);
  const [recipient, setRecipient] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLinks([]);
    if (!session || !saved) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    request<{ links: PassportLink[] }>(session, `/v1/statements/${saved.id}/passport-links`)
      .then((result) => { if (active) setLinks(result.links); })
      .catch((error) => { if (active) setError(error instanceof Error ? error.message : "Could not load passport links."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session, saved, setError]);

  async function create() {
    if (!session || !saved || !consent || recipient.trim().length < 2) return;
    const issued = await perform("Generating financial passport", () =>
      request<PassportLink>(session, `/v1/statements/${saved.id}/passport-links`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, recipient: recipient.trim() }),
      }));
    if (issued) {
      setLinks((current) => [issued, ...current]);
      setRecipient("");
      setConsent(false);
    }
  }

  async function download(link: PassportLink) {
    if (!session || !link.path) return;
    await perform("Downloading financial passport", async () => {
      const file = new File(Paths.document, `uqual-financial-passport-${link.id}.pdf`);
      const result = await File.downloadFileAsync(session.url + link.path, file, { idempotent: true, headers: { Authorization: `Bearer ${session.token}` } });
      if (!(await Sharing.isAvailableAsync())) throw new Error("The PDF was saved, but sharing is unavailable on this device.");
      await Sharing.shareAsync(result.uri, { mimeType: "application/pdf", dialogTitle: "Save or share financial passport" });
    });
  }

  async function revoke(link: PassportLink) {
    if (!session || !saved) return;
    const result = await perform("Revoking passport link", () =>
      request(session, `/v1/statements/${saved.id}/passport-links/${link.id}`, { method: "DELETE" }));
    if (result) setLinks((current) => current.map((item) => item.id === link.id ? { ...item, revoked: true, path: undefined } : item));
  }

  return <>
    <Card>
      <Label>YOUR FINANCIAL PASSPORT</Label>
      <Body>Generate a PDF with your assessment period, Behaviour Index, factors and data coverage. Choose who it is for; the sharing link expires after 24 hours.</Body>
      {!saved ? <Body>Save a statement to your private vault to generate a passport.</Body> : <>
        <TextInput accessibilityLabel="Passport recipient" placeholder="Recipient name" value={recipient} onChangeText={setRecipient} style={{ borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 14, color: C.ink }} />
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consent }} onPress={() => setConsent(!consent)} style={u.row}>
          <Text style={{ color: C.green, fontSize: 22 }}>{consent ? "☑" : "☐"}</Text>
          <Body>I consent to generate this report and control where its link is shared.</Body>
        </Pressable>
        <Button title="Generate passport PDF" disabled={!consent || recipient.trim().length < 2} onPress={create} />
      </>}
    </Card>
    <Section title="Your reports" />
    {loading && <Body>Loading reports…</Body>}
    {!loading && links.length === 0 && <Card><Body>No passport has been generated for this statement yet.</Body></Card>}
    {links.map((link) => {
      const active = !link.revoked && link.expires_at * 1000 > Date.now() && !!link.path;
      return <Card key={link.id}>
        <Text style={u.section}>{link.recipient}</Text>
        <Body>{link.revoked ? "Revoked" : active ? "Active" : "Expired"} · Expires {new Date(link.expires_at * 1000).toLocaleString()}</Body>
        {active && <>
          <Button title="Download PDF" onPress={() => download(link)} />
          <Button title="Share link" secondary onPress={() => Share.share({ title: "UQUAL financial passport", message: `${session!.url}${link.path}\nThis link expires in 24 hours and can be revoked.` })} />
          <Button title="Revoke link" secondary onPress={() => revoke(link)} />
        </>}
      </Card>;
    })}
    <Body>Anyone with an active link can open the PDF. Downloaded copies cannot be recalled.</Body>
  </>;
}
