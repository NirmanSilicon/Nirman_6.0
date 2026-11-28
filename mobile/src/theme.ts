// UQUAL light palette: navy typography, emerald actions, blue data accents.
export const C = {
  ink: "#092348", green: "#008FC7", deep: "#092348",
  lime: "#008FC7", bg: "#F3F7FC", white: "#FFFFFF",
  muted: "#64748B", line: "#E5EBF1", mint: "#EAF6FF",
  amber: "#A76713", amberBg: "#FFF4DD", red: "#BD3E50",
  panel: "#FFFFFF", purple: "#3278DA", lavender: "#008FC7",
  success: "#008FC7",
};
export const FONT = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  bold: "Inter_600SemiBold",
  heavy: "Inter_700Bold",
};
export const money = (value: number) =>
  "₹" + Math.round(value).toLocaleString("en-IN");
export const percent = (value: number) => (value * 100).toFixed(1) + "%";
export const FACTORS: {
  key: string;
  title: string;
  description: string;
  kind: "ratio" | "share";
  direction: string;
}[] = [
  {
    key: "external_outflow_ratio",
    title: "Spending vs inflows",
    description:
      "External expenses divided by eligible credits. Identified self transfers are excluded.",
    kind: "share",
    direction: "Lower generally reduces model risk",
  },
  {
    key: "mean_liquidity_ratio",
    title: "Average cash buffer",
    description:
      "Average daily balance divided by estimated monthly external credits.",
    kind: "ratio",
    direction: "Higher generally reduces model risk",
  },
  {
    key: "minimum_liquidity_ratio",
    title: "Lowest cash buffer",
    description:
      "Lowest daily balance relative to estimated monthly external credits.",
    kind: "ratio",
    direction: "Higher generally reduces model risk",
  },
  {
    key: "ending_liquidity_ratio",
    title: "Closing cash buffer",
    description:
      "Closing balance relative to estimated monthly external credits.",
    kind: "ratio",
    direction: "Higher generally reduces model risk",
  },
  {
    key: "negative_balance_share",
    title: "Days below zero",
    description: "Share of observed days with a negative closing balance.",
    kind: "share",
    direction: "Lower generally reduces model risk",
  },
  {
    key: "low_liquidity_share",
    title: "Low-buffer days",
    description:
      "Days with less than 10% of estimated monthly credits available.",
    kind: "share",
    direction: "Lower generally reduces model risk",
  },
  {
    key: "deficit_month_share",
    title: "Months in deficit",
    description:
      "Complete months where external expenses exceeded eligible credits.",
    kind: "share",
    direction: "Lower generally reduces model risk",
  },
  {
    key: "low_surplus_month_share",
    title: "Low-surplus months",
    description:
      "Complete months where external expenses exceeded 85% of eligible credits.",
    kind: "share",
    direction: "Lower generally reduces model risk",
  },
  {
    key: "external_inflow_cv",
    title: "Inflow variability",
    description:
      "Variation in monthly external credits divided by their average.",
    kind: "ratio",
    direction: "Lower generally reduces model risk",
  },
  {
    key: "obligations_ratio",
    title: "Identified commitments",
    description:
      "Tagged loan, rent, insurance, utility and household payments divided by eligible credits.",
    kind: "share",
    direction: "Lower generally reduces model risk",
  },
];
