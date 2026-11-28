import React, { useState } from "react";
import { Text, View } from "react-native";
import {
  Body,
  Button,
  Card,
  Field,
  Icon,
  Label,
  Screen,
  Section,
  u,
} from "../../components/ui";
import { C, FONT, money } from "../../theme";
import { useSession } from "../../session";
import { request, type Simulation } from "../../api";
export default function Twin() {
  const state = useSession();
  const [values, setValues] = useState({
      amount: "100000",
      annual_rate: "15",
      months: "12",
      monthly_income: "30000",
      monthly_expenses: "18000",
      existing_emi: "0",
    }),
    [result, setResult] = useState<Simulation | null>(null);
  const fields = [
    ["amount", "Loan amount (₹)"],
    ["months", "Term (months)"],
    ["annual_rate", "Annual interest (%)"],
    ["monthly_income", "Monthly income (₹)"],
    ["monthly_expenses", "Monthly expenses (₹)"],
    ["existing_emi", "Existing EMI (₹)"],
  ] as const;
  return (
    <Screen
      back={false}
      title="A little ‘what if’."
      subtitle="Explore a loan before making a commitment."
    >
      <Card>
        <View style={u.row}>
          <View style={u.round}>
            <Icon name="sparkles-outline" color={C.lime} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={u.section}>Meet your CreditTwin</Text>
            <Body>Numbers to plan with. No application needed.</Body>
          </View>
        </View>
      </Card>
      <Section title="Build your scenario" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        {fields.map(([key, label]) => (
          <View style={{ width: "47%" }} key={key}>
            <Field
              label={label}
              value={values[key]}
              onChangeText={(value) => {
                setValues({ ...values, [key]: value });
                setResult(null);
              }}
              keyboardType="decimal-pad"
            />
          </View>
        ))}
      </View>
      <Button
        title="Explore my scenario"
        icon="arrow-forward"
        disabled={!!state.busy}
        onPress={() =>
          state.perform("Calculating your scenarios", async () => {
            if (!state.session) return;
            const data = Object.fromEntries(
              Object.entries(values).map(([k, v]) => [
                k,
                v.trim() ? Number(v) : NaN,
              ]),
            );
            if (
              Object.values(data).some((v) => !Number.isFinite(v) || v < 0) ||
              data.amount <= 0 ||
              !Number.isInteger(data.months) ||
              data.months < 1 ||
              data.months > 600
            )
              throw new Error(
                "Enter valid nonnegative amounts and a whole-number term from 1 to 600 months.",
              );
            setResult(
              await request<Simulation>(state.session, "/v1/simulate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              }),
            );
          })
        }
      />
      {result && (
        <>
          <View style={u.soft}>
            <Text
              style={{
                fontFamily: FONT.medium,
                fontSize: 12,
                color: "#536A66",
              }}
            >
              Estimated monthly EMI
            </Text>
            <Text style={[u.number, { color: "#092348", fontSize: 42 }]}>
              {money(result.monthly_emi)}
            </Text>
            <Text
              style={{
                fontFamily: FONT.regular,
                fontSize: 12,
                color: "#536A66",
              }}
            >
              Total repayment {money(result.total_repayment_excluding_fees)} ·
              excludes fees
            </Text>
          </View>
          {[0, 0.1].map((increase) => (
            <Card key={increase}>
              <Section
                title={
                  increase ? "If expenses rise 10%" : "If your income changes"
                }
              />
              {result.scenarios
                .filter((s) => s.expense_increase === increase)
                .map((s) => (
                  <View
                    key={s.income_reduction}
                    style={[
                      u.between,
                      {
                        paddingVertical: 12,
                        borderBottomColor: C.line,
                        borderBottomWidth: 1,
                      },
                    ]}
                  >
                    <Body>
                      {s.income_reduction
                        ? `${s.income_reduction * 100}% less income`
                        : "Current income"}
                    </Body>
                    <Text
                      style={{
                        fontFamily: FONT.bold,
                        fontSize: 14,
                        color:
                          s.monthly_surplus_after_emi < 0 ? C.red : C.success,
                      }}
                    >
                      {money(s.monthly_surplus_after_emi)} left
                    </Text>
                  </View>
                ))}
              <Label>
                After entered expenses, existing EMI and proposed EMI.
              </Label>
            </Card>
          ))}
        </>
      )}
      <Label>
        The starting inputs are examples, not values inferred from your account.
        This is arithmetic—not an approval prediction, loan offer or promise of
        a score change.
      </Label>
    </Screen>
  );
}
