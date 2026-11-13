import React, { useState } from 'react';
import { X, PackagePlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { InventoryItem, ItemCategory, UnitType } from '../../types';
import { getTodayDateString, formatEthiopianDate } from '../../utils/ethiopianDate';

interface NewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewItemModal: React.FC<NewItemModalProps> = ({ isOpen, onClose }) => {
  const { addNewItem, items } = useApp();
  const { language, t } = useLanguage();

  const [nameAm, setNameAm] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [category, setCategory] = useState<ItemCategory>('produce');
  const [unit, setUnit] = useState<UnitType>('kg');
  const [unitAm, setUnitAm] = useState('ኪ.ግ');
  const [initialPrice, setInitialPrice] = useState<number | ''>('');
  const [initialStock, setInitialStock] = useState<number | ''>(0);
  const [minAlert, setMinAlert] = useState<number | ''>(20);
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUnitChange = (u: UnitType) => {
    setUnit(u);
    const unitMap: Record<UnitType, string> = {
      kg: 'ኪ.ግ',
      liter: 'ሊትር',
      quintal: 'ኩንታል',
      gram: 'ግራም',
      pcs: 'ፍሬ',
      pack: 'ፓኬት',
      bottle: 'ጠርሙስ',
    };
    setUnitAm(unitMap[u]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!nameAm.trim()) return;

    // Duplicate check: Prevent registering identical item names
    const cleanName = nameAm.trim().toLowerCase();
    const existing = items.find(
      (it) =>
        it.nameAm.trim().toLowerCase() === cleanName ||
        (it.nameEn && it.nameEn.trim().toLowerCase() === cleanName)
    );

    if (existing) {
      setErrorMessage(
        language === 'am'
          ? `ይህ ዕቃ («${existing.nameAm}») አስቀድሞ በስቶር ተመዝግቧል! አንድ አይነት ዕቃ ደጋግሞ መመዝገብ አይቻልም።`
          : `Item "${existing.nameAm}" already exists! Duplicate items are not allowed.`
      );
      return;
    }

    const price = typeof initialPrice === 'number' ? initialPrice : 0;
    const stock = typeof initialStock === 'number' ? initialStock : 0;
    const minLvl = typeof minAlert === 'number' ? minAlert : 10;
    const today = getTodayDateString();

    const newItem: InventoryItem = {
      id: `item-${Date.now()}`,
      nameAm: nameAm.trim(),
      nameEn: nameEn.trim() || nameAm.trim(),
      code: `RM-${category.slice(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      category,
      unit,
      unitAm,
      minStockLevel: minLvl,
      currentCentralStock: stock,
      weightedAvgCost: price,
      lastPurchasePrice: price,
      priceHistory: price > 0 ? [
        {
          date: today,
          ethiopianDateStr: formatEthiopianDate(today),
          price,
          quantity: stock,
          supplier: 'የመጀመሪያ ክምችት',
          grnNumber: 'INIT-001',
        }
      ] : [],
      description: description.trim(),
    };

    addNewItem(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-amber-500/40 text-slate-100 transition-all">
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {language === 'am' ? 'አዲስ ጥሬ ዕቃ መመዝገቢያ' : t.modals.addItemTitle}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'am' ? 'አዲስ ጥሬ እቃ ወደ ማዕከላዊ ስቶር መዝገብ አስገባ' : 'Register new material in central inventory'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-semibold animate-shake">
              ⚠️ {errorMessage}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-amber-300 mb-1.5">
              {language === 'am' ? 'የጥሬ ዕቃው ስም (በአማርኛ)' : 'Material Name (Amharic)'} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="ለምሳሌ፡ ድንች፣ የዶሮ ስጋ፣ ቅቤ..."
              value={nameAm}
              onChange={(e) => setNameAm(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-300 mb-1.5">
              {language === 'am' ? 'የጥሬ ዕቃው ስም (በእንግሊዝኛ)' : 'Material Name (English)'}
            </label>
            <input
              type="text"
              placeholder="e.g. Potato, Chicken, Butter..."
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1.5">
                {t.common.category}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-xs sm:text-sm text-white focus:bg-slate-900 focus:border-amber-400"
              >
                <option value="produce">{language === 'am' ? 'አትክልትና ፍራፍሬ' : 'Produce'}</option>
                <option value="meat">{language === 'am' ? 'ስጋና ዶሮ' : 'Meat & Poultry'}</option>
                <option value="grain">{language === 'am' ? 'እህልና ዱቄት' : 'Grains & Flour'}</option>
                <option value="dairy">{language === 'am' ? 'የወተት ውጤቶች' : 'Dairy'}</option>
                <option value="spices">{language === 'am' ? 'ቅመማ ቅመም' : 'Spices'}</option>
                <option value="oil">{language === 'am' ? 'ዘይትና ቅባት' : 'Oil & Fats'}</option>
                <option value="beverage">{language === 'am' ? 'መጠጦች' : 'Beverages'}</option>
                <option value="packaging">{language === 'am' ? 'ማሸጊያ' : 'Packaging'}</option>
                <option value="other">{language === 'am' ? 'ሌላ' : 'Other'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1.5">
                {t.common.unit}
              </label>
              <select
                value={unit}
                onChange={(e) => handleUnitChange(e.target.value as UnitType)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-xs sm:text-sm text-white focus:bg-slate-900 focus:border-amber-400"
              >
                <option value="kg">ኪሎ ግራም (kg)</option>
                <option value="liter">ሊትር (liter)</option>
                <option value="quintal">ኩንታል (quintal)</option>
                <option value="gram">ግራም (gram)</option>
                <option value="pcs">ፍሬ (pcs)</option>
                <option value="pack">ፓኬት (pack)</option>
                <option value="bottle">ጠርሙስ (bottle)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1.5">
                {language === 'am' ? 'የአንዱ የመነሻ ገበያ ዋጋ (ብር)' : 'Initial Unit Price (ETB)'}
              </label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={initialPrice}
                onChange={(e) => setInitialPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-xs sm:text-sm text-amber-300 placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-400 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1.5">
                {language === 'am' ? 'የመነሻ ክምችት' : 'Initial Stock'}
              </label>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-400 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-300 mb-1.5">
              {language === 'am' ? 'አነስተኛ ክምችት ማስጠንቀቂያ (Reorder Level)' : 'Reorder Alert Level'}
            </label>
            <input
              type="number"
              step="any"
              placeholder="10"
              value={minAlert}
              onChange={(e) => setMinAlert(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-400 font-mono font-bold"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs shadow-lg shadow-emerald-950/50 transition-all ring-1 ring-emerald-400/40"
            >
              {language === 'am' ? 'ጥሬ ዕቃውን መዝግብ' : t.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
