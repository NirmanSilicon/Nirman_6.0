import React from 'react';
import { Check, X } from 'lucide-react';

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

export function evaluatePasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      id: 'min-length',
      label: 'Minimum 8 characters',
      met: password.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'One uppercase letter (A-Z)',
      met: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'One lowercase letter (a-z)',
      met: /[a-z]/.test(password),
    },
    {
      id: 'number',
      label: 'One number (0-9)',
      met: /[0-9]/.test(password),
    },
    {
      id: 'special',
      label: 'One special character (!@#$%^&*...)',
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

interface PasswordChecklistProps {
  requirements: PasswordRequirement[];
  theme?: 'dark' | 'light';
}

export const PasswordRequirementsChecklist: React.FC<PasswordChecklistProps> = ({
  requirements,
  theme = 'dark',
}) => {
  const allMet = requirements.every((r) => r.met);
  const metCount = requirements.filter((r) => r.met).length;

  const isDark = theme === 'dark';

  return (
    <div
      className={`p-3 rounded-2xl border transition-all text-xs space-y-2 ${
        isDark
          ? 'bg-slate-900/70 border-white/15 text-slate-200 backdrop-blur-md'
          : 'bg-slate-50 border-slate-200 text-slate-700'
      }`}
      aria-live="polite"
      role="region"
      aria-label="Password requirements checklist"
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[11px] font-bold uppercase tracking-wider ${
            allMet
              ? isDark ? 'text-emerald-400' : 'text-emerald-600'
              : isDark ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          Password Requirements ({metCount}/{requirements.length})
        </span>
        {allMet && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
              isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            Strong Password
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
        {requirements.map((req) => (
          <div
            key={req.id}
            className={`flex items-center gap-1.5 text-[11px] transition-colors ${
              req.met
                ? isDark
                  ? 'text-emerald-400 font-semibold'
                  : 'text-emerald-600 font-semibold'
                : isDark
                ? 'text-slate-400'
                : 'text-slate-500'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px] ${
                req.met
                  ? 'bg-emerald-500 text-white'
                  : isDark
                  ? 'bg-white/10 text-slate-400'
                  : 'bg-slate-200 text-slate-400'
              }`}
            >
              {req.met ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <span className="w-1 h-1 rounded-full bg-current" />}
            </div>
            <span className="truncate">{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
