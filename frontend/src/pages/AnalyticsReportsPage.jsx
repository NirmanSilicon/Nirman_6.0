import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Info, Download } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useVidyut } from '../context/VidyutContext';

export function AnalyticsReportsPage() {
  const { analytics, dateRange, setDateRange, showToast } = useVidyut();

  if (!analytics) return null;

  const handleExportCsv = () => {
    const rows = [
      ['Metric', 'Baseline', 'Optimized', 'Delta', 'Data Classification'],
      ...analytics.summary.map((r) => [r.metric, r.baseline, r.optimized, r.savings, r.type]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vidyutsync-report-${dateRange.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Analytics report exported as CSV.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Data Distinction Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#933B5B] border-[3px] border-[#17140D] shadow-[5px_5px_0_#17140D] rounded-[16px] px-4 py-3 text-xs text-white">
        <div className="flex items-center gap-2 font-medium">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            <strong>Measurement Transparency:</strong> Counterfactual baseline savings and carbon avoidance are labeled{' '}
            <em>Simulated / Illustrative</em>, distinct from inverter and MES <em>Measured</em> metrics.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white p-1 rounded-[10px] border-2 border-[#17140D]">
            {['Today', 'Week', 'Month'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-2.5 py-1 rounded-[6px] text-xs font-extrabold cursor-pointer ${
                  dateRange === range ? 'bg-[#933B5B] text-white' : 'text-[#17140D]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button
            onClick={handleExportCsv}
            className="memphis-btn inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E3D6BF] text-[#17140D] text-xs font-extrabold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader
            title="Electricity Cost: Baseline vs. AI-Optimized (₹ Lakhs)"
            subtitle="6-month illustrative counterfactual comparison"
            action={<Badge variant="yellow">Simulated / Illustrative</Badge>}
          />
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#E3D6BF" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#17140D', fontWeight: 600 }} axisLine={{ stroke: '#17140D', strokeWidth: 2 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#17140D', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '2.5px solid #17140D',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    boxShadow: '4px 4px 0 #17140D',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700, paddingTop: '8px' }} />
                <Bar dataKey="baselineCost" name="Baseline Cost (₹L)" fill="#E3D6BF" stroke="#17140D" strokeWidth={2} radius={[6, 6, 0, 0]} />
                <Bar dataKey="optimizedCost" name="Optimized Cost (₹L)" fill="#933B5B" stroke="#17140D" strokeWidth={2} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Renewable Utilization vs. Grid Dependency (%)"
            subtitle="Monthly shift from grid reliance toward captive solar & wind"
            action={<Badge variant="green">Measured + Simulated</Badge>}
          />
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#E3D6BF" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#17140D', fontWeight: 600 }} axisLine={{ stroke: '#17140D', strokeWidth: 2 }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#17140D', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '2.5px solid #17140D',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    boxShadow: '4px 4px 0 #17140D',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700, paddingTop: '8px' }} />
                <Line type="monotone" dataKey="renewablePct" name="Renewable Usage (%)" stroke="#933B5B" strokeWidth={3} dot={{ r: 4, fill: '#933B5B', stroke: '#17140D', strokeWidth: 1.5 }} />
                <Line type="monotone" dataKey="gridPct" name="Grid Dependency (%)" stroke="#9F9679" strokeWidth={2.5} strokeDasharray="5 4" dot={{ r: 3.5, fill: '#9F9679', stroke: '#17140D', strokeWidth: 1.5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader
          title="Baseline vs. VidyutSync Optimized Summary"
          subtitle="Clear provenance labeling between measured telemetry and simulated counterfactuals"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-[2.5px] border-[#17140D] text-[11px] uppercase tracking-wider text-[#17140D]">
                <th className="py-2.5 px-3 font-extrabold">Performance Metric</th>
                <th className="py-2.5 px-3 font-extrabold">Unoptimized Baseline</th>
                <th className="py-2.5 px-3 font-extrabold">VidyutSync Optimized</th>
                <th className="py-2.5 px-3 font-extrabold">Impact / Delta</th>
                <th className="py-2.5 px-3 font-extrabold">Data Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#E3D6BF] text-xs">
              {analytics.summary.map((row) => (
                <tr key={row.metric} className="hover:bg-[#E3D6BF]/60">
                  <td className="py-3 px-3 font-extrabold text-[#17140D]">{row.metric}</td>
                  <td className="py-3 px-3 font-mono font-medium text-[#933B5B]">{row.baseline}</td>
                  <td className="py-3 px-3 font-mono font-extrabold text-[#17140D]">{row.optimized}</td>
                  <td className="py-3 px-3 font-mono font-extrabold text-[#933B5B]">{row.savings}</td>
                  <td className="py-3 px-3">
                    <Badge variant={row.type.startsWith('Measured') ? 'green' : 'yellow'}>
                      {row.type}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
