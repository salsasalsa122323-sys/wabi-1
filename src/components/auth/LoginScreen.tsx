import React, { useState } from 'react';
import { Lock, Mail, ShieldCheck, Sparkles, AlertCircle, UserCheck, KeyRound, Building2 } from 'lucide-react';
import { useAuth, SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const LoginScreen: React.FC = () => {
  const { login, loading, hasCustomPassword } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError(language === 'am' ? 'እባክዎ ኢሜይል እና የይለፍ ቃል ያስገቡ' : 'Please enter email and password');
      return;
    }
    const res = await login(email, password);
    if (!res.success && res.error) {
      setError(res.error);
    }
  };

  const handleQuickLoginAs = async (targetEmail: string, defaultPass = 'Bello@2026') => {
    setEmail(targetEmail);
    setError(null);
    if (hasCustomPassword(targetEmail)) {
      setPassword('');
      setError(
        language === 'am'
          ? 'ለዚህ አካውንት አዲስ የይለፍ ቃል ተቀምጧል፤ እባክዎ ያዘጋጁትን የይለፍ ቃል አስገብተው "ግባ" ይጫኑ።'
          : 'A custom password is set for this account. Enter your password and click Sign In.'
      );
      return;
    }
    setPassword(defaultPass);
    await login(targetEmail, defaultPass);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-amber-500/10 via-amber-500/[0.03] to-transparent pointer-events-none -z-10 blur-3xl"></div>

      {/* Language Switcher in top right */}
      <div className="absolute top-5 right-5 z-20 flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setLanguage('am')}
          className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
            language === 'am' ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          አማርኛ
        </button>
        <button
          onClick={() => setLanguage('en')}
          className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
            language === 'en' ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          English
        </button>
      </div>

      <div className="max-w-md w-full bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-1">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 tracking-wide">
            {language === 'am' ? 'የሆቴልና ሬስቶራንት F&B ቁጥጥር ሲስተም' : 'Enterprise F&B Multi-Hotel Control'}
          </h2>
          <p className="text-xs text-slate-400">
            {language === 'am'
              ? 'ለመግባት እባክዎ በFirebase Authentication የተመዘገበ ኢሜይልና የይለፍ ቃል ይጠቀሙ'
              : 'Sign in to access your hotel, store, and branch records'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 block mb-1.5 font-bold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'am' ? 'ኢሜይል (Email)' : 'Email Address'}</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. salsasalsa122323@gmail.com"
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400 text-xs font-mono shadow-inner"
            />
          </div>

          <div>
            <label className="text-slate-300 block mb-1.5 font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'am' ? 'የይለፍ ቃል (Password)' : 'Password'}</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400 text-xs font-mono shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-xl shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4 text-slate-950" />
            <span>{loading ? (language === 'am' ? 'እየገባ ነው...' : 'Signing in...') : (language === 'am' ? 'ግባ (Sign In)' : 'Sign In')}</span>
          </button>
        </form>

        {/* Quick Demo Access Bar */}
        <div className="pt-3 border-t border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
            <span>{language === 'am' ? '⚡ ፈጣን መግቢያ (Quick Access):' : '⚡ Quick Test Logins:'}</span>
            <span className="text-amber-400 font-mono">Firebase Auth</span>
          </div>

          {/* Super Admin Quick Button */}
          <button
            type="button"
            onClick={() => handleQuickLoginAs(SUPER_ADMIN_EMAIL)}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border border-amber-500/50 hover:border-amber-400 text-amber-300 text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center font-black text-xs">👑</span>
              <div className="text-left">
                <span className="font-black text-white block">{SUPER_ADMIN_NAME} (Super Admin)</span>
                <span className="text-[10px] text-slate-400 font-mono">{SUPER_ADMIN_EMAIL}</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30">
              {language === 'am' ? 'ሁሉንም ይቆጣጠራል' : 'Full Access'}
            </span>
          </button>

          {/* Role test accounts */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <button
              type="button"
              onClick={() => handleQuickLoginAs('manager.kokonut@bellofam.com')}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-left transition-all"
            >
              <strong className="text-amber-300 block">🏨 Hotel Manager</strong>
              <span className="text-slate-500 truncate block">manager.kokonut</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLoginAs('chef.6kilo@bellofam.com')}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-left transition-all"
            >
              <strong className="text-indigo-300 block">👨‍🍳 Kitchen Chef</strong>
              <span className="text-slate-500 truncate block">chef.6kilo</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLoginAs('storekeeper@bellofam.com')}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-left transition-all"
            >
              <strong className="text-emerald-300 block">📦 Store Keeper</strong>
              <span className="text-slate-500 truncate block">storekeeper</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLoginAs('cashier.shola@bellofam.com')}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-left transition-all"
            >
              <strong className="text-rose-300 block">🧾 Cashier (POS)</strong>
              <span className="text-slate-500 truncate block">cashier.shola</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-slate-500 border-t border-slate-800/60 pt-2 font-mono">
          🔒 Secured by Firebase Firestore Rules & Authentication
        </div>
      </div>
    </div>
  );
};
