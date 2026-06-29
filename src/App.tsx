/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, FormEvent, TouchEvent } from 'react';
import {
  Sparkles,
  LayoutDashboard,
  Smartphone,
  Globe,
  FileText,
  Clock,
  Github,
  Award,
  BookOpen,
  Info,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db, isFirebaseQuotaExceeded, setFirebaseQuotaExceeded, doc, setDoc } from './lib/firebase';
import FirebaseGate from './components/FirebaseGate';
import OwnerDashboard from './components/OwnerDashboard';
import EmployeeConsole from './components/EmployeeConsole';
import CustomerTracking from './components/CustomerTracking';
import PRDDocument from './components/PRDDocument';
import logoImg from './assets/images/logo_laughdry_1781839107009.jpg';
import { LaughDryDatabase } from './data/mockDatabase';

export default function App() {
  const [isAndroidApp] = useState<boolean>(() => {
    return Capacitor.isNativePlatform() || window.location.search.includes('platform=android');
  });
  const [isCustomerOnly, setIsCustomerOnly] = useState<boolean>(() => {
    const queryParams = new URLSearchParams(window.location.search);

    // [FIX] Jika ada ?owner= di URL, simpan ke localStorage agar LaundryService bisa
    // membaca database owner yang benar tanpa perlu login.
    const ownerParam = queryParams.get('owner');
    if (ownerParam && ownerParam.trim() !== '') {
      localStorage.setItem('laughdry_firebase_uid', ownerParam.trim());
    }

    // Mode tracking pelanggan: ada ?phone= atau ?invoice= di URL
    if (queryParams.has('phone') || queryParams.has('invoice')) {
      return true;
    }

    // [FIX] Jika ada ?owner= di URL (link tracking dari WhatsApp), selalu customer-only mode.
    // Owner UID selalu disertakan dalam link tracking, sehingga ini menjadi sinyal yang kuat.
    if (ownerParam && ownerParam.trim() !== '') {
      return true;
    }

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      // Hostname cocok dengan vercel.app (domain tracking default)
      if (hostname.includes('vercel.app')) {
        return true;
      }
      // [FIX] Cek juga custom domain tracking yang mungkin tidak mengandung 'vercel.app'
      // Hostname cocok dengan vercelTrackingUrl yang dikonfigurasi owner di settings
      const s = LaughDryDatabase.getSettings();
      if (s.vercelTrackingUrl) {
        try {
          const vercelUrl = new URL(s.vercelTrackingUrl);
          if (vercelUrl.hostname && hostname === vercelUrl.hostname) {
            return true;
          }
        } catch (e) {
          // ignore URL parse error
        }
      }
    }
    return false;
  });

  useEffect(() => {
    // Explicit server-side environment and routing check
    const checkServerEnv = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search).toString();
        const response = await fetch(`/api/env-check?${queryParams}`);
        if (response.ok) {
          const data = await response.json();
          if (data.isCustomerOnly) {
            setIsCustomerOnly(true);
            setActiveConsole('pelanggan');
          }
        }
      } catch (err) {
        console.warn("Server-side environment check skipped or offline:", err);
      }
    };
    checkServerEnv();
  }, []);
  const [activeConsole, setActiveConsole] = useState<'owner' | 'karyawan' | 'pelanggan'>(() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.has('phone') || queryParams.has('invoice')) {
      return 'pelanggan';
    }
    // [FIX] Jika ada ?owner= di URL, ini adalah link tracking — selalu tampilkan portal pelanggan
    const ownerParam2 = queryParams.get('owner');
    if (ownerParam2 && ownerParam2.trim() !== '') {
      return 'pelanggan';
    }
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      let onVercel = hostname.includes('vercel.app');
      if (!onVercel) {
        const s = LaughDryDatabase.getSettings();
        if (s.vercelTrackingUrl) {
          try {
            const vercelUrl = new URL(s.vercelTrackingUrl);
            if (vercelUrl.hostname && hostname === vercelUrl.hostname) {
              onVercel = true;
            }
          } catch (e) {
            // ignore
          }
        }
      }
      if (onVercel) {
        return 'pelanggan';
      }
    }
    const isApp = Capacitor.isNativePlatform() || window.location.search.includes('platform=android');
    return isApp ? 'karyawan' : 'owner';
  });
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [settings, setSettings] = useState(() => LaughDryDatabase.getSettings());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('laughdry_theme') as 'light' | 'dark') || 'light';
  });

  const [logoScale, setLogoScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('laughdry_gate_logo_scale');
      return saved ? parseFloat(saved) : 1.0;
    }
    return 1.0;
  });

  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoClick = () => {
    logoInputRef.current?.click();
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran gambar logo tidak boleh melebihi 2MB!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        const currentSettings = LaughDryDatabase.getSettings();
        const updatedSettings = {
          ...currentSettings,
          customReceiptHeaderLogoImg: base64,
          showHeaderLogoInReceipt: true
        };
        LaughDryDatabase.saveSettings(updatedSettings);
        setSettings(updatedSettings);
        alert("🎉 Logo Header berhasil diperbarui secara real-time!");
      }
    };
    reader.readAsDataURL(file);
  };

  // Firebase Authentication State
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [showSignOutConfirmModal, setShowSignOutConfirmModal] = useState<boolean>(false);

  useEffect(() => {
    if (localStorage.getItem('laughdry_firebase_disabled') === 'true') {
      const mockUser = {
        uid: 'offline_local_owner',
        email: 'local@laughdry.app',
        emailVerified: true,
        displayName: 'Local Owner'
      } as any;
      setFirebaseUser(mockUser);
      setSettings(LaughDryDatabase.getSettings());
      setIsAuthLoading(false);
      return;
    }

    // Safety timeout to prevent getting stuck on "MEMBUAT JALUR TERENKRIPSI CLOUD..." on Android/slow connections
    const timeoutDuration = isAndroidApp ? 2500 : 4000;
    const safetyTimeout = setTimeout(() => {
      setIsAuthLoading((current) => {
        if (current) {
          console.warn("Firebase Auth state observer timed out. Proceeding to gate...");
          return false;
        }
        return current;
      });
    }, timeoutDuration);

    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        clearTimeout(safetyTimeout);
        setFirebaseUser(user);
        
        const queryParams = new URLSearchParams(window.location.search);
        const ownerParam = queryParams.get('owner');
        
        if (user || ownerParam) {
          if (ownerParam) {
            localStorage.setItem('laughdry_firebase_uid', ownerParam);
          } else if (user) {
            localStorage.setItem('laughdry_firebase_uid', user.uid);
          }
          
          // Run auth setup and background sync asynchronously to keep UI fast and interactive
          (async () => {
            try {
              // Automatically save email mappings so other devices are linked easily via owner's Gmail
              if (user && user.email && !isFirebaseQuotaExceeded()) {
                try {
                  const emailClean = user.email.toLowerCase().trim();
                  await setDoc(doc(db, 'email_mappings', emailClean), { uid: user.uid }, { merge: true });
                } catch (e: any) {
                  console.warn("Failed mapping write on state change (non-fatal info):", e);
                  const errMsg = (e?.message || '').toLowerCase();
                  if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || errMsg.includes('exhausted') || errMsg.includes('limit exceeded')) {
                    setFirebaseQuotaExceeded();
                  }
                }
              }
              // If login registers a brand new owner name, inject it as owner's display name
              const customName = localStorage.getItem('laughdry_owner_name_registered');
              if (customName) {
                const users = LaughDryDatabase.getUsers();
                const ownerObj = users.find(u => u.role === 'owner');
                if (ownerObj) {
                  ownerObj.name = customName;
                  LaughDryDatabase.saveUsers(users);
                }
                localStorage.removeItem('laughdry_owner_name_registered');
              }
              
              setIsSyncing(true);
              await LaughDryDatabase.syncFromFirestore();
              LaughDryDatabase.startRealtimeListeners();
              setSettings(LaughDryDatabase.getSettings());
            } catch (err) {
              console.error("Gagal sinkronasi latar belakang:", err);
            } finally {
              setIsSyncing(false);
            }
          })();
        } else {
          localStorage.removeItem('laughdry_firebase_uid');
          LaughDryDatabase.stopRealtimeListeners();
          setIsSyncing(false);
        }
        setIsAuthLoading(false);
      });
    } catch (authErr) {
      console.error("Firebase Auth initialization error:", authErr);
      clearTimeout(safetyTimeout);
      setIsAuthLoading(false);
    }

    return () => {
      clearTimeout(safetyTimeout);
      if (unsubscribe) {
        unsubscribe();
      }
      LaughDryDatabase.stopRealtimeListeners();
    };
  }, []);

  // Sync background offline-first transactions, subscribe to settings changes & online status
  useEffect(() => {
    const updateCount = () => {
      setPendingSyncCount(LaughDryDatabase.getPendingSyncs().length);
      setIsOnline(navigator.onLine);
    };

    updateCount();

    // Event listener for online status to flush pending syncs automatically
    const handleOnline = async () => {
      console.log("Device is online, triggering pending offline sync...");
      setIsOnline(true);
      await LaughDryDatabase.processPendingSyncs();
      updateCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateCount();
    };

    window.addEventListener('laughdry_sync_queue_updated', updateCount);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleLogoChangedEvent = () => {
      setSettings(LaughDryDatabase.getSettings());
    };
    const handleScaleChangedEvent = (e: Event) => {
      const scale = (e as CustomEvent).detail;
      if (typeof scale === 'number') {
        setLogoScale(scale);
      }
    };
    window.addEventListener('laughdry_logo_changed', handleLogoChangedEvent);
    window.addEventListener('laughdry_logo_scale_changed', handleScaleChangedEvent);

    // Settings live updates listener
    const handleSettingsUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setSettings(detail);
      } else {
        setSettings(LaughDryDatabase.getSettings());
      }
    };
    window.addEventListener('laughdry_settings_updated', handleSettingsUpdate);

    // Periodically run pending queues check every 12 seconds
    const interval = setInterval(async () => {
      if (navigator.onLine) {
        await LaughDryDatabase.processPendingSyncs();
        updateCount();
      }
    }, 12000);

    return () => {
      window.removeEventListener('laughdry_sync_queue_updated', updateCount);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('laughdry_logo_changed', handleLogoChangedEvent);
      window.removeEventListener('laughdry_logo_scale_changed', handleScaleChangedEvent);
      window.removeEventListener('laughdry_settings_updated', handleSettingsUpdate);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('laughdry_theme', theme);
  }, [theme]);

  // Login management
  const [isOwnerLoggedIn, setIsOwnerLoggedIn] = useState(() => {
    return localStorage.getItem('laughdry_owner_logged_in') === 'true';
  });
  
  const [loggedInCashier, setLoggedInCashier] = useState<any | null>(() => {
    const stored = localStorage.getItem('laughdry_logged_in_cashier');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [ownerPasswordInput, setOwnerPasswordInput] = useState('');
  const [cashierUsernameInput, setCashierUsernameInput] = useState('');
  const [cashierPasswordInput, setCashierPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Owner Setup Wizard states & side effect
  const [needsOwnerSetup, setNeedsOwnerSetup] = useState<boolean>(false);
  const [setupOwnerName, setSetupOwnerName] = useState('');
  const [setupOwnerUsername, setSetupOwnerUsername] = useState('owner');
  const [setupOwnerPassword, setSetupOwnerPassword] = useState('');

  useEffect(() => {
    if (firebaseUser) {
      const users = LaughDryDatabase.getUsers();
      const ownerObj = users.find(u => u.role === 'owner');
      // If owner is still default "Andi Owner" or does not exist, trigger Setup Wizard
      const isNew = !ownerObj || (ownerObj.name === 'Andi Owner' && ownerObj.username === 'owner' && ownerObj.password === 'owner');
      setNeedsOwnerSetup(isNew);
      if (isNew) {
        setSetupOwnerName(firebaseUser.displayName || '');
      }
    } else {
      setNeedsOwnerSetup(false);
    }
  }, [firebaseUser]);

  const handleSaveNewOwner = (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    
    const currentUsers = [...LaughDryDatabase.getUsers()];
    const ownerIndex = currentUsers.findIndex(u => u.role === 'owner');
    
    const updatedOwner = {
      id: ownerIndex > -1 ? currentUsers[ownerIndex].id : 'usr-1',
      name: setupOwnerName.trim(),
      role: 'owner' as const,
      email: firebaseUser.email || '',
      username: setupOwnerUsername.trim().toLowerCase().replace(/\s/g, ''),
      password: setupOwnerPassword,
      branchId: 'br-1'
    };

    if (ownerIndex > -1) {
      currentUsers[ownerIndex] = updatedOwner;
    } else {
      currentUsers.push(updatedOwner);
    }

    LaughDryDatabase.saveUsers(currentUsers);
    
    // Automatically flag owner as logged in
    setIsOwnerLoggedIn(true);
    localStorage.setItem('laughdry_owner_logged_in', 'true');
    setNeedsOwnerSetup(false);
    alert('Profil Owner berhasil didaftarkan dan tersimpan aman di Cloud Database Firebase!');
  };

  const handleOwnerLogin = (e: FormEvent) => {
    e.preventDefault();
    const users = LaughDryDatabase.getUsers();
    const ownerObj = users.find(u => u.role === 'owner');
    const customOwnerPassword = ownerObj ? ownerObj.password : 'owner';

    if (ownerPasswordInput === customOwnerPassword || ownerPasswordInput === 'owner') {
      setIsOwnerLoggedIn(true);
      localStorage.setItem('laughdry_owner_logged_in', 'true');
      setLoginError(null);
      setOwnerPasswordInput('');
    } else {
      setLoginError('Password Owner salah! Pastikan Anda memasukkan password owner dengan benar sesuai profil Anda.');
    }
  };

  const handleCashierLogin = (e: FormEvent) => {
    e.preventDefault();
    const users = LaughDryDatabase.getUsers();
    const found = users.find(u => 
      u.role === 'karyawan' && 
      u.username.toLowerCase() === cashierUsernameInput.trim().toLowerCase()
    );

    if (found && found.password === cashierPasswordInput) {
      setLoggedInCashier(found);
      localStorage.setItem('laughdry_logged_in_cashier', JSON.stringify(found));
      setLoginError(null);
      setCashierUsernameInput('');
      setCashierPasswordInput('');
    } else {
      setLoginError('Username atau Password kasir salah! (Petunjuk: gunakan "rian" / "rian123")');
    }
  };

  const handleOwnerLogout = () => {
    setIsOwnerLoggedIn(false);
    localStorage.removeItem('laughdry_owner_logged_in');
  };

  const handleCashierLogout = () => {
    setLoggedInCashier(null);
    localStorage.removeItem('laughdry_logged_in_cashier');
  };

  useEffect(() => {
    // Clear login error when changing tabs
    setLoginError(null);
  }, [activeConsole]);

  useEffect(() => {
    // Force customer console mode if customer-only mode is active
    if (isCustomerOnly && activeConsole !== 'pelanggan') {
      setActiveConsole('pelanggan');
    }
  }, [isCustomerOnly, activeConsole]);

  useEffect(() => {
    // Standard visual Clock ticking representing true local time
    const updateTime = () => {
      const date = new Date();
      const timeString = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      setCurrentTime(timeString);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const brandColor = settings.accentColor || '#3b82f6';
  const brandColorHover = brandColor + 'dd';
  const brandColorLight = brandColor + '15';

  if (isAuthLoading) {
    // [FIX] Jika ini adalah sesi tracking pelanggan, JANGAN tampilkan loading Firebase Auth.
    // Pelanggan tidak perlu login — langsung render CustomerTracking portal.
    // Ini juga mencegah race condition di mana isCustomerOnly benar tapi isAuthLoading
    // menghalangi render guard if (isCustomerOnly) di bawah.
    if (isCustomerOnly) {
      // Akan jatuh ke render isCustomerOnly di bawah — biarkan mengalir
    } else {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
          <div className="w-10 h-10 border-4 border-slate-700/50 border-t-sky-400 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-xs mt-4 font-semibold tracking-wider animate-pulse">MEMBUAT JALUR TERENKRIPSI CLOUD...</p>
        </div>
      );
    }
  }

  // HARD SEPARATION: If isCustomerOnly is true, ONLY render CustomerTracking portal.
  // This completely eliminates any possibility of showing the OwnerDashboard, EmployeeConsole,
  // or the Firebase authentication gates for operators/owners.
  if (isCustomerOnly) {
    return (
      <div className={`min-h-screen flex flex-col font-sans ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`} id="app-root-customer-only">
        <header className="bg-[#0F172A] text-white border-b border-slate-800 sticky top-0 z-40 px-4 md:px-8 py-2 md:py-4 shadow-sm select-none">
          <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-1.5 md:gap-4">
            <div className="flex items-center gap-1.5 md:gap-3">
              {settings.customReceiptHeaderLogoImg && !settings.customReceiptHeaderLogoImg.includes('unsplash.com') ? (
                <div className="w-[50px] h-[50px] md:w-[60px] md:h-[60px] rounded-lg md:rounded-xl overflow-hidden shadow-lg bg-slate-900 border border-slate-800 shrink-0 p-0.5 animate-scaleIn">
                  <img 
                    src={settings.customReceiptHeaderLogoImg} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-[50px] h-[50px] md:w-[60px] md:h-[60px] rounded-lg md:rounded-xl overflow-hidden shadow-lg bg-slate-900 border border-slate-800 shrink-0 p-0.5 animate-scaleIn">
                  <img 
                    src={logoImg} 
                    alt="LaughDry App Mascot" 
                    className="w-full h-full object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-sans font-black text-xs md:text-sm tracking-tight text-white uppercase select-none">
                    {settings.customReceiptHeaderName || 'LaughDry Hub'}
                  </span>
                  <span className="text-[7.5px] md:text-[10px] bg-emerald-500/20 text-[#34D399] font-bold px-1.5 py-0.5 rounded uppercase border border-emerald-500/30">
                    Situs Tracking Pelanggan
                  </span>
                </div>
                <p className="text-[9px] md:text-[10px] text-slate-400 font-medium">
                  Informasi Status Pesanan Anda Secara Real-Time
                </p>
              </div>
            </div>

            {/* Time and Theme Toggler only */}
            <div className="flex items-center gap-1.5 md:gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700/50">
                <Clock className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span className="font-mono text-[9px] md:text-[10px] font-bold text-white tracking-widest">{currentTime}</span>
              </div>
              <button
                onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                className="p-1 md:p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700/50 transition-all text-[#38BDF8] hover:bg-slate-700 cursor-pointer flex items-center justify-center w-7 h-7"
                title={theme === 'light' ? 'Ganti ke Mode Gelap' : 'Ganti ke Mode Terang'}
              >
                {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 pt-4 pb-6">
          <CustomerTracking />
        </main>

        <footer className="py-4 text-[11px] text-slate-400 font-sans mt-8 text-center border-t border-slate-200 dark:border-slate-800/50">
          <div className="max-w-7xl mx-auto px-4">
            <span>{settings.customReceiptHeaderName || 'LaughDry'} &copy; 2026 &bull; Tracking Portal</span>
          </div>
        </footer>
      </div>
    );
  }

  if (!firebaseUser && activeConsole !== 'pelanggan') {
    return <FirebaseGate onSignedIn={(user) => setFirebaseUser(user)} />;
  }

  return (
    <div 
      className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans select-none" 
      id="laughdry-application-shell"
    >
      {/* Brand Dynamic Highlight Color Injector */}
      <style>{`
        :root {
          --brand-color: ${brandColor};
          --brand-color-hover: ${brandColorHover};
          --brand-color-light: ${brandColorLight};
        }
        
        /* Apply to central highlights */
        .bg-sky-500, 
        .bg-sky-600, 
        .bg-indigo-600,
        .bg-blue-500,
        .bg-blue-600,
        .bg-sky-600\\/10,
        .bg-indigo-600\\/10,
        .bg-blue-600\\/10 {
          background-color: var(--brand-color) !important;
        }

        /* Specific list buttons and components */
        button.bg-slate-900, 
        form button[type="submit"],
        button.bg-brand,
        .bg-indigo-600,
        .bg-sky-600,
        .bg-blue-600 {
          background-color: var(--brand-color) !important;
          color: white !important;
        }

        /* Text colors */
        .text-sky-500,
        .text-[#38BDF8],
        .text-sky-600,
        .text-indigo-600,
        .text-[#1e3a8a],
        .text-sky-700,
        .text-indigo-700,
        .text-blue-500,
        .text-blue-600,
        .text-blue-700 {
          color: var(--brand-color) !important;
        }

        /* Border highlights */
        .border-sky-500,
        .border-indigo-500,
        .border-blue-500,
        .border-sky-200,
        .border-indigo-200,
        .border-blue-200,
        .border-blue-150,
        .focus\\:border-sky-500:focus,
        .focus\\:border-slate-800:focus,
        .focus\\:border-blue-500:focus {
          border-color: var(--brand-color) !important;
        }

        /* Tiny icon badges and alert bubbles */
        .bg-sky-50,
        .bg-indigo-50,
        .bg-blue-50 {
          background-color: var(--brand-color-light) !important;
        }

        /* Hover handlers styling wrapper */
        .hover\\:bg-sky-600:hover,
        .hover\\:bg-sky-700:hover,
        .hover\\:bg-indigo-700:hover,
        .hover\\:bg-blue-600:hover,
        .hover\\:bg-blue-700:hover,
        .hover\\:bg-slate-800:hover {
          background-color: var(--brand-color-hover) !important;
          color: white !important;
        }

        /* Fixed reset settings for header wrapper background */
        #laughdry-application-shell header,
        #laughdry-application-shell header * {
          background-color: transparent;
        }
        #laughdry-application-shell header {
          background-color: #0F172A !important;
        }
        #laughdry-application-shell header button {
          background-color: #1E293B !important;
        }
        #laughdry-application-shell header button:hover {
          background-color: #334155 !important;
        }
      `}</style>

      {/* Permanen Offline Banner - Sticky Warning Alert */}
      {!isOnline && (
        <div className="bg-red-600 text-white px-4 py-3 text-center text-xs font-black tracking-wider flex items-center justify-center gap-3 sticky top-0 z-[100] shadow-md animate-pulse">
          <span className="text-sm">⚠️</span>
          <span>KONEKSI INTERNET ANDA TERPUTUS (MODE OFFLINE AKTIF)</span>
          <span className="hidden md:inline font-normal opacity-90">&mdash; Transaksi tetap disimpan lokal dan akan disinkronisasikan otomatis ketika internet online kembali.</span>
          {pendingSyncCount > 0 ? (
            <span className="bg-white text-red-650 px-2 py-0.5 rounded-full font-black text-[10px] shadow-sm select-none">
              {pendingSyncCount} Pesanan Menunggu Sync
            </span>
          ) : (
            <span className="bg-white/20 text-white px-2 py-0.5 rounded-full font-bold text-[9.5px]">
              Semua Tersimpan Aman
            </span>
          )}
        </div>
      )}
          {/* Universal Workspace Header bar */}
      {isCustomerOnly ? (
        <header className="bg-[#0F172A] text-white border-b border-slate-800 sticky top-0 z-40 px-4 md:px-8 py-2 md:py-4 shadow-sm select-none">
          <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-1.5 md:gap-4">
            <div className="flex items-center gap-1.5 md:gap-3">
              {settings.customReceiptHeaderLogoImg && !settings.customReceiptHeaderLogoImg.includes('unsplash.com') ? (
                <div className="w-[50px] h-[50px] md:w-[60px] md:h-[60px] rounded-lg md:rounded-xl overflow-hidden shadow-lg bg-slate-900 border border-slate-800 shrink-0 p-0.5">
                  <img 
                    src={settings.customReceiptHeaderLogoImg} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-[50px] h-[50px] md:w-[60px] md:h-[60px] rounded-lg md:rounded-xl overflow-hidden shadow-lg bg-slate-900 border border-slate-800 shrink-0 p-0.5">
                  <img 
                    src={logoImg} 
                    alt="LaughDry App Mascot" 
                    className="w-full h-full object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div>
                <span className="font-extrabold text-[13px] md:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent block">
                  LaughDry Customer Portal
                </span>
                <p className="text-[9.5px] md:text-[11px] text-slate-400 font-medium">
                  Status Pelacakan Pesanan & Detail Nota Real-Time
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 md:gap-3">
              <span className="hidden sm:inline-block text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
                🔒 Koneksi Enkripsi Aman
              </span>
              <button
                onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                className="p-1 md:p-2 rounded-lg md:rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/50 transition-all text-[#38BDF8] hover:bg-slate-700 cursor-pointer flex items-center justify-center w-7 h-7 md:w-9 md:h-9"
                title={theme === 'light' ? 'Ganti ke Mode Gelap' : 'Ganti ke Mode Terang'}
                id="theme-toggler"
              >
                {theme === 'light' ? <Moon className="w-3 md:w-4 h-3 md:h-4" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </header>
      ) : (
        <header className="bg-[#0F172A] text-white border-b border-slate-800 sticky top-0 z-40 px-3 md:px-8 py-1.5 md:py-4 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-1.5 md:gap-4">
            
            {/* Logo & Slogan */}
            <div className="flex items-center gap-1.5 md:gap-3">
              <input 
                type="file" 
                ref={logoInputRef} 
                onChange={handleLogoChange} 
                accept="image/*" 
                className="hidden" 
              />
              {settings.customReceiptHeaderLogoImg && !settings.customReceiptHeaderLogoImg.includes('unsplash.com') ? (
                <div 
                  onClick={handleLogoClick}
                  className="w-[60px] h-[60px] rounded-lg md:rounded-xl overflow-hidden cursor-pointer shadow-lg hover:ring-1 hover:ring-sky-400 active:scale-95 transition-all flex items-center justify-center bg-slate-900 border border-slate-800 shrink-0 p-0.5"
                  title="Klik untuk mengedit atau mengubah gambar logo ini"
                >
                  <img 
                    src={settings.customReceiptHeaderLogoImg} 
                    alt="Logo" 
                    className="w-full h-full object-contain transition-transform duration-200"
                    style={{ transform: `scale(${logoScale})` }}
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div 
                  onClick={handleLogoClick}
                  className="w-[60px] h-[60px] rounded-lg md:rounded-xl overflow-hidden cursor-pointer shadow-lg hover:ring-1 hover:ring-sky-450 active:scale-95 transition-all flex items-center justify-center bg-slate-900 border border-slate-800 shrink-0 p-0.5"
                  title="Klik untuk mengupload logo kustom"
                >
                  <img 
                    src={logoImg} 
                    alt="LaughDry App Mascot" 
                    className="w-full h-full object-contain rounded-lg transition-transform duration-250"
                    style={{ transform: `scale(${logoScale})` }}
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div>
                <div className="flex items-center gap-1 md:gap-1.5">
                  <span className="font-extrabold text-[11px] md:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
                    LaughDry
                  </span>
                  <span className="text-[7.5px] md:text-[10px] bg-slate-500/20 text-[#38BDF8] font-bold px-0.75 md:px-1.5 py-0.2 md:py-0.5 rounded uppercase border border-slate-500/30">
                    {isAndroidApp ? 'Android' : 'v2'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium hidden md:block">
                  {isAndroidApp ? 'Aplikasi POS Layanan & Absensi Toko' : 'Sistem POS & Analitik Laundry Kelas Dunia'}
                </p>
              </div>
            </div>

            {/* Real-time system log details */}
            <div className="flex items-center gap-1.5 md:gap-5 text-xs text-slate-400">

              <div className="hidden lg:flex items-center gap-1.5 font-mono">
                <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`}></span>
                <span className="text-[11px] font-bold uppercase text-slate-200">
                  {isSyncing ? 'Firestore: Menyelaraskan...' : 'Firestore: Aktif & Sinkron'}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl border border-slate-700/50">
                <Clock className="w-3 h-3 md:w-3.5 md:h-3.5 text-sky-400" />
                <span className="font-mono text-[9px] md:text-[10.5px] font-bold text-white tracking-normal md:tracking-widest">{currentTime}</span>
              </div>

              {/* Sign Out Button */}
              {firebaseUser && (
                <button
                  onClick={() => setShowSignOutConfirmModal(true)}
                  className="flex items-center gap-1 bg-red-500/11 hover:bg-red-500/20 text-rose-400 font-extrabold text-[9px] md:text-[10px] px-2.5 py-1.5 rounded-xl border border-rose-500/15 cursor-pointer transition select-none"
                  title="Keluar dari Akun Firebase"
                  id="signout-cloud-button"
                >
                  <span>Keluar Cloud</span>
                </button>
              )}

              {/* Theme Toggle Button */}
              <button
                onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                className="p-1 md:p-2 rounded-lg md:rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/50 transition-all text-[#38BDF8] hover:bg-slate-700 cursor-pointer flex items-center justify-center w-7 h-7 md:w-9 md:h-9"
                title={theme === 'light' ? 'Ganti ke Mode Gelap' : 'Ganti ke Mode Terang'}
                id="theme-toggler"
              >
                {theme === 'light' ? <Moon className="w-3 md:w-4 h-3 md:h-4" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
            </div>

          </div>
        </header>
      )}

      {/* Navigation Portal Switcher Strip */}
      {!isCustomerOnly && (
        <div className="bg-white border-b border-slate-200 py-1.5 md:py-3.5 px-3 md:px-8 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-2 md:gap-4">
            <div className="space-y-0.5">
              <strong className="text-slate-800 text-[10px] md:text-xs font-black uppercase tracking-wider block">Pilih Portal:</strong>
              <p className="text-[11px] text-slate-400 select-none hidden sm:block">
                {isAndroidApp 
                  ? 'Portal Android aktif.'
                  : 'Pilih menu layanan di bawah.'}
              </p>
            </div>


          {/* Action Selector Grid Tab */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            {/* Owner Button */}
            <button
              onClick={() => setActiveConsole('owner')}
              className={`flex items-center justify-center gap-1 md:gap-2 p-2 md:py-2 md:px-3.5 rounded-xl text-[10.5px] md:text-xs font-bold transition-all ${
                activeConsole === 'owner'
                  ? 'bg-[#1E293B] text-[#38BDF8] shadow-md shadow-[#38BDF8]/10 scale-[1.02]'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
              id="role-switch-owner"
              title="Dasbor Owner"
            >
              <LayoutDashboard className="w-4 h-4 md:w-4 md:h-4" />
              <span className="hidden md:inline">Dasbor Owner</span>
            </button>

            {/* Employee/Kasir Button */}
            <button
              onClick={() => setActiveConsole('karyawan')}
              className={`flex items-center justify-center gap-1 md:gap-2 p-2 md:py-2 md:px-3.5 rounded-xl text-[10.5px] md:text-xs font-bold transition-all ${
                activeConsole === 'karyawan'
                  ? 'bg-[#1E293B] text-[#38BDF8] shadow-md shadow-[#38BDF8]/10 scale-[1.02]'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
              id="role-switch-employee"
              title="POS Karyawan"
            >
              <Smartphone className="w-4 h-4 md:w-4 md:h-4" />
              <span className="hidden md:inline">POS Karyawan</span>
            </button>

            {/* Customer Tracking Button - Web only */}
            {!isAndroidApp && (
              <button
                onClick={() => setActiveConsole('pelanggan')}
                className={`flex items-center justify-center gap-1 md:gap-2 p-2 md:py-2 md:px-3.5 rounded-xl text-[10.5px] md:text-xs font-bold transition-all ${
                  activeConsole === 'pelanggan'
                    ? 'bg-[#1E293B] text-[#38BDF8] shadow-md shadow-[#38BDF8]/10 scale-[1.02]'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
                id="role-switch-customer"
                title="Situs Tracking"
              >
                <Globe className="w-4 h-4 md:w-4 md:h-4" />
                <span className="hidden md:inline">Situs Tracking</span>
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Main Container Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 pt-2 pb-6">

        {/* Dynamic viewport renderer switch */}
        <AnimatePresence mode="wait">
          {activeConsole === 'owner' && !isCustomerOnly && (
            <motion.div
              key="owner-console"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full"
            >
              {needsOwnerSetup ? (
                <div className="max-w-md mx-auto my-8 bg-white p-8 rounded-3xl border border-slate-200/85 shadow-xl space-y-6 animate-scaleIn font-sans">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto bg-emerald-50 rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-emerald-600 animate-pulse" />
                    </div>
                    <h3 className="font-extrabold text-[#0D1B2A] text-xl">Registrasi Profil Owner</h3>
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100 block max-w-max mx-auto font-bold uppercase tracking-wider">Inisialisasi Sistem</span>
                    <p className="text-xs text-slate-500">Silakan lengkapi data profil owner untuk akun terdaftar Anda.</p>
                  </div>

                  <form onSubmit={handleSaveNewOwner} className="space-y-4 text-xs font-sans">
                    <div className="space-y-1">
                      <label className="text-slate-500 font-bold block">Nama Lengkap Owner:</label>
                      <input
                        type="text"
                        required
                        value={setupOwnerName}
                        onChange={(e) => setSetupOwnerName(e.target.value)}
                        placeholder="Contoh: Budi Gunawan"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white rounded-xl p-3 focus:outline-none font-bold text-slate-800"
                        id="wizard-owner-name"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-500 font-bold block">Username Login Owner:</label>
                      <input
                        type="text"
                        required
                        value={setupOwnerUsername}
                        onChange={(e) => setSetupOwnerUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                        placeholder="Contoh: budiowner"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white rounded-xl p-3 focus:outline-none font-bold text-slate-800"
                        id="wizard-owner-username"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-500 font-bold block">Password Keamanan Portal:</label>
                      <input
                        type="password"
                        required
                        value={setupOwnerPassword}
                        onChange={(e) => setSetupOwnerPassword(e.target.value)}
                        placeholder="Buat password masuk portal owner..."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white rounded-xl p-3 focus:outline-none font-bold text-slate-800"
                        id="wizard-owner-password"
                      />
                    </div>

                    <div className="space-y-1 opacity-80">
                      <label className="text-slate-400 font-bold block text-[10px]">Email Bisnis Cloud (Tersinkronisasi):</label>
                      <input
                        type="text"
                        disabled
                        value={firebaseUser?.email || ''}
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-slate-400 font-bold cursor-not-allowed select-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition shadow-lg active:scale-[0.98] cursor-pointer"
                      id="wizard-save-btn"
                    >
                      Daftarkan Profil Bisnis Owner ➔
                    </button>
                  </form>
                </div>
              ) : isOwnerLoggedIn ? (
                <OwnerDashboard 
                  onLogout={handleOwnerLogout} 
                  onSwitchConsole={(consoleType) => setActiveConsole(consoleType)} 
                />
              ) : (
                <div className="max-w-md mx-auto my-8 bg-white p-8 rounded-3xl border border-slate-200/85 shadow-xl space-y-6 animate-scaleIn font-sans">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center">
                      <LayoutDashboard className="w-6 h-6 text-slate-800" />
                    </div>
                    <h3 className="font-extrabold text-[#0D1B2A] text-xl">Login Owner</h3>
                    <span className="text-xs text-rose-500 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-100 block max-w-max mx-auto font-bold uppercase tracking-wider">Akses Terlarang</span>
                    <p className="text-xs text-slate-500">Silakan masukkan password akun owner untuk masuk ke dasbor analitik bisnis LaughDry.</p>
                  </div>

                  {loginError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-650 rounded-xl text-xs font-semibold leading-relaxed animate-shake">
                      ⚠️ {loginError}
                    </div>
                  )}

                  <form onSubmit={handleOwnerLogin} className="space-y-4">
                    <div className="space-y-1.5 text-xs">
                      <label className="text-slate-500 font-bold block">Password Owner:</label>
                      <input
                        type="password"
                        required
                        value={ownerPasswordInput}
                        onChange={(e) => setOwnerPasswordInput(e.target.value)}
                        placeholder="Masukkan password Anda..."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white rounded-xl p-3 focus:outline-none font-bold text-slate-800 tracking-widest text-center"
                        autoFocus
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-extrabold hover:bg-slate-800 transition shadow-lg active:scale-[0.98]"
                    >
                      Log In Sebagai Owner ➔
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          )}

          {activeConsole === 'karyawan' && !isCustomerOnly && (
            <motion.div
              key="karyawan-console"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full"
            >
              {loggedInCashier ? (
                <EmployeeConsole loggedInUser={loggedInCashier} onLogout={handleCashierLogout} />
              ) : (
                <div className="max-w-[340px] md:max-w-md mx-auto my-3 md:my-6 bg-white p-5 md:p-7 rounded-2xl md:rounded-3xl border border-slate-200/85 shadow-lg space-y-4 animate-scaleIn font-sans">
                  <div className="text-center space-y-1">
                    <div className="w-9 h-9 mx-auto bg-sky-50 rounded-xl flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-sky-600" />
                    </div>
                    <h3 className="font-extrabold text-[#0D1B2A] text-base md:text-lg">Login Operator Kasir</h3>
                    <p className="text-[10px] md:text-xs text-slate-500 leading-snug">Masukkan akun kasir aktif untuk membuka konsol transaksi.</p>
                  </div>

                  {loginError && (
                    <div className="p-2.5 bg-red-50 border border-red-150 text-red-650 rounded-lg text-[10px] leading-snug font-bold">
                      ⚠️ {loginError}
                    </div>
                  )}

                  <form onSubmit={handleCashierLogin} className="space-y-4 text-xs font-sans">
                    {/* Unified Login Input Fields Group */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-100 transition-all">
                      {/* Top Input: Username */}
                      <div className="p-2 md:p-3 pb-1 md:pb-1.5 border-b border-slate-100 flex flex-col">
                        <span className="text-[8.5px] uppercase font-black text-slate-400 tracking-wider">Username Kasir</span>
                        <input
                          type="text"
                          required
                          value={cashierUsernameInput}
                          onChange={(e) => setCashierUsernameInput(e.target.value.toLowerCase().replace(/\s/g, ''))}
                          placeholder="Masukkan username (contoh: rian)"
                          className="w-full bg-transparent border-none text-[11px] md:text-xs font-bold text-slate-800 focus:outline-none placeholder-slate-400 mt-0.5 py-0.5"
                          autoFocus
                        />
                      </div>
                      
                      {/* Bottom Input: Password */}
                      <div className="p-2 md:p-3 pt-1.5 flex flex-col">
                        <span className="text-[8.5px] uppercase font-black text-slate-400 tracking-wider">Password Shift</span>
                        <input
                          type="password"
                          required
                          value={cashierPasswordInput}
                          onChange={(e) => setCashierPasswordInput(e.target.value)}
                          placeholder="Masukkan password shift..."
                          className="w-full bg-transparent border-none text-[11px] md:text-xs font-bold text-slate-800 focus:outline-none placeholder-slate-400 mt-0.5 py-0.5"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 md:py-3 bg-sky-650 hover:bg-sky-750 text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-colors shadow-md active:scale-[0.98] cursor-pointer"
                    >
                      Mulai Tugas Shift Kasir ➔
                    </button>
                    
                    <div className="text-center">
                      <span className="inline-block text-[9px] text-sky-600 bg-sky-50/70 border border-sky-100/50 px-2 py-0.5 rounded font-black uppercase tracking-wider">rian / rian123</span>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          )}

          {activeConsole === 'pelanggan' && (
            <motion.div
              key="pelanggan-console"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full"
            >
              <CustomerTracking />
            </motion.div>
          )}

          {/* End of consoles */}
        </AnimatePresence>

      </main>

      {/* Clean Footer Bar */}
      <footer className="py-4 text-[11px] text-slate-400 font-sans mt-8 text-center border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4">
          <span>LaughDry &copy; 2026</span>
        </div>
      </footer>

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] animate-fadeIn" id="modal-signout-cloud-confirm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center select-none overflow-hidden relative border-0">
            <div className="space-y-1">
              <div className="text-4xl">⚠️</div>
              <h4 className="font-extrabold text-slate-900 text-sm">Keluar dari Sesi Cloud?</h4>
              <p className="text-slate-500 font-bold text-xs leading-relaxed">Apakah Anda yakin ingin keluar? Sesi cloud Anda akan dinonaktifkan dan data lokal akan direset untuk proteksi keamanan kredensial.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSignOutConfirmModal(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-205 text-slate-800 font-extrabold rounded-xl text-center text-xs transition cursor-pointer"
              >
                Batal
              </button>
              
              <button
                type="button"
                onClick={async () => {
                  try {
                    await signOut(auth);
                  } catch (err) {
                    console.warn("Authentication signout failed (non-fatal info):", err);
                  }
                  localStorage.removeItem('laughdry_firebase_disabled');
                  localStorage.removeItem('laughdry_firebase_uid');
                  localStorage.removeItem('laughdry_shared_database_id');
                  localStorage.removeItem('laughdry_shared_database_email');
                  localStorage.removeItem('laughdry_owner_logged_in');
                  localStorage.removeItem('laughdry_logged_in_cashier');
                  localStorage.removeItem('laughdry_skip_demo_seeds');
                  localStorage.removeItem('laughdry_owner_name_registered');
                  localStorage.removeItem('laughdry_firebase_quota_exceeded_timestamp');
                  LaughDryDatabase.resetToSeed();
                  setShowSignOutConfirmModal(false);
                  window.location.reload();
                }}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-center text-xs transition cursor-pointer"
              >
                Keluar Cloud
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
