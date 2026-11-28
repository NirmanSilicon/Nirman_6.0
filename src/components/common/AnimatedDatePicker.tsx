import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';

interface AnimatedDatePickerProps {
  value: string; // Stored in DD/MM/YYYY format, or empty string ''
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  className?: string;
  minDate?: string; // DD/MM/YYYY
  maxDate?: string; // DD/MM/YYYY
  disabled?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// Utility to parse DD/MM/YYYY string into a Date object
export function parseDDMMYYYY(str: string): Date | null {
  if (!str || typeof str !== 'string') return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  const d = new Date(year, month, day);
  if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
    return d;
  }
  return null;
}

// Utility to format Date object into DD/MM/YYYY string
export function formatToDDMMYYYY(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export const AnimatedDatePicker: React.FC<AnimatedDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'DD/MM/YYYY',
  id = 'animated-date-picker',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse current value or default view date to current month
  const selectedDate = parseDDMMYYYY(value);
  const today = new Date();

  const [viewDate, setViewDate] = useState<Date>(() => {
    return selectedDate || today;
  });

  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // Keep viewDate in sync when value changes externally to a valid date
  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [value]);

  // Click outside listener
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

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSlideDirection('left');
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSlideDirection('right');
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleSelectDay = (dayDate: Date) => {
    const formatted = formatToDDMMYYYY(dayDate);
    onChange(formatted);
    setIsOpen(false);
  };

  const handleQuickPreset = (preset: 'today' | 'tomorrow' | 'weekend') => {
    const d = new Date();
    if (preset === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    } else if (preset === 'weekend') {
      const currentDay = d.getDay(); // 0 is Sunday, 6 is Saturday
      const daysUntilSaturday = (6 - currentDay + 7) % 7 || 7;
      d.setDate(d.getDate() + daysUntilSaturday);
    }
    const formatted = formatToDDMMYYYY(d);
    onChange(formatted);
    setViewDate(d);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (inputRef.current) inputRef.current.focus();
  };

  // Generate calendar grid (Monday to Sunday)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

  // 0 = Sun, 1 = Mon ... In EU/IN week starts on Monday: (day + 6) % 7
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const totalDaysInMonth = lastDayOfMonth.getDate();

  // Trailing days from prev month
  const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
  const prevMonthDays = Array.from({ length: startDayOfWeek }, (_, i) => {
    const day = prevMonthLastDay - startDayOfWeek + i + 1;
    return new Date(viewYear, viewMonth - 1, day);
  });

  // Current month days
  const currentMonthDays = Array.from({ length: totalDaysInMonth }, (_, i) => {
    return new Date(viewYear, viewMonth, i + 1);
  });

  // Next month leading days to complete 35 or 42 grid cells
  const totalRendered = prevMonthDays.length + currentMonthDays.length;
  const remainingCells = (totalRendered <= 35 ? 35 : 42) - totalRendered;
  const nextMonthDays = Array.from({ length: remainingCells }, (_, i) => {
    return new Date(viewYear, viewMonth + 1, i + 1);
  });

  const isToday = (d: Date) => {
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (d: Date) => {
    if (!selectedDate) return false;
    return (
      d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Raw user typing with automatic formatting
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d/]/g, '');
    
    // Auto insert slashes if user types numbers sequentially
    if (val.length === 2 && !val.includes('/') && value.length < 2) {
      val = val + '/';
    } else if (val.length === 5 && val.split('/').length === 2 && value.length < 5) {
      val = val + '/';
    }
    
    if (val.length <= 10) {
      onChange(val);
      const parsed = parseDDMMYYYY(val);
      if (parsed) {
        setViewDate(parsed);
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} id={`${id}-container`}>
      {/* Date Input Box */}
      <div
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border transition-all flex items-center justify-between cursor-pointer group ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <CalendarIcon className={`w-4 h-4 transition-colors ${value ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={value}
            onChange={handleInputChange}
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
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
            DD/MM/YYYY
          </span>
        </div>
      </div>

      {/* Animated Calendar Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 sm:right-auto sm:w-80 mt-2 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[400] text-slate-900 dark:text-white"
          >
            {/* Calendar Header with Month/Year Navigation */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{MONTH_NAMES[viewMonth]}</span>
                <span className="text-slate-400 dark:text-slate-500">{viewYear}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekdays Row */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 pt-2.5 pb-1">
              {WEEKDAYS.map((wd, i) => (
                <div key={i} className="py-1">
                  {wd}
                </div>
              ))}
            </div>

            {/* Days Grid with subtle motion */}
            <motion.div
              key={`${viewYear}-${viewMonth}`}
              initial={{ opacity: 0, x: slideDirection === 'right' ? 8 : -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-7 gap-1"
            >
              {/* Prev Month Days */}
              {prevMonthDays.map((d, i) => (
                <button
                  key={`prev-${i}`}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  className="h-8 rounded-lg text-xs text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center justify-center transition-colors cursor-pointer"
                >
                  {d.getDate()}
                </button>
              ))}

              {/* Current Month Days */}
              {currentMonthDays.map((d, i) => {
                const selected = isSelected(d);
                const current = isToday(d);
                return (
                  <motion.button
                    key={`curr-${i}`}
                    type="button"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelectDay(d)}
                    className={`h-8 rounded-xl text-xs font-bold flex items-center justify-center relative transition-all cursor-pointer ${
                      selected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-400'
                        : current
                        ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-black border border-blue-300 dark:border-blue-700'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {d.getDate()}
                    {current && !selected && (
                      <span className="absolute bottom-1 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
                    )}
                  </motion.button>
                );
              })}

              {/* Next Month Days */}
              {nextMonthDays.map((d, i) => (
                <button
                  key={`next-${i}`}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  className="h-8 rounded-lg text-xs text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center justify-center transition-colors cursor-pointer"
                >
                  {d.getDate()}
                </button>
              ))}
            </motion.div>

            {/* Quick Presets & Clear Footer */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-[11px]">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickPreset('today')}
                  className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 font-semibold transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('tomorrow')}
                  className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 font-semibold transition-colors"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('weekend')}
                  className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 font-semibold transition-colors"
                >
                  Weekend
                </button>
              </div>

              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  className="text-rose-500 hover:underline font-bold px-1.5 py-1"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
