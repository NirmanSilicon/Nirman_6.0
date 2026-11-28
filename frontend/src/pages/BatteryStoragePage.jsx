import React, { useState } from 'react';
import {
  BatteryCharging,
  ShieldCheck,
  Zap,
  Activity,
  Sliders,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useVidyut } from '../context/VidyutContext';

export function BatteryStoragePage() {
  const { battery, updateReserveThreshold } = useVidyut();
  const [draftThreshold, setDraftThreshold] = useState(battery?.reserveThresholdPercent ?? 30);

  if (!battery) return null;

  const reserveKwh = Math.round((battery.totalCapacityKwh * battery.reserveThresholdPercent) / 100);
  const availableAboveReserveKwh = Math.max(0, battery.storedEnergyKwh - reserveKwh);

  return (
    <div className="space-y-6">
      {/* Top 4 Battery Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#933B5B]">
                Battery State of Charge
              </p>
              <p className="font-display text-2xl font-extrabold font-mono text-[#17140D] mt-1.5">
                {battery.socPercent}%
              </p>
            </div>
            <div className="w-11 h-11 rounded-[12px] bg-[#E3D6BF] border-2 border-[#17140D] shadow-[3px_3px_0_#17140D] text-[#17140D] flex items-center justify-center">
              <BatteryCharging className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 w-full h-3.5 bg-[#E3D6BF] rounded-full border-2 border-[#17140D] overflow-hidden relative">
            <div
              className="h-full bg-[#AABAAE] transition-all"
              style={{ width: `${battery.socPercent}%` }}
            />
            <div
              className="absolute top-0 bottom-0 w-1 bg-[#933B5B]"
              style={{ left: `${battery.reserveThresholdPercent}%` }}
              title={`Reserve floor: ${battery.reserveThresholdPercent}%`}
            />
          </div>
          <p className="text-[11px] font-bold text-[#933B5B] mt-2">
            Reserve floor marked at {battery.reserveThresholdPercent}% ({reserveKwh} kWh)
          </p>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#933B5B]">
                Stored &amp; Available Energy
              </p>
              <p className="font-display text-2xl font-extrabold font-mono text-[#17140D] mt-1.5">
                {battery.storedEnergyKwh}{' '}
                <span className="text-xs font-bold text-[#933B5B]">/ {battery.totalCapacityKwh} kWh</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-[12px] bg-[#933B5B] border-2 border-[#17140D] shadow-[3px_3px_0_#17140D] text-white flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-[#17140D] font-bold mt-3 pt-2 border-t-2 border-[#E3D6BF]">
            {availableAboveReserveKwh} kWh dispatchable above reserve
          </p>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#933B5B]">
                Operating Status
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="green" dot>
                  {battery.status}
                </Badge>
                <span className="font-display text-lg font-extrabold font-mono text-[#17140D]">
                  +{battery.currentPowerKw} kW
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-[12px] bg-[#AABAAE] border-2 border-[#17140D] shadow-[3px_3px_0_#17140D] text-[#17140D] flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] font-bold text-[#933B5B] mt-3 pt-2 border-t-2 border-[#E3D6BF]">
            Est. time to full charge: {battery.estimatedTimeToFull}
          </p>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#933B5B]">
                Pack Health &amp; Reserve
              </p>
              <p className="font-display text-2xl font-extrabold font-mono text-[#17140D] mt-1.5">
                {battery.healthPercent}% <span className="text-xs font-bold text-[#933B5B]">SoH</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-[12px] bg-[#B5728A] border-2 border-[#17140D] shadow-[3px_3px_0_#17140D] text-[#17140D] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] font-bold text-[#933B5B] mt-3 pt-2 border-t-2 border-[#E3D6BF]">
            {battery.cycleCount} cycles · Min reserve: {battery.reserveThresholdPercent}%
          </p>
        </Card>
      </section>

      {/* Main Content: Activity Chart + Reserve Threshold Configurator */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Battery State of Charge & Dispatch Activity"
            subtitle="Hourly SOC (%) progression against charge/discharge power and configured reserve threshold"
          />
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={battery.hourlyActivity}
                margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="4 4" stroke="#E3D6BF" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#17140D', fontWeight: 600 }} axisLine={{ stroke: '#17140D', strokeWidth: 2 }} tickLine={false} />
                <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11, fill: '#17140D', fontWeight: 600 }} axisLine={false} tickLine={false} />
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
                <ReferenceLine
                  yAxisId="left"
                  y={battery.reserveThresholdPercent}
                  stroke="#933B5B"
                  strokeWidth={2.5}
                  strokeDasharray="5 4"
                  label={{
                    value: `Reserve (${battery.reserveThresholdPercent}%)`,
                    position: 'insideTopLeft',
                    fill: '#17140D',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <Bar yAxisId="right" dataKey="chargeKw" name="Charging (kW)" fill="#AABAAE" stroke="#17140D" strokeWidth={1.5} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="dischargeKw" name="Discharging (kW)" fill="#B5728A" stroke="#17140D" strokeWidth={1.5} radius={[4, 4, 0, 0]} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="soc"
                  name="State of Charge (%)"
                  stroke="#17140D"
                  strokeWidth={2.5}
                  fill="#933B5B"
                  fillOpacity={0.25}
                />
                <Line yAxisId="left" type="monotone" dataKey="reserve" name="Reserve Floor (%)" stroke="#9F9679" dot={false} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Configurable Minimum Reserve Threshold */}
        <Card className="flex flex-col justify-between bg-[#E3D6BF]">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-[10px] bg-[#933B5B] text-white border-2 border-[#17140D] shadow-[3px_3px_0_#17140D] flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-[16px] font-extrabold text-[#17140D]">
                  Minimum Reserve Threshold
                </h3>
                <p className="text-[11px] font-medium text-[#933B5B]">
                  Protected backup floor for critical factory loads
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-[14px] bg-[#933B5B] text-white border-2 border-[#17140D] shadow-[4px_4px_0_#17140D] text-center">
              <span className="text-xs font-extrabold uppercase tracking-wider block opacity-90">
                Configured Reserve Floor
              </span>
              <span className="font-display text-4xl font-extrabold font-mono mt-1 block">
                {draftThreshold}%
              </span>
              <span className="text-xs font-bold opacity-95">
                ({Math.round((battery.totalCapacityKwh * draftThreshold) / 100)} kWh protected)
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <input
                type="range"
                min={15}
                max={60}
                step={5}
                value={draftThreshold}
                onChange={(e) => setDraftThreshold(Number(e.target.value))}
                className="w-full accent-[#933B5B] cursor-pointer"
                aria-label="Battery minimum reserve threshold"
              />
              <div className="flex justify-between text-[11px] font-mono font-bold text-[#933B5B]">
                <span>15%</span>
                <span>30% (Default)</span>
                <span>45%</span>
                <span>60%</span>
              </div>

              <div className="flex gap-2 pt-2">
                {[20, 30, 40].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setDraftThreshold(preset)}
                    className={`memphis-btn flex-1 py-1.5 text-xs font-extrabold cursor-pointer ${
                      draftThreshold === preset
                        ? 'bg-[#933B5B] text-white'
                        : 'bg-white text-[#17140D]'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => updateReserveThreshold(draftThreshold)}
            disabled={draftThreshold === battery.reserveThresholdPercent}
            className="memphis-btn mt-6 w-full py-2.5 bg-[#E3D6BF] disabled:opacity-50 text-white text-xs font-extrabold cursor-pointer"
          >
            Apply Reserve Threshold ({draftThreshold}%)
          </button>
        </Card>
      </section>
    </div>
  );
}
