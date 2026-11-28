import React, { useEffect, useState } from "react";
import { Modal, Pressable, Share, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import {
  Badge,
  Body,
  Button,
  Card,
  Icon,
  Label,
  Screen,
  Section,
  u,
} from "../../components/ui";
import { C, FACTORS, FONT, money, percent } from "../../theme";
import { useSession } from "../../session";
import { observedProfile, request, type Behaviour, type BehaviourWhatIf, type PassportLink } from "../../api";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
export default function Insights() {
  const { analysis, records, session, perform } = useSession();
  const [month, setMonth] = useState("all"),
    [factor, setFactor] = useState<(typeof FACTORS)[number] | null>(null),
    [passportOpen, setPassportOpen] = useState(false),
    [recipient, setRecipient] = useState(""),
    [consent, setConsent] = useState(false),
    [legacyBehaviour, setLegacyBehaviour] = useState<Behaviour | null>(null),
    [links, setLinks] = useState<PassportLink[]>([]),
    [cut, setCut] = useState("10"),
    [whatIf, setWhatIf] = useState<BehaviourWhatIf | null>(null);
  const profile = observedProfile(analysis);
  const saved = records.find((r) => r.analysis.assessment_id === analysis?.assessment_id);
  const savedId = saved?.id;
  const behaviour = analysis?.financial_behaviour ?? legacyBehaviour;
  useEffect(() => {
    setLegacyBehaviour(null);
    if (!session || !savedId || analysis?.financial_behaviour) return;
    let active = true;
    request<Behaviour>(session, `/v1/statements/${savedId}/behaviour`)
      .then((value) => { if (active) setLegacyBehaviour(value); })
      .catch(() => {});
    return () => { active = false; };
  }, [session, savedId, analysis?.assessment_id, analysis?.financial_behaviour]);
  useEffect(() => {
    setLinks([]); setWhatIf(null);
    if (!session || !savedId) return;
    let active = true;
    request<{ links: PassportLink[] }>(session, `/v1/statements/${savedId}/passport-links`)
      .then((value) => { if (active) setLinks(value.links); }).catch(() => {});
    return () => { active = false; };
  }, [session, savedId]);
  async function sharePassport() {
    if (!session || !saved || !consent || recipient.trim().length < 2) return;
    await perform("Creating passport", async () => {
      const issued = await request<PassportLink>(session, `/v1/statements/${saved.id}/passport-links`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, recipient: recipient.trim() }),
      });
      setLinks((current) => [issued, ...current]);
      await Share.share({ title: "UQUAL financial passport PDF", message: `${session.url}${issued.path}\nFinancial statement demo report. This link expires in 24 hours; the account owner can revoke it earlier. Anyone with the link can open it.` });
      setPassportOpen(false); setConsent(false); setRecipient("");
    });
  }
  async function runWhatIf() {
    const pct = Number(cut);
    if (!session || !savedId || !Number.isFinite(pct) || pct < 0 || pct > 30) return;
    await perform("Calculating scenario", async () => {
      setWhatIf(await request<BehaviourWhatIf>(session, `/v1/statements/${savedId}/behaviour/scenario`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discretionary_cut_pct: pct }),
      }));
    });
  }
  async function revokeLink(id: string) {
    if (!session || !savedId) return;
    await perform("Revoking passport link", async () => {
      await request(session, `/v1/statements/${savedId}/passport-links/${id}`, { method: "DELETE" });
      setLinks((current) => current.map((link) => link.id === id ? { ...link, revoked: true } : link));
    });
  }
  async function downloadPassport(link: PassportLink) {
    if (!session?.url || !link.path) return;
    await perform("Downloading financial passport", async () => {
      const target = new File(Paths.document, `uqual-financial-passport-${link.id}.pdf`);
      const result = await File.downloadFileAsync(session.url + link.path, target, { headers: { Authorization: `Bearer ${session.token}` } });
      if (!(await Sharing.isAvailableAsync())) throw new Error("The PDF was downloaded, but this device cannot open the share sheet.");
      await Sharing.shareAsync(result.uri, { mimeType: "application/pdf", dialogTitle: "Save or share your UQUAL Financial Passport" });
    });
  }
  useEffect(() => setMonth("all"), [analysis?.assessment_id]);
  const chosen =
    profile &&
    (month === "all"
      ? {
          credits: profile.total_credits,
          debits: profile.total_debits,
          net_cashflow: profile.net_cashflow,
        }
      : profile.monthly[month]);
  if (Boolean(profile)) return <AnalysisOverview analysis={analysis!} behaviour={behaviour} />;
  return (
    <Screen
      back={false}
      title="Analysis"
      subtitle="A clearer view of your financial story."
    >
      {!profile ? (
        <Card>
          <Body>
            {analysis
              ? analysis.reasons.filter((r) => typeof r === "string").join(". ") || "No transactions are available in the assessment window. Choose another statement."
              : "Add a statement to see your observed cashflow and the ten model inputs."}
          </Body>
          <Button
            title="Add a statement"
            onPress={() => router.push("/upload")}
          />
        </Card>
      ) : (
        <>
          <Card style={{ backgroundColor: "#102E62", borderColor: "#1B5B84", padding: 20, gap: 16 }}>
            <View style={u.between}><View><Label>UQUAL FINANCIAL PROFILE</Label><Text style={{ fontFamily: FONT.heavy, fontSize: 23, color: "#FFFFFF", marginTop: 6 }}>Your money, explained.</Text></View><Icon name="analytics-outline" color="#8AF05B" size={28} /></View>
            <View style={u.row}>
              <View style={{ flex: 1 }}><Label>BEHAVIOUR INDEX</Label><Text style={{ fontFamily: FONT.heavy, fontSize: 34, color: "#FFFFFF" }}>{behaviour?.index == null ? "—" : behaviour.index.toFixed(1)}</Text><Text style={{ fontFamily: FONT.medium, fontSize: 11, color: "#BBD7E7" }}>descriptive · 0–100</Text></View>
              <View style={{ flex: 1 }}><Label>MODEL INDEX</Label><Text style={{ fontFamily: FONT.heavy, fontSize: 34, color: "#FFFFFF" }}>{analysis?.synthetic_risk_index == null ? "—" : analysis.synthetic_risk_index.toFixed(1)}</Text><Text style={{ fontFamily: FONT.medium, fontSize: 11, color: "#BBD7E7" }}>synthetic demo</Text></View>
            </View>
            <View style={{ height: 1, backgroundColor: "#FFFFFF22" }} /><Text style={{ fontFamily: FONT.regular, fontSize: 12, lineHeight: 18, color: "#D5E7F2" }}>This report describes the statement you uploaded. It is not a bureau score or a lending decision.</Text>
          </Card>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {[['score','Score explanation','Why this score?','analytics-outline','#7B4DE8','#F0E9FF'],['cashflow','Cashflow','Where money goes','stats-chart-outline','#1597E5','#E7F5FF'],['behaviour','Behaviour Index','What is calculated','pulse-outline','#12A878','#E5FAF1'],['coach','Coach','How to improve','sparkles-outline','#F28A16','#FFF2E1'],['passport','Passport','Share your profile','share-outline','#D44873','#FFEAF1']].map(([route,label,sub,icon,color,bg]) => <Pressable key={route} onPress={() => router.push(`/analysis/${route}`)} style={{ width: '48%', minHeight: 108, backgroundColor: bg, borderRadius: 20, padding: 15, gap: 8 }}><View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFFFFFAA', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon as any} size={20} color={color} /></View><Text style={{ fontFamily: FONT.bold, fontSize: 14, color: C.ink }}>{label}</Text><Text style={{ fontFamily: FONT.regular, fontSize: 10, color: C.muted }}>{sub}</Text></Pressable>)}
          </View>
          <Section title="Start here · score explanation" />
          <Badge>
            {analysis?.statement_source === "generated_sample"
              ? "GENERATED EXAMPLE"
              : "STATEMENT INSIGHTS"}
          </Badge>
          <Card style={{ backgroundColor: "#EAF6FF" }}>
            <View style={u.between}><View style={{ flex: 1 }}><Label>MODEL EXPLANATION</Label><Text style={[u.section, { fontSize: 17 }]}>Why this demo score?</Text></View><Icon name="information-circle-outline" color={C.green} /></View>
            <Body>The synthetic model uses cashflow features. Its raw feature contributions are shown below; they are not point weights on the 0–100 score.</Body>
            {analysis?.previous_synthetic_risk_index != null && analysis.synthetic_risk_index != null && <Body>Before your category correction: {analysis.previous_synthetic_risk_index.toFixed(2)}. Now: {analysis.synthetic_risk_index.toFixed(2)}. This is a recalculation, not proof that a future habit changes credit risk.</Body>}
            {analysis?.score_change_context && <Label>LAST CORRECTION: {analysis.score_change_context.old_category.replaceAll("_", " ")} → {analysis.score_change_context.new_category.replaceAll("_", " ")}. This changed the data fed to the model.</Label>}
            <View style={u.row}><Button title="Review transactions" secondary disabled={!saved} onPress={() => router.push("/statement-review")} /></View>
            {analysis?.classification && <Label>{analysis.classification.needs_review} transactions need review · {analysis.classification.possible_duplicates} possible duplicates · {analysis.classification.possible_refunds} possible refunds</Label>}
          </Card>
          {analysis?.score_explanation && <>
            <Section title="What influenced the model" />
            {[["Raised simulated risk", analysis.score_explanation.risk_increasing_features, C.red], ["Lowered simulated risk", analysis.score_explanation.risk_decreasing_features, "#087B60"]] .map(([heading, items, color]) => <Card key={heading as string} style={{ padding: 16 }}>
              <Text style={[u.section, { fontSize: 15, color: color as string }]}>{heading as string}</Text>
              {(items as NonNullable<typeof analysis.score_explanation>["risk_increasing_features"]).length ? (items as NonNullable<typeof analysis.score_explanation>["risk_increasing_features"]).map((item) => <View key={item.feature} style={{ paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.line }}>
                <Body muted={false}>{FACTORS.find((f) => f.key === item.feature)?.title ?? item.feature.replaceAll("_", " ")}</Body>
                <Label>Observed {item.value == null ? "—" : Number(item.value).toFixed(2)} · raw contribution {item.shap_contribution > 0 ? "+" : ""}{item.shap_contribution.toFixed(3)}</Label>
              </View>) : <Body>No feature was returned in this direction.</Body>}
            </Card>)}
            <Card><Label>SUPPORTING STATEMENT ROWS</Label><Body>{analysis.score_explanation.evidence_note}</Body>{analysis.score_explanation.supporting_transactions.slice(0, 6).map((item) => <View key={item.transaction_id} style={u.between}><Label>{item.date} · {item.category}</Label><Body>{money(item.amount)}</Body></View>)}</Card>
          </>}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {["all", ...Object.keys(profile.monthly)].map((m) => (
              <Pressable
                key={m}
                accessibilityRole="button"
                accessibilityState={{ selected: m === month }}
                onPress={() => setMonth(m)}
                style={{
                  padding: 11,
                  borderRadius: 12,
                  backgroundColor: m === month ? C.lavender : C.mint,
                }}
              >
                <Text
                  style={{
                    fontFamily: FONT.medium,
                    fontSize: 11,
                    color: m === month ? C.bg : C.muted,
                  }}
                >
                  {m === "all" ? "All months" : m}
                </Text>
              </Pressable>
            ))}
          </View>
          <Card>
            <Label>OBSERVED NET CASHFLOW</Label>
            <Text style={u.number}>{money(chosen?.net_cashflow ?? 0)}</Text>
            <View style={u.between}>
              <Body>Credits {money(chosen?.credits ?? 0)}</Body>
              <Body>Debits {money(chosen?.debits ?? 0)}</Body>
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                alignItems: "flex-end",
                height: 110,
                marginTop: 12,
              }}
            >
              {Object.entries(profile.monthly).map(([m, v]) => {
                const max = Math.max(
                  1,
                  ...Object.values(profile.monthly).flatMap((x) => [
                    x.credits,
                    x.debits,
                  ]),
                );
                return (
                  <View
                    key={m}
                    accessible
                    accessibilityLabel={`${m}: credits ${money(v.credits)}, debits ${money(v.debits)}`}
                    style={{ flex: 1, alignItems: "center", gap: 6 }}
                  >
                    <View
                      style={{
                        height: 85,
                        flexDirection: "row",
                        alignItems: "flex-end",
                        gap: 3,
                      }}
                    >
                      <View
                        style={{
                          height: (v.credits / max) * 85 + 1,
                          width: 8,
                          borderRadius: 4,
                          backgroundColor: C.purple,
                        }}
                      />
                      <View
                        style={{
                          height: (v.debits / max) * 85 + 1,
                          width: 8,
                          borderRadius: 4,
                          backgroundColor: "#C3D5E9",
                        }}
                      />
                    </View>
                    <Label>{m.slice(5)}</Label>
                  </View>
                );
              })}
            </View>
            <Label>Blue: credits · Light blue: debits</Label>
          </Card>
          <View style={u.row}>
            <Card style={{ flex: 1, padding: 16 }}>
              <Label>Closing balance</Label>
              <Text style={[u.section, { fontSize: 20 }]}>
                {money(profile.closing_balance)}
              </Text>
            </Card>
            <Card style={{ flex: 1, padding: 16 }}>
              <Label>Daily average</Label>
              <Text style={[u.section, { fontSize: 20 }]}>
                {money(profile.observed_daily_mean_balance)}
              </Text>
            </Card>
          </View>
          {profile.unidentified_credits > 0 && (
            <Body>
              {money(profile.unidentified_credits)} in credits has an
              unidentified source. Credits can include transfers or borrowing;
              they are not automatically income.
            </Body>
          )}
          <Section title="Financial Behaviour Index · cashflow habits" />
          <Card>
            <View style={u.between}>
              <View style={{ flex: 1 }}>
                <Label>STATEMENT BEHAVIOUR · 0–100</Label>
                <Text style={[u.number, { fontSize: 40 }]}>{behaviour?.index == null ? "—" : behaviour.index.toFixed(1)}</Text>
              </View>
              <Icon name="analytics-outline" color={C.green} size={32} />
            </View>
            <Body>{behaviour?.meaning ?? behaviour?.reason ?? "Behaviour analysis is unavailable for this record. Refresh or re-upload to calculate it."}</Body>
            <Body>{behaviour?.complete_months ?? 0} complete months assessed. This is a descriptive index, not a bureau score or approval prediction.</Body>
          </Card>
          {behaviour?.factors?.length ? <>
            <Section title="Why this result" />
            <Body>Each contribution is its factor score × published weight. The five contributions sum to the index.</Body>
            {behaviour.factors.map((item) => <Card key={item.key} style={{ padding: 16 }}>
              <View style={u.between}><Text style={[u.section, { fontSize: 16, flex: 1 }]}>{item.label}</Text><Text style={[u.section, { fontSize: 16 }]}>{item.contribution.toFixed(1)} / {Math.round(item.weight * 100)}</Text></View>
              <Body>{item.measure}</Body>
              <Label>OBSERVED {(item.observed_ratio * 100).toFixed(1)}% · FACTOR {item.factor_score.toFixed(1)}/100 · {Math.round(item.weight * 100)}% WEIGHT</Label>
            </Card>)}
            <Section title="Monthly stability" />
            <Card>
              <View style={u.between}><Label>CATEGORIZED INCOME</Label><Label>SPENDING / SURPLUS</Label></View>
              {behaviour.monthly?.map((item) => <View key={item.month} style={{ gap: 5, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line }}>
                <View style={u.between}><Body muted={false}>{item.month}</Body><Body>{money(item.confirmed_income)} in · {money(item.spending)} out</Body></View>
                <View style={{ height: 7, backgroundColor: "#E6EEF7", borderRadius: 5 }}><View style={{ height: 7, width: `${Math.min(100, item.spending / Math.max(1, item.confirmed_income) * 100)}%`, borderRadius: 5, backgroundColor: item.surplus < 0 ? C.red : C.green }} /></View>
                <Label>{item.surplus < 0 ? "DEFICIT" : "SURPLUS"} {money(Math.abs(item.surplus))} · recurring obligations {money(item.obligations)}</Label>
              </View>)}
            </Card>
            <Section title="Credit improvement coach" />
            <Body>Up to three lowest factor scores. Suggestions do not guarantee a higher bureau score or a loan.</Body>
            {behaviour.coach.length ? behaviour.coach.map((tip) => <Card key={tip.factor} style={{ padding: 16 }}><Body muted={false}>{tip.message}</Body></Card>) : <Card><Body>No factor fell below the coaching threshold in this statement. Keep reviewing your budget and upload a newer statement when available.</Body></Card>}
            <Card style={{ backgroundColor: "#F2FAFF" }}>
              <Text style={[u.section, { fontSize: 16 }]}>Try a spending scenario</Text>
              <Body>What if classified optional spending were lower? This recalculates the descriptive index only; it does not predict future behaviour or change the synthetic model.</Body>
              <View style={u.row}><TextInput accessibilityLabel="Optional spending reduction percent" keyboardType="decimal-pad" value={cut} onChangeText={setCut} maxLength={4} style={{ borderColor: C.line, borderWidth: 1, borderRadius: 11, padding: 11, minWidth: 75, color: C.ink, backgroundColor: C.white }} /><Body>% reduction (0–30)</Body></View>
              <Button title="Calculate what-if" secondary disabled={!saved || !Number.isFinite(Number(cut)) || Number(cut) < 0 || Number(cut) > 30} onPress={runWhatIf} />
              {whatIf && <><Text style={[u.section, { fontSize: 20 }]}>{whatIf.projected?.index == null ? "Unavailable" : `${whatIf.baseline.index?.toFixed(1)} → ${whatIf.projected.index.toFixed(1)}`}</Text><Body>{whatIf.scope ?? whatIf.reason}</Body></>}
            </Card>
          </> : null}
          {records.length > 1 && <>
            <Section title="Progress over statements" />
            <Card>
              <Body>Each point is a separate uploaded statement. Comparing them does not isolate the cause of a change.</Body>
              {records.slice(0, 6).reverse().map((record) => {
                const value = record.analysis.financial_behaviour?.index;
                return <View key={record.id} style={{ gap: 5, paddingVertical: 5 }}>
                  <View style={u.between}><Label>{record.analysis.statement_period?.end ?? record.filename}</Label><Body>{value == null ? "—" : `${value.toFixed(1)}/100`}</Body></View>
                  <View style={{ height: 6, borderRadius: 4, backgroundColor: C.line }}><View style={{ height: 6, width: `${Math.min(100, Math.max(0, value ?? 0))}%`, borderRadius: 4, backgroundColor: C.green }} /></View>
                </View>;
              })}
              <Label>Descriptive Behaviour Index history · separate from the synthetic model score</Label>
            </Card>
          </>}
          <Section title="Financial passport" />
          <Card>
            <Body>Downloadable PDF with a 24-hour link. You choose the recipient and can revoke the link. Anyone holding an active link can open it; downloaded copies cannot be recalled.</Body>
            <Button title="Create passport PDF link" icon="share-outline" disabled={!saved} onPress={() => setPassportOpen(true)} />
            {!saved && <Body>Save your statement to your private vault before exporting. Generated examples cannot be shared.</Body>}
            {links.map((link) => <View key={link.id} style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line, gap: 7 }}>
              <Body muted={false}>{link.recipient} · {link.revoked ? "Revoked" : link.expires_at * 1000 <= Date.now() ? "Expired" : "Active"}</Body>
              <Label>Expires {new Date(link.expires_at * 1000).toLocaleString()}</Label>
              {!link.revoked && link.expires_at * 1000 > Date.now() && <View style={u.row}>
                {link.path && <><Button title="Download PDF" secondary onPress={() => downloadPassport(link)} /><Button title="Revoke" secondary onPress={() => revokeLink(link.id)} /></>}
              </View>}
            </View>)}
          </Card>
          <Section title="Score factors" />
          <Label>
            Whole-statement model inputs, not per-month sub-scores. Tap to
            understand each measure.
          </Label>
          {FACTORS.map((f, index) => {
            const value = analysis?.evidence?.[f.key];
            return (
              <Pressable
                accessibilityRole="button"
                key={f.key}
                onPress={() => setFactor(f)}
              >
                <Card style={{ padding: 17, gap: 12 }}>
                  <View style={u.row}>
                    <View style={u.round}>
                      <Icon
                        name={
                          index < 4
                            ? "wallet-outline"
                            : index < 8
                              ? "calendar-outline"
                              : "pulse-outline"
                        }
                        color={C.lime}
                        size={19}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[u.section, { fontSize: 14 }]}>
                        {f.title}
                      </Text>
                      <Label>
                        {f.kind === "share"
                          ? "Share / ratio of statement activity"
                          : "Relative to external inflows"}
                      </Label>
                    </View>
                    <Text
                      style={{
                        fontFamily: FONT.bold,
                        fontSize: 16,
                        color: C.lavender,
                      }}
                    >
                      {value == null
                        ? "—"
                        : f.kind === "share"
                          ? percent(value)
                          : value.toFixed(2) + "×"}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 3,
                      borderRadius: 2,
                      backgroundColor: C.line,
                    }}
                  >
                    <View
                      style={{
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: C.purple,
                        width:
                          value == null
                            ? "0%"
                            : `${Math.min(100, Math.max(0, f.kind === "share" ? value * 100 : value * 30))}%`,
                      }}
                    />
                  </View>
                  <Label>
                    {f.direction}. Bar shows magnitude, not financial health.
                  </Label>
                </Card>
              </Pressable>
            );
          })}
        </>
      )}
      <Modal
        visible={factor !== null}
        transparent
        animationType="none"
        onRequestClose={() => setFactor(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#000000BB",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Card>
            <View style={u.between}>
              <Text style={u.section}>{factor?.title}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close factor explanation"
                style={u.round}
                onPress={() => setFactor(null)}
              >
                <Icon name="close" />
              </Pressable>
            </View>
            <Body>{factor?.description}</Body>
            <Badge>{factor?.direction}</Badge>
            <Body>
              One input among ten. Changing this measure does not guarantee
              better repayment outcomes or an official credit-score increase.
            </Body>
          </Card>
        </View>
      </Modal>
      <Modal visible={passportOpen} transparent animationType="slide" onRequestClose={() => setPassportOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "#00000099", justifyContent: "flex-end" }}>
          <Card style={{ padding: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
            <View style={u.between}><Text style={u.section}>Share financial passport</Text><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setPassportOpen(false)}><Icon name="close" /></Pressable></View>
            <Body>Enter the intended recipient. The PDF includes the index, factors, coverage and limitations. The link expires after 24 hours; anyone with the link can open it until you revoke it.</Body>
            <TextInput accessibilityLabel="Recipient name" placeholder="Lender or recipient name" value={recipient} onChangeText={setRecipient} style={{ borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 14, color: C.ink }} />
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consent }} onPress={() => setConsent(!consent)} style={u.row}><Icon name={consent ? "checkmark-circle-outline" : "help-circle-outline"} color={C.green} /><Body>I consent to create this report and choose where its link is shared.</Body></Pressable>
            <Button title="Open sharing options" disabled={!consent || recipient.trim().length < 2} onPress={sharePassport} />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

