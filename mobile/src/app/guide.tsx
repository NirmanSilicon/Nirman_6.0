import {
  Badge,
  Body,
  Card,
  Label,
  Logo,
  Screen,
  Section,
} from "../components/ui";
export default function Guide() {
  return (
    <Screen
      back
      title="A number needs context."
      subtitle="Here is what the synthetic model index means."
    >
      <Logo />
      <Badge>SYNTHETIC DEMONSTRATION</Badge>
      <Card>
        <Section title="How it is calculated" />
        <Body>
          Statement transactions become ten cashflow inputs. A trained,
          direction-constrained model estimates the probability of a simulated
          repayment-stress event. The displayed index is 100 × (1 − that
          probability).
        </Body>
        <Body>
          An index of 80 means the model outputs 0.20 for its simulated event.
          It does not establish a real 20% probability of default, a CIBIL score
          or access to a loan.
        </Body>
      </Card>
      <Card>
        <Section title="What it considers" />
        <Body>
          External expenses, average/minimum/closing cash buffers,
          negative-balance and low-buffer days, deficit and low-surplus months,
          inflow variability and identified commitments.
        </Body>
        <Body>
          Identified transfers, refunds and borrowing are excluded from external
          credits. Unidentified credits may still include these. UQUAL does not
          infer that every credit is income.
        </Body>
      </Card>
      <Card>
        <Section title="When there is no score" />
        <Body>
          At least 90 observed days, 20 transactions, two complete months and
          reconciled balances are needed. The system can abstain for
          insufficient history or unsupported input distributions. Cashflow
          observations may remain available.
        </Body>
      </Card>
      <Label>
        No bank, bureau or lending institution has endorsed this demo.
        Independent Indian repayment validation remains outstanding. The
        redesign and account system do not change model weights or financial
        validity.
      </Label>
    </Screen>
  );
}
