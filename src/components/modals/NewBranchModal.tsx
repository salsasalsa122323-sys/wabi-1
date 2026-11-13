import React, { useState } from 'react';
import { X, Building2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { Branch } from '../../types';

interface NewBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewBranchModal: React.FC<NewBranchModalProps> = ({ isOpen, onClose }) => {
  const { addNewBranch, branches } = useApp();
  const { language, t } = useLanguage();

  const [nameAm, setNameAm] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [code, setCode] = useState(`BR-0${branches.length + 1}`);
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [phone, setPhone] = useState('+251 ');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAm.trim()) return;

    const newBranch: Branch = {
      id: `br-${Date.now()}`,
      nameAm: nameAm.trim(),
      nameEn: nameEn.trim() || nameAm.trim(),
      code: code.trim(),
      location: location.trim() || 'አዲስ አበባ',
      manager: manager.trim() || 'ማናጀር',
      phone: phone.trim(),
    };

    addNewBranch(newBranch);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {t.modals.addBranchTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'am' ? 'ራሱን የቻለ ሌጀር የሚዘጋጅለት አዲስ ቅርንጫፍ' : 'Register branch with independent balance & ledger'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {language === 'am' ? 'የቅርንጫፍ ስም (በአማርኛ)' : 'Branch Name (Amharic)'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="ለምሳሌ፡ መገናኛ ቅርንጫፍ"
              value={nameAm}
              onChange={(e) => setNameAm(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {language === 'am' ? 'የቅርንጫፍ ስም (በእንግሊዝኛ)' : 'Branch Name (English)'}
            </label>
            <input
              type="text"
              placeholder="e.g. Megenagna Branch"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {language === 'am' ? 'መለያ ኮድ' : 'Branch Code'}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t.branches.manager}
              </label>
              <input
                type="text"
                placeholder="ለምሳሌ፡ ዮሴፍ በቀለ"
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t.branches.location}
            </label>
            <input
              type="text"
              placeholder="ለምሳሌ፡ መገናኛ ማራቶን ህንጻ"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t.branches.phone}
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium shadow-sm transition-all"
            >
              {t.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
