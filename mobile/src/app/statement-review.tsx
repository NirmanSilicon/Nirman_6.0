import React, { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { Badge, Body, Button, Card, Icon, Label, Screen, Section, u } from "../components/ui";
import { C, FONT, money } from "../theme";
import { request, type ClassificationPage } from "../api";
import { useSession, type Saved } from "../session";

type Row = ClassificationPage["transactions"][number];
const NAMES: Record<string, string> = {
  unknown: "Unknown", salary: "Salary", pension: "Pension", freelance_income: "Freelance income",
  business_income: "Business income", own_transfer: "Own transfer", refund: "Refund",
  loan_disbursement: "Loan proceeds", reversal: "Reversal", loan_payment: "Loan payment",
  rent: "Rent", insurance: "Insurance", utility: "Bills & utilities", household: "Household",
  groceries: "Groceries", transport: "Transport", shopping: "Shopping", bank_fee: "Bank fee",
  penalty: "Penalty", other: "Other",
};
const CREDIT = new Set(["unknown", "salary", "pension", "freelance_income", "business_income", "own_transfer", "refund", "loan_disbursement", "reversal", "other"]);
const DEBIT = new Set(["unknown", "own_transfer", "reversal", "loan_payment", "rent", "insurance", "utility", "household", "groceries", "transport", "shopping", "bank_fee", "penalty", "other"]);

export default function StatementReview() {
  const state = useSession();
  const saved = state.records.find((r) => r.analysis.assessment_id === state.analysis?.assessment_id);
  const savedId = saved?.id;
  const [page, setPage] = useState<ClassificationPage | null>(null);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async (from = 0) => {
    if (!state.session || !savedId) return;
    try {
      const result = await request<ClassificationPage>(state.session, `/v1/statements/${savedId}/classifications?offset=${from}&limit=30`);
      setPage(result); setOffset(from); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load transactions"); }
  }, [state.session, savedId]);
  useEffect(() => { void load(0); }, [load]);
  async function apply(category: string) {
    if (!state.session || !savedId || !selected || !page) return;
    await state.perform("Updating classification", async () => {
      const updated = await request<Saved>(state.session!, `/v1/statements/${savedId}/category`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: selected.transaction_id, category, expected_revision: page.revision }),
      });
      state.select(updated); setSelected(null); await state.refresh(); await load(offset);
    });
  }
  if (!state.session) return <Redirect href="/welcome" />;
  return <Screen title="Review transactions." subtitle="Check the labels behind your analysis.">
    {!saved && <Card><Body>Save a statement to review its transactions. Generated examples are read-only.</Body></Card>}
    {page && <>
      <Card style={{ backgroundColor: "#EAF6FF" }}>
        <View style={u.between}><View><Label>TRANSACTION REVIEW</Label><Text style={[u.section, { fontSize: 26 }]}>{page.summary.needs_review}</Text></View><Icon name="document-text-outline" color={C.green} size={30} /></View>
        <Body>Items need your review. {page.summary.auto_applied} expense labels were applied by conservative narration rules.</Body>
        <Label>{page.summary.possible_duplicates} possible duplicate rows · {page.summary.possible_refunds} possible refunds</Label>
      </Card>
      <Body>Salary, refunds and transfers stay unconfirmed until you review them. A suggestion is not proof of income or identity.</Body>
      <Section title="Statement ledger" />
      {page.transactions.map((item) => <Pressable key={item.transaction_id} accessibilityRole="button" onPress={() => setSelected(item)}>
        <Card style={{ padding: 16, gap: 7 }}>
          <View style={u.between}><Text style={[u.section, { fontSize: 14, flex: 1 }]} numberOfLines={2}>{item.description || "No narration"}</Text><Text style={{ fontFamily: FONT.bold, color: item.direction === "credit" ? "#087B60" : C.ink }}>{item.direction === "credit" ? "+" : "-"}{money(item.amount)}</Text></View>
          <Label>{item.date} · {NAMES[item.category] ?? item.category}</Label>
          {!!item.suggested_category && item.category === "unknown" && <Badge>SUGGESTED: {NAMES[item.suggested_category] ?? item.suggested_category}</Badge>}
          {item.possible_duplicate && <Body>Possible duplicate: compare bank references before acting.</Body>}
          {item.possible_refund && <Body>Possible refund: verify against the original debit.</Body>}
          <Label>{item.classification_status.replaceAll("_", " ").toUpperCase()} · TAP TO CORRECT</Label>
        </Card>
      </Pressable>)}
      <View style={u.row}><Button title="Previous" secondary disabled={offset === 0} onPress={() => load(Math.max(0, offset - 30))} /><Button title="Next" secondary disabled={offset + 30 >= page.total} onPress={() => load(offset + 30)} /></View>
      <Label>Showing {offset + 1}–{Math.min(page.total, offset + 30)} of {page.total}</Label>
    </>}
    {!!error && <Card><Body>{error}</Body><Button title="Retry" secondary onPress={() => load(offset)} /></Card>}
    <Modal visible={selected !== null} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
      <View style={{ flex: 1, backgroundColor: "#071C35AA", justifyContent: "flex-end" }}><Card style={{ maxHeight: "85%", padding: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
        <View style={u.between}><Text style={u.section}>Correct category</Text><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setSelected(null)}><Icon name="close" /></Pressable></View>
        <Body>{selected?.description} · {selected ? money(selected.amount) : ""}</Body>
        <Body>{selected?.classification_basis || "No confident rule matched this narration."}</Body>
        <Label>YOUR CONFIRMATION CHANGES THE STORED ANALYSIS</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {page?.categories.filter((c) => (selected?.direction === "credit" ? CREDIT : DEBIT).has(c)).map((c) =>
            <Pressable key={c} accessibilityRole="button" onPress={() => apply(c)} style={{ padding: 10, borderRadius: 11, backgroundColor: c === selected?.suggested_category ? "#DBF4E9" : "#F1F6FA" }}>
              <Text style={{ fontFamily: FONT.medium, fontSize: 12, color: C.ink }}>{NAMES[c] ?? c}</Text>
            </Pressable>)}
        </View>
      </Card></View>
    </Modal>
  </Screen>;
}
