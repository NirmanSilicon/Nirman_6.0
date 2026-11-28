import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, X, Check, Sun, Moon } from 'lucide-react';

interface AnimatedTimePickerProps {
  value: string; // e.g. "09:30 AM", "01:00 PM", or empty string ""
  onChange: (timeStr: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const QUICK_PRESETS = [
  { label: '09:00 AM', value: '09:00 AM', desc: 'Morning' },
  { label: '10:30 AM', value: '10:30 AM', desc: 'Mid Morning' },
  { label: '01:00 PM', value: '01:00 PM', desc: 'Afternoon' },
  { label: '04:30 PM', value: '04:30 PM', desc: 'Evening' },
  { label: '07:00 PM', value: '07:00 PM', desc: 'Night' },
];

export const AnimatedTimePicker: React.FC<AnimatedTimePickerProps> = ({
  value,
  onChange,
  placeholder = '--:-- --',
  id = 'animated-time-picker',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse current value parts
  const parseCurrent = () => {
    if (!value) return { hour: '09', minute: '30', period: 'AM' };
    const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      let h = match[1].padStart(2, '0');
      let m = match[2];
      let p = (match[3] || 'AM').toUpperCase();
      return { hour: h, minute: m, period: p };
    }
    return { hour: '09', minute: '30', period: 'AM' };
  };

  const current = parseCurrent();
  const [tempHour, setTempHour] = useState(current.hour);
  const [tempMinute, setTempMinute] = useState(current.minute);
  const [tempPeriod, setTempPeriod] = useState(current.period);
  const [activeTab, setActiveTab] = useState<'hour' | 'minute'>('hour');

  useEffect(() => {
    if (value) {
      const parsed = parseCurrent();
      setTempHour(parsed.hour);
      setTempMinute(parsed.minute);
      setTempPeriod(parsed.period);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleApply = (h = tempHour, m = tempMinute, p = tempPeriod) => {
    const formatted = `${h}:${m} ${p}`;
    onChange(formatted);
  };

  const handleSelectHour = (h: string) => {
    setTempHour(h);
    setActiveTab('minute');
    handleApply(h, tempMinute, tempPeriod);
  };

  const handleSelectMinute = (m: string) => {
    setTempMinute(m);
    handleApply(tempHour, m, tempPeriod);
  };

  const handleTogglePeriod = (p: 'AM' | 'PM') => {
    setTempPeriod(p);
    handleApply(tempHour, tempMinute, p);
  };

  const handleSelectPreset = (presetVal: string) => {
    onChange(presetVal);
    const parsed = parseCurrent();
    setTempHour(parsed.hour);
    setTempMinute(parsed.minute);
    setTempPeriod(parsed.period);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} id={`${id}-container`}>
      {/* Time Input Box */}
      <div
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border transition-all flex items-center justify-between cursor-pointer group ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Clock className={`w-4 h-4 transition-colors ${value ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={value}
            readOnly
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-transparent border-none outline-hidden p-0 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
            }}
          />
        </div>

        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-rose-500 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Clear time"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            12H
          </span>
        </div>
      </div>

      {/* Animated Time Picker Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 sm:right-auto sm:w-80 mt-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[400] text-slate-900 dark:text-white"
          >
            {/* Top Display & AM/PM Selector */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-lg font-black tracking-tight">
                <button
                  type="button"
                  onClick={() => setActiveTab('hour')}
                  className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'hour'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tempHour}
                </button>
                <span className="text-slate-400">:</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('minute')}
                  className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'minute'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tempMinute}
                </button>
              </div>

              {/* AM / PM Toggle with smooth animation */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-0.5 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => handleTogglePeriod('AM')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    tempPeriod === 'AM'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Sun className="w-3 h-3" />
                  <span>AM</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePeriod('PM')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    tempPeriod === 'PM'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Moon className="w-3 h-3" />
                  <span>PM</span>
                </button>
              </div>
            </div>

            {/* Tab Selector: Hours vs Minutes */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 mt-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('hour')}
                className={`flex-1 py-1.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'hour'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Select Hour (1 - 12)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('minute')}
                className={`flex-1 py-1.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'minute'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Select Minute (:00 - :55)
              </button>
            </div>

            {/* Interactive Grid: Hours or Minutes */}
            <div className="py-3">
              {activeTab === 'hour' ? (
                <div className="grid grid-cols-4 gap-1.5">
                  {HOURS.map((h) => {
                    const isSelected = tempHour === h;
                    return (
                      <motion.button
                        key={h}
                        type="button"
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handleSelectHour(h)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-400'
                            : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {h}
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {MINUTES.map((m) => {
                    const isSelected = tempMinute === m;
                    return (
                      <motion.button
                        key={m}
                        type="button"
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handleSelectMinute(m)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-400'
                            : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        :{m}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Time Presets */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Quick Suggestions
              </div>
              <div className="flex flex-wrap gap-1">
                {QUICK_PRESETS.map((qp) => (
                  <button
                    key={qp.value}
                    type="button"
                    onClick={() => handleSelectPreset(qp.value)}
                    className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-[11px] font-semibold transition-colors"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Done / Close footer */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  className="text-rose-500 hover:underline font-bold text-xs"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  handleApply();
                  setIsOpen(false);
                }}
                className="ml-auto px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
