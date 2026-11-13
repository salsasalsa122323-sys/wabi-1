import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  PieChart,
  Percent,
  Download,
  Printer,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Wallet,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { DEFAULT_CHART_OF_ACCOUNTS } from '../utils/stationConfigs';
import { ChartOfAccount, JournalVoucher, JournalLine } from '../types';
import { formatEthiopianDate, getTodayDateString } from '../utils/ethiopianDate';

export const FinanceView: React.FC = () => {
  const { language } = useLanguage();
  const isAmharic = language === 'am';
  const { branches } = useApp();

  // Active sub-tab
  const [financeTab, setFinanceTab] = useState<'pnl' | 'coa' | 'journal' | 'tax' | 'cashierAudit'>('pnl');

  // Selected branch & date range
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'this_week' | 'this_month' | 'custom'>('this_month');

  // Chart of Accounts state
  const [accounts, setAccounts] = useState<ChartOfAccount[]>(DEFAULT_CHART_OF_ACCOUNTS);
  const [selectedCoaCategory, setSelectedCoaCategory] = useState<string>('all');

  // Journal Vouchers (initialized strictly to empty [] for fresh zero-data entry)
  const [vouchers, setVouchers] = useState<JournalVoucher[]>(() => {
    try {
      const saved = localStorage.getItem('eth_erp_finance_vouchers_zero');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const saveVouchersToStorage = (updated: JournalVoucher[]) => {
    setVouchers(updated);
    try {
      localStorage.setItem('eth_erp_finance_vouchers_zero', JSON.stringify(updated));
    } catch {}
  };

  // New Journal Voucher Form Modal
  const [isNewJvOpen, setIsNewJvOpen] = useState(false);
  const [newJvDate, setNewJvDate] = useState(getTodayDateString());
  const [newJvDesc, setNewJvDesc] = useState('');
  const [newJvLines, setNewJvLines] = useState<JournalLine[]>([
    { accountCode: '1010', accountName: 'Cash on Hand', debit: 0, credit: 0 },
    { accountCode: '4010', accountName: 'Food Sales', debit: 0, credit: 0 },
  ]);

  // Calculate live debits and credits for new JV
  const newJvTotalDebit = useMemo(
    () => newJvLines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0),
    [newJvLines]
  );
  const newJvTotalCredit = useMemo(
    () => newJvLines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0),
    [newJvLines]
  );
  const isJvBalanced = Math.abs(newJvTotalDebit - newJvTotalCredit) < 0.01 && newJvTotalDebit > 0;

  const handleAddJvLine = () => {
    setNewJvLines([...newJvLines, { accountCode: '1010', accountName: 'Cash on Hand', debit: 0, credit: 0 }]);
  };

  const handleRemoveJvLine = (idx: number) => {
    if (newJvLines.length <= 2) return;
    setNewJvLines(newJvLines.filter((_, i) => i !== idx));
  };

  const handleUpdateJvLine = (idx: number, field: keyof JournalLine, value: any) => {
    const updated = [...newJvLines];
    if (field === 'accountCode') {
      const targetAcc = accounts.find((a) => a.code === value);
      updated[idx] = {
        ...updated[idx],
        accountCode: value,
        accountName: targetAcc ? (isAmharic ? targetAcc.nameAm : targetAcc.nameEn) : value,
      };
    } else {
      updated[idx] = {
        ...updated[idx],
        [field]: value,
      };
    }
    setNewJvLines(updated);
  };

  const handleSaveJv = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJvBalanced) {
      alert(isAmharic ? 'ዴቢትና ክሬዲት እኩል መሆን አለባቸው!' : 'Total Debits must equal Total Credits!');
      return;
    }

    const createdJv: JournalVoucher = {
      id: `jv_${Date.now()}`,
      hotelId: 'ht-bello-fam',
      branchId: selectedBranchId !== 'all' ? selectedBranchId : 'br-frasco-bello',
      voucherNumber: `JV-${new Date().getFullYear()}-${String(vouchers.length + 1).padStart(3, '0')}`,
      date: newJvDate,
      ethiopianDateStr: formatEthiopianDate(newJvDate, 'am'),
      referenceDoc: newJvDesc || (isAmharic ? 'አዲስ የሂሳብ ማስተካከያ' : 'Journal Adjustment'),
      lines: newJvLines,
      totalDebit: newJvTotalDebit,
      totalCredit: newJvTotalCredit,
      status: 'POSTED',
      preparedBy: 'Admin / Finance',
      createdAt: new Date().toISOString(),
    };

    saveVouchersToStorage([createdJv, ...vouchers]);
    setIsNewJvOpen(false);
    setNewJvDesc('');
    setNewJvLines([
      { accountCode: '1010', accountName: 'Cash on Hand', debit: 0, credit: 0 },
      { accountCode: '4010', accountName: 'Food Sales', debit: 0, credit: 0 },
    ]);
  };

  // USALI Standard Financial Metrics - dynamically calculated from vouchers (strictly 0.00 ETB on fresh start)
  const {
    foodSales,
    beverageSales,
    otherRevenue,
    totalRevenue,
    foodCost,
    beverageCost,
    totalCogs,
    grossProfit,
    grossMarginPct,
    foodCostPct,
    beverageCostPct,
    salariesExpense,
    rentExpense,
    utilitiesExpense,
    cleaningPackaging,
    maintenanceRepairs,
    marketingTech,
    otherOpex,
    totalOpex,
    ebitda,
    depreciation,
    ebit,
    estimatedIncomeTax,
    netProfit,
    netMarginPct,
    vatOutputCollected,
    vatInputPaid,
    netVatPayable,
    wht2PercentPayable,
    wht30PercentPayable,
    serviceCharge10PctCollected,
  } = useMemo(() => {
    let fs = 0;
    let bs = 0;
    let os = 0;
    let fc = 0;
    let bc = 0;
    let sal = 0;
    let rent = 0;
    let util = 0;
    let clean = 0;
    let maint = 0;
    let mkt = 0;
    let opex = 0;
    let vatOut = 0;
    let vatIn = 0;
    let wht2 = 0;
    let wht30 = 0;
    let sc = 0;

    vouchers.forEach((jv) => {
      jv.lines.forEach((l) => {
        const d = Number(l.debit) || 0;
        const c = Number(l.credit) || 0;
        if (l.accountCode === '4010') fs += c - d;
        else if (l.accountCode === '4020') bs += c - d;
        else if (l.accountCode.startsWith('40')) os += c - d;
        else if (l.accountCode === '5010') fc += d - c;
        else if (l.accountCode === '5020') bc += d - c;
        else if (l.accountCode === '6010' || l.accountCode === '6020') sal += d - c;
        else if (l.accountCode === '6030') rent += d - c;
        else if (l.accountCode === '6040') util += d - c;
        else if (l.accountCode === '6060') clean += d - c;
        else if (l.accountCode === '6050') maint += d - c;
        else if (l.accountCode === '6070') mkt += d - c;
        else if (l.accountCode.startsWith('60')) opex += d - c;
        else if (l.accountCode === '2020') {
          vatOut += c;
          vatIn += d;
        } else if (l.accountCode === '2050') wht2 += c;
        else if (l.accountCode === '2060') sc += c;
      });
    });

    const totRev = Math.max(0, fs + bs + os);
    const totCogs = Math.max(0, fc + bc);
    const gp = totRev - totCogs;
    const gmPct = totRev > 0 ? ((gp / totRev) * 100).toFixed(1) : '0.0';
    const fcPct = fs > 0 ? ((fc / fs) * 100).toFixed(1) : '0.0';
    const bcPct = bs > 0 ? ((bc / bs) * 100).toFixed(1) : '0.0';

    const totOp = Math.max(0, sal + rent + util + clean + maint + mkt + opex);
    const eb = gp - totOp;
    const dep = 0;
    const ebVal = eb - dep;
    const tax = ebVal > 0 ? ebVal * 0.3 : 0;
    const np = ebVal - tax;
    const nmPct = totRev > 0 ? ((np / totRev) * 100).toFixed(1) : '0.0';

    return {
      foodSales: Math.max(0, fs),
      beverageSales: Math.max(0, bs),
      otherRevenue: Math.max(0, os),
      totalRevenue: totRev,
      foodCost: Math.max(0, fc),
      beverageCost: Math.max(0, bc),
      totalCogs: totCogs,
      grossProfit: gp,
      grossMarginPct: gmPct,
      foodCostPct: fcPct,
      beverageCostPct: bcPct,
      salariesExpense: Math.max(0, sal),
      rentExpense: Math.max(0, rent),
      utilitiesExpense: Math.max(0, util),
      cleaningPackaging: Math.max(0, clean),
      maintenanceRepairs: Math.max(0, maint),
      marketingTech: Math.max(0, mkt),
      otherOpex: Math.max(0, opex),
      totalOpex: totOp,
      ebitda: eb,
      depreciation: dep,
      ebit: ebVal,
      estimatedIncomeTax: tax,
      netProfit: np,
      netMarginPct: nmPct,
      vatOutputCollected: Math.max(0, vatOut),
      vatInputPaid: Math.max(0, vatIn),
      netVatPayable: Math.max(0, vatOut - vatIn),
      wht2PercentPayable: Math.max(0, wht2),
      wht30PercentPayable: Math.max(0, wht30),
      serviceCharge10PctCollected: Math.max(0, sc),
    };
  }, [vouchers]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <DollarSign className="w-5 h-5" />
            </span>
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
              {isAmharic ? 'የሆቴልና ሬስቶራንት ስታንዳርድ ፋይናንስ' : 'Hotel & Restaurant USALI Finance System'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {isAmharic ? 'የፋይናንስና የግብር ማዕከል (Finance & Tax Control)' : 'Financial Ledger & Ethiopian Tax Compliance'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isAmharic
              ? 'የገቢና ወጪ ሪፖርት (P&L)፣ የሒሳብ መደቦች (Chart of Accounts)፣ 15% VAT፣ 2% WHT እና የካሸር ርክክብ'
              : 'USALI P&L Statement, Chart of Accounts, Journal Vouchers, 15% VAT, 2% WHT & Cashier Audit'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Print / Export */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>{isAmharic ? 'ፕሪንት' : 'Print'}</span>
          </button>

          {/* New Journal Voucher Button */}
          <button
            onClick={() => setIsNewJvOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isAmharic ? 'አዲስ ጆርናል ቫውቸር (JV)' : 'New Journal Voucher'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex overflow-x-auto gap-1">
        <button
          onClick={() => setFinanceTab('pnl')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
            financeTab === 'pnl'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{isAmharic ? 'የገቢና ወጪ መግለጫ (P&L / USALI)' : 'Income Statement (P&L)'}</span>
        </button>

        <button
          onClick={() => setFinanceTab('tax')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
            financeTab === 'tax'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{isAmharic ? 'የግብርና ታክስ ተገዢነት (VAT & WHT)' : 'Ethiopian Tax (VAT & WHT)'}</span>
        </button>

        <button
          onClick={() => setFinanceTab('journal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
            financeTab === 'journal'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{isAmharic ? 'ጆርናል ቫውቸሮች (General Ledger)' : 'Journal Vouchers'}</span>
        </button>

        <button
          onClick={() => setFinanceTab('coa')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
            financeTab === 'coa'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>{isAmharic ? 'የሒሳብ መደቦች (Chart of Accounts)' : 'Chart of Accounts'}</span>
        </button>

        <button
          onClick={() => setFinanceTab('cashierAudit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
            financeTab === 'cashierAudit'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>{isAmharic ? 'የካሸር ሽፍት ኦዲት (Cashier Settlement)' : 'Cashier Shifts'}</span>
        </button>
      </div>

      {/* 1) TAB: P&L Statement (USALI Standard) */}
      {financeTab === 'pnl' && (
        <div className="space-y-6">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <span className="text-xs text-slate-400 font-medium block">
                {isAmharic ? 'ጠቅላላ ሽያጭ (Total Revenue)' : 'Total Revenue'}
              </span>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                ETB {totalRevenue.toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-2">
                <ArrowUpRight className="w-4 h-4" />
                <span>{isAmharic ? 'ምግብ + መጠጥ + ሌሎች' : 'Food + Beverage + Other'}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <span className="text-xs text-slate-400 font-medium block">
                {isAmharic ? 'የጥሬ ዕቃ ወጪ (Total COGS)' : 'Cost of Goods Sold'}
              </span>
              <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                ETB {totalCogs.toLocaleString()}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                <span>Food Cost: <strong className="text-amber-300">{foodCostPct}%</strong></span>
                <span>Bev Cost: <strong className="text-blue-300">{beverageCostPct}%</strong></span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <span className="text-xs text-slate-400 font-medium block">
                {isAmharic ? 'ጠቅላላ ትርፍ (Gross Profit)' : 'Gross Profit'}
              </span>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                ETB {grossProfit.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-xs text-emerald-400 mt-2">
                <Percent className="w-3.5 h-3.5" />
                <span>{isAmharic ? `ጠቅላላ ማርጂን፡ ${grossMarginPct}%` : `Gross Margin: ${grossMarginPct}%`}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40">
              <span className="text-xs text-emerald-300 font-medium block">
                {isAmharic ? 'የተጣራ ትርፍ (Net Profit)' : 'Net Profit (EAT)'}
              </span>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                ETB {netProfit.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-xs text-emerald-300 mt-2">
                <span>{isAmharic ? `የተጣራ ማርጂን፡ ${netMarginPct}%` : `Net Margin: ${netMarginPct}%`}</span>
              </div>
            </div>
          </div>

          {/* Detailed USALI P&L Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  {isAmharic
                    ? 'የሆቴልና ሬስቶራንት የገቢና ወጪ መግለጫ (USALI Income Statement)'
                    : 'Uniform System of Accounts for the Lodging Industry (USALI) P&L'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isAmharic ? 'ዓለም አቀፍ ደረጃውን የጠበቀ የሆቴል ገቢ፣ የጥሬ ዕቃ ፍጆታ እና የተጣራ ትርፍ ስሌት' : 'Standard Lodging Operating Statement breakdown'}
                </p>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {isAmharic ? 'የዚህ ወር ሪፖርት' : 'Current Month'}
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 font-mono text-xs sm:text-sm">
              {/* SECTION: OPERATING REVENUES */}
              <div className="bg-slate-950/60 p-3 font-sans font-bold text-emerald-400 uppercase tracking-wider text-xs flex justify-between">
                <span>1. {isAmharic ? 'የስራ ማስኬጃ ገቢዎች (Operating Revenues)' : 'Operating Revenues'}</span>
                <span>% of Sales</span>
              </div>
              <div className="p-3 flex justify-between hover:bg-slate-800/30">
                <span className="font-sans pl-4">{isAmharic ? 'የምግብ ሽያጭ ገቢ (Food Revenue)' : 'Food Revenue'}</span>
                <div className="flex gap-8">
                  <span className="text-slate-400">{( (foodSales/totalRevenue)*100 ).toFixed(1)}%</span>
                  <span className="text-white font-bold w-32 text-right">ETB {foodSales.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-3 flex justify-between hover:bg-slate-800/30">
                <span className="font-sans pl-4">{isAmharic ? 'የመጠጥ ሽያጭ ገቢ (Beverage Revenue)' : 'Beverage Revenue'}</span>
                <div className="flex gap-8">
                  <span className="text-slate-400">{( (beverageSales/totalRevenue)*100 ).toFixed(1)}%</span>
                  <span className="text-white font-bold w-32 text-right">ETB {beverageSales.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-3 flex justify-between hover:bg-slate-800/30">
                <span className="font-sans pl-4">{isAmharic ? 'ሌሎች ገቢዎች (Other Income)' : 'Other Operating Income'}</span>
                <div className="flex gap-8">
                  <span className="text-slate-400">{( (otherRevenue/totalRevenue)*100 ).toFixed(1)}%</span>
                  <span className="text-white font-bold w-32 text-right">ETB {otherRevenue.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-3.5 bg-emerald-950/20 flex justify-between font-bold text-white border-y border-emerald-500/20">
                <span className="font-sans">{isAmharic ? 'ጠቅላላ ገቢ (Total Revenue)' : 'Total Operating Revenue'}</span>
                <div className="flex gap-8">
                  <span className="text-emerald-400">100.0%</span>
                  <span className="text-emerald-300 w-32 text-right">ETB {totalRevenue.toLocaleString()}</span>
                </div>
              </div>

              {/* SECTION: COST OF SALES (COGS) */}
              <div className="bg-slate-950/60 p-3 font-sans font-bold text-amber-400 uppercase tracking-wider text-xs flex justify-between">
                <span>2. {isAmharic ? 'የተሸጡ ዕቃዎች ወጪ (Cost of Sales / COGS)' : 'Cost of Goods Sold'}</span>
                <span>Cost %</span>
              </div>
              <div className="p-3 flex justify-between hover:bg-slate-800/30">
                <span className="font-sans pl-4">{isAmharic ? 'የምግብ ፍጆታ ወጪ (Cost of Food Sold)' : 'Cost of Food Sold'}</span>
                <div className="flex gap-8">
                  <span className="text-amber-400 font-bold">{foodCostPct}%</span>
                  <span className="text-amber-300 w-32 text-right">ETB {foodCost.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-3 flex justify-between hover:bg-slate-800/30">
                <span className="font-sans pl-4">{isAmharic ? 'የመጠጥ ፍጆታ ወጪ (Cost of Beverage Sold)' : 'Cost of Beverage Sold'}</span>
                <div className="flex gap-8">
                  <span className="text-blue-400 font-bold">{beverageCostPct}%</span>
                  <span className="text-blue-300 w-32 text-right">ETB {beverageCost.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-3.5 bg-amber-950/20 flex justify-between font-bold text-white border-y border-amber-500/20">
                <span className="font-sans">{isAmharic ? 'ጠቅላላ የጥሬ ዕቃ ወጪ (Total Cost of Sales)' : 'Total Cost of Sales'}</span>
                <div className="flex gap-8">
                  <span className="text-amber-400">{((totalCogs/totalRevenue)*100).toFixed(1)}%</span>
                  <span className="text-amber-300 w-32 text-right">ETB {totalCogs.toLocaleString()}</span>
                </div>
              </div>

              {/* GROSS PROFIT */}
              <div className="p-4 bg-emerald-900/30 flex justify-between font-bold text-white border-b border-emerald-500/30">
                <span className="font-sans text-sm sm:text-base">{isAmharic ? 'ጠቅላላ ትርፍ (GROSS PROFIT)' : 'GROSS PROFIT'}</span>
                <div className="flex gap-8 text-sm sm:text-base">
                  <span className="text-emerald-400">{grossMarginPct}%</span>
                  <span className="text-emerald-300 w-32 text-right">ETB {grossProfit.toLocaleString()}</span>
                </div>
              </div>

              {/* SECTION: OPERATING EXPENSES (OPEX) */}
              <div className="bg-slate-950/60 p-3 font-sans font-bold text-rose-400 uppercase tracking-wider text-xs flex justify-between">
                <span>3. {isAmharic ? 'የስራ ማስኬጃ ወጪዎች (Operating Expenses - OPEX)' : 'Operating Expenses (OPEX)'}</span>
                <span>% of Sales</span>
              </div>
              <div className="p-3 flex justify-between hover:bg-slate-800/30">
                <span className="font-sans pl-4">{isAmharic ? 'የሰራተኞች ደመወዝና ጥቅማጥቅም (Salaries & Wages)' : 'Salaries & Benefits'}</span>
                <div className="flex gap-8">
                  <span className="text-slate-400">{((salariesExpense/totalRevenue)*100).toFixed(1)}%</span>
                  <span className="text-white w-32 text-right">ETB {salariesExpense.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-3 flex justify-between hover:bg-slate-800/30">
                <span className="font-sans pl-4">{isAmharic ? 'የቤት ኪራይ (Rent Expense)' : 'Rent & Occupancy'}</span>
                <div className="flex gap-8">
                  <span className="text-slate-400">{((rentExpense/totalRevenue)*100).toFixed(1)}%</span>
                  <span className="text-white w-32 text-right">ETB {rentExpense.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-3 flex justify-between hover:bg-slate-800/30">
                <span className="font-sans pl-4">{isAmharic ? 'መብራት፣ ውሃ እና የኩሽና ጋዝ (Utilities & Gas)' : 'Utilities, Water & Gas'}</span>
                <div className="flex gap-8">
                  <span className="text-slate-400">{((utilitiesExpense/totalRevenue)*100).toFixed(1)}%</span>
                  <span className="text-white w-32 text-right">ETB {utilitiesExpense.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-3 flex justify-between hover:bg-slate-800/30">
                <span className="font-sans pl-4">{isAmharic ? 'ማጽጃ፣ ማሸጊያና ኬሚካል (Supplies & Cleaning)' : 'Cleaning & Packaging'}</span>
                <div className="flex gap-8">
                  <span className="text-slate-400">{((cleaningPackaging/totalRevenue)*100).toFixed(1)}%</span>
                  <span className="text-white w-32 text-right">ETB {cleaningPackaging.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-3 flex justify-between hover:bg-slate-800/30">
                <span className="font-sans pl-4">{isAmharic ? 'ጥገናና ማደስ (Repairs & Maintenance)' : 'Repairs & Maintenance'}</span>
                <div className="flex gap-8">
                  <span className="text-slate-400">{((maintenanceRepairs/totalRevenue)*100).toFixed(1)}%</span>
                  <span className="text-white w-32 text-right">ETB {maintenanceRepairs.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-3 flex justify-between hover:bg-slate-800/30">
                <span className="font-sans pl-4">{isAmharic ? 'ማርኬቲንግ፣ ሶፍትዌርና ቴክኖሎጂ (Marketing & POS Tech)' : 'Marketing & POS Software'}</span>
                <div className="flex gap-8">
                  <span className="text-slate-400">{((marketingTech/totalRevenue)*100).toFixed(1)}%</span>
                  <span className="text-white w-32 text-right">ETB {marketingTech.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-3.5 bg-rose-950/20 flex justify-between font-bold text-white border-y border-rose-500/20">
                <span className="font-sans">{isAmharic ? 'ጠቅላላ የስራ ማስኬጃ ወጪ (Total OPEX)' : 'Total Operating Expenses'}</span>
                <div className="flex gap-8">
                  <span className="text-rose-400">{((totalOpex/totalRevenue)*100).toFixed(1)}%</span>
                  <span className="text-rose-300 w-32 text-right">ETB {totalOpex.toLocaleString()}</span>
                </div>
              </div>

              {/* EBITDA */}
              <div className="p-3 flex justify-between bg-slate-950 font-bold text-white">
                <span className="font-sans">{isAmharic ? 'EBITDA (ከወለድና ግብር በፊት ያለ ትርፍ)' : 'EBITDA'}</span>
                <div className="flex gap-8">
                  <span className="text-emerald-400">{((ebitda/totalRevenue)*100).toFixed(1)}%</span>
                  <span className="text-emerald-300 w-32 text-right">ETB {ebitda.toLocaleString()}</span>
                </div>
              </div>

              {/* DEPRECIATION */}
              <div className="p-3 flex justify-between hover:bg-slate-800/30">
                <span className="font-sans pl-4">{isAmharic ? 'እርጅናና ቅናሽ (Depreciation & Amortization)' : 'Depreciation'}</span>
                <div className="flex gap-8">
                  <span className="text-slate-400">{((depreciation/totalRevenue)*100).toFixed(1)}%</span>
                  <span className="text-slate-300 w-32 text-right">ETB {depreciation.toLocaleString()}</span>
                </div>
              </div>

              {/* ESTIMATED 30% CORPORATE INCOME TAX */}
              <div className="p-3 flex justify-between hover:bg-slate-800/30">
                <span className="font-sans pl-4">{isAmharic ? 'የንግድ ስራ ገቢ ግብር 30% (Estimated Business Income Tax)' : 'Estimated Business Income Tax (30%)'}</span>
                <div className="flex gap-8">
                  <span className="text-slate-400">{((estimatedIncomeTax/totalRevenue)*100).toFixed(1)}%</span>
                  <span className="text-amber-300 w-32 text-right">ETB {estimatedIncomeTax.toLocaleString()}</span>
                </div>
              </div>

              {/* NET PROFIT */}
              <div className="p-4 bg-emerald-950/80 flex justify-between font-bold text-white border-t-2 border-emerald-500">
                <span className="font-sans text-base sm:text-lg">{isAmharic ? 'የተጣራ ትርፍ (NET PROFIT / EAT)' : 'NET PROFIT (EAT)'}</span>
                <div className="flex gap-8 text-base sm:text-lg">
                  <span className="text-emerald-400">{netMarginPct}%</span>
                  <span className="text-emerald-300 w-32 text-right font-mono font-bold">ETB {netProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2) TAB: Ethiopian Tax Compliance (VAT & WHT) */}
      {financeTab === 'tax' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* VAT Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-semibold">{isAmharic ? '15% የተጨማሪ እሴት ታክስ (VAT)' : '15% VAT Net Payable'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">MOR Compliance</span>
              </div>
              <div className="text-2xl font-bold text-blue-400 font-mono">
                ETB {netVatPayable.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Output VAT (ከሽያጭ የተሰበሰበ)፡</span>
                  <span className="text-white font-mono">ETB {vatOutputCollected.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Input VAT (ለዕቃ ግዢ የተከፈለ)፡</span>
                  <span className="text-white font-mono">- ETB {vatInputPaid.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Withholding Tax */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-semibold">{isAmharic ? 'የዊዝሆልዲንግ ታክስ (2% / 30% WHT)' : 'Withholding Tax (WHT)'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Tax Deduction</span>
              </div>
              <div className="text-2xl font-bold text-amber-400 font-mono">
                ETB {(wht2PercentPayable + wht30PercentPayable).toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>2% WHT (ደረሰኝ ላላቸው አቅራቢዎች)፡</span>
                  <span className="text-white font-mono">ETB {wht2PercentPayable.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>30% WHT (ደረሰኝ ለሌላቸው)፡</span>
                  <span className="text-white font-mono">ETB {wht30PercentPayable.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 10% Service Charge */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-semibold">{isAmharic ? '10% ሰርቪስ ቻርጅ (ለሰራተኞች)' : '10% Service Charge Pool'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Staff Tips</span>
              </div>
              <div className="text-2xl font-bold text-purple-400 font-mono">
                ETB {serviceCharge10PctCollected.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {isAmharic
                  ? 'በወሩ መጨረሻ ለFOH፣ ለኩሽና እና ለባር ሰራተኞች በእኩል ወይም በነጥብ ክፍፍል የሚሰጥ'
                  : 'Monthly pooled service charge ready for staff tip distribution schedule.'}
              </p>
            </div>
          </div>

          {/* Tax Regulation Guide Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{isAmharic ? 'የኢትዮጵያ የግብርና ታክስ ህግጋት ማስታወሻ' : 'Ethiopian Ministry of Revenue (MOR) Compliance Notes'}</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <strong className="text-blue-400 block mb-1">15% VAT (ተጨማሪ እሴት ታክስ)</strong>
                {isAmharic
                  ? 'በየወሩ እስከ 30ኛው ቀን ድረስ በኦንላይን e-Tax ፖርታል መወገድና መከፈል አለበት።'
                  : 'Filed monthly via the Ministry of Revenue e-Tax portal by the 30th of the following month.'}
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <strong className="text-amber-400 block mb-1">2% Withholding (WHT)</strong>
                {isAmharic
                  ? 'ከብር 10,000 በላይ ለሆኑ የአገልግሎትና የእቃ ግዢዎች ላይ ተቀንሶ ለገቢዎች የሚከፈል።'
                  : 'Deducted on payments over 10,000 ETB for goods/services from registered taxpayers.'}
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <strong className="text-rose-400 block mb-1">30% Withholding (WHT)</strong>
                {isAmharic
                  ? 'የታክስ ከፋይ መለያ ቁጥር (TIN) ወይም ህጋዊ ደረሰኝ ለሌላቸው ግብይቶች የሚቆረጥ።'
                  : 'Mandatory 30% withholding on vendors failing to supply a valid TIN and official receipt.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3) TAB: Journal Vouchers */}
      {financeTab === 'journal' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">
              {isAmharic ? 'የጆርናል ቫውቸሮች ዝርዝር (General Ledger Journal Vouchers)' : 'Posted Journal Vouchers'}
            </h3>
            <button
              onClick={() => setIsNewJvOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isAmharic ? 'አዲስ ቫውቸር መዝግብ' : 'Add Voucher'}</span>
            </button>
          </div>

          {vouchers.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center shadow-xl space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  {isAmharic ? 'ምንም የተመዘገበ ጆርናል ቫውቸር የለም (ዳታው ዜሮ ሆኗል)' : 'No Journal Vouchers (Clean Slate)'}
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                  {isAmharic
                    ? 'የዕለቱ የካሸር ሽያጭ ገቢ ወይም የስቶር ግዢ ወጪዎችን እዚህ እንደ አዲስ በመመዝገብ የፋይናንስ መዛግብትዎን ያስጀምሩ።'
                    : 'Start recording daily POS cashier sales, ingredient purchases, and operating expenses from scratch.'}
                </p>
              </div>
              <button
                onClick={() => setIsNewJvOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isAmharic ? '+ የመጀመሪያውን ቫውቸር መዝግብ' : '+ Record First Voucher'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {vouchers.map((jv) => (
                <div key={jv.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-emerald-400 text-sm bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                        {jv.voucherNumber}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">{jv.referenceDoc}</h4>
                        <span className="text-xs text-slate-400">
                          {formatEthiopianDate(jv.date, language)} • {jv.preparedBy}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      {isAmharic ? 'የተለጠፈ (Posted)' : 'Posted'}
                    </span>
                  </div>

                  {/* Lines Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                          <th className="py-2 px-2 w-24">{isAmharic ? 'ኮድ' : 'Account Code'}</th>
                          <th className="py-2 px-2">{isAmharic ? 'የሒሳብ ስም' : 'Account Name'}</th>
                          <th className="py-2 px-2 text-right w-32">{isAmharic ? 'ዴቢት (Debit)' : 'Debit'}</th>
                          <th className="py-2 px-2 text-right w-32">{isAmharic ? 'ክሬዲት (Credit)' : 'Credit'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {jv.lines.map((l, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/20">
                            <td className="py-1.5 px-2 font-mono text-slate-400">{l.accountCode}</td>
                            <td className="py-1.5 px-2 text-slate-200">{l.accountName}</td>
                            <td className="py-1.5 px-2 text-right font-mono text-white">
                              {l.debit > 0 ? `ETB ${l.debit.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-white">
                              {l.credit > 0 ? `ETB ${l.credit.toLocaleString()}` : '-'}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-950 font-bold border-t border-slate-700">
                          <td colSpan={2} className="py-2 px-2 text-right text-slate-300">
                            {isAmharic ? 'ድምር (Total)፡' : 'Total:'}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-emerald-400">
                            ETB {jv.totalDebit.toLocaleString()}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-emerald-400">
                            ETB {jv.totalCredit.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4) TAB: Chart of Accounts (COA) */}
      {financeTab === 'coa' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                {isAmharic ? 'የሒሳብ መደቦች ዝርዝር (Chart of Accounts)' : 'Standard Chart of Accounts (USALI)'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAmharic
                  ? 'ለሆቴልና ሬስቶራንት የተዘጋጀ 1000-6000 ዓለም አቀፍ የሂሳብ አከፋፈል ኮዶች'
                  : 'International 1000-6000 code structure for hotel asset, liability, revenue & expense tracking'}
              </p>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-1">
              {['all', 'asset', 'liability', 'equity', 'revenue', 'cogs', 'expense'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCoaCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                    selectedCoaCategory === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-28">{isAmharic ? 'የሂሳብ ኮድ' : 'Code'}</th>
                    <th className="py-3 px-4">{isAmharic ? 'የመደብ ስም (አማርኛ / English)' : 'Account Name'}</th>
                    <th className="py-3 px-4 w-32">{isAmharic ? 'ዓይነት' : 'Category'}</th>
                    <th className="py-3 px-4 w-32">{isAmharic ? 'መደበኛ ባላንስ' : 'Normal Balance'}</th>
                    <th className="py-3 px-4 text-right w-36">{isAmharic ? 'ያለበት ሂሳብ' : 'Balance (ETB)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {accounts
                    .filter((a) => selectedCoaCategory === 'all' || a.category === selectedCoaCategory)
                    .map((acc) => (
                      <tr key={acc.code} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-4 font-mono font-bold text-emerald-400">{acc.code}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-white">{isAmharic ? acc.nameAm : acc.nameEn}</div>
                          <div className="text-[10px] text-slate-400">{isAmharic ? acc.nameEn : acc.nameAm}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                            {acc.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {acc.isDebitNormal ? (isAmharic ? 'ዴቢት (Debit)' : 'Debit') : (isAmharic ? 'ክሬዲት (Credit)' : 'Credit')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-white">
                          ETB {acc.balance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5) TAB: Cashier Shifts & Settlement */}
      {financeTab === 'cashierAudit' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-rose-400" />
                <span>{isAmharic ? 'የካሸሮች የቀን ሽፍትና የሣጥን ርክክብ' : 'Cashier Daily Shift Settlements'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAmharic
                  ? 'ከካሸር ፖርታል በቀጥታ የተላኩ የጥሬ ገንዘብ፣ የቴሌብር፣ የሲቢኢ ብርና የPOS ልዩነቶች ማረጋገጫ'
                  : 'Live cashier drawer tally vs POS machine sales comparison with Over/Short tracking.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shift 1 Sample */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                <div>
                  <span className="text-xs font-bold text-white">ሰላማዊት ታደሰ (Morning Shift)</span>
                  <div className="text-[11px] text-slate-400">Frasco Bello • POS Station 1</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  ትክክል (Balanced)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2 rounded-lg">
                  <span className="text-slate-400 block">የPOS ሽያጭ</span>
                  <strong className="text-white font-mono">ETB 34,250.00</strong>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg">
                  <span className="text-slate-400 block">ጥሬ ገንዘብ በሣጥን</span>
                  <strong className="text-white font-mono">ETB 16,500.00</strong>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg">
                  <span className="text-slate-400 block">ቴሌብር</span>
                  <strong className="text-blue-300 font-mono">ETB 12,350.00</strong>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg">
                  <span className="text-slate-400 block">ሲቢኢ ብር / ካርድ</span>
                  <strong className="text-purple-300 font-mono">ETB 5,400.00</strong>
                </div>
              </div>
            </div>

            {/* Shift 2 Sample */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                <div>
                  <span className="text-xs font-bold text-white">ዳዊት በቀለ (Evening Shift)</span>
                  <div className="text-[11px] text-slate-400">Frasco Bello • POS Station 2</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  +12.00 ETB (Over)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2 rounded-lg">
                  <span className="text-slate-400 block">የPOS ሽያጭ</span>
                  <strong className="text-white font-mono">ETB 51,200.00</strong>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg">
                  <span className="text-slate-400 block">ጥሬ ገንዘብ በሣጥን</span>
                  <strong className="text-white font-mono">ETB 28,150.00</strong>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg">
                  <span className="text-slate-400 block">ቴሌብር</span>
                  <strong className="text-blue-300 font-mono">ETB 14,862.00</strong>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg">
                  <span className="text-slate-400 block">ሲቢኢ ብር / ካርድ</span>
                  <strong className="text-purple-300 font-mono">ETB 8,200.00</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Journal Voucher Modal */}
      {isNewJvOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                {isAmharic ? 'አዲስ ጆርናል ቫውቸር መዝግብ (New Journal Voucher)' : 'Record New Journal Voucher'}
              </h3>
              <button
                onClick={() => setIsNewJvOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveJv} className="p-4 flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isAmharic ? 'ቀን' : 'Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={newJvDate}
                    onChange={(e) => setNewJvDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isAmharic ? 'መግለጫ / ምክንያት' : 'Description'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newJvDesc}
                    onChange={(e) => setNewJvDesc(e.target.value)}
                    placeholder={isAmharic ? 'ለምሳሌ፡ የጥሬ ዕቃ ግዢ ወይም የባንክ ማስተካከያ' : 'e.g. Stock purchase'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white"
                  />
                </div>
              </div>

              {/* Lines */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    {isAmharic ? 'የሂሳብ መስመሮች (Journal Lines)' : 'Lines'}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddJvLine}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    + {isAmharic ? 'መስመር ጨምር' : 'Add Line'}
                  </button>
                </div>

                <div className="space-y-2">
                  {newJvLines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <select
                        value={line.accountCode}
                        onChange={(e) => handleUpdateJvLine(idx, 'accountCode', e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white flex-1"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.code} value={acc.code}>
                            {acc.code} - {isAmharic ? acc.nameAm : acc.nameEn}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="0.01"
                        placeholder="Debit"
                        value={line.debit || ''}
                        onChange={(e) => handleUpdateJvLine(idx, 'debit', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-right text-emerald-400 font-mono"
                      />

                      <input
                        type="number"
                        step="0.01"
                        placeholder="Credit"
                        value={line.credit || ''}
                        onChange={(e) => handleUpdateJvLine(idx, 'credit', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-right text-emerald-400 font-mono"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveJvLine(idx)}
                        disabled={newJvLines.length <= 2}
                        className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-30"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Balance validation */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">Total Debits: </span>
                    <strong className="text-white font-mono">ETB {newJvTotalDebit.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Credits: </span>
                    <strong className="text-white font-mono">ETB {newJvTotalCredit.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        isJvBalanced
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {isJvBalanced
                        ? (isAmharic ? 'የተመጣጠነ (Balanced)' : 'Balanced')
                        : (isAmharic ? 'አልተመጣጠነም (Out of Balance)' : 'Out of Balance')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewJvOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  {isAmharic ? 'ይቅር' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!isJvBalanced}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition"
                >
                  {isAmharic ? 'ቫውቸሩን ለጥፍ (Post JV)' : 'Post Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
