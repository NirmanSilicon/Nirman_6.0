import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCheck,
  ArrowRight,
  Trash2,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/StateBanner';
import { useVidyut } from '../context/VidyutContext';

const SEVERITY_STYLE = {
  critical: {
    badge: 'red',
    icon: AlertOctagon,
    iconBg: 'bg-[#933B5B] text-white',
    accentBg: 'border-l-[8px] border-l-[#E3D6BF]',
  },
  warning: {
    badge: 'yellow',
    icon: AlertTriangle,
    iconBg: 'bg-[#933B5B] text-white',
    accentBg: 'border-l-[8px] border-l-[#933B5B]',
  },
  info: {
    badge: 'green',
    icon: Info,
    iconBg: 'bg-[#933B5B] text-white',
    accentBg: 'border-l-[8px] border-l-[#933B5B]',
  },
};

export function AlertsPage() {
  const navigate = useNavigate();
  const { alerts, markAlertRead, markAllAlertsRead, dismissAlert } = useVidyut();
  const [severityFilter, setSeverityFilter] = useState('all');

  const totalCount = alerts.length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const unreadCount = alerts.filter((a) => !a.read).length;

  const filtered =
    severityFilter === 'all' ? alerts : alerts.filter((a) => a.severity === severityFilter);

  const summaryCards = [
    { label: 'Total Alerts', value: totalCount, icon: Bell, bg: 'bg-[#E3D6BF] text-[#17140D]' },
    { label: 'Critical', value: criticalCount, icon: AlertOctagon, bg: 'bg-[#933B5B] text-white' },
    { label: 'Warnings', value: warningCount, icon: AlertTriangle, bg: 'bg-[#933B5B] text-white' },
    { label: 'Unread', value: unreadCount, icon: CheckCircle2, bg: 'bg-[#933B5B] text-white' },
  ];

  return (
    <div className="space-y-6">
      {/* Top 4 Summary Cards */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} padding="p-4" className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#933B5B]">
                  {item.label}
                </p>
                <p className="font-display text-2xl font-extrabold font-mono text-[#17140D] mt-1">
                  {item.value}
                </p>
              </div>
              <div
                className={`w-11 h-11 rounded-[12px] border-2 border-[#17140D] shadow-[3px_3px_0_#17140D] flex items-center justify-center shrink-0 ${item.bg}`}
              >
                <Icon className="w-5 h-5" />
              </div>
            </Card>
          );
        })}
      </section>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-[16px] border-[3px] border-[#17140D] shadow-[5px_5px_0_#17140D] px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: `All (${totalCount})` },
            { id: 'critical', label: `Critical (${criticalCount})` },
            { id: 'warning', label: `Warning (${warningCount})` },
            { id: 'info', label: `Info (${alerts.filter((a) => a.severity === 'info').length})` },
          ].map((sev) => (
            <button
              key={sev.id}
              onClick={() => setSeverityFilter(sev.id)}
              className={`px-3 py-1.5 rounded-[10px] text-xs font-extrabold border-2 border-[#17140D] cursor-pointer transition-all ${
                severityFilter === sev.id
                  ? 'bg-[#933B5B] text-white shadow-[2px_2px_0_#17140D]'
                  : 'bg-[#E3D6BF] text-[#17140D] hover:bg-white'
              }`}
            >
              {sev.label}
            </button>
          ))}
        </div>

        <button
          onClick={markAllAlertsRead}
          className="memphis-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#933B5B] text-xs font-extrabold text-white cursor-pointer"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          Mark all as read
        </button>
      </div>

      {/* Alert Cards List */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="No active alerts in this category"
            description="All systems and multi-agent checks are operating within nominal bounds."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((alert) => {
            const cfg = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.info;
            const Icon = cfg.icon;

            return (
              <Card
                key={alert.id}
                padding="p-4 sm:p-5"
                className={`${cfg.accentBg} ${!alert.read ? 'bg-white' : 'bg-[#E3D6BF]'}`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-[12px] border-2 border-[#17140D] shadow-[3px_3px_0_#17140D] flex items-center justify-center shrink-0 ${cfg.iconBg}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={cfg.badge}>{alert.severity.toUpperCase()}</Badge>
                        <span className="px-2 py-0.5 rounded-md bg-[#E3D6BF] border border-[#17140D] text-[11px] font-extrabold text-[#933B5B]">
                          {alert.category}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-[#933B5B]">
                          {alert.timestamp}
                        </span>
                        {!alert.read && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#933B5B]">
                            <span className="w-2 h-2 rounded-full bg-[#933B5B] border border-[#17140D]" />
                            NEW
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-base font-extrabold text-[#17140D]">
                        {alert.title}
                      </h3>
                      <p className="text-xs font-medium text-[#933B5B] leading-relaxed max-w-3xl">
                        {alert.description}
                      </p>
                      <p className="text-[11px] font-bold text-[#17140D]">
                        Source: <span className="text-[#933B5B]">{alert.source}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {!alert.read && (
                      <button
                        onClick={() => markAlertRead(alert.id)}
                        className="memphis-btn px-3 py-2 bg-white text-[#17140D] text-xs font-extrabold cursor-pointer"
                      >
                        Mark Read
                      </button>
                    )}
                    {alert.actionRoute && (
                      <button
                        onClick={() => {
                          markAlertRead(alert.id);
                          navigate(alert.actionRoute);
                        }}
                        className="memphis-btn inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#933B5B] text-white text-xs font-extrabold cursor-pointer"
                      >
                        {alert.actionLabel || 'Inspect'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="memphis-btn p-2 bg-white text-[#17140D] hover:bg-[#17140D] hover:text-white cursor-pointer"
                      title="Dismiss alert"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
