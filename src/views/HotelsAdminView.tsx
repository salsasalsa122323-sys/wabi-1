import React, { useState } from 'react';
import {
  Building2,
  Users,
  ShieldCheck,
  Plus,
  KeyRound,
  Lock,
  Mail,
  UserCheck,
  UserX,
  Edit3,
  Archive,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Sparkles,
  GitBranch,
  Crown,
  History,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth, SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Hotel, HotelCategory, UserRole, AppUser } from '../types';

export const HotelsAdminView: React.FC = () => {
  const {
    hotels,
    currentHotelId,
    setCurrentHotelId,
    addHotel,
    updateHotel,
    archiveHotel,
    branches,
    auditCorrections,
  } = useApp();
  const {
    currentUser,
    appUsers,
    createAppUser,
    updateAppUser,
    resetUserPassword,
    changeUserPassword,
    hasCustomPassword,
    toggleDisableUser,
    isSuperAdmin,
  } = useAuth();
  const { language } = useLanguage();

  const [activeTab, setActiveTab] = useState<'hotels' | 'users' | 'auditLog'>('hotels');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminPassError, setAdminPassError] = useState<string | null>(null);

  // Hotel Modals
  const [addHotelModalOpen, setAddHotelModalOpen] = useState(false);
  const [newHotelName, setNewHotelName] = useState('');
  const [newHotelNameAm, setNewHotelNameAm] = useState('');
  const [newHotelCategory, setNewHotelCategory] = useState<HotelCategory>('restaurant');
  const [newHotelCode, setNewHotelCode] = useState('');
  const [newHotelAddress, setNewHotelAddress] = useState('');
  const [newHotelPhone, setNewHotelPhone] = useState('');
  const [newHotelManager, setNewHotelManager] = useState('');

  // User Modals
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('Bello@2026');
  const [newUserRole, setNewUserRole] = useState<UserRole>('hotel_manager');
  const [newUserHotelId, setNewUserHotelId] = useState<string>(hotels[0]?.id || 'hotel_bello_fam');
  const [newUserBranchId, setNewUserBranchId] = useState<string>('all');
  const [userModalNotice, setUserModalNotice] = useState<string | null>(null);

  // Search filter
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const hotelCategoryLabels: Record<HotelCategory, { am: string; en: string }> = {
    restaurant: { am: 'ሬስቶራንት እና ካፌ', en: 'Restaurant & Cafe' },
    hotel: { am: 'ሆቴል እና ሎጅ', en: 'Hotel & Lodge' },
    cafe: { am: 'ካፌ እና ጁስ ቤት', en: 'Cafe & Juice Bar' },
    bakery: { am: 'ዳቦና ኬክ ቤት (Bakery)', en: 'Bakery & Pastry' },
    bar_lounge: { am: 'ባር እና ላውንጅ', en: 'Bar & Lounge' },
    factory: { am: 'የምግብ ፋብሪካ / ማቀነባበሪያ', en: 'Food Processing / Factory' },
    other: { am: 'ሌሎች ንግዶች', en: 'Other Enterprise' },
  };

  const roleLabels: Record<UserRole, { am: string; en: string; color: string }> = {
    super_admin: { am: '👑 ዋና አድሚን (ባለቤት)', en: 'Super Admin (Owner)', color: 'text-amber-300 bg-amber-500/20 border-amber-400/40' },
    hotel_manager: { am: '🏨 የሆቴል ስራ አስኪያጅ', en: 'Hotel General Manager', color: 'text-blue-300 bg-blue-500/20 border-blue-400/40' },
    chef: { am: '👨‍🍳 ሼፍ (የኩሽና ኃላፊ)', en: 'Kitchen Head Chef', color: 'text-indigo-300 bg-indigo-500/20 border-indigo-400/40' },
    store_keeper: { am: '📦 የስቶር ኃላፊ', en: 'Central Store Keeper', color: 'text-emerald-300 bg-emerald-500/20 border-emerald-400/40' },
    cashier: { am: '🧾 ካሸር (የሽያጭ መዝጋቢ)', en: 'Cashier / POS Billing', color: 'text-rose-300 bg-rose-500/20 border-rose-400/40' },
  };

  const handleCreateHotel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotelName.trim()) return;

    const created = addHotel({
      name: newHotelName.trim(),
      nameAm: newHotelNameAm.trim() || newHotelName.trim(),
      category: newHotelCategory,
      categoryAm: hotelCategoryLabels[newHotelCategory]?.am,
      code: newHotelCode.trim() || 'HTL',
      address: newHotelAddress.trim(),
      phone: newHotelPhone.trim(),
      managerName: newHotelManager.trim() || 'ስራ አስኪያጅ',
    });

    setNoticeMessage(
      language === 'am'
        ? `✅ አዲሱ ሆቴል/ንግድ "${created.name}" በተሳካ ሁኔታ ተፈጥሮ ሲስተሙ ዝግጁ ሆኗል!`
        : `✅ New hotel "${created.name}" created and provisioned with an isolated system!`
    );
    setTimeout(() => setNoticeMessage(null), 5000);

    setAddHotelModalOpen(false);
    setNewHotelName('');
    setNewHotelNameAm('');
    setNewHotelCode('');
    setNewHotelAddress('');
    setNewHotelPhone('');
    setNewHotelManager('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserName.trim() || !newUserPassword.trim()) return;

    setUserModalNotice(language === 'am' ? 'ተጠቃሚውን በመመዝገብ ላይ...' : 'Creating user...');

    const res = await createAppUser(
      {
        uid: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email: newUserEmail.trim(),
        displayName: newUserName.trim(),
        role: newUserRole,
        hotelId: newUserHotelId,
        branchId: newUserBranchId,
      },
      newUserPassword.trim()
    );

    if (res.success) {
      setNoticeMessage(
        language === 'am'
          ? `✅ ተጠቃሚው "${newUserName}" (${roleLabels[newUserRole].am}) በስኬት ተመዝግቧል!`
          : `✅ User "${newUserName}" created successfully!`
      );
      setTimeout(() => setNoticeMessage(null), 5000);
      setAddUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('Bello@2026');
      setUserModalNotice(null);
    } else {
      setUserModalNotice(res.error || 'ስህተት አጋጥሟል');
    }
  };

  const handleResetPass = async (email: string) => {
    const res = await resetUserPassword(email);
    setNoticeMessage(res.message);
    setTimeout(() => setNoticeMessage(null), 5000);
  };

  const handleSaveAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPassError(null);
    if (adminNewPassword.trim().length < 4) {
      setAdminPassError(
        language === 'am'
          ? 'አዲሱ የይለፍ ቃል ቢያንስ 4 ፊደላት ወይም ቁጥሮች ሊኖሩት ይገባል።'
          : 'Password must be at least 4 characters.'
      );
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      setAdminPassError(
        language === 'am'
          ? 'ሁለቱ የይለፍ ቃሎች አይመሳሰሉም፤ እባክዎ ደግመው ያረጋግጡ።'
          : 'Passwords do not match.'
      );
      return;
    }
    const targetEmail = currentUser?.email || SUPER_ADMIN_EMAIL;
    const res = await changeUserPassword(targetEmail, adminNewPassword);
    if (res.success) {
      setNoticeMessage(
        language === 'am'
          ? `✅ አዲሱ የአድሚን የይለፍ ቃል ለ ${targetEmail} በተሳካ ሁኔታ ተቀምጧል!`
          : res.message
      );
      setAdminNewPassword('');
      setAdminConfirmPassword('');
      setTimeout(() => setNoticeMessage(null), 6000);
    } else {
      setAdminPassError(res.message);
    }
  };

  const filteredUsers = appUsers.filter((u) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-16 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Crown className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500">
              {language === 'am' ? 'የሆቴሎችና የተጠቃሚዎች ቁጥጥር (Multi-Hotel Admin)' : 'Multi-Hotel System & User Roles Admin'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'am'
              ? 'ዋና አድሚን፦ ሳልሳዊ ስዩም • ብዙ ሆቴሎችን፣ ካፌዎችንና ፋብሪካዎችን በተናጠል ማስተዳደሪያ'
              : 'Super Admin: Salsawi Seyoum • Multi-business management with independent central stores and roles'}
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('hotels')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'hotels'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{language === 'am' ? '🏨 ሆቴሎችና ንግዶች' : 'Hotels & Businesses'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 font-mono">
              {hotels.filter((h) => !h.isArchived).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{language === 'am' ? '👥 ተጠቃሚዎችና ሚናዎች' : 'Users & Roles'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 font-mono">
              {appUsers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('auditLog')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'auditLog'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{language === 'am' ? '📜 የኦዲት ሎግ' : 'Audit Trail'}</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {noticeMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{noticeMessage}</span>
          </div>
          <button onClick={() => setNoticeMessage(null)} className="p-1 hover:bg-white/10 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =========================================================================
          TAB 1: HOTELS & BUSINESSES MANAGEMENT
          ========================================================================= */}
      {activeTab === 'hotels' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="font-bold text-white text-sm">
                {language === 'am' ? 'የተመዘገቡ ሆቴሎችና ንግዶች ዝርዝር' : 'Registered Hotels & Enterprise Accounts'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'am'
                  ? 'እያንዳንዱ አዲስ ሆቴል ራሱን የቻለ ሙሉ ባዶ ሲስተም (ስቶር፣ ሜኑ፣ ቆጠራ፣ ወጪዎች) ይኖረዋል'
                  : 'Each hotel gets a completely isolated system with its own central store, menu, and branches.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAddHotelModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-xs shadow-lg transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>{language === 'am' ? '+ አዲስ ሆቴል/ንግድ ጨምር' : '+ Add New Hotel'}</span>
            </button>
          </div>

          {/* Hotels Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hotels.map((hotel) => {
              const hotelBranchesList = branches.filter((b) => !b.hotelId || b.hotelId === hotel.id);
              const isCurrent = hotel.id === currentHotelId;

              return (
                <div
                  key={hotel.id}
                  className={`p-5 rounded-3xl border transition-all space-y-3 relative overflow-hidden ${
                    isCurrent
                      ? 'bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/60 shadow-xl ring-2 ring-amber-400/30'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  } ${hotel.isArchived ? 'opacity-50 grayscale' : ''}`}
                >
                  {isCurrent && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black">
                      {language === 'am' ? 'አሁን እየሰራበት ያለ' : 'Active Working'}
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <span className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
                      <Building2 className="w-6 h-6" />
                    </span>
                    <div>
                      <h4 className="font-black text-white text-base">{hotel.nameAm || hotel.name}</h4>
                      <span className="text-xs text-amber-400 font-mono block">
                        {hotel.code} • {hotelCategoryLabels[hotel.category]?.am || hotel.category}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
                    <div className="flex items-center justify-between">
                      <span>{language === 'am' ? 'ስራ አስኪያጅ:' : 'Manager:'}</span>
                      <strong className="text-slate-200">{hotel.managerName || 'ሳልሳዊ ስዩም'}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{language === 'am' ? 'ቅርንጫፎች:' : 'Branches:'}</span>
                      <strong className="text-amber-300 font-mono">{hotelBranchesList.length} ቅርንጫፍ</strong>
                    </div>
                    {hotel.address && (
                      <div className="flex items-center justify-between">
                        <span>{language === 'am' ? 'አድራሻ:' : 'Location:'}</span>
                        <span className="text-slate-300 truncate">{hotel.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Switch to this hotel button */}
                  <div className="pt-2 flex items-center justify-between gap-2">
                    {!isCurrent && !hotel.isArchived ? (
                      <button
                        type="button"
                        onClick={() => setCurrentHotelId(hotel.id)}
                        className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition-all"
                      >
                        {language === 'am' ? 'ወደዚህ ሆቴል ቀይር ↗' : 'Switch to this Hotel ↗'}
                      </button>
                    ) : (
                      <div className="flex-1 text-center py-1.5 text-xs text-emerald-400 font-bold">
                        {language === 'am' ? 'ይህ ሆቴል ተመርጧል ✓' : 'Selected Hotel ✓'}
                      </div>
                    )}

                    {isSuperAdmin && hotel.id !== 'hotel_bello_fam' && !hotel.isArchived && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(language === 'am' ? `"${hotel.name}"ን አርካይቭ ማድረግ ይፈልጋሉ?` : `Archive ${hotel.name}?`)) {
                            archiveHotel(hotel.id);
                          }
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                        title="አርካይቭ አድርግ"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: USERS & ROLES MANAGEMENT
          ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Set / Change Admin Password Card */}
          <form
            onSubmit={handleSaveAdminPassword}
            className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 space-y-3 shadow-lg"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <KeyRound className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-black text-amber-300 text-sm">
                    {language === 'am'
                      ? '🔑 አዲስ የአድሚን የይለፍ ቃል (Admin Password) ማዘጋጃ'
                      : '🔑 Set / Change Admin Password'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'am'
                      ? `አካውንት፦ ${currentUser?.email || SUPER_ADMIN_EMAIL} • ${hasCustomPassword(currentUser?.email || SUPER_ADMIN_EMAIL) ? 'ብጁ የይለፍ ቃል ተቀምጧል ✓' : 'አዲስ የራስዎን የይለፍ ቃል እዚህ ያስገቡ'}`
                      : `Account: ${currentUser?.email || SUPER_ADMIN_EMAIL} • ${hasCustomPassword(currentUser?.email || SUPER_ADMIN_EMAIL) ? 'Custom password active ✓' : 'Set your personal Admin password'}`}
                  </p>
                </div>
              </div>
            </div>

            {adminPassError && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{adminPassError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {language === 'am' ? 'አዲስ የይለፍ ቃል (New Password)' : 'New Password'}
                </label>
                <input
                  type="password"
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {language === 'am' ? 'ድጋሚ ያረጋግጡ (Confirm)' : 'Confirm Password'}
                </label>
                <input
                  type="password"
                  value={adminConfirmPassword}
                  onChange={(e) => setAdminConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
              <button
                type="submit"
                className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{language === 'am' ? 'አዲስ ፓስዎርድ አስቀምጥ' : 'Save Admin Password'}</span>
              </button>
            </div>
          </form>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="font-bold text-white text-sm">
                {language === 'am' ? 'የተጠቃሚዎች አካውንትና ሚናዎች (Firebase Auth)' : 'User Accounts & Roles Management'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'am'
                  ? 'ተጠቃሚዎች የተፈቀደላቸውን ሆቴልና ቅርንጫፍ ብቻ ነው የሚያዩት፤ ዋና አድሚን ሙሉ ቁጥጥር አለው'
                  : 'Users only see their assigned hotel and branch. Enforced by server-side Firestore rules.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder={language === 'am' ? 'ተጠቃሚ ፈልግ...' : 'Search user...'}
                  className="bg-transparent text-white text-xs w-32 focus:outline-none"
                />
              </div>

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setAddUserModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-slate-950" />
                  <span>{language === 'am' ? '+ አዲስ ተጠቃሚ ፍጠር' : '+ Add User'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-300 font-bold">
                  <th className="py-3 px-4">{language === 'am' ? 'ስም' : 'Name'}</th>
                  <th className="py-3 px-3">{language === 'am' ? 'ኢሜይል' : 'Email'}</th>
                  <th className="py-3 px-3">{language === 'am' ? 'ሚና (Role)' : 'Role'}</th>
                  <th className="py-3 px-3">{language === 'am' ? 'የተመደበበት ሆቴል' : 'Assigned Hotel'}</th>
                  <th className="py-3 px-3">{language === 'am' ? 'ቅርንጫፍ' : 'Branch'}</th>
                  <th className="py-3 px-2 text-center">{language === 'am' ? 'ሁኔታ' : 'Status'}</th>
                  <th className="py-3 px-3 text-center">{language === 'am' ? 'ድርጊት' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredUsers.map((user) => {
                  const isOwner = user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                  const hotelObj = hotels.find((h) => h.id === user.hotelId);
                  const branchObj = branches.find((b) => b.id === user.branchId);

                  return (
                    <tr key={user.uid} className={`hover:bg-slate-850/50 ${user.disabled ? 'opacity-50' : ''}`}>
                      <td className="py-3 px-4 font-sans font-bold text-white">
                        <div className="flex items-center gap-2">
                          {isOwner ? (
                            <span className="p-1 rounded bg-amber-400/20 text-amber-300 font-bold text-xs">👑</span>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                          )}
                          <span>{user.displayName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{user.email}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold font-sans ${
                            roleLabels[user.role]?.color || 'text-slate-300 bg-slate-800 border-slate-700'
                          }`}
                        >
                          {roleLabels[user.role]?.am || user.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-300">
                        {user.hotelId === 'all' ? (
                          <span className="text-amber-400 font-bold">ሁሉም ሆቴሎች (All)</span>
                        ) : (
                          hotelObj?.nameAm || hotelObj?.name || user.hotelId
                        )}
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-400">
                        {user.branchId === 'all' || !user.branchId ? (
                          <span className="text-slate-300">ሁሉም ቅርንጫፎች</span>
                        ) : (
                          branchObj?.nameAm || branchObj?.nameEn || user.branchId
                        )}
                      </td>
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        {user.disabled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            የታገደ (Disabled)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ንቁ (Active)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isOwner ? (
                          <span className="text-[10px] text-amber-400 font-bold font-sans">
                            ቋሚ ዋና አድሚን ✓
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 font-sans">
                            <button
                              type="button"
                              onClick={() => handleResetPass(user.email)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-700"
                              title="የይለፍ ቃል ሪሴት አድርግ"
                            >
                              ሪሴት
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleDisableUser(user.uid)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                user.disabled
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900'
                                  : 'bg-rose-950 text-rose-300 border-rose-500/40 hover:bg-rose-900'
                              }`}
                            >
                              {user.disabled ? 'አንቃ' : 'እገድ'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: AUDIT CORRECTIONS & AUDIT TRAIL LOG
          ========================================================================= */}
      {activeTab === 'auditLog' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-white text-sm">
              {language === 'am' ? 'የሲስተሙ ዋና የኦዲት መዝገብ (Permanent Audit Trail)' : 'System Audit Log'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'am'
                ? 'ምንም ዓይነት ዳታ በቋሚነት አይደለዝም፤ እያንዳንዱ የፕራይመሪ ዕቃ ማከል/ማስወገድ፣ የወጪ ማስተካከያና የተጠቃሚ ለውጥ እዚህ ይመዘገባል'
                : 'Zero hard-deletions: Every primary material add/remove, expense correction, and permission update is logged.'}
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/80 max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-300 font-bold z-10">
                <tr>
                  <th className="py-2.5 px-3">{language === 'am' ? 'ሰዓት/ቀን' : 'Timestamp'}</th>
                  <th className="py-2.5 px-3">{language === 'am' ? 'ፈጻሚ (User)' : 'User'}</th>
                  <th className="py-2.5 px-2">{language === 'am' ? 'ሞጁል' : 'Module'}</th>
                  <th className="py-2.5 px-4">{language === 'am' ? 'ምክንያትና ዝርዝር' : 'Reason / Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {auditCorrections.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 font-sans">
                      {language === 'am' ? 'እስካሁን ምንም የኦዲት ማስተካከያ አልተመዘገበም' : 'No audit entries logged yet'}
                    </td>
                  </tr>
                ) : (
                  auditCorrections.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-850/50">
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-bold text-amber-300 whitespace-nowrap">
                        {log.user}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold font-sans">
                          {log.module}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-200">
                        {log.reason}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD NEW HOTEL
          ========================================================================= */}
      {addHotelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="font-black text-white text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <span>{language === 'am' ? 'አዲስ ሆቴል/ንግድ ማቋቋሚያ' : 'Add New Hotel / Enterprise'}</span>
              </h4>
              <button onClick={() => setAddHotelModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {language === 'am'
                ? 'አዲስ ሆቴል ሲፈጥሩ ራሱን የቻለ ሙሉ ባዶ ሲስተም (ስቶር፣ ሜኑ፣ ቅርንጫፎች፣ ወጪዎች) አብሮ ይዘጋጃል፦'
                : 'Creates a fully isolated system for the new business.'}
            </p>

            <form onSubmit={handleCreateHotel} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-bold">የሆቴሉ/ንግዱ ስም (Hotel Name) *</label>
                <input
                  type="text"
                  value={newHotelName}
                  onChange={(e) => setNewHotelName(e.target.value)}
                  placeholder="e.g. Grand Panorama Hotel"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-bold">የአማርኛ ስም (Amharic Name)</label>
                <input
                  type="text"
                  value={newHotelNameAm}
                  onChange={(e) => setNewHotelNameAm(e.target.value)}
                  placeholder="ለምሳሌ፡ ግራንድ ፓኖራማ ሆቴል"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1 font-bold">የንግዱ ምድብ (Category) *</label>
                  <select
                    value={newHotelCategory}
                    onChange={(e) => setNewHotelCategory(e.target.value as HotelCategory)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400 font-bold"
                  >
                    {Object.entries(hotelCategoryLabels).map(([catKey, labels]) => (
                      <option key={catKey} value={catKey}>
                        {language === 'am' ? labels.am : labels.en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-bold">አህጽሮተ ኮድ (Code)</label>
                  <input
                    type="text"
                    value={newHotelCode}
                    onChange={(e) => setNewHotelCode(e.target.value)}
                    placeholder="GPH"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono uppercase focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1 font-bold">ስራ አስኪያጅ (Manager)</label>
                  <input
                    type="text"
                    value={newHotelManager}
                    onChange={(e) => setNewHotelManager(e.target.value)}
                    placeholder="አቶ ታደሰ ከበደ"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-bold">ስልክ (Phone)</label>
                  <input
                    type="text"
                    value={newHotelPhone}
                    onChange={(e) => setNewHotelPhone(e.target.value)}
                    placeholder="+251 911 000 111"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-bold">አድራሻ (Location)</label>
                <input
                  type="text"
                  value={newHotelAddress}
                  onChange={(e) => setNewHotelAddress(e.target.value)}
                  placeholder="ቦሌ፣ አዲስ አበባ"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddHotelModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  {language === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg cursor-pointer"
                >
                  {language === 'am' ? 'ፍጠርና ጀምር' : 'Create Hotel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD NEW USER (ROLE-BASED CREATION)
          ========================================================================= */}
      {addUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="font-black text-white text-base flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <span>{language === 'am' ? 'አዲስ ተጠቃሚ አካውንት ፍጠር' : 'Create User Account'}</span>
              </h4>
              <button onClick={() => setAddUserModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {userModalNotice && (
              <div className="p-2.5 rounded-xl bg-blue-950 border border-blue-500/40 text-blue-200 text-xs">
                {userModalNotice}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-bold">ሙሉ ስም (Full Name) *</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Dawit Tadesse"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-bold">ኢሜይል (Email Address) *</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="e.g. dawit@bellofam.com"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-bold">የይለፍ ቃል (Password) *</label>
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Bello@2026"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-bold">የስራ ሚና (System Role) *</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-amber-400"
                >
                  <option value="hotel_manager">🏨 የሆቴል ስራ አስኪያጅ (Hotel General Manager)</option>
                  <option value="chef">👨‍🍳 ሼፍ (Kitchen Head Chef)</option>
                  <option value="store_keeper">📦 የስቶር ኃላፊ (Central Store Keeper)</option>
                  <option value="cashier">🧾 ካሸር (Cashier / POS Sales)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1 font-bold">ሆቴል (Assigned Hotel)</label>
                  <select
                    value={newUserHotelId}
                    onChange={(e) => setNewUserHotelId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400 font-bold truncate"
                  >
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.nameAm || h.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-bold">ቅርንጫፍ (Branch)</label>
                  <select
                    value={newUserBranchId}
                    onChange={(e) => setNewUserBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400 font-bold truncate"
                  >
                    <option value="all">-- ሁሉም ቅርንጫፎች --</option>
                    {branches
                      .filter((b) => !b.hotelId || b.hotelId === newUserHotelId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nameAm || b.nameEn}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  {language === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg cursor-pointer"
                >
                  {language === 'am' ? 'ተጠቃሚ ፍጠር' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
