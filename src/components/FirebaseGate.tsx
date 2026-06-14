import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Mail, Lock, User as UserIcon, LogIn, UserPlus, Info, Sparkles, CheckCircle, Network, Link2, Unlink, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../lib/firebase';

const isWebView = () => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isCap = !!(window as any).Capacitor;
  const isWV = ua.includes('webview') || ua.includes('wv') || (ua.includes('android') && ua.includes('version/'));
  const isLocalScheme = window.location.protocol.startsWith('capacitor') || window.location.protocol.startsWith('ionic') || window.location.protocol === 'file:';
  return isCap || isWV || isLocalScheme;
};

interface FirebaseGateProps {
  onSignedIn: (user: User) => void;
}

export default function FirebaseGate({ onSignedIn }: FirebaseGateProps) {
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Verification states
  const [unverifiedUser, setUnverifiedUser] = useState<User | null>(null);
  const [checkingVerification, setCheckingVerification] = useState<boolean>(false);

  // Shared database linking states
  const [targetOwnerEmail, setTargetOwnerEmail] = useState<string>(() => localStorage.getItem('laughdry_shared_database_email') || '');
  const [activeSharedDbId, setActiveSharedDbId] = useState<string>(() => localStorage.getItem('laughdry_shared_database_id') || '');
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [mappingSuccess, setMappingSuccess] = useState<string | null>(null);
  const [mappingLoading, setMappingLoading] = useState<boolean>(false);
  const [showSharedConfig, setShowSharedConfig] = useState<boolean>(false);

  // Helper to register mapping from email to user uid
  const registerEmailMapping = async (user: User) => {
    if (user && user.email) {
      try {
        const emailClean = user.email.toLowerCase().trim();
        await setDoc(doc(db, 'email_mappings', emailClean), { uid: user.uid }, { merge: true });
        console.log("Email mapping registered successfully:", emailClean, "->", user.uid);
      } catch (e) {
        console.warn("Failed to register email mapping (non-fatal info):", e);
      }
    }
  };

  const handleConnectSharedDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setMappingError(null);
    setMappingSuccess(null);
    setMappingLoading(true);

    const emailInput = targetOwnerEmail.trim().toLowerCase();
    if (!emailInput) {
      setMappingError('Silakan masukkan email Owner atau ID Database Cloud!');
      setMappingLoading(false);
      return;
    }

    // Checking if it's a raw UID
    if (!emailInput.includes('@')) {
      localStorage.setItem('laughdry_shared_database_id', emailInput);
      localStorage.setItem('laughdry_shared_database_email', 'Kustom ID: ' + emailInput);
      setActiveSharedDbId(emailInput);
      setMappingSuccess('Berhasil terhubung menggunakan ID Database langsung!');
      setMappingLoading(false);
      return;
    }

    try {
      const mappingRef = doc(db, 'email_mappings', emailInput);
      const mappingSnap = await getDoc(mappingRef);
      if (mappingSnap.exists()) {
        const data = mappingSnap.data();
        if (data && data.uid) {
          localStorage.setItem('laughdry_shared_database_id', data.uid);
          localStorage.setItem('laughdry_shared_database_email', emailInput);
          setActiveSharedDbId(data.uid);
          setMappingSuccess(`Hubungan database sukses! Tersinkronisasi ke Cloud Owner: ${emailInput}`);
        } else {
          setMappingError('Akun Owner tersebut belum memiliki database cloud.');
        }
      } else {
        setMappingError('Tidak ditemukan database cloud terkait email owner tersebut. Pastikan email owner sudah diisi dengan benar dan sudah pernah masuk ke aplikasi sekali.');
      }
    } catch (err: any) {
      console.warn("Mapping fetch error (non-fatal info):", err);
      setMappingError('Gagal memeriksa database cloud. Pastikan Anda terhubung ke internet.');
    } finally {
      setMappingLoading(false);
    }
  };

  const handleDisconnectSharedDatabase = () => {
    localStorage.removeItem('laughdry_shared_database_id');
    localStorage.removeItem('laughdry_shared_database_email');
    setActiveSharedDbId('');
    setTargetOwnerEmail('');
    setMappingSuccess('Kembali ke mode database bawaan perangkat.');
    setMappingError(null);
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    setAuthErrorCode(null);
    setSuccessMsg(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      localStorage.removeItem('laughdry_firebase_disabled');
      localStorage.setItem('laughdry_firebase_uid', result.user.uid);
      await registerEmailMapping(result.user);
      setSuccessMsg('Autentikasi akun Gmail berhasil! Membuka gerbang utama...');
      setTimeout(() => {
        onSignedIn(result.user);
      }, 1200);
    } catch (err: any) {
      console.warn("Google sign in error (non-fatal info):", err);
      let localizedError = 'Gagal masuk menggunakan akun Gmail. Silakan coba lagi.';
      if (err.code === 'auth/popup-closed-by-user') {
        localizedError = 'Popup masuk Google ditutup atau diblokir. Jika Anda sedang melihat pratinjau di dalam iframe, silakan buka aplikasi di tab baru (tombol panah di kanan atas) atau gunakan Mode Lokal.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        localizedError = 'Permintaan popup masuk dibatalkan atau terblokir. Silakan coba lagi.';
      } else if (
        err.code === 'auth/operation-not-supported-in-this-environment' || 
        err.code === 'auth/invalid-action' || 
        (err.message && err.message.includes('requested action is invalid')) || 
        isWebView()
      ) {
        localizedError = 'Aplikasi mendeteksi Anda menggunakan HP (WebView) atau Google Sign-In dibatalkan karena kebijakan keamanan Google. Solusi termudah: Silakan daftar / login menggunakan form Email & Password di bawah untuk akses HP yang 100% lancar.';
      }
      setAuthError(localizedError);
      setAuthErrorCode(err.code || null);
      setLoading(false);
    }
  };

  // Password reset handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    setAuthErrorCode(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setAuthError('Silakan masukkan alamat email akun Anda terlebih dahulu!');
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setSuccessMsg(`Email instruksi pergantian kata sandi dikirim ke ${cleanEmail}! Silakan periksa kotak masuk (inbox) atau spam Anda.`);
      setLoading(false);
    } catch (err: any) {
      console.warn("Firebase reset password error (non-fatal info):", err);
      let localizedError = 'Gagal mengirim email reset kata sandi. Silakan pastikan alamat email sudah benar.';
      if (err.code === 'auth/user-not-found') {
        localizedError = 'Alamat email ini belum terdaftar di database cloud kami.';
      } else if (err.code === 'auth/invalid-email') {
        localizedError = 'Format alamat email tidak valid.';
      }
      setAuthError(localizedError);
      setAuthErrorCode(err.code || null);
      setLoading(false);
    }
  };

  // Check email verification manually
  const checkEmailVerification = async () => {
    if (!unverifiedUser) return;
    setCheckingVerification(true);
    setAuthError(null);
    setAuthErrorCode(null);
    try {
      await auth.currentUser?.reload();
      const refreshedUser = auth.currentUser;
      if (refreshedUser && refreshedUser.emailVerified) {
        setSuccessMsg('Email berhasil dikonfirmasi! Membuka gerbang utama...');
        setTimeout(() => {
          onSignedIn(refreshedUser);
        }, 1200);
      } else {
        setAuthError('Email Anda belum dikonfirmasi. Silakan periksa kotak masuk atau folder spam Anda dan klik link tautan konfirmasi.');
      }
    } catch (err: any) {
      console.warn("Email verification check error (non-fatal info):", err);
      setAuthError('Gagal memeriksa status verifikasi email. Coba lagi beberapa saat lagi.');
    } finally {
      setCheckingVerification(false);
    }
  };

  // Resend email verification link
  const resendVerificationEmail = async () => {
    if (!unverifiedUser) return;
    setLoading(true);
    setAuthError(null);
    setAuthErrorCode(null);
    setSuccessMsg(null);
    try {
      await sendEmailVerification(unverifiedUser);
      setSuccessMsg('Email konfirmasi pendaftaran berhasil dikirim ulang! Silakan periksa inbox Anda.');
    } catch (err: any) {
      console.warn("Resend verification error (non-fatal info):", err);
      setAuthError('Gagal mengirim ulang email konfirmasi. Silakan coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    setUnverifiedUser(null);
    setAuthError(null);
    setAuthErrorCode(null);
    setSuccessMsg(null);
    await signOut(auth);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    setAuthErrorCode(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setAuthError('Email dan password wajib diisi!');
      setLoading(false);
      return;
    }

    try {
      if (isRegisterMode) {
        if (!name.trim()) {
          setAuthError('Nama Laundri/Pengusaha wajib diisi!');
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        localStorage.setItem('laughdry_firebase_uid', userCredential.user.uid);
        localStorage.setItem('laughdry_owner_name_registered', name.trim());
        
        // Send email verification
        try {
          await sendEmailVerification(userCredential.user);
        } catch (evErr) {
          console.warn("Failed to send verification email (non-fatal info):", evErr);
        }
        
        setUnverifiedUser(userCredential.user);
        setSuccessMsg('Pendaftaran berhasil! Kami telah mengirimkan email konfirmasi. Silakan periksa kotak masuk Anda untuk melakukan konfirmasi pendaftaran.');
        setLoading(false);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        
        // Check if email has been verified
        if (!userCredential.user.emailVerified) {
          setUnverifiedUser(userCredential.user);
          setAuthError('Email Anda belum dikonfirmasi! Silakan buka email Anda untuk melakukan verifikasi konfirmasi pendaftaran.');
          setLoading(false);
          return;
        }
        
        localStorage.removeItem('laughdry_firebase_disabled');
        localStorage.setItem('laughdry_firebase_uid', userCredential.user.uid);
        await registerEmailMapping(userCredential.user);
        setSuccessMsg('Autentikasi berhasil! Selamat datang kembali...');
        setTimeout(() => {
          onSignedIn(userCredential.user);
        }, 1200);
      }
    } catch (err: any) {
      console.warn("Firebase auth error (non-fatal info):", err);
      let localizedError = 'Gagal melakukan otentikasi. Silakan periksa kembali.';
      if (err.code === 'auth/email-already-in-use') {
        localizedError = 'Alamat email ini sudah terdaftar. Silakan masuk.';
      } else if (err.code === 'auth/operation-not-allowed') {
        localizedError = 'Metode login Email/Password secara default dinonaktifkan di Firebase Console Anda. Silakan ikuti petunjuk panduan di bawah untuk mengaktifkannya atau login menggunakan akun Gmail.';
      } else {
        if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          localizedError = 'Email atau password salah. Pastikan kredensial diisi dengan benar.';
        } else if (err.code === 'auth/invalid-email') {
          localizedError = 'Format alamat email tidak valid.';
        } else if (err.code === 'auth/weak-password') {
          localizedError = 'Kata sandi terlalu pendek (minimal 6 karakter).';
        }
      }
      setAuthError(localizedError);
      setAuthErrorCode(err.code || null);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-sky-500/30 selection:text-white" id="firebase-gate-shell">
      
      {/* Visual background lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-505/10 rounded-full blur-[100px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-xl"
        id="gate-container"
      >
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex p-3.5 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/20 shadow-lg mb-1" id="gate-logo-badge">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center justify-center gap-1.5" id="gate-main-heading">
            LaughDry Cloud POS
          </h1>
          <p className="text-xs text-slate-400 font-normal leading-normal px-2" id="gate-main-desc">
            Sistem Multi-Device Terintegrasi untuk Manajemen Laundry Professional & Real-Time Tracking Pelanggan
          </p>
        </div>

        {unverifiedUser ? (
          /* Email Verification screen portal */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-5 text-sans text-xs text-slate-300"
            id="verification-portal-container"
          >
            <div className="bg-sky-950/40 border border-sky-900/50 p-4 rounded-2xl space-y-2.5">
              <h3 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                ✉️ Konfirmasi Verifikasi Alamat Email
              </h3>
              <p className="leading-relaxed text-slate-400 text-[11px]">
                Sebuah email konfirmasi pendaftaran telah dikirim ke alamat email <strong className="text-sky-400">{unverifiedUser.email}</strong>. 
                Silakan buka kotak masuk email Anda dan klik tautan verifikasi yang ada di dalamnya terlebih dahulu sebelum masuk ke dalam sistem aplikasi.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {authError && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-500 font-medium leading-relaxed"
                >
                  {authError}
                </motion.div>
              )}
              {successMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-xl text-xs text-emerald-400 font-bold leading-relaxed"
                >
                  {successMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={checkEmailVerification}
                disabled={checkingVerification}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black tracking-wide transition-all shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                {checkingVerification ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <span>✅ SAYA SUDAH VERIFIKASI (MASUK SEKARANG)</span>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={resendVerificationEmail}
                  disabled={loading}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10.5px] font-bold transition cursor-pointer text-center"
                >
                  Kirim Ulang Email Link
                </button>
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="py-2.5 bg-slate-900 border border-slate-800 text-rose-450 hover:bg-slate-850 rounded-xl text-[10.5px] font-bold transition cursor-pointer text-center"
                >
                  Ganti Akun / Login
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Normal Auth Screen */
          <div className="space-y-4">
            
            {/* WebView/Device warning notice */}
            {isWebView() && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] rounded-2xl leading-relaxed font-sans" id="webview-badge-info">
                <span className="font-extrabold text-amber-400 block mb-0.5">⚠️ Info Google Auth di Aplikasi HP:</span>
                Sistem mendeteksi Anda menggunakan HP (WebView). Google membatasi login tombol Gmail langsung di aplikasi HP. 
                Silakan gunakan/daftar dengan **Email & Password** di bawah untuk akses 100% lancar di HP Anda!
              </div>
            )}

            {/* Google Integration Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-850 font-black text-xs rounded-xl border border-slate-200 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
              id="google-signin-btn"
            >
              <img 
                src="https://www.gstatic.com/images/branding/product/1x/gsa_64dp.png" 
                alt="Google G" 
                className="w-4 h-4 object-contain"
              />
              <span>MASUK DENGAN AKUN GMAIL</span>
            </button>

            {/* Offline Bypass Option with beautiful styling */}
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('laughdry_firebase_disabled', 'true');
                localStorage.setItem('laughdry_firebase_uid', 'offline_local_owner');
                localStorage.setItem('laughdry_owner_logged_in', 'true');
                setSuccessMsg('Masuk menggunakan Mode Lokal (Aman, Cepat & Bebas Hambatan Cloud)...');
                setTimeout(() => {
                  onSignedIn({
                    uid: 'offline_local_owner',
                    email: 'local@laughdry.app',
                    emailVerified: true,
                    displayName: 'Local Owner'
                  } as any);
                  window.location.reload();
                }, 1000);
              }}
              disabled={loading}
              className="w-full py-2.5 bg-slate-850 hover:bg-slate-800 text-amber-400 font-extrabold text-xs rounded-xl border border-amber-500/20 hover:border-amber-500/40 transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
              id="offline-bypass-btn"
            >
              <span className="text-sm">⚡</span>
              <span>MASUK OFFLINE (Bypass Firebase: Mode Lokal)</span>
            </button>

            {/* Shared Database / Multi-Device link settings */}
            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-2.5 font-sans" id="shared-db-panel">
              <button
                type="button"
                onClick={() => setShowSharedConfig(!showSharedConfig)}
                className="w-full flex items-center justify-between text-[11px] font-black text-sky-400 tracking-wider hover:text-sky-305 transition-colors uppercase outline-none focus:outline-none"
              >
                <span className="flex items-center gap-1.5 text-[10px]">
                  <Network className="w-3.5 h-3.5 text-indigo-400" /> SINKRONISASI BERSAMA (1 CLOUD DB)
                </span>
                <span className="text-[10px]">{showSharedConfig ? 'TUTUP ▲' : 'BUKA ▼'}</span>
              </button>

              {(showSharedConfig || activeSharedDbId) && (
                <div className="pt-2 border-t border-slate-900 space-y-2.5">
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                    Silakan hubungkan perangkat ini ke database utama dengan memasukkan email owner di bawah:
                  </p>

                  {activeSharedDbId ? (
                    <div className="p-2.5 bg-emerald-950/30 border border-emerald-900/50 rounded-xl space-y-2">
                      <div className="flex items-center gap-1 text-[10.5px] text-emerald-400 font-extrabold">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> STATUS: TERSYNC KE OWNER
                      </div>
                      <div className="text-[10px] text-slate-300 leading-snug break-all font-semibold">
                        Email Owner: <strong className="text-white">{localStorage.getItem('laughdry_shared_database_email')}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={handleDisconnectSharedDatabase}
                        className="w-full py-2 bg-rose-955 hover:bg-rose-900/40 text-rose-400 font-extrabold text-[10px] rounded-lg transition-all border border-rose-900/20 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Unlink className="w-3 h-3" /> Putuskan Hubungan (Gunakan DB Sendiri)
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleConnectSharedDatabase} className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase text-slate-450 tracking-wider">Email Utama Owner</label>
                        <input
                          type="text"
                          value={targetOwnerEmail}
                          onChange={(e) => setTargetOwnerEmail(e.target.value)}
                          placeholder="Contoh: zayvandro@gmail.com"
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 text-white rounded-lg text-xs font-semibold outline-none transition-all placeholder:text-slate-650"
                        />
                      </div>

                      {mappingError && (
                        <div className="p-2 bg-red-950/40 border border-red-900/40 rounded-lg text-[10px] text-red-400 font-medium leading-relaxed">
                          ⚠️ {mappingError}
                        </div>
                      )}
                      {mappingSuccess && (
                        <div className="p-2 bg-emerald-950/40 border border-emerald-900/40 rounded-lg text-[10px] text-emerald-400 font-semibold leading-relaxed">
                          ✅ {mappingSuccess}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={mappingLoading}
                        className="w-full py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer select-none border border-indigo-500/10"
                      >
                        {mappingLoading ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        ) : (
                          <>
                            <Link2 className="w-3.5 h-3.5" /> Sambungkan Database
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center my-4 justify-between" id="auth-divider">
              <span className="h-px bg-slate-800 flex-1"></span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider px-3 font-semibold">Atau login mandiri</span>
              <span className="h-px bg-slate-800 flex-1"></span>
            </div>

            {isForgotPasswordMode ? (
              /* Forgot password portal form */
              <form onSubmit={handleResetPassword} className="space-y-4" id="gate-forgot-form">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1" htmlFor="gate-forgot-email-input">
                    <Mail className="w-3 h-3 text-slate-500" /> Alamat Email Terdaftar
                  </label>
                  <input 
                    type="email" 
                    id="gate-forgot-email-input"
                    placeholder="nama@laundri.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-sky-550 focus:ring-1 focus:ring-sky-500/30 text-white rounded-xl text-xs font-semibold outline-none transition-all placeholder:text-slate-600"
                    required
                  />
                </div>

                <AnimatePresence mode="wait">
                  {authError && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-400 leading-relaxed font-medium flex items-start gap-2"
                      id="gate-forgot-error"
                    >
                      <span className="text-sm mt-0.5">⚠️</span>
                      <span>{authError}</span>
                    </motion.div>
                  )}

                  {successMsg && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-xl text-xs text-emerald-400 leading-relaxed font-semibold flex items-center gap-2"
                      id="gate-forgot-success"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>{successMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  type="submit" 
                  disabled={loading}
                  className={`w-full py-3 h-11 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black tracking-wide transition-all shadow-lg shadow-amber-500/15 select-none active:scale-95 cursor-pointer ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
                  id="gate-forgot-submit-btn"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <span>KIRIM EMAIL LAYANAN RESET SANDI</span>
                  )}
                </button>

                <div className="pt-3 flex justify-center">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsForgotPasswordMode(false);
                      setAuthError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-amber-400 hover:text-amber-305 hover:underline transition font-extrabold focus:outline-none"
                  >
                    ← Kembali ke Halaman Masuk
                  </button>
                </div>
              </form>
            ) : (
              /* Normal sign in & registration forms */
              <form onSubmit={handleSubmit} className="space-y-4" id="gate-auth-form">
                
                <AnimatePresence mode="popLayout">
                  {isRegisterMode && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1" htmlFor="gate-name-input">
                        <UserIcon className="w-3 h-3 text-slate-500" /> Nama Laundry / Pengusaha
                      </label>
                      <input 
                        type="text" 
                        id="gate-name-input"
                        placeholder="Contoh: LaughDry Melati S9" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-sky-550 focus:ring-1 focus:ring-sky-500/30 text-white rounded-xl text-xs font-semibold outline-none transition-all placeholder:text-slate-600"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1" htmlFor="gate-email-input">
                    <Mail className="w-3 h-3 text-slate-500" /> Alamat Email Akun
                  </label>
                  <input 
                    type="email" 
                    id="gate-email-input"
                    placeholder="nama@laundri.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-sky-550 focus:ring-1 focus:ring-sky-500/30 text-white rounded-xl text-xs font-semibold outline-none transition-all placeholder:text-slate-600"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1" htmlFor="gate-password-input">
                      <Lock className="w-3 h-3 text-slate-500" /> Sandi Akun (Password)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPasswordMode(true);
                        setAuthError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[10px] text-amber-400 hover:text-amber-305 font-bold transition focus:outline-none"
                    >
                      Lupa Sandi?
                    </button>
                  </div>
                  <input 
                    type="password" 
                    id="gate-password-input"
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-sky-550 focus:ring-1 focus:ring-sky-500/30 text-white rounded-xl text-xs font-semibold outline-none transition-all placeholder:text-slate-600"
                    required
                  />
                </div>

                <AnimatePresence mode="wait">
                  {authError && (
                    <div className="space-y-3">
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-400 leading-relaxed font-medium flex items-start gap-2"
                        id="gate-error-message"
                      >
                        <span className="text-sm mt-0.5">⚠️</span>
                        <span>{authError}</span>
                      </motion.div>

                      {authErrorCode === 'auth/operation-not-allowed' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="p-4 bg-amber-950/40 border border-amber-900/60 rounded-2xl text-xs text-amber-300 leading-relaxed space-y-2.5 font-sans"
                          id="gate-provider-tutorial"
                        >
                          <span className="font-extrabold flex items-center gap-1.5 text-amber-400">
                            <Info className="w-4 h-4" /> Cara Mengaktifkan Login Email & Password:
                          </span>
                          <ol className="list-decimal pl-4 space-y-1.5 text-slate-300 text-[11px] font-medium">
                            <li>Buka <a href="https://console.firebase.google.com/project/phonic-ring-q9z5m/authentication/providers" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline hover:text-sky-305 font-bold">Konsol Firebase Auth</a>.</li>
                            <li>Klik tombol <strong>Add provider</strong> atau <strong>Enable helper</strong>.</li>
                            <li>Pilih opsi penyedia <strong>Email/Password</strong> dan aktifkan fitur tersebut (Enable).</li>
                            <li>Pastikan status penyedia adalah "Enabled" lalu simpan perubahan.</li>
                            <li>Kembali ke halaman ini dan coba lengkapi form login/daftar Anda kembali!</li>
                          </ol>
                          <p className="text-[10px] text-slate-400 leading-normal border-t border-amber-900/30 pt-2 font-medium">
                            <strong>Kiat Pintar:</strong> Anda juga bisa menekan tombol <strong>MASUK DENGAN AKUN GMAIL</strong> di atas untuk login aman dalam satu klik secara langsung tanpa perlu menyetel apa pun!
                          </p>
                        </motion.div>
                      )}

                      {(authErrorCode === 'auth/popup-closed-by-user' || authErrorCode === 'auth/cancelled-popup-request') && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="p-4 bg-slate-900/90 border border-amber-500/30 rounded-2xl text-xs text-amber-200 leading-relaxed space-y-3 font-sans"
                          id="gate-popup-tutorial"
                        >
                          <span className="font-extrabold flex items-center gap-1.5 text-amber-400 text-xs">
                            <Info className="w-4 h-4 text-amber-400 animate-bounce" /> Solusi Kendala Login Google (Iframe Sandbox):
                          </span>
                          <div className="space-y-2.5 text-slate-300 text-[11px] font-medium leading-relaxed">
                            <p>
                              Sistem mendeteksi Google Sign-In dibatalkan atau terblokir. Hal ini wajar terjadi karena fitur perlindungan browser melarang cookies pihak ketiga di dalam <strong>iframe pratinjau AI Studio</strong>.
                            </p>
                            <div className="border-t border-slate-800 pt-2.5 space-y-1.5 font-bold text-slate-200">
                              Pilih salah satu dari 2 jalan keluar mudah berikut:
                            </div>
                            <div className="space-y-2 pt-0.5">
                              <div className="flex items-start gap-1.5">
                                <span className="text-amber-400 font-extrabold">Jalan A - Rekomendasi:</span>
                                <span><strong>Buka di Tab Baru</strong>. Tekan tombol ikon panah/popout di kanan atas layar pratinjau web Anda untuk membukanya secara independen. Login Google akan langsung berjalan 100% lancar tanpa hambatan sandbox!</span>
                              </div>
                              <div className="flex items-start gap-1.5 pt-1">
                                <span className="text-amber-400 font-extrabold">Jalan B - Paling Cepat:</span>
                                <span>Gunakan tombol **MASUK OFFLINE (Bypass Firebase)** di atas untuk masuk langsung dengan data lokal aman.</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {successMsg && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-xl text-xs text-emerald-400 leading-relaxed font-semibold flex items-center gap-2"
                      id="gate-success-message"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>{successMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  type="submit" 
                  disabled={loading}
                  className={`w-full py-3 h-11 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-black tracking-wide transition-all shadow-lg shadow-sky-500/15 select-none active:scale-95 cursor-pointer ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
                  id="gate-submit-btn"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  ) : isRegisterMode ? (
                    <>
                      <UserPlus className="w-4 h-4" /> DAFTAR LAUNDRY AKUN BARU
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" /> MASUK KE PORTAL UTAMA
                    </>
                  )}
                </button>

              </form>
            )}

            <div className="mt-6 pt-5 border-t border-slate-800/50 flex flex-col items-center justify-center gap-3">
              {!isForgotPasswordMode && (
                <button 
                  type="button" 
                  onClick={() => {
                    setIsRegisterMode(!isRegisterMode);
                    setAuthError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-sky-400 hover:text-sky-305 hover:underline font-bold transition flex items-center gap-1 cursor-pointer bg-transparent border-none outline-none"
                  id="gate-toggle-auth-btn"
                >
                  {isRegisterMode ? 'Sudah memiliki akun? Masuk disini' : 'Laundry Baru? Daftar & buat database terisolasi gratis'}
                </button>
              )}

              <p className="text-[10px] text-slate-500 leading-snug text-center px-1" id="gate-info-text">
                *Database dan pengaturan sinkronisasi antar perangkat (HP Kasir, Tablet Karyawan & Laptop Owner) terisolasi penuh berdasar alamat email Anda.
              </p>
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
}
