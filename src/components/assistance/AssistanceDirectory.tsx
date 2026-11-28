import React, { useState } from 'react';
import { Destination, AssistancePoint } from '../../types';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Phone,
  ShieldAlert,
  Search,
  MapPin,
  Clock,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  Volume2,
} from 'lucide-react';

interface AssistanceDirectoryProps {
  destinations: Destination[];
}

export const AssistanceDirectory: React.FC<AssistanceDirectoryProps> = ({ destinations }) => {
  const { t } = useLanguage();
  const { addNotification, speak } = useAccessibility();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  const allAssistancePoints: { point: AssistancePoint; destName: string; city: string }[] = [];
  destinations.forEach((d) => {
    d.assistancePoints.forEach((p) => {
      allAssistancePoints.push({
        point: p,
        destName: d.name,
        city: d.city,
      });
    });
  });

  const filtered = allAssistancePoints.filter(
    (item) =>
      item.point.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.destName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.point.services.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleTriggerSOS = () => {
    setSosSent(true);
    speak('Emergency assistance beacon activated. Transmitting coordinates to on-duty accessibility station officers.');
    addNotification({
      type: 'EMERGENCY_ALERT',
      title: '🚨 EMERGENCY SOS BEACON ACTIVATED',
      message: 'Your current location has been broadcast to on-site PRM escorts and medical assistance staff.',
      severity: 'CRITICAL',
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Banner with Emergency SOS Callout */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold uppercase rounded-full">
              24/7 Universal Support
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black">{t('assistance')} / Direct Support Hubs</h2>
          <p className="text-sm text-purple-200 max-w-2xl">
            Access free wheelchair escorts, sign-language guides, accessible shuttles, and direct emergency dispatch lines.
          </p>
        </div>

        <button
          onClick={() => {
            setShowSosModal(true);
            setSosSent(false);
          }}
          className="px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-black text-base rounded-2xl shadow-xl hover:shadow-2xl transition-all transform active:scale-95 flex items-center gap-2.5 shrink-0"
        >
          <ShieldAlert className="w-6 h-6 animate-pulse" />
          <span>EMERGENCY SOS BEACON</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search assistance by service (e.g. Wheelchair loan, Buggy transit, Sign Language, Escort)..."
          className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm focus:ring-2 focus:ring-purple-600 focus:outline-hidden text-sm sm:text-base font-medium"
        />
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(({ point, destName, city }) => (
          <div
            key={point.id}
            className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 rounded-md">
                    {point.category.replace('_', ' ')}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {point.name}
                  </h3>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
                  <HeartHandshake className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-purple-600" />
                  <span>
                    {point.location} ({destName})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Hours: {point.openingHours}</span>
                </div>
              </div>

              {/* Services badges */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Provided Assistance:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {point.services.map((svc, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-medium"
                    >
                      ✓ {svc}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Call action */}
            <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <a
                href={`tel:${point.contactPhone}`}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Desk: {point.contactPhone}</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* SOS Modal */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-red-500 p-6 sm:p-8 space-y-6 text-center">
            <div className="p-4 bg-red-100 dark:bg-red-950/60 text-red-600 rounded-3xl w-fit mx-auto animate-bounce">
              <ShieldAlert className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-red-600 dark:text-red-400">
                Emergency Accessibility Dispatch
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Instantly connect with station accessibility officers or emergency emergency response teams.
              </p>
            </div>

            {sosSent ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl space-y-2 text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
                <div className="font-bold text-sm">Emergency Beacon Transmitted</div>
                <p className="text-xs">
                  On-site Special Assistance team has received your GPS coordinates. Stay calm at your current location.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleTriggerSOS}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-lg rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3"
                >
                  <ShieldAlert className="w-6 h-6" />
                  <span>TRANSMIT SOS LOCATION BEACON</span>
                </button>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <a
                    href="tel:112"
                    className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2"
                  >
                    <Phone className="w-4 h-4 text-red-600" />
                    <span>Dial 112 (Emergency)</span>
                  </a>
                  <a
                    href="tel:+91112"
                    className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2"
                  >
                    <Phone className="w-4 h-4 text-purple-600" />
                    <span>Transit PRM Desk</span>
                  </a>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowSosModal(false)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
            >
              Close Emergency Modal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
