import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { AppUser, UserRole } from '../types';

// Super Admin definition
export const SUPER_ADMIN_EMAIL = 'salsasalsa122323@gmail.com';
export const SUPER_ADMIN_NAME = 'ሳልሳዊ ስዩም';

export const DEFAULT_SUPER_ADMIN_USER: AppUser = {
  uid: 'super_admin_salsawi',
  email: SUPER_ADMIN_EMAIL,
  displayName: SUPER_ADMIN_NAME,
  role: 'super_admin',
  hotelId: 'all',
  branchId: 'all',
  disabled: false,
  createdAt: '2026-10-01T08:00:00Z',
};

// Initial demo users for hotel and branch roles
export const INITIAL_APP_USERS: AppUser[] = [
  DEFAULT_SUPER_ADMIN_USER,
  {
    uid: 'user_hotel_mgr_1',
    email: 'manager.kokonut@bellofam.com',
    displayName: 'አበበ ደረጀ (Abebe D.)',
    role: 'hotel_manager',
    hotelId: 'hotel_bello_fam',
    branchId: 'all',
    disabled: false,
    createdAt: '2026-10-05T09:00:00Z',
  },
  {
    uid: 'user_chef_6kilo',
    email: 'chef.6kilo@bellofam.com',
    displayName: 'ሼፍ ሙሉጌታ (Chef Mulugeta)',
    role: 'chef',
    hotelId: 'hotel_bello_fam',
    branchId: 'br-kokonut-6kilo',
    disabled: false,
    createdAt: '2026-10-10T09:00:00Z',
  },
  {
    uid: 'user_store_keeper',
    email: 'storekeeper@bellofam.com',
    displayName: 'ዮናስ ታደሰ (Yonas T.)',
    role: 'store_keeper',
    hotelId: 'hotel_bello_fam',
    branchId: 'all',
    disabled: false,
    createdAt: '2026-10-12T09:00:00Z',
  },
  {
    uid: 'user_cashier_shola',
    email: 'cashier.shola@bellofam.com',
    displayName: 'ሰላማዊት በቀለ (Selamawit B.)',
    role: 'cashier',
    hotelId: 'hotel_bello_fam',
    branchId: 'br-cocoon-shola',
    disabled: false,
    createdAt: '2026-10-15T09:00:00Z',
  },
];

