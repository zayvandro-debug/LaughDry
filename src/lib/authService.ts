/**
 * authService.ts — LaughDry Auth Service
 * Menangani: Login Email, Login Google (Gmail), Register Email, Logout
 * dan sinkronisasi uid ke localStorage setelah auth berhasil.
 *
 * [FIX] File ini menggantikan logika auth yang tersebar di berbagai tempat.
 * Import dan gunakan fungsi-fungsi ini di App.tsx / LoginPage.tsx.
 */

import {
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from './firebase';
import { LaughDryDatabase } from '../services/mockDatabase';

// ─── Simpan uid ke localStorage setelah login ─────────────────────────────────
// Ini yang hilang sebelumnya: uid tidak tersimpan, sehingga queueSync/syncFromFirestore
// menganggap user belum login dan memblokir semua operasi Firestore.
function persistAuthUid(uid: string | null) {
  if (uid) {
    localStorage.setItem('laughdry_firebase_uid', uid);
  } else {
    localStorage.removeItem('laughdry_firebase_uid');
  }
}

// ─── Listener auth state — panggil ini SATU KALI di App.tsx ──────────────────
// Setiap kali user login/logout, uid tersimpan dan sync dijalankan otomatis.
// [FIX] Juga menangani redirect result dari signInWithRedirect (Google Login fallback)
// yang terjadi saat browser kembali ke app setelah redirect OAuth.
export function initAuthListener(
  onLogin: (uid: string, email: string | null) => void,
  onLogout: () => void
): () => void {
  // Tangkap pending redirect result SEBELUM onAuthStateChanged, karena getRedirectResult
  // harus dipanggil sebelum Firebase Auth memproses state-nya sendiri.
  handleGoogleRedirectResult().catch(e =>
    console.warn('[AUTH] handleGoogleRedirectResult saat init gagal:', e)
  );

  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      persistAuthUid(user.uid);
      try {
        // Proses pending syncs yang tertumpuk saat offline/belum login
        await LaughDryDatabase.processPendingSyncs();
      } catch (e) {
        console.warn('[AUTH] processPendingSyncs gagal:', e);
      }
      try {
        // Sync data dari Firestore ke localStorage
        // [FIX] Dibungkus try-catch terpisah: untuk user BARU, syncFromFirestore mungkin
        // menemukan koleksi kosong — ini normal, tidak boleh memblokir login.
        await LaughDryDatabase.syncFromFirestore();
      } catch (e) {
        console.warn('[AUTH] syncFromFirestore gagal (mungkin user baru):', e);
      }
      try {
        // Mulai realtime listeners
        LaughDryDatabase.startRealtimeListeners();
      } catch (e) {
        console.warn('[AUTH] startRealtimeListeners gagal:', e);
      }
      onLogin(user.uid, user.email);
    } else {
      persistAuthUid(null);
      LaughDryDatabase.stopRealtimeListeners?.();
      onLogout();
    }
  });
}

// ─── Login dengan Email & Password ───────────────────────────────────────────
export async function loginWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; message: string; uid?: string }> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    persistAuthUid(result.user.uid);
    return { success: true, message: 'Login berhasil', uid: result.user.uid };
  } catch (err: any) {
    const code = err?.code || '';
    const messages: Record<string, string> = {
      'auth/user-not-found':     'Email tidak ditemukan. Silakan daftar terlebih dahulu.',
      'auth/wrong-password':     'Password salah. Silakan coba lagi.',
      'auth/invalid-credential': 'Email atau password tidak valid.',
      'auth/too-many-requests':  'Terlalu banyak percobaan login. Coba lagi beberapa saat.',
      'auth/user-disabled':      'Akun ini telah dinonaktifkan.',
      'auth/invalid-email':      'Format email tidak valid.',
    };
    return {
      success: false,
      message: messages[code] || `Login gagal: ${err.message}`,
    };
  }
}

// ─── Register Email Baru ──────────────────────────────────────────────────────
export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<{ success: boolean; message: string; uid?: string }> {
  try {
    if (password.length < 6) {
      return { success: false, message: 'Password minimal 6 karakter.' };
    }

    const result = await createUserWithEmailAndPassword(auth, email, password);
    const uid = result.user.uid;
    persistAuthUid(uid);

    // [FIX] Untuk user BARU, jangan panggil syncFromFirestore() karena Firestore belum punya
    // data apapun untuk uid ini — akan menyebabkan error permission-denied yang tidak perlu.
    // onAuthStateChanged di initAuthListener akan menangani sync + listener secara otomatis
    // setelah Firebase Auth mengkonfirmasi session. Tidak perlu lakukan apapun di sini.

    return { success: true, message: 'Akun berhasil dibuat!', uid };
  } catch (err: any) {
    const code = err?.code || '';
    const messages: Record<string, string> = {
      'auth/email-already-in-use': 'Email sudah terdaftar. Silakan login.',
      'auth/weak-password':        'Password terlalu lemah. Gunakan minimal 6 karakter.',
      'auth/invalid-email':        'Format email tidak valid.',
      'auth/operation-not-allowed':'Registrasi email belum diaktifkan di Firebase Console.',
    };
    return {
      success: false,
      message: messages[code] || `Registrasi gagal: ${err.message}`,
    };
  }
}

