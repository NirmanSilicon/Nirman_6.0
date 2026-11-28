import React, { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import {
  Badge,
  Body,
  Button,
  Card,
  Field,
  Icon,
  Label,
  Screen,
  u,
} from "../components/ui";
import { C, FONT } from "../theme";
import { useSession } from "../session";
export default function Upload() {
  const state = useSession();
  const [asset, setAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(
      null,
    ),
    [end, setEnd] = useState(""),
    [format, setFormat] = useState("%Y-%m-%d"),
    [consent, setConsent] = useState(false);
  if (!state.session) return <Redirect href="/welcome" />;
  async function pick() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["text/*", "application/csv", "application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const file = result.assets[0];
    if (!/\.(csv|pdf|xlsx)$/i.test(file.name))
      throw new Error(
        "Choose a CSV, text PDF, or XLSX statement.",
      );
    if ((file.size ?? 0) > 10 * 1024 * 1024)
      throw new Error("Choose a statement smaller than 10 MB");
    setAsset(file);
    setConsent(false);
    setEnd("");
  }
  return (
    <Screen
      back
      title="Add your next chapter."
      subtitle="One statement. A clearer financial picture."
    >
      <Badge>CSV / PDF / XLSX · INDIA / INR</Badge>
      <Pressable
        accessibilityRole="button"
        onPress={() => state.perform("Opening file picker", pick)}
      >
        <Card
          style={{
            alignItems: "center",
            paddingVertical: 35,
            borderStyle: "dashed",
            borderColor: "#8CBEAB",
            gap: 15,
          }}
        >
          <View style={[u.round, { width: 60, height: 60, borderRadius: 20 }]}>
            <Icon name="cloud-upload-outline" size={30} color={C.lime} />
          </View>
          <Text style={u.section}>
            {asset ? asset.name : "Choose your statement"}
          </Text>
          <Body>
            {asset
              ? "Tap to replace your statement"
              : "From your phone or cloud drive"}
          </Body>
        </Card>
      </Pressable>
      <Field
        label="Statement end date (YYYY-MM-DD)"
        value={end}
        onChangeText={setEnd}
        placeholder="2026-10-31"
        autoCapitalize="none"
      />
      <Label>
        Use the actual end date, including quiet days after the last
        transaction. Included sample CSV: 2022-03-31.
      </Label>
      <Label>DATE FORMAT INSIDE YOUR STATEMENT</Label>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {[
          ["%Y-%m-%d", "YYYY-MM-DD"],
          ["%d/%m/%Y", "DD/MM/YYYY"],
          ["%d-%m-%Y", "DD-MM-YYYY"],
        ].map(([value, text]) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: format === value }}
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: format === value ? C.lavender : C.mint,
            }}
            onPress={() => setFormat(value)}
          >
            <Text
              style={{
                fontFamily: FONT.medium,
                fontSize: 11,
                color: format === value ? C.bg : C.muted,
              }}
            >
              {text}
            </Text>
          </Pressable>
        ))}
      </View>
      <Card>
        <View style={u.row}>
          <Icon name="shield-checkmark-outline" color={C.lime} />
          <Text style={u.section}>Private by permission</Text>
        </View>
        <Body>
          Your statement and result will be encrypted and saved in your account on{" "}
          {state.session.url}. You can view or delete them in My vault. No
          lender receives them automatically.
        </Body>
        <View style={[u.row, { alignItems: "flex-start" }]}>
          <Switch
            accessibilityLabel="Consent to analysis and encrypted storage"
            value={consent}
            onValueChange={setConsent}
            trackColor={{ false: C.line, true: C.purple }}
          />
          <View style={{ flex: 1 }}>
            <Body>
              I consent to statement analysis and encrypted storage in my
              private account.
            </Body>
          </View>
        </View>
      </Card>
      <Button
        disabled={!asset || !consent || !!state.busy}
        title="Upload for analysis"
        icon="sparkles-outline"
        onPress={() =>
          state.perform(
            "Uploading your statement",
            async () => {
              if (!asset) return;
              if (!/^\d{4}-\d{2}-\d{2}$/.test(end))
                throw new Error("Enter the statement end date as YYYY-MM-DD");
              await state.saveStatement(asset, format, end);
              router.replace("/vault");
            },
          )
        }
      />
      <Button
        secondary
        title="Try a generated example instead"
        onPress={() =>
          state.perform("Analyzing an example", async () => {
            await state.sample();
            router.replace("/home");
          })
        }
      />
      <Button
        secondary
        title="Create full synthetic demo statement"
        disabled={!consent || !!state.busy}
        onPress={() => state.perform("Creating a generated statement", async () => {
          await state.generatedDemo();
          router.replace("/insights");
        })}
      />
      <Label>This saves generated, fictional transactions in your account so you can try category review, coaching, what-if and passport. It needs the storage consent above. No real bank data is used.</Label>
      <Label>
        At least 90 observed days, 20 transactions and two complete calendar
        months. Columns: Date, Description, Debit, Credit, Balance. Optional:
        TransactionID, Category. Keep bank order within each date. Text PDFs
        need a supported layout. Scanned PDFs and bank verification are not supported.
      </Label>
      <Label>
        The index remains synthetic-demo-only. Insufficient or unsupported
        inputs can return cashflow observations without a score.
      </Label>
    </Screen>
  );
}
