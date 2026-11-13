import React, { useState, useMemo } from 'react';
import {
  Users,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  Plus,
  Building2,
  ShieldCheck,
  Award,
  BookOpen,
  ChevronRight,
  Trash2,
  X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { Employee, DepartmentType, JobDescription } from '../types';
import {
  STANDARD_JOB_DESCRIPTIONS,
  calculateEthiopianPayeTax,
} from '../utils/stationConfigs';
import { formatEthiopianDate, getTodayDateString } from '../utils/ethiopianDate';

export const HrPayrollView: React.FC = () => {
  const { language } = useLanguage();
  const isAmharic = language === 'am';
  const { branches } = useApp();

  // Active sub-tab
  const [activeHrTab, setActiveHrTab] = useState<'employees' | 'payroll' | 'jds'>('employees');

  // Employee Directory state (initialized strictly to empty [] for fresh zero-data entry)
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem('eth_erp_employees_zero');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const saveEmployeesToStorage = (updated: Employee[]) => {
    setEmployees(updated);
    try {
      localStorage.setItem('eth_erp_employees_zero', JSON.stringify(updated));
    } catch {}
  };

  // Add Employee Modal state
  const [isAddEmpOpen, setIsAddEmpOpen] = useState(false);
  const [newEmpNameAm, setNewEmpNameAm] = useState('');
  const [newEmpNameEn, setNewEmpNameEn] = useState('');
  const [newEmpCode, setNewEmpCode] = useState('');
  const [newEmpDept, setNewEmpDept] = useState<DepartmentType>('KITCHEN_BOH');
  const [newEmpJobTitle, setNewEmpJobTitle] = useState('');
  const [newEmpStation, setNewEmpStation] = useState<string>('none');
  const [newEmpBasicSalary, setNewEmpBasicSalary] = useState<number>(0);
  const [newEmpTransport, setNewEmpTransport] = useState<number>(0);
  const [newEmpHousing, setNewEmpHousing] = useState<number>(0);
  const [newEmpFood, setNewEmpFood] = useState<number>(0);
  const [newEmpPosition, setNewEmpPosition] = useState<number>(0);
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpBranchId, setNewEmpBranchId] = useState(branches[0]?.id || 'br-frasco-bello');

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpNameAm.trim() && !newEmpNameEn.trim()) return;

    const newEmp: Employee = {
      id: `emp_${Date.now()}`,
      hotelId: 'ht-bello-fam',
      branchId: newEmpBranchId,
      employeeCode: newEmpCode.trim() || `EMP-${String(employees.length + 1).padStart(3, '0')}`,
      nameAm: newEmpNameAm.trim() || newEmpNameEn.trim(),
      nameEn: newEmpEnOrFallback(newEmpNameEn, newEmpNameAm),
      department: newEmpDept,
      jobTitle: newEmpJobTitle.trim() || (isAmharic ? 'ሰራተኛ' : 'Staff Member'),
      assignedStation: newEmpStation !== 'none' ? (newEmpStation as any) : undefined,
      basicSalary: Number(newEmpBasicSalary) || 0,
      allowances: {
        transport: Number(newEmpTransport) || 0,
        housing: Number(newEmpHousing) || 0,
        food: Number(newEmpFood) || 0,
        position: Number(newEmpPosition) || 0,
      },
      phone: newEmpPhone.trim() || '+251 900 000 000',
      emergencyContact: '+251 900 000 000',
      gender: 'MALE',
      hireDate: getTodayDateString(),
      employmentType: 'PERMANENT',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    saveEmployeesToStorage([...employees, newEmp]);
    setIsAddEmpOpen(false);
    // Reset form
    setNewEmpNameAm('');
    setNewEmpNameEn('');
    setNewEmpCode('');
    setNewEmpJobTitle('');
    setNewEmpBasicSalary(0);
    setNewEmpTransport(0);
    setNewEmpHousing(0);
    setNewEmpFood(0);
    setNewEmpPosition(0);
    setNewEmpPhone('');
  };

  const handleDeleteEmployee = (empId: string) => {
    if (window.confirm(isAmharic ? 'ይህንን ሰራተኛ መሰረዝ ይፈልጋሉ?' : 'Remove this staff member?')) {
      saveEmployeesToStorage(employees.filter((e) => e.id !== empId));
    }
  };

  function newEmpEnOrFallback(en: string, am: string): string {
    return en.trim() || am.trim();
  }

  // Selected JD for detail view
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    STANDARD_JOB_DESCRIPTIONS[0]?.roleId || ''
  );
  const activeJd =
    STANDARD_JOB_DESCRIPTIONS.find((jd) => jd.roleId === selectedRoleId) ||
    STANDARD_JOB_DESCRIPTIONS[0];

  // Selected Employee for payslip print modal
  const [selectedPayslipEmp, setSelectedPayslipEmp] = useState<Employee | null>(null);

  // Service charge tip pool per staff member
  const [serviceChargePerStaff, setServiceChargePerStaff] = useState<number>(3200);

  // Calculate complete Ethiopian payroll for all active employees
  const payrollSummary = useMemo(() => {
    return employees
      .filter((e) => e.status === 'ACTIVE')
      .map((emp) => {
        const basic = emp.basicSalary || 0;
        const transport = emp.allowances?.transport || 0;
        const housing = emp.allowances?.housing || 0;
        const food = emp.allowances?.food || 0;
        const position = emp.allowances?.position || 0;
        const serviceChargeTips = serviceChargePerStaff;

        // Transport allowance up to 600 ETB is generally exempt in Ethiopia
        const taxableTransport = Math.max(0, transport - 600);
        const taxableAllowances = taxableTransport + housing + position;
        const grossTaxableIncome = basic + taxableAllowances;

        // Ethiopian Tax Engine (Proclamation 979/2016)
        const taxEngine = calculateEthiopianPayeTax(grossTaxableIncome);

        // Deductions
        const payeIncomeTax = taxEngine.incomeTaxPayable;
        const employeePension7Pct = taxEngine.employeePension;
        const employerPension11Pct = taxEngine.employerPension;
        const totalDeductions = payeIncomeTax + employeePension7Pct;

        // Gross Earnings & Net Take-Home Pay
        const totalGrossEarnings =
          basic + transport + housing + food + position + serviceChargeTips;
        const netPay = totalGrossEarnings - totalDeductions;

        return {
          employee: emp,
          basic,
          transport,
          housing,
          food,
          position,
          serviceChargeTips,
          totalGrossEarnings,
          taxableIncome: grossTaxableIncome,
          taxRatePct: taxEngine.taxRatePct,
          deductionConstant: taxEngine.deductionConstant,
          payeIncomeTax,
          employeePension7Pct,
          employerPension11Pct,
          totalPension18Pct: taxEngine.totalPension,
          totalDeductions,
          netPay: Number(netPay.toFixed(2)),
        };
      });
  }, [employees, serviceChargePerStaff]);

  // Payroll totals
  const totalPayrollGross = useMemo(
    () => payrollSummary.reduce((acc, p) => acc + p.totalGrossEarnings, 0),
    [payrollSummary]
  );
  const totalPayeTax = useMemo(
    () => payrollSummary.reduce((acc, p) => acc + p.payeIncomeTax, 0),
    [payrollSummary]
  );
  const totalEmployeePension = useMemo(
    () => payrollSummary.reduce((acc, p) => acc + p.employeePension7Pct, 0),
    [payrollSummary]
  );
  const totalEmployerPension = useMemo(
    () => payrollSummary.reduce((acc, p) => acc + p.employerPension11Pct, 0),
    [payrollSummary]
  );
  const totalNetPay = useMemo(
    () => payrollSummary.reduce((acc, p) => acc + p.netPay, 0),
    [payrollSummary]
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Users className="w-5 h-5" />
            </span>
            <span className="text-xs uppercase font-bold tracking-wider text-blue-400">
              {isAmharic ? 'የሆቴልና ሬስቶራንት HR እና ፔይሮል ሲስተም' : 'Hotel HR & Ethiopian Payroll Proclamation 979/2016'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {isAmharic ? 'የሰራተኞች አስተዳደር፣ የሥራ መዘርዝርና ደመወዝ' : 'Staff Directory, Job Descriptions & Payroll'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isAmharic
              ? 'የኢትዮጵያ የግብር ህግ (PAYE 0-35%)፣ የጡረታ መዋጮ (7% + 11%)፣ የሰርቪስ ቻርጅ ክፍፍል እና የስራ መዘርዝሮች'
              : 'Ethiopian Progressive Income Tax, 7% EE / 11% ER Pension, Service Charge Tips & Department JDs'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>{isAmharic ? 'ፕሪንት' : 'Print'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex overflow-x-auto gap-1">
        <button
          onClick={() => setActiveHrTab('employees')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeHrTab === 'employees'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isAmharic ? 'የሰራተኞች ማህደር (Staff Directory)' : 'Staff Directory'}</span>
        </button>

        <button
          onClick={() => setActiveHrTab('payroll')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeHrTab === 'payroll'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>{isAmharic ? 'የወር ፔይሮልና ግብር (Ethiopian Payroll)' : 'Payroll & Taxes'}</span>
        </button>

        <button
          onClick={() => setActiveHrTab('jds')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeHrTab === 'jds'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>{isAmharic ? 'ስታንዳርድ የስራ መዘርዝር (Job Descriptions)' : 'Job Descriptions'}</span>
        </button>
      </div>

      {/* 1) TAB: Staff Directory */}
      {activeHrTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                {isAmharic ? 'የተመዘገቡ ሰራተኞች ዝርዝር' : 'Registered Staff Members'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAmharic ? 'የሆቴልና የሬስቶራንት ሰራተኞችን እንደ አዲስ እዚህ ይመዝግቡ' : 'Manage your staff directory and assign station portal roles'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                {employees.length} {isAmharic ? 'ንቁ ሰራተኞች' : 'Active Employees'}
              </span>
              <button
                onClick={() => setIsAddEmpOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAmharic ? '+ አዲስ ሰራተኛ መዝግብ' : '+ Register Staff'}</span>
              </button>
            </div>
          </div>

          {employees.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center shadow-xl space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  {isAmharic ? 'ምንም የተመዘገበ ሰራተኛ የለም (ዳታው ዜሮ ሆኗል)' : 'No Staff Members Registered (Zero Slate)'}
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                  {isAmharic
                    ? 'የሆቴልዎን ወይም የሬስቶራንትዎን ሰራተኞች ስም፣ የስራ ድርሻና ደመወዝ ከዚህ ቀን ጀምሮ እራስዎ ፊድ ማድረግ ይችላሉ።'
                    : 'Feed your actual staff members from scratch. Assign roles for Chef, Barman, Juicer, Cashier, and Storekeeper.'}
                </p>
              </div>
              <button
                onClick={() => setIsAddEmpOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition"
              >
                <Plus className="w-4 h-4" />
                <span>{isAmharic ? '+ የመጀመሪያውን ሰራተኛ መዝግብ' : '+ Register First Staff Member'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3 relative hover:border-blue-500/40 transition group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                        {emp.nameEn.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition">
                          {isAmharic ? emp.nameAm : emp.nameEn}
                        </h4>
                        <p className="text-xs text-blue-400">{emp.jobTitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                        {emp.status}
                      </span>
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title={isAmharic ? 'ሰራተኛውን ሰርዝ' : 'Remove employee'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isAmharic ? 'መሰረታዊ ደመወዝ፡' : 'Basic Salary:'}</span>
                      <strong className="text-white font-mono">ETB {emp.basicSalary.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isAmharic ? 'ዲፓርትመንት፡' : 'Department:'}</span>
                      <span className="text-slate-200 capitalize">{emp.department}</span>
                    </div>
                    {emp.assignedStation && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">{isAmharic ? 'የስቴሽን ቆጠራ ሊንክ፡' : 'Assigned Station:'}</span>
                        <span className="text-amber-400 font-semibold capitalize">{emp.assignedStation}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isAmharic ? 'ስልክ፡' : 'Phone:'}</span>
                      <span className="text-slate-300 font-mono">{emp.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">ID: {emp.employeeCode}</span>
                    <button
                      onClick={() => setSelectedPayslipEmp(emp)}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold"
                    >
                      <span>{isAmharic ? 'ፔይስሊፕ እይ' : 'View Payslip'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Staff Modal */}
          {isAddEmpOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
              <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full border border-blue-500/40 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-blue-500/20 bg-slate-950">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    <h4 className="text-sm font-bold text-white">
                      {isAmharic ? 'አዲስ ሰራተኛ መመዝገቢያ' : 'Register New Employee'}
                    </h4>
                  </div>
                  <button
                    onClick={() => setIsAddEmpOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateEmployee} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {isAmharic ? 'ሙሉ ስም (በአማርኛ) *' : 'Full Name (Amharic) *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={newEmpNameAm}
                        onChange={(e) => setNewEmpNameAm(e.target.value)}
                        placeholder="ለምሳሌ፡ አበበ ከበደ"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {isAmharic ? 'ስም (በእንግሊዝኛ)' : 'Name (English)'}
                      </label>
                      <input
                        type="text"
                        value={newEmpNameEn}
                        onChange={(e) => setNewEmpNameEn(e.target.value)}
                        placeholder="e.g. Abebe Kebede"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {isAmharic ? 'የስራ መደብ (Job Title) *' : 'Job Title *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={newEmpJobTitle}
                        onChange={(e) => setNewEmpJobTitle(e.target.value)}
                        placeholder="ለምሳሌ፡ ዋና ሼፍ / ባርማን"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {isAmharic ? 'ዲፓርትመንት *' : 'Department *'}
                      </label>
                      <select
                        value={newEmpDept}
                        onChange={(e) => setNewEmpDept(e.target.value as DepartmentType)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="KITCHEN_BOH">Kitchen (ኩሽና)</option>
                        <option value="BAR">Bar (መጠጥ ባር)</option>
                        <option value="JUICE_BAR">Fresh Juice (ፍራፍሬና ጁስ)</option>
                        <option value="CASHIER_POS">Cashier & POS (ካሸር)</option>
                        <option value="STORE_PURCHASE">Store (ስቶር)</option>
                        <option value="SERVICE_FOH">Service & Waiters (አስተናጋጆች)</option>
                        <option value="MANAGEMENT_ADMIN">Management (ማኔጅመንት)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {isAmharic ? 'የስቴሽን ቆጠራ ሊንክ ሚና' : 'Assigned Station Portal'}
                      </label>
                      <select
                        value={newEmpStation}
                        onChange={(e) => setNewEmpStation(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="none">{isAmharic ? 'ምንም (አይቆጥርም)' : 'None (No station)'}</option>
                        <option value="chef">Chef (የሼፍ ቆጠራ)</option>
                        <option value="barman">Barman (የባርማን ቆጠራ)</option>
                        <option value="juicer">Juicer (የጁሰር ቆጠራ)</option>
                        <option value="cashier">Cashier (የካሸር ሪፖርት)</option>
                        <option value="storekeeper">Storekeeper (የስቶር ቆጠራ)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {isAmharic ? 'መሰረታዊ ደመወዝ (ETB) *' : 'Basic Salary (ETB) *'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={newEmpBasicSalary || ''}
                        onChange={(e) => setNewEmpBasicSalary(parseFloat(e.target.value) || 0)}
                        placeholder="8000"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {isAmharic ? 'የትራንስፖርት አበል' : 'Transport'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newEmpTransport || ''}
                        onChange={(e) => setNewEmpTransport(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {isAmharic ? 'የቤት አበል' : 'Housing'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newEmpHousing || ''}
                        onChange={(e) => setNewEmpHousing(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {isAmharic ? 'የምግብ አበል' : 'Food'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newEmpFood || ''}
                        onChange={(e) => setNewEmpFood(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {isAmharic ? 'የሃላፊነት አበል' : 'Position'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newEmpPosition || ''}
                        onChange={(e) => setNewEmpPosition(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {isAmharic ? 'ስልክ ቁጥር' : 'Phone'}
                      </label>
                      <input
                        type="text"
                        value={newEmpPhone}
                        onChange={(e) => setNewEmpPhone(e.target.value)}
                        placeholder="+251 911 000 000"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {isAmharic ? 'ቅርንጫፍ' : 'Branch'}
                      </label>
                      <select
                        value={newEmpBranchId}
                        onChange={(e) => setNewEmpBranchId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {isAmharic ? b.nameAm : b.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddEmpOpen(false)}
                      className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                    >
                      {isAmharic ? 'ሰርዝ' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg transition"
                    >
                      {isAmharic ? 'መዝግብና አጠናቅቅ' : 'Register Staff Member'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2) TAB: Ethiopian Payroll & PAYE Tax */}
      {activeHrTab === 'payroll' && (
        <div className="space-y-6">
          {/* Top 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold block">
                {isAmharic ? 'ጠቅላላ የደመወዝ ወጪ (Gross Payroll)' : 'Total Gross Payroll'}
              </span>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                ETB {totalPayrollGross.toLocaleString()}
              </div>
              <span className="text-xs text-slate-400 mt-2 block">
                {isAmharic ? 'መሰረታዊ + አበል + ሰርቪስ ቻርጅ' : 'Basic + Allowances + Tips'}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold block">
                {isAmharic ? 'የተቀጣሪዎች የገቢ ግብር (PAYE Tax)' : 'PAYE Income Tax'}
              </span>
              <div className="text-2xl font-bold text-rose-400 font-mono mt-1">
                ETB {totalPayeTax.toLocaleString()}
              </div>
              <span className="text-xs text-slate-400 mt-2 block">
                {isAmharic ? 'ለገቢዎች ሚኒስቴር የሚተላለፍ' : 'Ministry of Revenue deduction'}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold block">
                {isAmharic ? 'የጡረታ መዋጮ (18% Pension)' : 'Total 18% Pension'}
              </span>
              <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                ETB {(totalEmployeePension + totalEmployerPension).toLocaleString()}
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-2">
                <span>7% EE: ETB {totalEmployeePension.toLocaleString()}</span>
                <span>11% ER: ETB {totalEmployerPension.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-lg bg-gradient-to-br from-slate-900 to-emerald-950/40">
              <span className="text-xs text-emerald-300 font-semibold block">
                {isAmharic ? 'የተጣራ የሚከፈል (Net Take-Home Pay)' : 'Net Take-Home Pay'}
              </span>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                ETB {totalNetPay.toLocaleString()}
              </div>
              <span className="text-xs text-emerald-300 mt-2 block">
                {isAmharic ? 'ለሰራተኞች ባንክ የሚተላለፍ' : 'Net bank transfer to staff'}
              </span>
            </div>
          </div>

          {/* Service Charge Tip Configuration Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">
                {isAmharic ? 'የ10% ሰርቪስ ቻርጅ የሰራተኞች ክፍፍል' : '10% Service Charge Tip Pool Distribution'}
              </h4>
              <p className="text-xs text-slate-400">
                {isAmharic
                  ? 'ከምግብና መጠጥ ሽያጭ የተሰበሰበው 10% ሰርቪስ ቻርጅ ለእያንዳንዱ ሰራተኛ እኩል ተካፍሎ ከደመወዝ ጋር ይከፈላል'
                  : 'Distribute collected monthly tips evenly across all active team members'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{isAmharic ? 'ለአንድ ሰራተኛ፡' : 'Per Employee:'}</span>
              <div className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-500">ETB</span>
                <input
                  type="number"
                  value={serviceChargePerStaff}
                  onChange={(e) => setServiceChargePerStaff(parseFloat(e.target.value) || 0)}
                  className="w-24 bg-transparent font-mono font-bold text-emerald-400 text-sm focus:outline-none text-right"
                />
              </div>
            </div>
          </div>

          {/* Master Ethiopian Payroll Ledger Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <h3 className="text-sm sm:text-base font-bold text-white">
                {isAmharic
                  ? 'የኢትዮጵያ አዋጅ ቁጥር 979/2016 የፔይሮል ማስያ ሰንጠረዥ'
                  : 'Ethiopian Proclamation 979/2016 Master Payroll Ledger'}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {isAmharic ? 'ወር፡ ግንቦት 2016' : 'Period: Current Month'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 min-w-[140px] sticky left-0 bg-slate-950 z-10">{isAmharic ? 'የሰራተኛ ስም' : 'Employee'}</th>
                    <th className="py-3 px-2 text-right">{isAmharic ? 'መሰረታዊ' : 'Basic'}</th>
                    <th className="py-3 px-2 text-right">{isAmharic ? 'አበል' : 'Allowances'}</th>
                    <th className="py-3 px-2 text-right text-purple-300">{isAmharic ? 'ሰርቪስ ቻርጅ' : 'Tips / SC'}</th>
                    <th className="py-3 px-2 text-right font-bold text-white">{isAmharic ? 'ጠቅላላ ገቢ' : 'Gross'}</th>
                    <th className="py-3 px-2 text-right text-rose-300">{isAmharic ? 'የገቢ ግብር (PAYE)' : 'PAYE Tax'}</th>
                    <th className="py-3 px-2 text-right text-amber-300">{isAmharic ? 'ጡረታ 7%' : 'Pension 7%'}</th>
                    <th className="py-3 px-2 text-right text-slate-400">{isAmharic ? 'የአሰሪ ጡረታ 11%' : 'Pension 11%'}</th>
                    <th className="py-3 px-3 text-right font-bold text-emerald-400 bg-emerald-950/20">{isAmharic ? 'የተጣራ ተከፋይ' : 'Net Pay'}</th>
                    <th className="py-3 px-2 text-center">{isAmharic ? 'ፔይስሊፕ' : 'Slip'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {payrollSummary.map((p, idx) => (
                    <tr
                      key={p.employee.id}
                      className={`hover:bg-slate-800/40 transition ${
                        idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/90'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800/60">
                        <div>{isAmharic ? p.employee.nameAm : p.employee.nameEn}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {p.employee.jobTitle}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-white">
                        {p.basic.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-300">
                        {(p.transport + p.housing + p.food + p.position).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-purple-300">
                        {p.serviceChargeTips.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-white">
                        {p.totalGrossEarnings.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-rose-400 font-semibold">
                        {p.payeIncomeTax.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-amber-400">
                        {p.employeePension7Pct.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                        {p.employerPension11Pct.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300 bg-emerald-950/20 text-sm">
                        {p.netPay.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => setSelectedPayslipEmp(p.employee)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-semibold"
                        >
                          {isAmharic ? 'ስሊፕ' : 'Slip'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-slate-950 font-bold border-t-2 border-slate-700 text-xs">
                    <td className="py-3 px-3 text-slate-200 sticky left-0 bg-slate-950 z-10 border-r border-slate-800">
                      {isAmharic ? 'ጠቅላላ ድምር (TOTALS)' : 'TOTALS'}
                    </td>
                    <td colSpan={3} className="py-3 px-2 text-right text-slate-400">
                      -
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-white">
                      ETB {totalPayrollGross.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-rose-400">
                      ETB {totalPayeTax.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-amber-400">
                      ETB {totalEmployeePension.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-slate-400">
                      ETB {totalEmployerPension.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 bg-emerald-950/40 text-sm">
                      ETB {totalNetPay.toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3) TAB: Standard Hotel Job Descriptions (JDs) */}
      {activeHrTab === 'jds' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Roles List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              {isAmharic ? 'የስራ መዘርዝር መደቦች' : 'Hotel Job Profiles'}
            </h4>
            {STANDARD_JOB_DESCRIPTIONS.map((jd) => {
              const active = jd.roleId === activeJd.roleId;
              return (
                <button
                  key={jd.roleId}
                  onClick={() => setSelectedRoleId(jd.roleId)}
                  className={`w-full text-left p-3 rounded-xl border transition ${
                    active
                      ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-sm">{isAmharic ? jd.titleAm : jd.titleEn}</div>
                  <div className="text-[11px] text-slate-400 capitalize">{jd.department}</div>
                </button>
              );
            })}
          </div>

          {/* JD Detail Panel */}
          <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                {activeJd.department}
              </span>
              <h2 className="text-xl font-bold text-white mt-2">
                {isAmharic ? activeJd.titleAm : activeJd.titleEn}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isAmharic ? activeJd.titleEn : activeJd.titleAm}
              </p>
              <div className="text-xs text-slate-300 mt-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <strong>{isAmharic ? 'ዓላማ፡ ' : 'Objective: '}</strong>
                {isAmharic ? activeJd.objectiveAm : activeJd.objectiveEn}
              </div>
            </div>

            {/* Key Duties */}
            <div>
              <h3 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{isAmharic ? 'ዋና ዋና የስራ ኃላፊነቶች' : 'Key Responsibilities'}</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-300 list-disc list-inside">
                {(isAmharic ? activeJd.dutiesAm : activeJd.dutiesEn).map((resp, i) => (
                  <li key={i} className="leading-relaxed">
                    {resp}
                  </li>
                ))}
              </ul>
            </div>

            {/* KPIs & Uniform Standards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>{isAmharic ? 'የስራ አፈጻጸም መለኪያዎች (KPIs)' : 'Performance KPIs'}</span>
                </h4>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  {(isAmharic ? activeJd.kpisAm : activeJd.kpisEn).map((kpi, i) => (
                    <li key={i}>{kpi}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isAmharic ? 'የዩኒፎርምና የንጽህና መስፈርቶች' : 'Uniform & Hygiene Standards'}</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isAmharic ? activeJd.dressCodeAm : activeJd.dressCodeEn}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Luxury Payslip Modal */}
      {selectedPayslipEmp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">
                  {isAmharic ? 'የደመወዝ ክፍያ ማስረጃ (Employee Payslip)' : 'Official Salary Payslip'}
                </h3>
                <span className="text-xs text-slate-400">Proclamation No. 979/2016 Compliant</span>
              </div>
              <button
                onClick={() => setSelectedPayslipEmp(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Payslip Card Body */}
            {(() => {
              const pay = payrollSummary.find((p) => p.employee.id === selectedPayslipEmp.id);
              if (!pay) return null;

              return (
                <div className="space-y-4 text-xs font-sans">
                  {/* Hotel Header */}
                  <div className="text-center pb-2 border-b border-slate-800">
                    <h4 className="font-bold text-white text-sm">BELLO FAM & FRASCO RESTAURANTS</h4>
                    <p className="text-[11px] text-slate-400">Addis Ababa, Ethiopia • TIN: 0049281726</p>
                    <div className="text-[11px] font-mono text-emerald-400 mt-1">
                      Payslip for {isAmharic ? 'ግንቦት 2016' : 'Current Month'}
                    </div>
                  </div>

                  {/* Employee Details */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Employee:</span>
                      <strong className="text-white text-sm">
                        {isAmharic ? pay.employee.nameAm : pay.employee.nameEn}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Position:</span>
                      <strong className="text-white">{pay.employee.jobTitle}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Employee Code:</span>
                      <span className="text-slate-300 font-mono">{pay.employee.employeeCode}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Department:</span>
                      <span className="text-slate-300 font-mono">{pay.employee.department}</span>
                    </div>
                  </div>

                  {/* Earnings Breakdown */}
                  <div className="space-y-1.5">
                    <div className="font-bold text-slate-300 text-xs flex justify-between border-b border-slate-800 pb-1">
                      <span>EARNINGS (ገቢዎች)</span>
                      <span>ETB</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Basic Salary (መሰረታዊ ደመወዝ)</span>
                      <span className="font-mono">{pay.basic.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Allowances (አበሎች)</span>
                      <span className="font-mono">
                        {(pay.transport + pay.housing + pay.food + pay.position).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-purple-300 font-semibold">
                      <span>10% Service Charge Tips (ሰርቪስ ቻርጅ)</span>
                      <span className="font-mono">{pay.serviceChargeTips.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold pt-1 border-t border-slate-800">
                      <span>TOTAL GROSS EARNINGS</span>
                      <span className="font-mono">{pay.totalGrossEarnings.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Deductions Breakdown */}
                  <div className="space-y-1.5">
                    <div className="font-bold text-rose-400 text-xs flex justify-between border-b border-slate-800 pb-1">
                      <span>DEDUCTIONS (ተቀናሾች)</span>
                      <span>ETB</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>PAYE Income Tax ({pay.taxRatePct}%)</span>
                      <span className="font-mono text-rose-400">-{pay.payeIncomeTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Employee Pension (7%)</span>
                      <span className="font-mono text-amber-400">-{pay.employeePension7Pct.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold pt-1 border-t border-slate-800">
                      <span>TOTAL DEDUCTIONS</span>
                      <span className="font-mono text-rose-400">-{pay.totalDeductions.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Net Pay Card */}
                  <div className="bg-emerald-950/60 border border-emerald-500/40 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-emerald-300 font-bold block uppercase">
                        NET TAKE-HOME PAY (የተጣራ ተከፋይ)
                      </span>
                      <span className="text-xl font-bold font-mono text-white">
                        ETB {pay.netPay.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      PAID / ተከፍሏል
                    </span>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{isAmharic ? 'ፕሪንት አድርግ' : 'Print Payslip'}</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
