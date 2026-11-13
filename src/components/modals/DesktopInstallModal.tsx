import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Laptop,
  Download,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Share2,
  Terminal,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Wifi,
  Layers,
  RefreshCw,
  ArrowRightLeft,
  KeyRound,
  FileDown,
  Info,
  HardDrive,
  FolderDown,
  PlayCircle,
  FileText,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface DesktopInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopInstallModal: React.FC<DesktopInstallModalProps> = ({ isOpen, onClose }) => {
  const { language, t } = useLanguage();
  const { isInstallable, isInstalled, isIOS, isAndroid, isMobile, install } = usePWAInstall();
  const { getSyncCode, applySyncCode, exportFullBackup, items, recipes, schedules, branches } = useApp();
  
  // Default tab set to Desktop / Laptop App
  const [activeTab, setActiveTab] = useState<'laptop' | 'windows' | 'sync' | 'mobile' | 'developer'>('laptop');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSyncCode, setCopiedSyncCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [appUrl, setAppUrl] = useState('');
  const [inputSyncCode, setInputSyncCode] = useState('');
  const [syncStatus, setSyncStatus] = useState<{ message: string; success: boolean } | null>(null);

  const handleDownloadWindowsShortcut = () => {
    const currentUrl = appUrl || (typeof window !== 'undefined' ? window.location.href : '');
    const content = `[InternetShortcut]\r\nURL=${currentUrl}\r\nIconIndex=0\r\n`;
    const blob = new Blob([content], { type: 'application/internet-shortcut' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Bello_Fam_Restaurant_ERP.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenStandaloneWindow = () => {
    const currentUrl = appUrl || (typeof window !== 'undefined' ? window.location.href : '');
    window.open(currentUrl, '_blank', 'menubar=no,status=no,toolbar=no,location=no,scrollbars=yes,resizable=yes');
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.href);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const url = appUrl || window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopySyncCode = () => {
    try {
      const code = getSyncCode();
      navigator.clipboard.writeText(code);
      setCopiedSyncCode(true);
      setTimeout(() => setCopiedSyncCode(false), 3000);
    } catch {
      alert(language === 'am' ? 'የዳታ ኮድ ማመንጨት አልተቻለም' : 'Failed to generate sync code');
    }
  };

  const handleApplySyncCode = async () => {
    if (!inputSyncCode.trim()) {
      setSyncStatus({
        message: language === 'am' ? 'እባክዎ መጀመሪያ ኮዱን እዚህ ያስገቡ (Paste Code)' : 'Please paste your sync code first',
        success: false,
      });
      return;
    }
    const success = await applySyncCode(inputSyncCode);
    if (success) {
      setSyncStatus({
        message: language === 'am' ? 'ዳታው በስኬት ተጭኗል! ሁሉም እቃዎች እና ስኬጁሎች ተመሳስለዋል' : 'Data synced and imported successfully!',
        success: true,
      });
      setInputSyncCode('');
      setTimeout(() => {
        setSyncStatus(null);
      }, 5000);
    } else {
      setSyncStatus({
        message: language === 'am' ? 'የተሳሳተ ወይም የተበላሸ ኮድ ነው። እባክዎ እንደገና በትክክል ኮፒ አድርገው ይሞክሩ።' : 'Invalid sync code. Please check and try again.',
        success: false,
      });
    }
  };

  const handleInstallDirect = async () => {
    if (isInstallable) {
      await install();
    } else {
      if (isIOS) {
        alert(
          language === 'am'
            ? 'በ iPhone/iPad ላይ ለመጫን፡ በ Safari ብራውዘር ታች የሚገኘውን የ "Share" (📤) ምልክት ተጭነው "Add to Home Screen" (➕) የሚለውን ይምረጡ።'
            : 'To install on iOS: Tap the "Share" (📤) icon at the bottom of Safari, then choose "Add to Home Screen" (➕).'
        );
      } else {
        alert(
          language === 'am'
            ? 'በብራውዘርዎ የላይኛው አድራሻ ማስገቢያ በስተቀኝ በኩል የሚታየውን 🖥️/⬇️ የመጫኛ ምልክት (Install) ይጫኑ፣ ወይም ሜኑ (⋮) ገብተው "Install app" ወይም "Add to Home Screen" የሚለውን ይምረጡ።'
            : 'Click the Install icon (🖥️/⬇️) in your browser address bar or open menu (⋮) and choose "Install app" / "Add to Home Screen".'
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Luxury Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-amber-500/20 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500">
                {language === 'am' ? 'ስልክ/ላፕቶፕ መጫኛ እና ዳታ ማስተላለፊያ' : 'Install App & Sync Data Between Devices'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'am' ? 'የነበረዎትን ዳታ ወደ ስልክዎ ማስተላለፍ እና ያለ ኢንተርኔት መጠቀም' : 'Transfer existing data to phone & run offline'}
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

        {/* Tab Selection Navigation */}
        <div className="flex items-center border-b border-slate-800 px-4 sm:px-6 pt-3 gap-2 text-xs font-bold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('laptop')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'laptop'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-4 h-4 text-amber-400" />
            <span>{language === 'am' ? '💻 እንደ ኮምፒውተር መተግበሪያ (Desktop App)' : '💻 Desktop App (1-Click)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('windows')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'windows'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>{language === 'am' ? '📁 ወደ Local Disk (C:) መጫኛ' : '📁 Windows Local Disk (C:)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'sync'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
            <span>{language === 'am' ? '🔄 ዳታ ወደ ስልክ ማስተላለፊያ' : '🔄 Data Sync'}</span>
          </button>

          <button
            onClick={() => setActiveTab('mobile')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'mobile'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{language === 'am' ? '📱 በሞባይል ስልክ' : '📱 Mobile Phone'}</span>
          </button>

          <button
            onClick={() => setActiveTab('developer')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'developer'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>{language === 'am' ? '⚡ Terminal' : '⚡ Terminal'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">

          {/* TAB: WINDOWS PC LOCAL DISK (C:) SUITE */}
          {activeTab === 'windows' && (
            <div className="space-y-4">
              
              {/* Hero Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950 border border-amber-500/40 space-y-3">
                <div className="flex items-start gap-3 text-amber-300">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 border border-amber-500/30">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400">
                      {language === 'am'
                        ? 'በኮምፒውተርዎ Local Disk (C:) ላይ መጫኛ እና ዳታዎን መጠበቂያ'
                        : 'Windows PC Local Disk (C:) Offline Suite & Data Protection'}
                    </h4>
                    <p className="text-slate-300 text-xs leading-relaxed mt-1">
                      {language === 'am'
                        ? 'ይህ አማራጭ አፕሊኬሽኑን ሙሉ ለሙሉ ወደ ኮምፒውተርዎ Local Disk (C:) ወስደው ያለ ምንም ኢንተርኔት ወይም የዳታ መጥፋት ስጋት በቀጥታ ደብል ክሊክ በማድረግ እንደ ማንኛውም የኮምፒውተር ሶፍትዌር እንዲጠቀሙ ያደርግልዎታል።'
                        : 'Run the entire application and database directly on your computer Local Disk (C:). Completely offline, safe, and launches with a simple double-click.'}
                    </p>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <a
                    href="/api/export-full-source-zip"
                    download="Ethiopia_FNB_ERP_CleanZero_FullStack.zip"
                    className="p-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all text-xs sm:col-span-2"
                  >
                    <FolderDown className="w-4 h-4 text-slate-950" />
                    <span>{language === 'am' ? '📦 ሙሉ ባክኤንድና ፍሮንትኤንድ ፋይል አውርድ (.zip — Clean Zero)' : '📦 Download Full-Stack Clean-Zero Source (.zip)'}</span>
                  </a>

                  <a
                    href="/Ethiopia_Restaurant_ERP_Source.tar.gz"
                    download="Ethiopia_Restaurant_ERP_CleanZero_Package.tar.gz"
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 border border-amber-500/30 font-bold flex items-center justify-center gap-2 transition-colors text-xs"
                  >
                    <FolderDown className="w-4 h-4 text-amber-400" />
                    <span>{language === 'am' ? '📦 .tar.gz ፓኬጅ አውርድ' : '📦 Download (.tar.gz)'}</span>
                  </a>

                  <button
                    onClick={exportFullBackup}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold flex items-center justify-center gap-2 transition-colors text-xs"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>{language === 'am' ? '💾 የዛሬውን ዳታ ባክአፕ አውርድ (.json)' : '💾 Download Today Data (.json)'}</span>
                  </button>
                </div>
              </div>

              {/* Step by Step Visual Guide */}
              <div className="space-y-3">
                <h5 className="font-bold text-slate-200 text-xs flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-amber-400" />
                  <span>{language === 'am' ? 'በ Local Disk (C:) ላይ ለመጠቀም 3ቱ ቀላል ደረጃዎች፦' : '3 Simple Steps to Run on Local Disk (C:):'}</span>
                </h5>

                {/* Step 1 */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-[10px] shrink-0 border border-amber-500/30">1</span>
                    <strong className="text-amber-300 text-xs">
                      {language === 'am' ? 'ደረጃ 1፦ ፋይሉን ወደ Local Disk (C:) መውሰድ' : 'Step 1: Move Files to Local Disk (C:)'}
                    </strong>
                  </div>
                  <p className="text-slate-300 text-xs pl-7 leading-relaxed">
                    {language === 'am'
                      ? 'የወረደውን ማህደር በኮምፒውተርዎ «Local Disk (C:)» ውስጥ «C:\\Ethiopia_Restaurant_ERP» በሚል ፎልደር ውስጥ ይክፈቱት (Extract ያድርጉት)።'
                      : 'Extract the downloaded archive into "C:\\Ethiopia_Restaurant_ERP" on your computer Local Disk (C:).'}
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-[10px] shrink-0 border border-amber-500/30">2</span>
                    <strong className="text-amber-300 text-xs">
                      {language === 'am' ? 'ደረጃ 2፦ የመጀመሪያ ጊዜ ዝግጅት (First Time Setup)' : 'Step 2: One-Time Setup'}
                    </strong>
                  </div>
                  <p className="text-slate-300 text-xs pl-7 leading-relaxed">
                    {language === 'am'
                      ? 'በፎልደሩ ውስጥ የሚገኘውን «SETUP_WINDOWS.bat» የሚለውን ፋይል ደብል ክሊክ (Double click) ያድርጉ። አስፈላጊ ፋይሎችን በራሱ ጫን አድርጎ ያዘጋጅልዎታል።'
                      : 'Double click "SETUP_WINDOWS.bat" inside the folder. It will prepare and install all dependencies automatically.'}
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-[10px] shrink-0 border border-emerald-500/30">3</span>
                    <strong className="text-emerald-300 text-xs">
                      {language === 'am' ? 'ደረጃ 3፦ አፕሊኬሽኑን ማስጀመር (Daily 1-Click Launch)' : 'Step 3: Daily 1-Click Launch'}
                    </strong>
                  </div>
                  <p className="text-slate-300 text-xs pl-7 leading-relaxed">
                    {language === 'am'
                      ? '«START_ERP.bat» የሚለውን ፋይል ደብል ክሊክ ሲያደርጉት አፕሊኬሽኑ በኮምፒውተርዎ ላይ ወዲያውኑ ይከፈትልዎታል። ለቀጣይ ፈጣን አጠቃቀም «START_ERP.bat» ላይ Right-click አድርገው ወደ ዴስክቶፕ Shortcut ማድረግ ይችላሉ!'
                      : 'Double click "START_ERP.bat" to start the application instantly on your PC! You can create a desktop shortcut for quick access.'}
                  </p>
                </div>
              </div>

              {/* Separate Bat Scripts Direct Download if needed */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 block text-xs">
                  {language === 'am' ? 'የማስጀመሪያ ፋይሎችን ለብቻ ለማውረድ፦' : 'Individual Windows Launcher Scripts:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/START_ERP.bat"
                    download="START_ERP.bat"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>START_ERP.bat</span>
                  </a>
                  <a
                    href="/SETUP_WINDOWS.bat"
                    download="SETUP_WINDOWS.bat"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>SETUP_WINDOWS.bat</span>
                  </a>
                  <a
                    href="/README_WINDOWS_AMHARIC.txt"
                    download="README_WINDOWS_AMHARIC.txt"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>{language === 'am' ? 'የአማርኛ መመሪያ ሰነድ (.txt)' : 'Amharic Guide (.txt)'}</span>
                  </a>
                </div>
              </div>

              {/* Data Safety Note */}
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3 text-emerald-200">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="block text-emerald-300 text-xs">
                    {language === 'am' ? 'ዳታዎን በ Local Disk (C:) ውስጥ በደህንነት እንዴት ይጠብቃሉ?' : 'How your data is 100% safe on Drive C:'}
                  </strong>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {language === 'am'
                      ? 'አፕሊኬሽኑ በኮምፒውተርዎ ሲሰራ መረጃዎችዎን በሙሉ በኮምፒውተርዎ ባለከፍተኛ አቅም IndexedDB ውስጥ ያስቀምጣል። በተጨማሪም በማንኛውም ጊዜ «ዳታ ባክአፕ አውርድ (.json)» የሚለውን በመጫን የሙሉ መረጃዎን ፋይል በኮምፒውተርዎ C: ድራይቭ ላይ ማስቀመጥ ይችላሉ።'
                      : 'All records are saved directly into your computer persistent IndexedDB vault. You can also export full JSON backups anytime onto your C: drive.'}
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 0: SYNC & TRANSFER DATA TO PHONE */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              {/* Explanation Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-950 to-slate-900 border border-amber-500/30 space-y-2.5">
                <div className="flex items-start gap-2.5 text-amber-300">
                  <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-amber-300">
                      {language === 'am'
                        ? 'ሊንኩን በሌላ ስልክ/ብራውዘር ሲከፍቱ ዳታው ለምን እንደ አዲስ ጀመረ?'
                        : 'Why did the app open empty when opening on a new device or browser?'}
                    </h4>
                    <p className="text-slate-300 text-xs leading-relaxed mt-1">
                      {language === 'am'
                        ? 'የነበረዎ ዳታ አልጠፋም! በብራውዘር የደህንነት ህግ (Browser Storage Security) መሰረት፣ በአንድ ኮምፒውተር ላይ የሞሉት መረጃ በኮምፒውተርዎ ሚሞሪ ውስጥ ብቻ ነው የሚቀመጠው፤ በራሱ ጊዜ ወደ ሌላ ስልክ ወይም አዲስ ብራውዘር አይተላለፍም። የነበረዎትን ዳታ ወደ ስልክዎ ለማስገባት ከታች ያሉትን 2 እጅግ ቀላል መንገዶች ይጠቀሙ፦'
                        : 'Your data is safe! Web browsers isolate storage per device. Follow the 2 simple options below to transfer all your data to your phone.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Message */}
              {syncStatus && (
                <div
                  className={`p-3 rounded-2xl border flex items-center gap-2.5 text-xs font-bold ${
                    syncStatus.success
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                  }`}
                >
                  {syncStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
                  <span>{syncStatus.message}</span>
                </div>
              )}

              {/* OPTION 1: 1-Click Sync Code (Fastest) */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="font-bold text-amber-300 flex items-center gap-2 text-xs sm:text-sm">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>{language === 'am' ? 'አማራጭ 1፦ በዳታ ማስተላለፊያ ኮድ (በ 3 ሴኮንድ ውስጥ)' : 'Option 1: Transfer Code (Fastest)'}</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    {language === 'am' ? 'እጅግ ቀላል' : 'Recommended'}
                  </span>
                </div>

                {/* Sub-step A: On Computer / Sender */}
                <div className="space-y-2">
                  <p className="text-slate-300 text-xs">
                    <strong className="text-amber-300">ሀ. ዳታው ባለበት ኮምፒውተር ላይ፦</strong>{' '}
                    {language === 'am'
                      ? 'ከታች ያለውን አዝራር በመጫን የዳታ ማስተላለፊያ ኮዱን ቅዱ፤ ከዚያ ለራስዎ በቴሌግራም (Saved Messages) ወይም ዋትስአፕ ይላኩት።'
                      : 'Click below to copy your data sync code and send it to yourself via Telegram/WhatsApp.'}
                  </p>
                  <button
                    onClick={handleCopySyncCode}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 text-xs ${
                      copiedSyncCode
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20'
                    }`}
                  >
                    {copiedSyncCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>
                      {copiedSyncCode
                        ? (language === 'am' ? '✅ ኮዱ ተቀድቷል! አሁን ወደ ስልክዎ ይላኩት' : '✅ Sync Code Copied to Clipboard!')
                        : (language === 'am' ? '📋 የነበረኝን ዳታ ኮድ ቅዳ (Copy My Data Sync Code)' : 'Copy My Data Sync Code')}
                    </span>
                  </button>
                  <p className="text-[10px] text-slate-500 text-center">
                    ({items.length} {language === 'am' ? 'እቃዎች' : 'items'} • {branches.length} {language === 'am' ? 'ቅርንጫፎች' : 'branches'} • {recipes.length} {language === 'am' ? 'ሪሲፒዎች' : 'recipes'} • {schedules.length} {language === 'am' ? 'ስኬጁሎች' : 'schedules'})
                  </p>
                </div>

                {/* Sub-step B: On Mobile Phone / Receiver */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <p className="text-slate-300 text-xs">
                    <strong className="text-emerald-400">ለ. በአዲሱ ስልክዎ ላይ፦</strong>{' '}
                    {language === 'am'
                      ? 'ከቴሌግራም የቀዱትን ኮድ እዚህ ሳጥን ውስጥ ፔስት (Paste) አድርገው «ዳታውን ስልክ ላይ ጫን» የሚለውን ይጫኑ።'
                      : 'Paste the copied code here on your phone and tap "Import Data".'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder={language === 'am' ? 'የቀዱትን ኮድ እዚህ ፔስት (Paste) ያድርጉ...' : 'Paste sync code here...'}
                      value={inputSyncCode}
                      onChange={(e) => setInputSyncCode(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={handleApplySyncCode}
                      className="px-4 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 shrink-0 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{language === 'am' ? 'ዳታውን ስልክ ላይ ጫን' : 'Import Data'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* OPTION 2: Download & Upload Backup JSON */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-2 text-xs sm:text-sm">
                    <FileDown className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'am' ? 'አማራጭ 2፦ በባክአፕ ፋይል ማስተላለፊያ (.json File)' : 'Option 2: Backup File (.json)'}</span>
                  </span>
                </div>
                <p className="text-slate-300 text-xs">
                  {language === 'am'
                    ? 'በኮምፒውተርዎ ላይ ሳሉ «ባክአፕ አውርድ» በማለት ፋይሉን በቴሌግራም ወደ ስልክዎ ልከው፣ ስልክዎ ላይ «ዳታ ስቶሬጅ» ገብተው ፋይሉን መጫን ይችላሉ።'
                    : 'Download full backup file to your computer, send to phone, and restore via Data Vault.'}
                </p>
                <button
                  onClick={exportFullBackup}
                  className="px-4 py-2 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center gap-2 text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'am' ? 'ሙሉ ባክአፕ ፋይል አውርድ (.json)' : 'Download Full Backup (.json)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Install Bar if Browser Prompt Available */}
          {isInstallable && !isInstalled && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-emerald-900/40 to-slate-900 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div>
                  <p className="font-bold text-emerald-300 text-xs sm:text-sm">
                    {language === 'am' ? 'ብራውዘርዎ መተግበሪያውን በቀጥታ ለመጫን ዝግጁ ነው!' : 'Browser is ready for 1-click install!'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {language === 'am' ? 'አንድ ጊዜ በመጫን ስልክዎ ወይም ኮምፒውተርዎ ላይ ያኑሩ' : 'Click below to install directly to home screen / desktop'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleInstallDirect}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:scale-105 transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{language === 'am' ? 'አሁኑኑ ጫን (Install Now)' : 'Install Now'}</span>
              </button>
            </div>
          )}

          {isInstalled && (
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                {language === 'am'
                  ? 'ይህ መተግበሪያ በአሁኑ ሰዓት እንደ ተጫነ ራሱን የቻለ ሶፍትዌር (Installed App) እየሰራ ነው!'
                  : 'The application is already running in installed standalone mode!'}
              </span>
            </div>
          )}

          {/* Share / Copy App Link Section */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 flex items-center gap-2">
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                {language === 'am' ? 'የመተግበሪያው የቀጥታ አድራሻ (Live Link)' : 'App Web Link'}
              </span>
              <span className="text-[11px] text-slate-400">
                {language === 'am' ? 'ወደ ስልክዎ ልከው በ Safari ወይም Chrome ይክፈቱት' : 'Open in mobile browser'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={appUrl || window.location.href}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-amber-200 select-all focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs shrink-0 ${
                  copiedLink
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? (language === 'am' ? 'ተቀድቷል!' : 'Copied!') : (language === 'am' ? 'ሊንኩን ቅዳ' : 'Copy')}</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Mobile Phone Guide */}
          {activeTab === 'mobile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                
                {/* Android Steps */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs sm:text-sm border-b border-slate-800/80 pb-2">
                    <span className="text-base">🤖</span>
                    <span>{language === 'am' ? 'ለ አንድሮይድ ስልኮች (Samsung, Tecno, ወዘተ)' : 'Android (Google Chrome)'}</span>
                  </div>
                  
                  <ol className="space-y-2.5 text-slate-300 text-xs">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                      <span>
                        {language === 'am' ? 'በስልክዎ ' : 'Open '}
                        <strong className="text-emerald-300">Google Chrome</strong> 
                        {language === 'am' ? ' ብራውዘር አድራሻውን ይክፈቱ።' : ' browser.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                      <span>
                        {language === 'am' ? 'ከላይ በቀኝ በኩል የሚገኙትን ' : 'Tap the '}
                        <strong className="text-amber-300">3 ነጥቦች (⋮)</strong>
                        {language === 'am' ? ' ይጫኑ።' : ' menu at top right.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                      <span>
                        <strong className="text-emerald-300">"Install app"</strong> ወይም <strong className="text-emerald-300">"Add to Home screen / ወደ መነሻ ገጽ አክል"</strong>
                        {language === 'am' ? ' የሚለውን ይምረጡ።' : '.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
                      <span>
                        {language === 'am'
                          ? 'ከዚያ በኋላ አፑ በስልክዎ መነሻ ገጽ (Home Screen) ላይ ይቀመጣል፤ እንደ ቴሌግራም ወይም ዋትስአፕ በቀጥታ ይከፈታል!'
                          : 'The app icon appears on your phone home screen like a native app!'}
                      </span>
                    </li>
                  </ol>
                </div>

                {/* iPhone / iPad Steps */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sky-400 text-xs sm:text-sm border-b border-slate-800/80 pb-2">
                    <span className="text-base">🍎</span>
                    <span>{language === 'am' ? 'ለ iPhone እና iPad (Apple iOS)' : 'iPhone & iPad (Safari)'}</span>
                  </div>

                  <ol className="space-y-2.5 text-slate-300 text-xs">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                      <span>
                        {language === 'am' ? 'በስልክዎ ' : 'Open the link in '}
                        <strong className="text-sky-300">Safari</strong> 
                        {language === 'am' ? ' ብራውዘር ይክፈቱት።' : ' browser.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                      <span>
                        {language === 'am' ? 'ከስክሪኑ ታችኛው ክፍል የሚገኘውን ' : 'Tap the '}
                        <strong className="text-amber-300">"Share" (📤)</strong> 
                        {language === 'am' ? ' ምልክት ይጫኑ።' : ' icon at bottom.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                      <span>
                        {language === 'am' ? 'ዝርዝሩን ዝቅ አድርገው ' : 'Scroll down and tap '}
                        <strong className="text-sky-300">"Add to Home Screen" (➕ ወደ መነሻ ገጽ አክል)</strong>
                        {language === 'am' ? ' የሚለውን ይጫኑ።' : '.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
                      <span>
                        {language === 'am'
                          ? 'ከላይ በቀኝ በኩል "Add" ይጫኑ። በ iPhoneዎ መነሻ ገጽ ላይ አዶው ይቀመጣል፤ ያለ ብራውዘር መስመር በሙሉ ስክሪን ይሰራል!'
                          : 'Tap "Add" at top right. Now it runs full-screen without Safari browser bars!'}
                      </span>
                    </li>
                  </ol>
                </div>
              </div>

              {/* Offline & Storage Advantage */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-amber-200">
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  {language === 'am'
                    ? 'ጥቅሙ፦ አፑን በስልክዎ ላይ ከጫኑት በኋላ በማንኛውም ጊዜ ያለ ኢንተርኔት መቆራረጥ መረጃዎችን መመዝገብ፣ የሰራተኞች ምግብ ስኬጁል ማየት እና ማስተዳደር ይችላሉ።'
                    : 'Benefit: Runs offline, caches all store and recipe data on your device, and launches instantly from your home screen.'}
                </span>
              </div>
            </div>
          )}

          {/* TAB: Laptop & Desktop Direct App Suite */}
          {activeTab === 'laptop' && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950 border border-amber-500/40 space-y-4">
                <div className="flex items-center gap-3 font-bold text-amber-300 text-sm">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 border border-amber-500/30">
                    <Laptop className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400">
                      {language === 'am' ? 'በኮምፒውተርዎ ላይ እንደ ሶፍትዌር ማስቀመጥ (Desktop App)' : 'Install as Dedicated Desktop App'}
                    </h4>
                    <p className="text-slate-300 text-xs mt-0.5">
                      {language === 'am'
                        ? 'መተግበሪያውን በቀጥታ በኮምፒውተርዎ ዴስክቶፕ እና ታስክባር ላይ አስቀምጠው ያለ ብራውዘር መስመር በራሱ መስኮት ይጠቀሙ'
                        : 'Launch the ERP directly from your Desktop / Taskbar without browser headers.'}
                    </p>
                  </div>
                </div>

                {/* 1-Click Direct Action Buttons Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Action 1: Direct Install */}
                  <button
                    onClick={handleInstallDirect}
                    className="p-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all cursor-pointer border border-amber-300"
                  >
                    <Download className="w-5 h-5 text-slate-950" />
                    <span className="text-xs">
                      {isInstalled
                        ? (language === 'am' ? 'ተጭኗል ✓' : 'Installed ✓')
                        : (language === 'am' ? '💻 መተግበሪያውን ጫን' : '💻 Install App')}
                    </span>
                  </button>

                  {/* Action 2: Open in Standalone Window */}
                  <button
                    onClick={handleOpenStandaloneWindow}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <ExternalLink className="w-5 h-5 text-amber-400" />
                    <span className="text-xs">
                      {language === 'am' ? '🖥️ በራሱ መስኮት ክፈት' : '🖥️ Standalone Window'}
                    </span>
                  </button>

                  {/* Action 3: Windows Desktop Shortcut (.url) */}
                  <button
                    onClick={handleDownloadWindowsShortcut}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <HardDrive className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs">
                      {language === 'am' ? '📌 ዴስክቶፕ ሾርትከት አውርድ' : '📌 Desktop Shortcut'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 3 Simple Guidance Cards for PC Users */}
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="font-bold text-amber-300 block text-xs">
                    1. በ Google Chrome ወይም Microsoft Edge ላይ፦
                  </span>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    {language === 'am'
                      ? '• በላይኛው አድራሻ መስመር (URL Bar) በስተቀኝ በኩል የሚታየውን 🖥️ ወይም ⬇️ "Install" ምልክት ይጫኑ።'
                      : '• Click the 🖥️ or ⬇️ Install icon located on the right side of the address bar.'}
                    <br />
                    {language === 'am'
                      ? '• ወይም በላይኛው ቀኝ ሜኑ (⋮) ገብተው "Save and share" -> "Install app" የሚለውን ይምረጡ።'
                      : '• Or open the browser menu (⋮) -> "Save and share" -> "Install app".'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="font-bold text-emerald-300 block text-xs">
                    2. በዊንዶውስ ዴስክቶፕ ላይ (Desktop Shortcut)፦
                  </span>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    {language === 'am'
                      ? 'ከላይ «📌 ዴስክቶፕ ሾርትከት አውርድ» የሚለውን ተጭነው የወረደውን ፋይል ዴስክቶፕዎ ላይ ያስቀምጡት፤ ከዚያ ደብል ክሊክ ሲያደርጉት በቀጥታ ይከፈትልዎታል!'
                      : 'Click "📌 Desktop Shortcut" above and place the downloaded file on your desktop. Double-clicking it launches the ERP immediately!'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Developer / Local Source Code */}
          {activeTab === 'developer' && (
            <div className="space-y-4">
              <p className="text-slate-300 text-xs">
                {language === 'am'
                  ? 'ይህን ፕሮጀክት ሙሉ ለሙሉ በራስዎ ላፕቶፕ ኮምፒውተር ላይ በ Node.js ከመስመር ውጭ ለማስኬድ የሚከተሉትን ትዕዛዞች በ Terminal / Command Prompt ያሂዱ፦'
                  : 'To run this app completely offline from local source code using Node.js:'}
              </p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">1. Dependencies መጫን:</span>
                  <div className="flex items-center justify-between bg-slate-950 text-slate-200 p-2.5 rounded-xl font-mono text-[11px] border border-slate-800">
                    <code>npm install</code>
                    <button
                      onClick={() => copyToClipboard('npm install', 'c1')}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      {copiedCode === 'c1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">2. አፑን ማስጀመር:</span>
                  <div className="flex items-center justify-between bg-slate-950 text-slate-200 p-2.5 rounded-xl font-mono text-[11px] border border-slate-800">
                    <code>npm run dev</code>
                    <button
                      onClick={() => copyToClipboard('npm run dev', 'c2')}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      {copiedCode === 'c2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">3. በብራውዘር መክፈቻ አድራሻ:</span>
                  <div className="bg-slate-950 text-emerald-400 p-2.5 rounded-xl font-mono text-[11px] border border-slate-800">
                    http://localhost:3000
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'am' ? 'PWA • Offline Caching • Data Sync' : 'PWA • Offline Caching • Data Sync'}</span>
          </div>
          
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors ml-auto"
          >
            {t.common.close}
          </button>
        </div>

      </div>
    </div>
  );
};
