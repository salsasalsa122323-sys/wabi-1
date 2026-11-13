import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Receipt,
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Building2,
  Plus,
  Trash2,
  Edit3,
  Camera,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  Percent,
  Search,
  Filter,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatEthiopianDate, getTodayDateString } from '../utils/ethiopianDate';
import { ExpenseCategory, PaymentMethod, ExpenseRecord } from '../types';

export const ExpensesView: React.FC = () => {
  const {
    currentHotel,
    currentHotelId,
    branches,
    expenses,
    recordExpense,
    updateExpense,
    deleteExpense,
    getMonthlyExpenseSummary,
  } = useApp();
  const { currentUser } = useAuth();
  const { language } = useLanguage();

  // Filter branches by current hotel
  const hotelBranches = useMemo(() => {
    return branches.filter((b) => !b.hotelId || b.hotelId === currentHotelId);
  }, [branches, currentHotelId]);

  // Selected filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>(hotelBranches[0]?.id || 'all');
  const [selectedMonth, setSelectedMonth] = useState<string>(getTodayDateString().substring(0, 7)); // YYYY-MM
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // New Expense Form State
  const [expenseDate, setExpenseDate] = useState<string>(getTodayDateString());
  const [branchIdInput, setBranchIdInput] = useState<string>(hotelBranches[0]?.id || '');
  const [category, setCategory] = useState<ExpenseCategory>('kitchen_supplies');
  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [hasReceipt, setHasReceipt] = useState<boolean>(true);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [isVatInclusive, setIsVatInclusive] = useState<boolean>(true);
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState<string | undefined>(undefined);
  const [photoPreviewModal, setPhotoPreviewModal] = useState<string | null>(null);

  // Edit Expense Modal
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [editReason, setEditReason] = useState('');
  const [deleteModalExpense, setDeleteModalExpense] = useState<ExpenseRecord | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Category labels mapping
  const categoryLabels: Record<ExpenseCategory, { am: string; en: string }> = {
    utilities: { am: 'መብራት/ውሃ/ስልክ/ኔት', en: 'Utilities (Water/Power/Net)' },
    transport: { am: 'ትራንስፖርትና ነዳጅ', en: 'Transport & Fuel' },
    maintenance: { am: 'ጥገና እና ዕድሳት', en: 'Maintenance & Repairs' },
    cleaning: { am: 'ጽዳትና ሳሙና እቃዎች', en: 'Cleaning & Janitorial' },
    kitchen_supplies: { am: 'የወጥ ቤት ማብሰያና እቃዎች', en: 'Kitchen Supplies & Utensils' },
    marketing: { am: 'ማስታወቂያና ፕሮሞሽን', en: 'Marketing & Promotions' },
    labor_casual: { am: 'የቀን ሰራተኛና ጉልበት', en: 'Casual Labor / Daily Wages' },
    other: { am: 'ልዩ ልዩ ወጪዎች', en: 'Miscellaneous & Other' },
  };

  const paymentLabels: Record<PaymentMethod, { am: string; en: string }> = {
    cash: { am: 'ጥሬ ገንዘብ (Cash)', en: 'Cash' },
    bank_transfer: { am: 'የባንክ ማስተላለፍ (CBE/Awash)', en: 'Bank Transfer' },
    telebirr: { am: 'ቴሌብር (Telebirr)', en: 'Telebirr' },
    cbe_birr: { am: 'ሲቢኢ ብር (CBE Birr)', en: 'CBE Birr' },
    check: { am: 'ቼክ (Check)', en: 'Check' },
  };

  // Live VAT & Total Calculation for Form
  const liveCalculations = useMemo(() => {
    const val = parseFloat(amountInput) || 0;
    if (val <= 0) return { amountBeforeVat: 0, vatAmount: 0, totalAmount: 0 };
    if (!hasReceipt) {
      return { amountBeforeVat: val, vatAmount: 0, totalAmount: val };
    }
    if (isVatInclusive) {
      const totalAmount = val;
      const amountBeforeVat = parseFloat((val / 1.15).toFixed(2));
      const vatAmount = parseFloat((totalAmount - amountBeforeVat).toFixed(2));
      return { amountBeforeVat, vatAmount, totalAmount };
    } else {
      const amountBeforeVat = val;
      const vatAmount = parseFloat((val * 0.15).toFixed(2));
      const totalAmount = parseFloat((amountBeforeVat + vatAmount).toFixed(2));
      return { amountBeforeVat, vatAmount, totalAmount };
    }
  }, [amountInput, hasReceipt, isVatInclusive]);

  // Handle Photo Upload (reads as data URL)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptPhotoUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle Submit New Expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(amountInput) || 0;
    if (amountVal <= 0) {
      alert(language === 'am' ? 'እባክዎ ትክክለኛ የብር መጠን ያስገቡ' : 'Please enter a valid amount');
      return;
    }
    if (!description.trim()) {
      alert(language === 'am' ? 'እባክዎ የወጪውን ዝርዝር መግለጫ ያስገቡ' : 'Please enter expense description');
      return;
    }

    const targetBranch = branchIdInput || hotelBranches[0]?.id || 'general';

    recordExpense({
      hotelId: currentHotelId,
      branchId: targetBranch,
      date: expenseDate,
      ethiopianDateStr: formatEthiopianDate(expenseDate),
      category,
      description: description.trim(),
      paymentMethod,
      hasReceipt,
      receiptNumber: hasReceipt ? receiptNumber.trim() : undefined,
      receiptPhotoUrl,
      isVatInclusive,
      enteredAmount: amountVal,
      recordedBy: currentUser?.displayName || 'ሳልሳዊ ስዩም',
    });

    setSuccessBanner(
      language === 'am'
        ? `✅ ወጪው (${amountVal} ብር) በተሳካ ሁኔታ ተመዝግቧል!`
        : `✅ Expense of ${amountVal} ETB recorded successfully!`
    );
    setTimeout(() => setSuccessBanner(null), 4000);

    // Reset fields
    setDescription('');
    setAmountInput('');
    setReceiptNumber('');
    setReceiptPhotoUrl(undefined);
  };

  // Monthly summary
  const monthlySummary = useMemo(() => {
    return getMonthlyExpenseSummary(currentHotelId, selectedBranchId, selectedMonth);
  }, [getMonthlyExpenseSummary, currentHotelId, selectedBranchId, selectedMonth, expenses]);

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (e.isDeleted) return false;
      if (currentHotelId !== 'all' && e.hotelId && e.hotelId !== currentHotelId) return false;
      if (selectedBranchId !== 'all' && e.branchId !== selectedBranchId) return false;
      if (!e.date.startsWith(selectedMonth)) return false;
      if (selectedCategoryFilter !== 'all' && e.category !== selectedCategoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = e.description.toLowerCase().includes(q);
        const refMatch = e.receiptNumber?.toLowerCase().includes(q);
        const catAm = categoryLabels[e.category]?.am.toLowerCase().includes(q);
        const catEn = categoryLabels[e.category]?.en.toLowerCase().includes(q);
        if (!descMatch && !refMatch && !catAm && !catEn) return false;
      }
      return true;
    });
  }, [expenses, currentHotelId, selectedBranchId, selectedMonth, selectedCategoryFilter, searchQuery]);

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredExpenses.map((e, idx) => {
      const branchObj = hotelBranches.find((b) => b.id === e.branchId);
      return {
        'ተ.ቁ (No)': idx + 1,
        'ቀን (Date)': e.date,
        'የኢትዮጵያ ቀን': e.ethiopianDateStr,
        'ቅርንጫፍ (Branch)': branchObj?.nameAm || branchObj?.nameEn || e.branchId,
        'የወጪ ምድብ (Category)': categoryLabels[e.category]?.am || e.category,
        'ዝርዝር መግለጫ (Description)': e.description,
        'የክፍያ ዘዴ (Method)': paymentLabels[e.paymentMethod]?.am || e.paymentMethod,
        'ደረሰኝ ሁኔታ (Receipt)': e.hasReceipt ? `በደረሰኝ (#${e.receiptNumber || '-'})` : 'ያለ ደረሰኝ',
        'የእቃ ዋጋ (Before VAT)': e.amountBeforeVat,
        '15% ቫት (VAT ETB)': e.vatAmount,
        'ጠቅላላ ክፍያ (Total ETB)': e.totalAmount,
        'መዝጋቢ (Recorded By)': e.recordedBy,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    XLSX.writeFile(wb, `${currentHotel.name}_Expenses_${selectedMonth}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <DollarSign className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500">
              {language === 'am' ? 'የየዕለቱ ወጪዎችና 15% ቫት ቁጥጥር' : 'Daily Expenses & 15% VAT Accounting'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {currentHotel.nameAm || currentHotel.name} • {language === 'am' ? 'በደረሰኝ እና ያለ ደረሰኝ ወጪዎች በየወሩ ተጠቃለው የሚሰሉበት ክፍል' : 'Monthly expense summaries with automatic 15% VAT breakdown and receipt attachments'}
          </p>
        </div>

        {/* Month Selector & Export Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-amber-500/40 text-xs">
            <Calendar className="w-4 h-4 text-amber-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-amber-300 font-bold font-mono focus:outline-none text-xs"
            />
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'am' ? 'Excel አውርድ' : 'Export Excel'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>{language === 'am' ? 'ፕሪንት' : 'Print'}</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="p-1 hover:bg-white/10 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 KPI Summary Cards for Selected Month */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-1 shadow-lg">
          <span className="text-[11px] font-bold text-slate-400 block">
            {language === 'am' ? 'በደረሰኝ የወጣ ጠቅላላ (With Receipt)' : 'Total With Receipt'}
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-emerald-400">
            {monthlySummary.totalWithReceipt.toLocaleString()} <span className="text-xs">ETB</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">15% ቫት የሚያካትት / ተቀናሽ</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-teal-500/30 space-y-1 shadow-lg">
          <span className="text-[11px] font-bold text-slate-400 block">
            {language === 'am' ? 'ጠቅላላ የተከፈለ 15% ቫት (Total VAT)' : 'Total 15% VAT'}
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-teal-300">
            {monthlySummary.totalVat.toLocaleString()} <span className="text-xs">ETB</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">ከደረሰኝ ወጪዎች የተሰላ</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-1 shadow-lg">
          <span className="text-[11px] font-bold text-slate-400 block">
            {language === 'am' ? 'ያለ ደረሰኝ የወጣ (Without Receipt)' : 'Total Without Receipt'}
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-amber-300">
            {monthlySummary.totalWithoutReceipt.toLocaleString()} <span className="text-xs">ETB</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">ጥቃቅን / የቀን ሰራተኛ ወጪ</span>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border border-amber-400/50 space-y-1 shadow-xl">
          <span className="text-[11px] font-bold text-amber-300 block">
            {language === 'am' ? 'አጠቃላይ የወጣ ወጪ (Grand Total)' : 'Grand Total Expenses'}
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-amber-200">
            {monthlySummary.grandTotal.toLocaleString()} <span className="text-xs">ETB</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono block">
            {monthlySummary.recordCount} {language === 'am' ? 'የተመዘገቡ ወጪዎች' : 'records in month'}
          </span>
        </div>
      </div>

      {/* Main Grid: Entry Form (Left) & Live History Table (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Col: Daily Expense Recording Form (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 p-5 rounded-3xl border border-amber-500/30 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black text-xs border border-amber-500/30">
              +
            </span>
            <div>
              <h3 className="font-black text-sm text-white">
                {language === 'am' ? 'አዲስ ወጪ መመዝገቢያ ፎርም' : 'Record New Expense'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'am' ? 'የየዕለቱ ወጪ ከነደረሰኙና ከነቫት ስሌቱ ይመዝገቡ' : 'Daily branch expense with automatic 15% VAT'}
              </p>
            </div>
          </div>

          <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs">
            {/* Date & Ethiopian Date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  {language === 'am' ? 'የወጪው ቀን' : 'Expense Date'}
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  {language === 'am' ? 'ቅርንጫፍ' : 'Branch'}
                </label>
                <select
                  value={branchIdInput}
                  onChange={(e) => setBranchIdInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400 font-bold truncate"
                >
                  {hotelBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {language === 'am' ? b.nameAm : b.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-amber-950/30 border border-amber-500/20 text-[10px] text-amber-300 font-mono">
              🇪🇹 {formatEthiopianDate(expenseDate)}
            </div>

            {/* Category & Payment Method */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  {language === 'am' ? 'የወጪ ምድብ' : 'Category'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400 font-bold"
                >
                  {Object.entries(categoryLabels).map(([catKey, labels]) => (
                    <option key={catKey} value={catKey}>
                      {language === 'am' ? labels.am : labels.en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  {language === 'am' ? 'የክፍያ ዘዴ' : 'Payment Method'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400 font-bold"
                >
                  {Object.entries(paymentLabels).map(([pKey, labels]) => (
                    <option key={pKey} value={pKey}>
                      {language === 'am' ? labels.am : labels.en}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">
                {language === 'am' ? 'የወጪው ዝርዝር መግለጫ' : 'Description / Item Details'}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={language === 'am' ? 'ለምሳሌ፡ የኩሽና ጋዝ መሙያ፣ የጽዳት ሳሙና...' : 'e.g. Kitchen cooking gas refill, cleaning supplies...'}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Receipt Toggle Bar */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'am' ? 'የደረሰኝ ሁኔታ' : 'Receipt Status'}</span>
                </span>

                <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setHasReceipt(true)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      hasReceipt
                        ? 'bg-emerald-500 text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'am' ? 'በደረሰኝ (With Receipt)' : 'With Receipt'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasReceipt(false)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      !hasReceipt
                        ? 'bg-amber-500 text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'am' ? 'ያለ ደረሰኝ' : 'No Receipt'}
                  </button>
                </div>
              </div>

              {/* Receipt details when "With Receipt" */}
              {hasReceipt && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        {language === 'am' ? 'የደረሰኝ ቁጥር' : 'Receipt Number'}
                      </label>
                      <input
                        type="text"
                        value={receiptNumber}
                        onChange={(e) => setReceiptNumber(e.target.value)}
                        placeholder="REC-00124"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        {language === 'am' ? 'የደረሰኝ ፎቶ (አማራጭ)' : 'Receipt Photo (Optional)'}
                      </label>
                      <label className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-slate-300 cursor-pointer text-xs transition-colors">
                        <Camera className="w-3.5 h-3.5 text-amber-400" />
                        <span className="truncate">
                          {receiptPhotoUrl ? (language === 'am' ? 'ፎቶ ተመርጧል ✓' : 'Photo Attached ✓') : (language === 'am' ? 'ፎቶ አንሳ/ምረጥ' : 'Upload Photo')}
                        </span>
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* VAT Mode Toggle: Inclusive vs Exclusive */}
                  <div className="pt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-bold">
                      {language === 'am' ? '15% የቫት ስሌት መንገድ:' : '15% VAT Method:'}
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="vatMode"
                          checked={isVatInclusive}
                          onChange={() => setIsVatInclusive(true)}
                          className="accent-amber-400"
                        />
                        <span className={isVatInclusive ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                          {language === 'am' ? 'ከነ ቫቱ (Inclusive)' : 'VAT Inclusive'}
                        </span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="vatMode"
                          checked={!isVatInclusive}
                          onChange={() => setIsVatInclusive(false)}
                          className="accent-amber-400"
                        />
                        <span className={!isVatInclusive ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                          {language === 'am' ? 'ያለ ቫት (Exclusive)' : 'VAT Exclusive'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">
                {language === 'am' ? 'የወጣው የብር መጠን (Amount in ETB)' : 'Expense Amount (ETB)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/50 rounded-xl text-amber-300 text-sm font-mono font-black focus:outline-none focus:border-amber-400 shadow-inner"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-mono text-slate-400 font-bold">
                  ETB
                </span>
              </div>
            </div>

            {/* Live 15% VAT Breakdown Card */}
            {parseFloat(amountInput) > 0 && hasReceipt && (
              <div className="p-3 rounded-2xl bg-slate-950 border border-teal-500/40 space-y-1.5 font-mono text-[11px] animate-fadeIn">
                <div className="flex items-center justify-between text-slate-400">
                  <span>{language === 'am' ? 'የእቃ/አገልግሎት ዋጋ (Before VAT):' : 'Amount Before VAT:'}</span>
                  <span className="text-white font-bold">{liveCalculations.amountBeforeVat.toLocaleString()} ETB</span>
                </div>
                <div className="flex items-center justify-between text-teal-400">
                  <span>{language === 'am' ? '+ 15% ቫት (15% VAT):' : '+ 15% VAT:'}</span>
                  <span className="font-bold">+{liveCalculations.vatAmount.toLocaleString()} ETB</span>
                </div>
                <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-xs font-black text-amber-300">
                  <span>{language === 'am' ? 'ጠቅላላ ክፍያ (Total Amount):' : 'Total Expense Amount:'}</span>
                  <span>{liveCalculations.totalAmount.toLocaleString()} ETB</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-xl shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>{language === 'am' ? 'ወጪውን መዝግብ (Save Expense)' : 'Save Expense Record'}</span>
            </button>
          </form>
        </div>

        {/* Right Col: Expense History & Category Filter Table (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span>{language === 'am' ? 'የወጪዎች ዝርዝር ሰንጠረዥ' : 'Recorded Expenses Ledger'}</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {filteredExpenses.length} {language === 'am' ? 'ወጪዎች ተገኝተዋል' : 'records found'}
              </span>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Branch Filter */}
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="all">{language === 'am' ? '-- ሁሉም ቅርንጫፎች --' : '-- All Branches --'}</option>
                {hotelBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {language === 'am' ? b.nameAm : b.nameEn}
                  </option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="all">{language === 'am' ? '-- ሁሉም ምድቦች --' : '-- All Categories --'}</option>
                {Object.entries(categoryLabels).map(([catKey, labels]) => (
                  <option key={catKey} value={catKey}>
                    {language === 'am' ? labels.am : labels.en}
                  </option>
                ))}
              </select>

              {/* Search input */}
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'am' ? 'ፈልግ...' : 'Search...'}
                  className="bg-transparent text-white text-xs w-24 sm:w-32 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[550px] overflow-y-auto border border-slate-800/80 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-300 font-bold z-10">
                <tr>
                  <th className="py-2.5 px-3">{language === 'am' ? 'ቀን' : 'Date'}</th>
                  <th className="py-2.5 px-2">{language === 'am' ? 'ምድብ' : 'Category'}</th>
                  <th className="py-2.5 px-3">{language === 'am' ? 'መግለጫ' : 'Description'}</th>
                  <th className="py-2.5 px-2 text-center">{language === 'am' ? 'ደረሰኝ' : 'Receipt'}</th>
                  <th className="py-2.5 px-3 text-right text-slate-400">{language === 'am' ? 'የእቃ ዋጋ' : 'Before VAT'}</th>
                  <th className="py-2.5 px-3 text-right text-teal-300">{language === 'am' ? '15% ቫት' : 'VAT'}</th>
                  <th className="py-2.5 px-3 text-right text-amber-300">{language === 'am' ? 'ጠቅላላ' : 'Total'}</th>
                  <th className="py-2.5 px-2 text-center">{language === 'am' ? 'ድርጊት' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500 font-sans text-xs">
                      {language === 'am' ? 'ለተመረጠው ወር ምንም የወጪ መረጃ አልተገኘም' : 'No expense records found for this month'}
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => {
                    return (
                      <tr key={exp.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-bold text-white block">{exp.date}</span>
                          <span className="text-[10px] text-amber-400/80 block">{exp.ethiopianDateStr}</span>
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 text-[10px] font-bold font-sans">
                            {categoryLabels[exp.category]?.am || exp.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans max-w-[180px]">
                          <span className="font-bold text-white block truncate">{exp.description}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {paymentLabels[exp.paymentMethod]?.am || exp.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          {exp.hasReceipt ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                #{exp.receiptNumber || 'ደረሰኝ'}
                              </span>
                              {exp.receiptPhotoUrl && (
                                <button
                                  type="button"
                                  onClick={() => setPhotoPreviewModal(exp.receiptPhotoUrl || null)}
                                  className="p-1 rounded hover:bg-slate-800 text-amber-400"
                                  title="ፎቶውን እይ"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                              ያለ ደረሰኝ
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {exp.amountBeforeVat.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-teal-300 font-bold">
                          {exp.vatAmount > 0 ? `+${exp.vatAmount.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-300 font-black">
                          {exp.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingExpense(exp);
                                setEditReason('');
                              }}
                              className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                              title={language === 'am' ? 'አስተካክል' : 'Edit'}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteModalExpense(exp);
                                setDeleteReason('');
                              }}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                              title={language === 'am' ? 'አስወግድ (Soft delete)' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Photo Preview Modal */}
      {photoPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="font-bold text-white text-xs flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span>{language === 'am' ? 'የተያያዘ የደረሰኝ ፎቶ' : 'Attached Receipt Photo'}</span>
              </h4>
              <button onClick={() => setPhotoPreviewModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-2xl border border-slate-800 flex items-center justify-center bg-black">
              <img src={photoPreviewModal} alt="Receipt" className="max-w-full max-h-[60vh] object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal (With Audit Reason Log) */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="font-black text-white text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>{language === 'am' ? 'ወጪ ማስተካከያ (ኦዲት ሎግ ይያዛል)' : 'Edit Expense (Audit Logged)'}</span>
              </h4>
              <button onClick={() => setEditingExpense(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              {language === 'am'
                ? 'የቀድሞው መረጃ በኦዲት ሎግ ውስጥ ተመዝግቦ ይቀራል፤ ለውጡንና ምክንያቱን እዚህ ያስገቡ፦'
                : 'The original record is preserved in the audit log. Enter updates and reason:'}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-bold">መግለጫ (Description)</label>
                <input
                  type="text"
                  value={editingExpense.description}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">የብር መጠን (Amount in ETB)</label>
                <input
                  type="number"
                  step="any"
                  value={editingExpense.enteredAmount}
                  onChange={(e) => setEditingExpense({ ...editingExpense, enteredAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-300 font-mono font-bold text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">የማስተካከያ ምክንያት (Audit Reason)</label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder={language === 'am' ? 'ለምሳሌ፡ የቁጥር መተየብ ስህተት ማረም...' : 'e.g. Typo correction in entered amount'}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-white text-xs focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  {language === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateExpense(
                      editingExpense.id,
                      {
                        description: editingExpense.description,
                        enteredAmount: editingExpense.enteredAmount,
                      },
                      editReason || 'User amended expense record'
                    );
                    setEditingExpense(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-amber-400 text-slate-950 font-black shadow-lg"
                >
                  {language === 'am' ? 'አዘምን' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
                <AlertCircle className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-black text-white text-sm">
                  {language === 'am' ? 'ወጪውን ማስወገድ ይፈልጋሉ?' : 'Delete Expense Record?'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {deleteModalExpense.description} ({deleteModalExpense.totalAmount} ETB)
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              {language === 'am'
                ? 'ይህ ወጪ ከሰንጠረዡ ይወገዳል፤ ሆኖም ግን የኦዲት መረጃው ሳይጠፋ በሲስተሙ ኦዲት ሎግ ውስጥ ተመዝግቦ ይቀራል።'
                : 'Soft deletion: The record is removed from the active list but preserved permanently in the audit log.'}
            </p>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1 font-bold">
                {language === 'am' ? 'የማስወገጃ ምክንያት' : 'Deletion Reason'}
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder={language === 'am' ? 'ለምሳሌ፡ የተደገመ ምዝገባ...' : 'e.g. Duplicate entry'}
                className="w-full px-3 py-2 bg-slate-950 border border-rose-500/40 rounded-xl text-white text-xs focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDeleteModalExpense(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                {language === 'am' ? 'ይቅር' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteExpense(deleteModalExpense.id, deleteReason || 'Deleted by user');
                  setDeleteModalExpense(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black shadow-lg"
              >
                {language === 'am' ? 'አስወግድ (Delete)' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
