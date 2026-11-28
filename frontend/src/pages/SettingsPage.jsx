import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Server, Shield, Factory, User, LogOut, Sliders } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useVidyut } from '../context/VidyutContext';
import { vidyutService } from '../services/apiClient';

export function SettingsPage() {
  const navigate = useNavigate();
  const { settings, updateSettings, authUser, logout } = useVidyut();
  const [form, setForm] = useState(settings);

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings(form);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Left 2 Columns: Main Configuration */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader
            title="Factory & Shift Profile"
            subtitle="Configure plant identification and operational shift boundaries"
            action={
              <div className="w-9 h-9 rounded-[10px] bg-[#933B5B] text-white border-2 border-[#17140D] flex items-center justify-center">
                <Factory className="w-4 h-4" />
              </div>
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <label className="block">
              <span className="font-extrabold text-[#17140D] block mb-1.5">Factory Name</span>
              <input
                type="text"
                value={form.factoryName}
                onChange={(e) => setForm({ ...form, factoryName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-[10px] border-2 border-[#17140D] bg-[#E3D6BF] font-medium focus:outline-none focus:ring-2 focus:ring-[#933B5B]"
              />
            </label>
            <label className="block">
              <span className="font-extrabold text-[#17140D] block mb-1.5">Plant Location</span>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-[10px] border-2 border-[#17140D] bg-[#E3D6BF] font-medium focus:outline-none focus:ring-2 focus:ring-[#933B5B]"
              />
            </label>
            <label className="block">
              <span className="font-extrabold text-[#17140D] block mb-1.5">
                Ergonomics Max Noise Limit (dBA)
              </span>
              <input
                type="number"
                min={65}
                max={95}
                value={form.maxNoiseLimitDba}
                onChange={(e) => setForm({ ...form, maxNoiseLimitDba: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-[10px] border-2 border-[#17140D] bg-[#E3D6BF] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#933B5B]"
              />
            </label>
            <label className="block">
              <span className="font-extrabold text-[#17140D] block mb-1.5">
                Active Shift Window (Hours IST)
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={form.shiftStartHour}
                  onChange={(e) => setForm({ ...form, shiftStartHour: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-[10px] border-2 border-[#17140D] bg-[#E3D6BF] font-mono font-bold"
                />
                <span className="font-extrabold text-[#17140D]">to</span>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={form.shiftEndHour}
                  onChange={(e) => setForm({ ...form, shiftEndHour: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-[10px] border-2 border-[#17140D] bg-[#E3D6BF] font-mono font-bold"
                />
              </div>
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="AI Orchestration Guardrails"
            subtitle="Human-in-the-loop safety and threshold controls"
            action={
              <div className="w-9 h-9 rounded-[10px] bg-[#933B5B] text-white border-2 border-[#17140D] flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-[12px] bg-[#E3D6BF] border-2 border-[#17140D]">
              <p className="font-extrabold text-[#17140D]">Schedule Approval Mode</p>
              <p className="text-[#933B5B] font-medium mt-1">
                Manual Operator Approval Required (No autonomous PLC actuation).
              </p>
            </div>
            <div className="p-3.5 rounded-[12px] bg-[#E3D6BF] border-2 border-[#17140D]">
              <p className="font-extrabold text-[#17140D]">Ergonomics Enforcement</p>
              <p className="text-[#933B5B] font-medium mt-1">
                Active — blocks shifts exceeding {form.maxNoiseLimitDba} dBA or outside {String(form.shiftStartHour).padStart(2, '0')}:00–{String(form.shiftEndHour).padStart(2, '0')}:00.
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t-2 border-[#E3D6BF] flex justify-end">
            <button
              type="submit"
              className="memphis-btn inline-flex items-center gap-2 px-5 py-2.5 bg-[#933B5B] text-white text-xs font-extrabold cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </Card>
      </div>

      {/* Right Column: Active Session & API Integration */}
      <div className="space-y-6">
        <Card className="bg-[#E3D6BF]">
          <CardHeader
            title="Operator Session"
            subtitle="Signed-in workspace account"
            action={
              <div className="w-9 h-9 rounded-[10px] bg-[#933B5B] text-white border-2 border-[#17140D] flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
            }
          />
          <div className="p-3.5 rounded-[12px] bg-white border-2 border-[#17140D] space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-sm font-extrabold text-[#17140D]">
                {authUser?.name || 'Plant Ops Lead'}
              </span>
              {authUser?.isDemo && <Badge variant="yellow">Demo</Badge>}
            </div>
            <p className="font-mono text-[11px] font-bold text-[#933B5B]">
              {authUser?.email || 'demo.ops@vidyutsync.in'}
            </p>
            <p className="text-[#933B5B] font-medium">{authUser?.role || 'Shift A · Supervisor'}</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="memphis-btn mt-4 w-full py-2.5 bg-white hover:bg-[#17140D] hover:text-white text-[#17140D] text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Log Out of Workspace
          </button>
        </Card>

        <Card>
          <CardHeader
            title="Backend API Integration"
            subtitle="Axios service layer status"
            action={
              <Badge variant={vidyutService.isMockMode() ? 'yellow' : 'green'}>
                {vidyutService.isMockMode() ? 'Simulated Mode' : 'Live API'}
              </Badge>
            }
          />
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-[12px] bg-[#E3D6BF] border-2 border-[#17140D]">
              <Server className="w-4 h-4 text-[#17140D] shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-[#17140D]">Configured API Base URL</p>
                <p className="font-mono font-medium text-[#933B5B] truncate">{form.apiBaseUrl}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-[12px] bg-[#E3D6BF] border-2 border-[#17140D]">
              <Shield className="w-4 h-4 text-[#17140D] shrink-0 mt-0.5" />
              <p className="font-medium text-[#17140D] leading-relaxed">
                Set{' '}
                <code className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-[#17140D]">
                  VITE_API_BASE_URL
                </code>{' '}
                and{' '}
                <code className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-[#17140D]">
                  VITE_USE_MOCK_DATA=false
                </code>{' '}
                to connect live telemetry.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </form>
  );
}
