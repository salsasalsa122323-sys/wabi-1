import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useLanguage } from '../../context/LanguageContext';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { language } = useLanguage();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2.5 rounded-2xl bg-amber-500/95 text-slate-950 font-bold px-4 py-2.5 text-xs shadow-2xl border border-amber-300 ring-2 ring-amber-500/30 animate-bounce">
      <WifiOff className="w-4 h-4 text-slate-950 shrink-0" />
      <span>
        {language === 'am'
          ? 'ከመስመር ውጭ (Offline) ሁነታ — መረጃዎች በስልክዎ/ኮምፒውተርዎ ላይ ይቀመጣሉ'
          : 'Offline Mode — Changes are saved locally on your device'}
      </span>
    </div>
  );
};