function AnalysisOverview({ analysis, behaviour }: { analysis: NonNullable<ReturnType<typeof useSession>["analysis"]>; behaviour: Behaviour | null }) {
  const cards = [
    ["score", "Score explanation", "Why this score?", "analytics-outline", "#F0E9FF", "#7B4DE8"],
    ["cashflow", "Cashflow", "Where your money goes", "stats-chart-outline", "#E7F5FF", "#1597E5"],
    ["behaviour", "Behaviour Index", "What is calculated", "pulse-outline", "#E5FAF1", "#12A878"],
    ["coach", "Credit coach", "How to improve", "sparkles-outline", "#FFF2E1", "#F28A16"],
    ["passport", "Financial passport", "Download and share", "share-outline", "#FFEAF1", "#D44873"],
    ["factors", "Score factors", "Model inputs", "bar-chart-outline", "#EAF0FF", "#4B68D1"],
  ] as const;
  return <Screen back={false} title="Analysis" subtitle="Choose what you want to understand.">
    <Card style={{ padding: 0, overflow: "hidden", borderColor: "#D9E6F2", backgroundColor: "#FFFFFF" }}>
      <View style={{ padding: 20, backgroundColor: "#EEF8FF", gap: 7 }}><View style={u.between}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: "#19B879" }} /><Text style={{ fontFamily: FONT.heavy, fontSize: 11, letterSpacing: 1, color: "#12365A" }}>UQUAL FINANCIAL PROFILE</Text></View><Icon name="information-circle-outline" color="#5F86A5" size={20} /></View><Text style={{ fontFamily: FONT.heavy, fontSize: 24, color: "#102E62", letterSpacing: -.5 }}>Your money, explained.</Text><Text style={{ fontFamily: FONT.regular, fontSize: 12, color: "#65819A" }}>Two views of the same statement, kept clearly separate.</Text></View>
      <View style={{ flexDirection: "row", gap: 10, padding: 14 }}><View style={{ flex: 1, padding: 14, borderRadius: 16, backgroundColor: "#F1ECFF", gap: 6 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon name="pulse-outline" size={16} color="#7B4DE8" /><Text style={{ fontFamily: FONT.bold, fontSize: 10, color: "#6A45C4" }}>BEHAVIOUR INDEX</Text></View><Text style={{ fontFamily: FONT.heavy, fontSize: 32, color: "#2F2360" }}>{behaviour?.index?.toFixed(1) ?? "—"}</Text><Text style={{ fontFamily: FONT.regular, fontSize: 10, color: "#746A91" }}>descriptive · 0–100</Text></View><View style={{ flex: 1, padding: 14, borderRadius: 16, backgroundColor: "#E7F8F3", gap: 6 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon name="analytics-outline" size={16} color="#12A878" /><Text style={{ fontFamily: FONT.bold, fontSize: 10, color: "#087B60" }}>MODEL INDEX</Text></View><Text style={{ fontFamily: FONT.heavy, fontSize: 32, color: "#0C5B49" }}>{analysis.synthetic_risk_index?.toFixed(1) ?? "—"}</Text><Text style={{ fontFamily: FONT.regular, fontSize: 10, color: "#5D897E" }}>synthetic demo · 0–100</Text></View></View>
      <View style={{ marginHorizontal: 14, marginBottom: 14, padding: 12, borderRadius: 12, backgroundColor: "#F7FAFD", flexDirection: "row", gap: 9, alignItems: "flex-start" }}><Icon name="lock-closed-outline" size={16} color="#66839E" /><Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 11, lineHeight: 16, color: "#66809A" }}>Statement-based insight only. Not a bureau score or lending decision.</Text></View>
    </Card>
    <Text style={{ fontFamily: FONT.bold, fontSize: 15, color: C.ink, marginTop: 5 }}>Explore your statement</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{cards.map(([route, title, sub, icon, bg, color]) => <Pressable key={route} onPress={() => router.push(`/analysis/${route}`)} style={{ width: "48%", minHeight: 112, backgroundColor: bg, borderRadius: 20, padding: 15, gap: 8 }}><View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFFAA", alignItems: "center", justifyContent: "center" }}><Icon name={icon as any} size={20} color={color} /></View><Text style={{ fontFamily: FONT.bold, fontSize: 13, color: C.ink }}>{title}</Text><Text style={{ fontFamily: FONT.regular, fontSize: 10, color: C.muted }}>{sub}</Text><Icon name="chevron-forward" size={15} color={color} /></Pressable>)}</View>
    <Card style={{ backgroundColor: "#F4F8FF", padding: 16 }}><Label>HOW TO USE THIS PAGE</Label><Body>Open one card at a time. Each screen explains the data, calculation and limitations without overwhelming you.</Body></Card>
  </Screen>;
}
