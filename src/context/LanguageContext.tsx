import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';
import { Language } from '../types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations['am'];
  formatCurrency: (amount: number) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('eth_erp_lang');
    return (saved === 'en' || saved === 'am') ? saved : 'am'; // Default to Amharic as user requested!
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('eth_erp_lang', lang);
    } catch {
      // ignore
    }
  };

  const t = translations[language];

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);

    return language === 'am' ? `${formatted} ብር` : `${formatted} ETB`;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatCurrency }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
