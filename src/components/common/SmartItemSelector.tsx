import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, Sparkles, Tag, Layers } from 'lucide-react';
import { InventoryItem } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface SmartItemSelectorProps {
  items: InventoryItem[];
  selectedItemId: string;
  onSelectItem: (itemId: string) => void;
  placeholder?: string;
  className?: string;
}

export const SmartItemSelector: React.FC<SmartItemSelectorProps> = ({
  items,
  selectedItemId,
  onSelectItem,
  placeholder,
  className = '',
}) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
      setSelectedCategory('all');
    }
  }, [isOpen]);

  // Extract unique categories
  const categories = ['all', ...Array.from(new Set(items.map((i) => i.category || 'general').filter(Boolean)))];

  // Filter items by search query and category
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesNameAm = item.nameAm.toLowerCase().includes(query);
    const matchesNameEn = item.nameEn.toLowerCase().includes(query);
    const matchesCode = item.code.toLowerCase().includes(query);
    return matchesCategory && (matchesNameAm || matchesNameEn || matchesCode);
  });

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Selected Item Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-xs text-white hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all shadow-inner text-left"
      >
        {selectedItem ? (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              {selectedItem.code}
            </span>
            <span className="font-bold text-white truncate text-xs">
              {language === 'am' ? selectedItem.nameAm : selectedItem.nameEn}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              ({selectedItem.unitAm || selectedItem.unit})
            </span>
          </div>
        ) : (
          <span className="text-slate-400 text-xs">
            {placeholder || (language === 'am' ? 'ጥሬ እቃ ይምረጡ...' : 'Select ingredient...')}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-amber-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full sm:min-w-[320px] max-w-[420px] bg-slate-900 border border-amber-500/50 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-950/90 space-y-2">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'am' ? 'በስም ወይም በኮድ ይፈልጉ...' : 'Search by name or code...'}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Category Filter Pills */}
            {categories.length > 2 && (
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {cat === 'all' ? (language === 'am' ? 'ሁሉም' : 'All') : cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60 p-1">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                {language === 'am' ? 'የተገኘ ጥሬ እቃ የለም' : 'No matching items found'}
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.id === selectedItemId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectItem(item.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all text-xs ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                        : 'hover:bg-slate-800/80 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-700 shrink-0">
                        {item.code}
                      </span>
                      <div className="truncate">
                        <span className="font-bold text-white block truncate">
                          {language === 'am' ? item.nameAm : item.nameEn}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span>{item.category || 'general'}</span>
                          <span>•</span>
                          <span className="text-amber-400/90 font-mono">
                            {item.weightedAvgCost ? `${item.weightedAvgCost} ብር/${item.unitAm}` : item.unitAm}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        ስቶክ: {item.currentCentralStock} {item.unitAm}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Count */}
          <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
            <span>{filteredItems.length} {language === 'am' ? 'እቃዎች ተገኝተዋል' : 'items'}</span>
            <span className="text-amber-400/70">Smart Search ⚡</span>
          </div>
        </div>
      )}
    </div>
  );
};
