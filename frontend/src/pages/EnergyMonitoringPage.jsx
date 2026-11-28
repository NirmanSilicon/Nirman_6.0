import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Sun, Wind, Zap, IndianRupee, Leaf } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useVidyut } from '../context/VidyutContext';

export function EnergyMonitoringPage() {
  const { dateRange, setDateRange, energySeries } = useVidyut();

  const peakSolar = Math.max(...energySeries.map((d) => d.solar));
  const peakWind = Math.max(...energySeries.map((d) => d.wind));
  const maxTariff = Math.max(...energySeries.map((d) => d.tariff));
  const minCarbon = Math.min(...energySeries.map((d) => d.carbon));

  return (
    <div className="space-y-6">
      {/* Filter & Highlights Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-[16px] border-[3px] border-[#17140D] shadow-[5px_5px_0_#17140D] px-4 py-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 font-bold text-[#17140D]">
            <span className="w-6 h-6 rounded-md bg-[#9F9679] text-[#17140D] border-2 border-[#17140D] flex items-center justify-center">
              <Sun className="w-3.5 h-3.5" />
            </span>
            Peak Solar: <strong className="font-mono">{peakSolar} {dateRange === 'Today' ? 'kW' : 'kWh'}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-[#17140D]">
            <span className="w-6 h-6 rounded-md bg-[#AABAAE] text-[#17140D] border-2 border-[#17140D] flex items-center justify-center">
              <Wind className="w-3.5 h-3.5" />
            </span>
            Peak Wind: <strong className="font-mono">{peakWind} {dateRange === 'Today' ? 'kW' : 'kWh'}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-[#17140D]">
            <span className="w-6 h-6 rounded-md bg-[#933B5B] text-white border-2 border-[#17140D] flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5" />
            </span>
            Peak Tariff: <strong className="font-mono">₹{maxTariff.toFixed(2)}/kWh</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-[#17140D]">
            <span className="w-6 h-6 rounded-md bg-[#B5728A] text-[#17140D] border-2 border-[#17140D] flex items-center justify-center">
              <Leaf className="w-3.5 h-3.5" />
            </span>
            Lowest Carbon: <strong className="font-mono">{minCarbon.toFixed(2)} kg CO₂/kWh</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#E3D6BF] p-1 rounded-[12px] border-2 border-[#17140D]">
          {['Today', 'Week', 'Month'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1 rounded-[8px] text-xs font-extrabold transition-all cursor-pointer ${dateRange === range
                ? 'bg-[#933B5B] text-white border-2 border-[#17140D] shadow-[2px_2px_0_#17140D]'
                : 'text-[#17140D] hover:bg-white border-2 border-transparent'
                }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart 1: Renewable Generation vs Factory & Grid Consumption */}
      <Card>
        <CardHeader
          title="Renewable Generation vs. Factory & Grid Electricity Usage"
          subtitle={`Solar + Wind supply compared against optimized factory demand and residual grid draw (${dateRange})`}
          action={<Badge variant="green">Simulated Telemetry</Badge>}
        />
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={energySeries} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#E3D6BF" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#17140D', fontWeight: 600 }} axisLine={{ stroke: '#17140D', strokeWidth: 2 }} tickLine={false} />
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
              <Area type="monotone" dataKey="solar" name="Solar Generation" stroke="#9F9679" strokeWidth={2.5} fill="#9F9679" fillOpacity={0.28} />
              <Area type="monotone" dataKey="wind" name="Wind Generation" stroke="#17140D" strokeWidth={2} fill="#AABAAE" fillOpacity={0.45} />
              <Line type="monotone" dataKey="optimized" name="Factory Consumption" stroke="#933B5B" strokeWidth={3} dot={{ r: 3, fill: '#933B5B', stroke: '#17140D' }} />
              <Line type="monotone" dataKey="grid" name="Grid Electricity Usage" stroke="#B5728A" strokeWidth={2.5} strokeDasharray="5 4" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Bottom 2-Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader
            title="Battery Charging & Discharging Flow"
            subtitle="Positive values indicate BESS charging from solar surplus; negative values indicate peak discharge"
            action={
              <Badge variant="emerald">
                <Zap className="w-3.5 h-3.5" />
                BESS Net Flow
              </Badge>
            }
          />
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={energySeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#E3D6BF" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#17140D', fontWeight: 600 }} axisLine={{ stroke: '#17140D', strokeWidth: 2 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#17140D', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <ReferenceLine y={0} stroke="#17140D" strokeWidth={2} />
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
                <Bar
                  dataKey="batteryFlow"
                  name="Battery Flow (+Charge / -Discharge)"
                  fill="#AABAAE"
                  stroke="#17140D"
                  strokeWidth={2}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Electricity Prices (₹/kWh) & Grid Carbon Intensity"
            subtitle="Time-of-Use tariff curve vs. marginal CO₂ intensity (kg CO₂/kWh)"
          />
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={energySeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#E3D6BF" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#17140D', fontWeight: 600 }} axisLine={{ stroke: '#17140D', strokeWidth: 2 }} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#17140D', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#17140D', fontWeight: 600 }} axisLine={false} tickLine={false} />
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
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="tariff"
                  name="Electricity Price (₹/kWh)"
                  stroke="#933B5B"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: '#933B5B', stroke: '#17140D', strokeWidth: 1.5 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="carbon"
                  name="Carbon Intensity (kg CO₂/kWh)"
                  stroke="#9F9679"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#9F9679', stroke: '#17140D', strokeWidth: 1.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
