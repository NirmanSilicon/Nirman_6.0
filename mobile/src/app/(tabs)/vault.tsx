import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Share, Text, View } from "react-native";
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
import { C, FONT } from "../../theme";
import { type Saved, useSession } from "../../session";
export default function Vault() {
  const state = useSession();
  const [remove, setRemove] = useState<Saved | null>(null),
    [source, setSource] = useState<string | null>(null);
  async function showSource(record: Saved) {
    await state.perform("Opening your transaction ledger", async () => {
      if (!state.session) return;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(
          state.session.url + "/v1/statements/" + record.id + (record.normalized_available ? "/normalized.csv" : "/document"),
          {
            signal: controller.signal,
            headers: { Authorization: "Bearer " + state.session.token },
          },
        );
        if (!response.ok)
          throw new Error(
            "Could not open this statement. Please sign in again.",
          );
        setSource((await response.text()).slice(0, 12000));
      } finally {
        clearTimeout(timer);
      }
    });
  }
  async function share() {
    if (!state.analysis) return;
    await state.perform("Preparing your snapshot", async () => {
      await Share.share({
        title: "My UQUAL summary",
        message: JSON.stringify(
          {
            app: "UQUAL Personal",
            scope:
              "Synthetic demonstration; not a credit bureau score or lending assessment",
            source: state.analysis?.statement_source,
            period: state.analysis?.statement_period,
            demo_index: state.analysis?.synthetic_risk_index ?? null,
            cashflow: state.analysis?.cashflow_profile,
            feature_version: state.analysis?.feature_version,
          },
          null,
          2,
        ),
      });
    });
  }
  return (
    <Screen
      back={false}
      title="A place for your story."
      subtitle="Private statements. Real history. Your control."
    >
      <View style={u.row}>
        <Badge>ENCRYPTED AT REST</Badge>
        <Label>{state.records.length} / 100 statements</Label>
      </View>
      <Button
        title="Add a statement"
        icon="add-outline"
        onPress={() => router.push("/upload")}
      />
      <Section
        title="Your statement vault"
        action="Refresh"
        onPress={() =>
          state.perform("Refreshing your private vault", state.refresh)
        }
      />
      {state.jobs.filter((job) => ["queued", "running", "failed"].includes(job.status)).map((job) => (
        <Card key={job.id}>
          <Badge>{job.status.toUpperCase()}</Badge>
          <Text style={u.section}>{job.filename}</Text>
          <Body>{job.error?.message || (job.status === "queued" ? "Waiting for processing. You can leave this screen." : "Checking transactions and calculating your assessment.")}</Body>
          {job.status !== "failed" && <Button secondary title="Cancel processing" onPress={() => state.perform("Cancelling processing", () => state.cancelJob(job.id))} />}
        </Card>
      ))}
      {!state.records.length ? (
        <Card>
          <Icon name="folder-open-outline" color={C.lime} size={31} />
          <Text style={u.section}>Your first chapter starts here.</Text>
          <Body>
            Saved statements and assessments stay in your account across
            sign-ins. Generated samples never enter your vault.
          </Body>
        </Card>
      ) : (
        state.records.map((record) => (
          <Card key={record.id}>
            <View style={u.row}>
              <View style={u.round}>
                <Icon name="document-text-outline" color={C.lime} />
              </View>
              <Pressable
                style={{ flex: 1, gap: 5 }}
                onPress={() => {
                  state.select(record);
                  router.push("/insights");
                }}
                accessibilityRole="button"
              >
                <Text style={[u.section, { fontSize: 14 }]} numberOfLines={2}>
                  {record.filename}
                </Text>
                <Label>
                  {record.analysis.statement_period.start} →{" "}
                  {record.analysis.statement_period.end}
                </Label>
              </Pressable>
              <Text
                style={{
                  fontFamily: FONT.bold,
                  fontSize: 22,
                  color: C.lavender,
                }}
              >
                {record.analysis.synthetic_risk_index == null
                  ? "—"
                  : record.analysis.synthetic_risk_index.toFixed(0)}
              </Text>
            </View>
            <View style={u.line} />
            <View style={u.between}>
              <Pressable
                accessibilityRole="button"
                onPress={() => showSource(record)}
                style={{ paddingVertical: 10 }}
              >
                <Text style={u.link}>View transactions ↗</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={"Delete " + record.filename}
                onPress={() => setRemove(record)}
                style={u.round}
              >
                <Icon name="trash-outline" color={C.red} size={19} />
              </Pressable>
            </View>
            <Label>
              Consent saved{" "}
              {new Date(record.created_at * 1000).toLocaleDateString("en-IN")} ·
              synthetic demo assessment
            </Label>
          </Card>
        ))
      )}
      <Section title="Financial Passport" />
      <Card>
        <Text style={u.section}>A snapshot you choose to share.</Text>
        <Body>
          {state.analysis
            ? "Share the currently selected statement’s cashflow and demo index using your device’s share sheet."
            : "Analyze or select a statement to prepare a summary."}
        </Body>
        {state.analysis && (
          <>
            <Badge>
              {state.analysis.statement_source === "generated_sample"
                ? "GENERATED SAMPLE · NOT YOUR DATA"
                : "SELECTED STATEMENT"}
            </Badge>
            <Text style={u.number}>
              {state.analysis.synthetic_risk_index?.toFixed(2) ?? "Not scored"}
              <Text style={u.body}> / 100</Text>
            </Text>
            <Label>
              {state.analysis.statement_period.start} →{" "}
              {state.analysis.statement_period.end}
            </Label>
            <Button
              secondary
              title="Review & share summary"
              icon="share-outline"
              onPress={share}
            />
          </>
        )}
      </Card>
      <Label>
        No institution can access your account automatically. Sharing a summary
        is your decision and does not establish lending eligibility.
      </Label>
      <Modal
        visible={!!remove}
        transparent
        animationType="none"
        onRequestClose={() => setRemove(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#000000CC",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Card>
            <Text style={u.section}>Delete this statement?</Text>
            <Body>
              This removes {remove?.filename} and its assessment from your
              account. It cannot be restored through the app. Your original file
              is unaffected.
            </Body>
            <Button
              title="Delete statement permanently"
              onPress={() =>
                state.perform("Removing statement", async () => {
                  if (remove) await state.remove(remove.id);
                  setRemove(null);
                })
              }
            />
            <Button
              secondary
              title="Keep statement"
              onPress={() => setRemove(null)}
            />
          </Card>
        </View>
      </Modal>
      <Modal
        visible={source !== null}
        animationType="none"
        onRequestClose={() => setSource(null)}
      >
        <Screen
          onBack={() => setSource(null)}
          title="Statement transactions"
          subtitle="First 12,000 characters of the parsed ledger. Bank authenticity is not verified."
        >
          <Button
            secondary
            title="Close source preview"
            onPress={() => setSource(null)}
          />
          <ScrollView horizontal>
            <Text
              selectable
              style={{
                fontFamily: "monospace",
                color: C.ink,
                fontSize: 11,
                lineHeight: 19,
              }}
            >
              {source}
            </Text>
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}
