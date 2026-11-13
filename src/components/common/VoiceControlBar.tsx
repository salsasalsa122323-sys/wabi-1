import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Check, X, ArrowRight } from 'lucide-react';
import { useVoiceInput, ParsedVoiceCommand } from '../../hooks/useVoiceInput';
import { useLanguage } from '../../context/LanguageContext';

interface VoiceControlBarProps {
  onApplyVoiceCommand: (cmd: ParsedVoiceCommand) => void;
  availableDishes?: { id: string; nameAm: string; nameEn: string }[];
  availableItems?: { id: string; nameAm: string; nameEn: string }[];
}

export const VoiceControlBar: React.FC<VoiceControlBarProps> = ({
  onApplyVoiceCommand,
  availableDishes = [],
  availableItems = [],
}) => {
  const { language } = useLanguage();
  const { isListening, transcript, isSupported, errorMessage, startListening, stopListening, parseVoiceCommand } = useVoiceInput();
  const [selectedLang, setSelectedLang] = useState<'am-ET' | 'en-US'>('am-ET');
  const [lastActionMsg, setLastActionMsg] = useState<string | null>(null);

  // When speech transcript completes and user stops listening
  useEffect(() => {
    if (transcript && !isListening) {
      const parsed = parseVoiceCommand(transcript);

      // Match dish name if found
      const lowerT = transcript.toLowerCase();
      const matchedDish = availableDishes.find(
        (d) => lowerT.includes(d.nameAm.toLowerCase()) || lowerT.includes(d.nameEn.toLowerCase())
      );
      if (matchedDish) {
        parsed.matchedDishName = matchedDish.nameAm;
      }

      // Match raw item if found
      const matchedItem = availableItems.find(
        (i) => lowerT.includes(i.nameAm.toLowerCase()) || lowerT.includes(i.nameEn.toLowerCase())
      );
      if (matchedItem) {
        parsed.matchedItemId = matchedItem.id;
      }

      onApplyVoiceCommand(parsed);
      setLastActionMsg(
        language === 'am'
          ? `ድምጽ ተቀብሏል፦ "${transcript}"`
          : `Voice recognized: "${transcript}"`
      );
      setTimeout(() => setLastActionMsg(null), 4000);
    }
  }, [isListening, transcript]);

  if (!isSupported) {
    return null; // Gracefully omit if browser doesn't have Speech API
  }

  return (
    <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (isListening) {
              stopListening();
            } else {
              startListening(selectedLang);
            }
          }}
          className={`p-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg ${
            isListening
              ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-500/30'
              : 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black shadow-amber-500/20 hover:scale-105'
          }`}
        >
          {isListening ? (
            <>
              <MicOff className="w-4 h-4 text-white" />
              <span>{language === 'am' ? 'እያዳመጠ ነው... (አቁም)' : 'Listening... (Stop)'}</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 text-slate-950" />
              <span>{language === 'am' ? '🎙️ በድምጽ አስገባ (Voice)' : '🎙️ Voice Input'}</span>
            </>
          )}
        </button>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-300 text-xs">
              {language === 'am' ? 'ስማርት የድምጽ ቴክኖሎጂ' : 'Smart Voice Dictation'}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono">
              AI Speech ⚡
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {isListening
              ? (language === 'am' ? 'ይናገሩ፦ ለምሳሌ "50 ጥብስ" ወይም "ስጋ 15 ኪሎ"...' : 'Speak: e.g. "50 Tibs" or "Beef 15kg"...')
              : (language === 'am' ? 'ምግቦችንና ቁጥሮችን በድምጽዎ በቀጥታ ይናገሩ' : 'Speak dish names and numbers directly')}
          </p>
        </div>
      </div>

      {/* Real-time speech transcript or action confirmation */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        {transcript && isListening && (
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-400/50 text-amber-300 font-mono text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span className="truncate max-w-[200px]">"{transcript}"</span>
          </div>
        )}

        {lastActionMsg && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate max-w-[240px]">{lastActionMsg}</span>
          </div>
        )}

        {errorMessage && (
          <div className="px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Language selector for voice recognition */}
        <div className="flex items-center bg-slate-950 rounded-xl p-0.5 border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setSelectedLang('am-ET')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
              selectedLang === 'am-ET' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            አማርኛ
          </button>
          <button
            type="button"
            onClick={() => setSelectedLang('en-US')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
              selectedLang === 'en-US' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            English
          </button>
        </div>
      </div>
    </div>
  );
};
