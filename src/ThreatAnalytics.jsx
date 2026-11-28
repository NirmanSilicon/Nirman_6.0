import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area
} from "recharts";

import { BarChart3, Activity } from "lucide-react";

export default function ThreatAnalytics({ logs = [] }) {
  const allowed = logs.filter(
    l => ["ALLOWED", "APPROVED"].includes(l.decision)
  ).length;

  const blocked = logs.filter(
    l => ["BLOCKED", "REJECTED"].includes(l.decision)
  ).length;

  const pending = logs.filter(
    l => l.decision === "NEEDS HUMAN REVIEW"
  ).length;

  const distribution = [
    { name: "Allowed", value: allowed, color: "#10b981" },
    { name: "Blocked", value: blocked, color: "#ef4444" },
    { name: "Pending", value: pending, color: "#f59e0b" }
  ];

  const threats = [
    {
      name: "RBAC",
      count: logs.filter(l => l.violation).length
    },
    {
      name: "Injection",
      count: logs.filter(l => l.injection).length
    },
    {
      name: "Sensitive",
      count: logs.filter(l =>
        /password|salary|salaries|ssn|secret/i.test(l.action || "")
      ).length
    },
    {
      name: "Financial",
      count: logs.filter(l =>
        /refund|transfer|payment|invoice/i.test(l.action || "")
      ).length
    }
  ];

  const trend = [...logs]
    .slice(0, 10)
    .reverse()
    .map((log, index) => ({
      name: `R${index + 1}`,
      risk: Number(log.score) || 0
    }));

  const averageRisk = logs.length
    ? Math.round(
        logs.reduce((sum, l) => sum + (Number(l.score) || 0), 0)
        / logs.length
      )
    : 0;

  const tooltipStyle = {
    backgroundColor: "#101827",
    border: "1px solid #334155",
    borderRadius: "8px"
  };

  return (
    <section className="panel p-5 space-y-5 mt-6">

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="text-cyan-400" />
          Threat Analytics Dashboard
        </h2>

        <span className="text-emerald-400 text-sm flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          LIVE ANALYTICS
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ["Session Requests", logs.length, "text-cyan-400"],
          ["Allowed / Approved", allowed, "text-emerald-400"],
          ["Blocked / Rejected", blocked, "text-red-400"],
          ["Average Risk", `${averageRisk}/100`, "text-amber-400"]
        ].map(([label, value, color]) => (
          <div
            key={label}
            className="bg-slate-950/50 border border-slate-700 rounded-xl p-4"
          >
            <p className="text-sm text-slate-400">{label}</p>
            <p className={`text-3xl font-bold mt-2 ${color}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="min-w-0 bg-slate-950/50 border border-slate-700 rounded-xl p-4">
          <h3 className="font-semibold mb-4">
            Request Distribution
          </h3>

          {logs.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-slate-500">
              Simulate requests to generate analytics
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={distribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  stroke="none"
                >
                  {distribution.map(item => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>

                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: "#ffffff" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}

          <div className="flex flex-wrap justify-center gap-4">
            {distribution.map(item => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.name}: {item.value}
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 bg-slate-950/50 border border-slate-700 rounded-xl p-4">
          <h3 className="font-semibold mb-4">
            Threat Categories
          </h3>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={threats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" allowDecimals={false} />

              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={{ color: "#ffffff" }}
                cursor={{ fill: "#1e293b" }}
              />

              <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <p className="text-xs text-slate-500">
            A request may trigger multiple threat categories.
          </p>
        </div>

      </div>

      <div className="min-w-0 bg-slate-950/50 border border-slate-700 rounded-xl p-4">

        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Activity className="text-cyan-400" size={18} />
          Risk Score Trend
        </h3>

        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={trend}>

            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis domain={[0, 100]} stroke="#94a3b8" />

            <Tooltip
              contentStyle={tooltipStyle}
              itemStyle={{ color: "#ffffff" }}
            />

            <Area
              type="monotone"
              dataKey="risk"
              stroke="#22d3ee"
              strokeWidth={3}
              fill="url(#riskGradient)"
              dot={{ r: 4, fill: "#22d3ee" }}
            />

          </AreaChart>
        </ResponsiveContainer>

        <p className="text-xs text-slate-500">
          Risk scores of the latest 10 evaluated requests.
        </p>

      </div>

    </section>
  );
}