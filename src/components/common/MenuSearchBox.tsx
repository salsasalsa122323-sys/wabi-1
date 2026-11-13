import React from 'react';
import { Search, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface MenuSearchBoxProps {
  query: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
  totalCount?: number;
  className?: string;
}

export const MenuSearchBox: React.FC<MenuSearchBoxProps> = ({
  query,
  onChange,
  placeholder,
  resultCount,
  totalCount,
  className = '',
}) => {
  const { language } = useLanguage();

  const defaultPlaceholder =
    placeholder ||
    (language === 'am'
      ? 'የምግቡን ስም፣ ምድብ ወይም ኮድ በፈጣን ሰርች ፈልግ (ለምሳሌ፦ በርገር፣ ፒዛ፣ Tibs)...'
      : 'Search menu by name, category, or code (e.g. Burger, Pizza, Tibs)...');

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        {/* Magnifier Icon */}
        <div className="absolute left-3.5 flex items-center pointer-events-none text-amber-400">
          <Search className="w-4 h-4" />
        </div>

        {/* Input Field */}
        <input
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder={defaultPlaceholder}
          className="w-full pl-10 pr-20 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 font-medium transition-all outline-none"
        />

        {/* Right Action: Clear Button & Result Count Badge */}
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {query && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={language === 'am' ? 'ፍለጋውን አጽዳ' : 'Clear search'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {typeof resultCount === 'number' && (
            <span className="text-[11px] font-mono font-bold text-amber-300/80 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
              {resultCount}
              {typeof totalCount === 'number' ? `/${totalCount}` : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