interface AuthContextType {
  currentUser: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  appUsers: AppUser[];
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  createAppUser: (user: Omit<AppUser, 'createdAt' | 'disabled'>, pass: string) => Promise<{ success: boolean; error?: string }>;
  updateAppUser: (uid: string, updates: Partial<AppUser>) => Promise<boolean>;
  resetUserPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  changeUserPassword: (email: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  hasCustomPassword: (email: string) => boolean;
  toggleDisableUser: (uid: string) => Promise<boolean>;
  isSuperAdmin: boolean;
  canAccessHotel: (hotelId: string) => boolean;
  canAccessBranch: (branchId: string) => boolean;
  canEditSettings: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = 'eth_erp_registered_app_users_v2';
const CURRENT_USER_SESSION_KEY = 'eth_erp_active_user_session';
const PASSWORDS_STORAGE_KEY = 'eth_erp_local_passwords_v1';
const DEFAULT_INITIAL_PASSWORD = 'Bello@2026';

function readLocalPasswords(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PASSWORDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  return {};
}

function writeLocalPassword(email: string, pass: string): void {
  try {
    const current = readLocalPasswords();
    current[email.trim().toLowerCase()] = pass;
    localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(current));
  } catch {}
}

const isValidAppUser = (u: any): u is AppUser =>
  Boolean(u && typeof u === 'object' && !Array.isArray(u) && typeof u.uid === 'string' && typeof u.email === 'string');

const safeEmail = (email?: unknown): string => (typeof email === 'string' ? email.trim().toLowerCase() : '');

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(CURRENT_USER_SESSION_KEY);
      if (saved === 'null') return null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isValidAppUser(parsed)) return parsed;
      }
    } catch {}
    return DEFAULT_SUPER_ADMIN_USER; // Default to Super Admin for smooth initial loading
  });

  const [appUsers, setAppUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(isValidAppUser);
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
    return INITIAL_APP_USERS;
  });

  const [loading, setLoading] = useState(false);

  // Sync users to storage
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(appUsers));
    } catch {}
  }, [appUsers]);

  // Sync active user to storage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(CURRENT_USER_SESSION_KEY);
      }
    } catch {}
  }, [currentUser]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Find in registered users or match by email
        const matched = appUsers.find((u) => safeEmail(u?.email) === safeEmail(user.email));
        if (matched) {
          if (!matched.disabled) {
            setCurrentUser(matched);
          } else {
            await firebaseSignOut(auth);
            setCurrentUser(null);
          }
        } else if (user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
          setCurrentUser(DEFAULT_SUPER_ADMIN_USER);
        } else {
          // New authenticated user, default to hotel manager
          const newUser: AppUser = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            role: 'hotel_manager',
            hotelId: 'all',
            branchId: 'all',
            disabled: false,
            createdAt: new Date().toISOString(),
          };
          setAppUsers((prev) => [...prev, newUser]);
          setCurrentUser(newUser);
        }
      }
    });

    return () => unsubscribe();
  }, [appUsers]);

  // Login handler
  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    // Check if target user is disabled in local registry
    const targetLocal = appUsers.find((u) => safeEmail(u?.email) === cleanEmail);
    if (targetLocal?.disabled) {
      setLoading(false);
      return { success: false, error: 'ይህ አካውንት ታግዷል። እባክዎ ሲስተም አድሚኑን (ሳልሳዊ ስዩም) ያነጋግሩ። (Account disabled)' };
    }

    const localPasswords = readLocalPasswords();
    const customPass = localPasswords[cleanEmail];
    const expectedLocalPass = customPass !== undefined ? customPass : DEFAULT_INITIAL_PASSWORD;

    try {
      // 1. Try Firebase Auth sign-in
      await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const matched = appUsers.find((u) => safeEmail(u?.email) === cleanEmail);
      if (matched) {
        setCurrentUser(matched);
      } else if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
        setCurrentUser(DEFAULT_SUPER_ADMIN_USER);
      }
      setLoading(false);
      return { success: true };
    } catch (firebaseErr: any) {
      console.warn('Firebase sign-in fallback/offline attempt:', firebaseErr?.message);

      // 2. Offline / local credential verification (enforces custom password strictly)
      if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase() || targetLocal) {
        if (pass === expectedLocalPass) {
          const loggedUser = targetLocal || DEFAULT_SUPER_ADMIN_USER;
          setCurrentUser(loggedUser);
          setLoading(false);
          return { success: true };
        }
        setLoading(false);
        return {
          success: false,
          error: 'ያስገቡት የይለፍ ቃል ልክ አይደለም (Invalid password)',
        };
      }

      setLoading(false);
      return {
        success: false,
        error: firebaseErr?.message?.includes('invalid-credential')
          ? 'ኢሜይል ወይም የይለፍ ቃል ልክ አይደለም (Invalid email or password)'
          : firebaseErr?.message || 'መግባት አልተቻለም',
      };
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {}
    setCurrentUser(null);
  };

  // Create new user (Admin only)
  const createAppUser = async (
    userData: Omit<AppUser, 'createdAt' | 'disabled'>,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const newUser: AppUser = {
        ...userData,
        disabled: false,
        createdAt: new Date().toISOString(),
      };

      writeLocalPassword(userData.email, pass);

      // Try creating in Firebase Auth in background if online
      try {
        await createUserWithEmailAndPassword(auth, userData.email, pass);
      } catch (e: any) {
        console.warn('Firebase user creation note:', e?.message);
      }

      setAppUsers((prev) => [...prev.filter((u) => safeEmail(u?.email) !== safeEmail(userData.email)), newUser]);

      // Save to Firestore users collection
      try {
        await setDoc(doc(db, 'users', newUser.uid), newUser, { merge: true });
      } catch {}

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'ተጠቃሚውን መፍጠር አልተቻለም' };
    }
  };

  const updateAppUser = async (uid: string, updates: Partial<AppUser>): Promise<boolean> => {
    // Prevent modification of Super Admin email or downgrade
    const target = appUsers.find((u) => u.uid === uid);
    if (safeEmail(target?.email) === safeEmail(SUPER_ADMIN_EMAIL)) {
      if (updates.role && updates.role !== 'super_admin') {
        console.warn('Attempt to downgrade Super Admin blocked!');
        return false;
      }
      if (updates.disabled === true) {
        console.warn('Attempt to disable Super Admin blocked!');
        return false;
      }
    }

    setAppUsers((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, ...updates } : u))
    );

    try {
      await setDoc(doc(db, 'users', uid), updates, { merge: true });
    } catch {}

    if (currentUser?.uid === uid) {
      setCurrentUser((prev) => (prev ? { ...prev, ...updates } : null));
    }
    return true;
  };

  const toggleDisableUser = async (uid: string): Promise<boolean> => {
    const target = appUsers.find((u) => u.uid === uid);
    if (safeEmail(target?.email) === safeEmail(SUPER_ADMIN_EMAIL)) {
      return false;
    }

    const nextState = !target?.disabled;
    await updateAppUser(uid, { disabled: nextState });
    return true;
  };

  const resetUserPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    writeLocalPassword(email, DEFAULT_INITIAL_PASSWORD);
    return {
      success: true,
      message: `ለ ${email} የይለፍ ቃል ወደ "${DEFAULT_INITIAL_PASSWORD}" ተቀይሯል (Password reset to "${DEFAULT_INITIAL_PASSWORD}")`,
    };
  };

  const changeUserPassword = async (
    email: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    const trimmed = newPassword.trim();
    if (trimmed.length < 4) {
      return {
        success: false,
        message: 'የይለፍ ቃሉ ቢያንስ 4 ፊደላት/ቁጥሮች ሊኖሩት ይገባል (Minimum 4 characters)',
      };
    }
    writeLocalPassword(email, trimmed);
    return {
      success: true,
      message: `የ ${email} አዲስ የይለፍ ቃል በተሳካ ሁኔታ ተቀምጧል! (New password saved)`,
    };
  };

  const hasCustomPassword = (email: string): boolean => {
    const map = readLocalPasswords();
    return typeof map[email.trim().toLowerCase()] === 'string';
  };

  const isSuperAdmin = currentUser?.role === 'super_admin' || safeEmail(currentUser?.email) === safeEmail(SUPER_ADMIN_EMAIL);

  const canAccessHotel = (hotelId: string): boolean => {
    if (!currentUser) return false;
    if (isSuperAdmin) return true;
    return currentUser.hotelId === 'all' || currentUser.hotelId === hotelId;
  };

  const canAccessBranch = (branchId: string): boolean => {
    if (!currentUser) return false;
    if (isSuperAdmin) return true;
    if (currentUser.role === 'hotel_manager' && (currentUser.branchId === 'all' || !currentUser.branchId)) return true;
    return currentUser.branchId === 'all' || currentUser.branchId === branchId;
  };

  const canEditSettings = isSuperAdmin || currentUser?.role === 'hotel_manager';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        appUsers,
        login,
        logout,
        createAppUser,
        updateAppUser,
        resetUserPassword,
        changeUserPassword,
        hasCustomPassword,
        toggleDisableUser,
        isSuperAdmin,
        canAccessHotel,
        canAccessBranch,
        canEditSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