// ─── Cek hasil Google Redirect (panggil SEKALI di awal App.tsx) ───────────────
// Wajib dipanggil saat app pertama kali mount, untuk menangkap hasil
// signInWithRedirect yang terjadi di sesi sebelumnya (setelah browser kembali ke app).
export async function handleGoogleRedirectResult(): Promise<{ success: boolean; uid?: string; isNewUser?: boolean } | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null; // Tidak ada pending redirect result — normal
    const uid = result.user.uid;
    persistAuthUid(uid);
    const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
    return { success: true, uid, isNewUser };
  } catch (err: any) {
    const code = err?.code || '';
    // Error 'auth/no-auth-event' dan 'missing-initial-state' artinya tidak ada redirect result — abaikan
    if (code === 'auth/no-auth-event' || (err?.message || '').includes('missing initial state')) {
      return null;
    }
    console.warn('[AUTH] handleGoogleRedirectResult error:', err);
    return null;
  }
}

// ─── Login dengan Google (Gmail) ──────────────────────────────────────────────
// Strategi: coba signInWithPopup dulu. Jika popup diblokir atau browser tidak mendukung
// (storage-partitioned, iframe, dll), fallback ke signInWithRedirect.
// Hasil redirect ditangkap oleh handleGoogleRedirectResult() saat app reload.
//
// PRASYARAT: Di Firebase Console → Authentication → Sign-in method → Google → Enable
// PRASYARAT: Di Firebase Console → Authentication → Settings → Authorized domains
//            → tambahkan: localhost (dev) dan domain production Anda
export async function loginWithGoogle(): Promise<{ success: boolean; message: string; uid?: string; isNewUser?: boolean }> {
  const provider = new GoogleAuthProvider();
  // Paksa tampilkan dialog pilih akun Google meskipun sudah pernah login
  provider.setCustomParameters({ prompt: 'select_account' });

  // Coba popup dulu
  try {
    const result = await signInWithPopup(auth, provider);
    const uid = result.user.uid;
    persistAuthUid(uid);
    const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
    return { success: true, message: 'Login Google berhasil!', uid, isNewUser };
  } catch (popupErr: any) {
    const code = popupErr?.code || '';
    const msg = (popupErr?.message || '').toLowerCase();

    // Error yang bisa di-retry dengan redirect
    const shouldFallbackToRedirect =
      code === 'auth/popup-blocked' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/popup-closed-by-user' ||
      msg.includes('missing initial state') ||
      msg.includes('sessionstorage') ||
      msg.includes('storage') ||
      msg.includes('cross-origin') ||
      msg.includes('unable to process');

    if (shouldFallbackToRedirect) {
      try {
        // Redirect: browser akan meninggalkan halaman ini, lalu kembali ke app.
        // Hasil ditangkap oleh handleGoogleRedirectResult() saat app mount ulang.
        await signInWithRedirect(auth, provider);
        // Baris di bawah ini tidak akan pernah dieksekusi karena halaman sudah redirect
        return { success: true, message: 'Mengalihkan ke halaman Google...' };
      } catch (redirectErr: any) {
        return {
          success: false,
          message: `Login Google gagal: ${redirectErr?.message || 'Tidak dapat membuka halaman login Google.'}`,
        };
      }
    }

    // Error yang tidak bisa di-retry
    const messages: Record<string, string> = {
      'auth/unauthorized-domain':
        'Domain ini belum diizinkan untuk login Google. ' +
        'Buka Firebase Console → Authentication → Settings → Authorized domains ' +
        '→ tambahkan "localhost" (development) atau domain Anda (production).',
      'auth/account-exists-with-different-credential':
        'Email ini sudah terdaftar dengan metode login lain. Gunakan login email/password.',
      'auth/user-disabled':
        'Akun ini telah dinonaktifkan.',
      'auth/operation-not-allowed':
        'Login Google belum diaktifkan. Buka Firebase Console → Authentication → Sign-in method → Google → Enable.',
    };
    return {
      success: false,
      message: messages[code] || `Login Google gagal: ${popupErr.message}`,
    };
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  try {
    LaughDryDatabase.stopRealtimeListeners?.();
    await signOut(auth);
    persistAuthUid(null);
    // Bersihkan cache lokal agar data tidak bocor ke sesi berikutnya
    localStorage.removeItem('laughdry_firebase_uid');
  } catch (err) {
    console.error('[AUTH] Logout error:', err);
  }
}

// ─── Cek status login saat ini ────────────────────────────────────────────────
export function getCurrentUser() {
  return auth.currentUser;
}

export function isLoggedIn(): boolean {
  return !!auth.currentUser;
}
