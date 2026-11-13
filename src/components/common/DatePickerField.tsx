import React from 'react';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import { formatEthiopianDate, getTodayDateString, getRelativeDateString } from '../../utils/ethiopianDate';
import { useLanguage } from '../../context/LanguageContext';

interface DatePickerFieldProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  required?: boolean;
  className?: string;
  helperText?: string;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onChange,
  required = false,
  className = '',
  helperText,
}) => {
  const { language, t } = useLanguage();
  const ethDateFormatted = formatEthiopianDate(value || getTodayDateString(), language);
  const todayStr = getTodayDateString();
  const yesterdayStr = getRelativeDateString(-1);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
          <label className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{label}</span>
            {required && <span className="text-rose-500">*</span>}
          </label>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-medium border border-amber-200/60 dark:border-amber-800/40 text-[11px]">
            <span>🇪🇹 {ethDateFormatted}</span>
          </span>
        </div>
      )}

      <div className="relative flex items-center">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full px-3 py-2 pl-9 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all shadow-xs"
        />
        <Calendar className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
      </div>

      {/* Quick Select Preset Buttons for speed */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={() => onChange(todayStr)}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            value === todayStr
              ? 'bg-emerald-600 text-white font-medium shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
          }`}
        >
          {t.common.today}
        </button>
        <button
          type="button"
          onClick={() => onChange(yesterdayStr)}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            value === yesterdayStr
              ? 'bg-emerald-600 text-white font-medium shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
          }`}
        >
          {t.common.yesterday}
        </button>
        {helperText && (
          <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-auto truncate">
            {helperText}
          </span>
        )}
      </div>
    </div>
  );
};
