import React, { useState, useRef, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Mail, Lock, User as UserIcon, LogIn, UserPlus, Info, Sparkles, CheckCircle, Network, Link2, Unlink, Copy, Check, Shirt, Droplet, Camera, RotateCcw, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../lib/firebase';
import logoImg from '../assets/images/logo_laughdry_1781839107009.jpg';

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
  // Custom expandable logo state
  const [gateLogo, setGateLogo] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('laughdry_gate_logo') || logoImg;
    }
    return logoImg;
  });
  const [logoScale, setLogoScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('laughdry_gate_logo_scale');
      return saved ? parseFloat(saved) : 1.0;
    }
    return 1.0;
  });
  const [showLogoControls, setShowLogoControls] = useState<boolean>(false);

  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUploadClick = () => {
    logoInputRef.current?.click();
  };

  const handleScaleChange = (val: number) => {
    setLogoScale(val);
    localStorage.setItem('laughdry_gate_logo_scale', val.toString());
    window.dispatchEvent(new CustomEvent('laughdry_logo_scale_changed', { detail: val }));
  };

  const handleLogoUploaded = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        localStorage.setItem('laughdry_gate_logo', base64);
        setGateLogo(base64);
        setShowLogoControls(true);
        window.dispatchEvent(new CustomEvent('laughdry_logo_changed', { detail: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Reset logo kembali ke bawaan LaughDry?")) {
      localStorage.removeItem('laughdry_gate_logo');
      localStorage.removeItem('laughdry_gate_logo_scale');
      setGateLogo(logoImg);
      setLogoScale(1.0);
      setShowLogoControls(false);
      window.dispatchEvent(new CustomEvent('laughdry_logo_changed', { detail: logoImg }));
      window.dispatchEvent(new CustomEvent('laughdry_logo_scale_changed', { detail: 1.0 }));
    }
  };

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

  // Monitor and handle Google Sign-In redirect result on page mount
  useEffect(() => {
    let active = true;
    
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user && active) {
          setLoading(true);
          console.log("Google Sign-In Redirect success:", result.user);
          localStorage.removeItem('laughdry_firebase_disabled');
          localStorage.setItem('laughdry_firebase_uid', result.user.uid);
          await registerEmailMapping(result.user);
          setSuccessMsg('Autentikasi Google berhasil! Membuka gerbang utama...');
          setTimeout(() => {
            if (active) {
              onSignedIn(result.user);
            }
          }, 1200);
        }
      } catch (err: any) {
        console.error("Google Sign-In Redirect error parsing result:", err);
        if (active) {
          let localizedError = 'Gagal memproses masuk Google dari halaman redirect.';
          if (err.code === 'auth/unauthorized-domain') {
            localizedError = 'Domain atau alamat situs ini belum diizinkan di Firebase Console -> Authentication -> Authorized Domains Anda. Silakan tambahkan domain ini agar redirect berhasil.';
          } else if (err.code === 'auth/operation-not-allowed') {
            localizedError = 'Metode masuk Google/Gmail belum diaktifkan di tab Sign-In Method pada Firebase Console Anda.';
          } else if (err.code === 'auth/popup-blocked') {
            localizedError = 'Popup diblokir oleh browser Anda. Silakan beri izin pop-up / redirect.';
          } else if (err.message && err.message.includes('network-request-failed')) {
            localizedError = 'Koneksi internet bermasalah. Pastikan perangkat Anda terhubung.';
          }
          setAuthError(localizedError);
          setAuthErrorCode(err.code || null);
          setLoading(false);
        }
      }
    };

    handleRedirectResult();
    
    return () => {
      active = false;
    };
  }, []);

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
    
    // Check if on a mobile browser or WebView
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const useRedirectMode = isMobileDevice || isWebView();

    try {
      const provider = new GoogleAuthProvider();
      
      if (useRedirectMode) {
        console.log("Mobile/WebView detected, using signInWithRedirect for Google Auth...");
        setSuccessMsg('Mengalihkan Anda ke halaman login resmi Google (Akun Gmail)...');
        await signInWithRedirect(auth, provider);
      } else {
        console.log("Desktop detected, attempting signInWithPopup for Google Auth...");
        const result = await signInWithPopup(auth, provider);
        
        localStorage.removeItem('laughdry_firebase_disabled');
        localStorage.setItem('laughdry_firebase_uid', result.user.uid);
        await registerEmailMapping(result.user);
        setSuccessMsg('Autentikasi akun Gmail berhasil! Membuka gerbang utama...');
        setTimeout(() => {
          onSignedIn(result.user);
        }, 1200);
      }
    } catch (err: any) {
      console.warn("Google Sign-In failed/blocked:", err);
      
      // Fallback to Redirect automatically if popup failed or wasn't supported
      if (
        err.code === 'auth/popup-blocked' || 
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/operation-not-supported-in-this-environment'
      ) {
        try {
          console.log("Popup was blocked or unsupported. Falling back to signInWithRedirect...");
          setSuccessMsg('Popup terblokir atau bermasalah. Mengalihkan Anda secara otomatis ke halaman login resmi Google...');
          const provider = new GoogleAuthProvider();
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirErr: any) {
          console.error("Redirect fallback failed:", redirErr);
        }
      }

      let localizedError = 'Gagal masuk menggunakan akun Gmail. Silakan coba lagi.';
      if (err.code === 'auth/popup-closed-by-user') {
        localizedError = 'Popup masuk Google ditutup oleh pengguna. Jika Anda sedang melihat pratinjau di dalam iframe, silakan buka aplikasi di tab baru (tombol panah di kanan atas) atau gunakan Mode Lokal.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        localizedError = 'Permintaan popup masuk dibatalkan atau terblokir. Silakan coba lagi.';
      } else if (err.code === 'auth/unauthorized-domain') {
        localizedError = `Domain situs ini (${window.location.hostname}) belum diizinkan untuk login Google di Firebase Console Anda. Silakan daftarkan domain ini di Firebase Console -> Authentication -> Settings -> Authorized Domains.`;
      } else if (isWebView()) {
        localizedError = 'Aplikasi mendeteksi Anda menggunakan HP (WebView) atau Google Sign-In dibatalkan karena kebijakan keamanan Google. Solusi termudah: Silakan masuk menggunakan form Email & Password di bawah untuk akses HP yang 100% lancar.';
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
        <div className="text-center space-y-3 mb-8 flex flex-col items-center">
          <div className="relative group select-none flex flex-col items-center">
            {/* Logo Badge Container */}
            <div 
              onClick={() => setShowLogoControls(!showLogoControls)}
              className={`relative flex items-center justify-center w-24 h-24 bg-white/5 border rounded-3xl overflow-hidden shadow-2xl p-1 cursor-pointer transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] ${showLogoControls ? 'border-sky-500 bg-sky-500/5 shadow-sky-500/20' : 'border-slate-800 shadow-sky-500/10 hover:border-slate-600'}`}
              id="gate-logo-badge"
              title="Klik untuk mengatur atau mengubah logo"
            >
              <img 
                src={gateLogo} 
                alt="LaughDry App Mascot" 
                className="w-full h-full object-contain rounded-2xl transition-transform duration-200" 
                style={{ transform: `scale(${logoScale})` }}
                referrerPolicy="no-referrer"
              />
              
              {/* Camera Hover Overlay */}
              <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200">
                <Camera className="w-5 h-5 text-sky-450 animate-pulse" />
                <span className="text-[8px] text-slate-300 font-bold uppercase tracking-wider mt-1 text-center px-1">Atur / Ganti</span>
              </div>
              
              <Sparkles className="w-4.5 h-4.5 absolute -top-1 -right-1 text-amber-300 animate-pulse pointer-events-none" />
            </div>

            {/* Hidden native input which prompts standard gallery selection or camera captures */}
            <input 
              type="file" 
              ref={logoInputRef} 
              accept="image/*" 
              className="hidden" 
              onChange={handleLogoUploaded} 
            />
          </div>

          {/* Logo Scale and Customization Controls Popover */}
          {showLogoControls && (
            <div className="flex flex-col items-center gap-2.5 w-64 mt-2 px-3.5 py-3.5 bg-slate-950/95 border border-slate-800/90 rounded-2xl shadow-2xl animate-fade-in relative z-20">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center border-b border-slate-850 pb-1.5 w-full">
                Sesuaikan Logo Toko
              </div>

              {/* Upload Action Button */}
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); handleLogoUploadClick(); }}
                className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 active:scale-98 transition-all text-xs font-semibold"
              >
                <Camera className="w-4 h-4" />
                <span>Upload Baru / Kamera</span>
              </button>

              {/* Slider Scale Group */}
              <div className="w-full flex flex-col gap-1.5 px-0.5 mt-1">
                <div className="flex items-center justify-between w-full text-[10px] text-slate-450 font-medium">
                  <span>Skala Foto</span>
                  <span className="text-sky-400 font-bold">{Math.round(logoScale * 100)}%</span>
                </div>
                <input 
                  type="range"
                  min="0.4"
                  max="2.0"
                  step="0.05"
                  value={logoScale}
                  onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
              </div>

              {/* Bottom Actions Row */}
              <div className="flex items-center gap-2 w-full mt-1.5 border-t border-slate-850 pt-2.5">
                {gateLogo !== logoImg && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleResetLogo(e); }}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 active:scale-95 text-[10px] rounded-lg transition-all font-semibold shrink-0"
                    title="Kembalikan ke logo bawaan"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowLogoControls(false); }}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-sky-500 hover:bg-sky-600 text-slate-950 font-black text-[10px] rounded-lg uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-sky-500/10"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Selesai</span>
                </button>
              </div>
            </div>
          )}
          <h1 className="text-3xl font-black bg-gradient-to-r from-sky-300 via-sky-100 to-white bg-clip-text text-transparent tracking-tight text-center animate-fade-in" id="gate-main-heading">
            LaughDry
          </h1>
          <p className="text-[11px] text-slate-400">
            Pusat Laundry Modern & Kasir Digital Pintar
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
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
}
