import React, { useState, useEffect, useRef } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useToast } from '../common/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { UserProfile } from '../../types';
import { 
  Lock, Mail, User, LogIn, UserPlus, 
  ArrowLeft, ChefHat, Phone, MapPin, Eye, EyeOff,
  KeyRound, Smartphone, CheckCircle2
} from 'lucide-react';

// Declare global window property for recaptcha verifier
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

interface AuthModuleProps {
  onSuccess: (role: 'pelanggan' | 'pemilik') => void;
  onCancel: () => void;
  defaultRole?: 'pelanggan' | 'pemilik';
}

type AuthMethod = 'email' | 'phone';

export const AuthModule: React.FC<AuthModuleProps> = ({ 
  onSuccess, 
  onCancel,
  defaultRole = 'pelanggan',
}) => {
  const { showToast } = useToast();
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [isRegister, setIsRegister] = useState(false);
  const [role] = useState<'pelanggan' | 'pemilik'>(defaultRole);

  // Email / Password Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [noWhatsapp, setNoWhatsapp] = useState('');
  const [alamat, setAlamat] = useState('');

  // Phone OTP State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [phoneUserName, setPhoneUserName] = useState('');
  const [phoneAlamat, setPhoneAlamat] = useState('');

  // Common State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Bersihkan reCAPTCHA saat unmount atau ganti mode
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = undefined;
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Helper sync user role & profile ke Firestore
  const handleUserFirestoreProfile = async (
    uid: string, 
    userEmail: string | null, 
    name: string | null,
    phone?: string,
    userAlamat?: string
  ): Promise<'pelanggan' | 'pemilik'> => {
    let finalRole: 'pelanggan' | 'pemilik' = 'pelanggan';
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data() as UserProfile;
      finalRole = data.role || 'pelanggan';
      // Update data nomor telepon / alamat jika baru ada
      if (phone && !data.no_whatsapp) {
        await setDoc(userDocRef, { no_whatsapp: phone }, { merge: true });
      }
      if (userAlamat && !data.alamat) {
        await setDoc(userDocRef, { alamat: userAlamat }, { merge: true });
      }
    } else {
      // Tentukan role fallback
      finalRole = (userEmail && (userEmail.includes('owner') || userEmail.includes('admin') || userEmail.includes('dina')))
        ? 'pemilik' 
        : 'pelanggan';

      const newProfile: UserProfile = {
        uid,
        email: userEmail || '',
        displayName: name || (userEmail ? userEmail.split('@')[0] : phone || 'Pelanggan'),
        role: finalRole,
        ...(phone ? { no_whatsapp: phone } : {}),
        ...(userAlamat ? { alamat: userAlamat } : {}),
      };
      await setDoc(userDocRef, newProfile);
    }

    // Jika ada nomor kontak, pastikan juga tercatat di koleksi 'pelanggan'
    if (phone) {
      await setDoc(doc(db, 'pelanggan', phone), {
        id: phone,
        nama: name || phone,
        no_whatsapp: phone,
        alamat: userAlamat || 'Alamat belum diatur',
        dibuat_pada: new Date().toISOString(),
      }, { merge: true });
    }

    return finalRole;
  };

  // --- 1. GOOGLE SIGN-IN ---
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRole = await handleUserFirestoreProfile(
        user.uid,
        user.email,
        user.displayName,
        user.phoneNumber || undefined
      );

      showToast(`Berhasil masuk dengan Google sebagai ${user.displayName || 'Pelanggan'}!`, 'success');
      onSuccess(userRole);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        const msg = err.code === 'auth/popup-blocked' 
          ? 'Popup login Google diblokir browser. Izinkan popup lalu coba lagi.' 
          : (err.message || 'Gagal masuk dengan Google.');
        setErrorMsg(msg);
        showToast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- 2. PHONE OTP SIGN-IN ---
  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          setErrorMsg('reCAPTCHA kedaluwarsa. Silakan ulangi pengiriman kode.');
        }
      });
    }
    return window.recaptchaVerifier;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let formattedPhone = phoneNumber.trim().replace(/[\s-]/g, '');
    if (!formattedPhone) {
      setErrorMsg('Nomor telepon wajib diisi.');
      return;
    }

    // Ubah 08xxx menjadi +628xxx format internasional E.164
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+62' + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    setLoading(true);

    try {
      const appVerifier = setupRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      window.confirmationResult = confirmation;
      setOtpSent(true);
      showToast(`Kode OTP SMS telah dikirim ke ${formattedPhone}. Silakan periksa SMS Anda.`, 'success');
    } catch (err: any) {
      console.error('Phone Auth Error:', err);
      let msg = 'Gagal mengirim kode OTP.';
      if (err.code === 'auth/invalid-phone-number') {
        msg = 'Format nomor HP tidak valid. Gunakan format contoh: 081234567890';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Terlalu banyak permintaan SMS. Coba lagi dalam beberapa menit.';
      } else if (err.code === 'auth/billing-not-enabled') {
        msg = 'Layanan SMS Firebase belum aktif atau kuota habis.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMsg(msg);
      showToast(msg, 'error');
      // Reset verifier jika error
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = undefined;
        } catch {
          // ignore
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setErrorMsg('Masukkan 6 digit kode OTP yang dikirimkan.');
      return;
    }

    const conf = confirmationResult || window.confirmationResult;
    if (!conf) {
      setErrorMsg('Sesi OTP telah berakhir. Silakan minta kode baru.');
      setOtpSent(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await conf.confirm(verificationCode.trim());
      const user = result.user;

      // Update display name jika diisi
      if (phoneUserName.trim()) {
        await updateProfile(user, { displayName: phoneUserName.trim() });
      }

      const userRole = await handleUserFirestoreProfile(
        user.uid,
        null,
        phoneUserName.trim() || user.phoneNumber || 'Pelanggan',
        user.phoneNumber || phoneNumber.trim(),
        phoneAlamat.trim() || undefined
      );

      showToast('Berhasil masuk dengan Nomor Telepon!', 'success');
      onSuccess(userRole);
    } catch (err: any) {
      console.error('OTP Verification Error:', err);
      let msg = 'Kode OTP salah atau telah kedaluwarsa.';
      if (err.code === 'auth/invalid-verification-code') {
        msg = 'Kode verifikasi OTP tidak sesuai. Silakan periksa kembali SMS Anda.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- 3. EMAIL & PASSWORD SUBMIT ---
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Email dan kata sandi wajib diisi.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    if (isRegister && !displayName.trim()) {
      setErrorMsg('Nama lengkap wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        // Pendaftaran Akun Baru
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(userCredential.user, {
          displayName: displayName.trim(),
        });

        const userRole = await handleUserFirestoreProfile(
          userCredential.user.uid,
          email.trim(),
          displayName.trim(),
          noWhatsapp.trim() || undefined,
          alamat.trim() || undefined
        );

        showToast(`Selamat datang, ${displayName.trim()}! Anda terdaftar sebagai Pelanggan Dapur Nia.`, 'success');
        onSuccess(userRole);
      } else {
        // Masuk Akun
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        const userRole = await handleUserFirestoreProfile(
          user.uid,
          user.email,
          user.displayName
        );

        const name = user.displayName || email.split('@')[0];
        showToast(`Berhasil masuk sebagai ${name} (${userRole === 'pemilik' ? 'Pemilik' : 'Pelanggan'})!`, 'success');
        onSuccess(userRole);
      }
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      let message = 'Terjadi kesalahan saat otentikasi.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'Email atau kata sandi tidak cocok.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Email ini sudah terdaftar. Silakan langsung masuk.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Format email tidak valid.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Kata sandi terlalu lemah (minimal 6 karakter).';
      } else if (err.message) {
        message = err.message;
      }
      setErrorMsg(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Invisible reCAPTCHA container for Phone Auth */}
      <div id="recaptcha-container" ref={recaptchaContainerRef} />

      {/* Top Navbar */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between pt-2">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 px-3.5 py-1.5 rounded-full shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Katalog Menu</span>
        </button>

        <span className="text-xs font-bold text-slate-500">
          Dapur Nia
        </span>
      </div>

      {/* Main Card Content */}
      <div className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl">
          
          {/* Logo & Headline */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-amber-500/20 ring-4 ring-amber-100">
              <ChefHat className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
              {isRegister ? 'Daftar Akun Baru' : 'Masuk ke Dapur Nia'}
            </h2>
            <p className="text-xs text-slate-500 mt-1.5">
              Pilih metode masuk favorit Anda untuk memesan katering lezat
            </p>
          </div>

          {/* Opsi 1: Masuk Instan dengan Google */}
          <div className="mb-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-xs sm:text-sm border border-slate-300 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {/* Google Brand SVG Icon */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Lanjutkan dengan Google</span>
            </button>
          </div>

          {/* Pemisah Garis */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider shrink-0">
              atau gunakan
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>

          {/* Tab Pemilihan Metode: Email vs Nomor Telepon */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl mb-4">
            <button
              type="button"
              onClick={() => {
                setAuthMethod('email');
                setErrorMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMethod === 'email'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email & Sandi</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod('phone');
                setErrorMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMethod === 'phone'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>No. Telepon / OTP</span>
            </button>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* --- METODE 1: EMAIL & PASSWORD --- */}
          {authMethod === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              {isRegister && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Nama Lengkap</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Nama Lengkap Anda"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required={isRegister}
                      className="h-10 text-xs sm:text-sm rounded-xl bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Nomor WhatsApp (diawali 08)</span>
                    </label>
                    <Input
                      type="tel"
                      placeholder="Contoh: 081234567890"
                      value={noWhatsapp}
                      onChange={(e) => setNoWhatsapp(e.target.value)}
                      className="h-10 text-xs sm:text-sm rounded-xl bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>Alamat Pengiriman Lengkap</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Alamat jalan, nomor rumah, RT/RW"
                      value={alamat}
                      onChange={(e) => setAlamat(e.target.value)}
                      className="h-10 text-xs sm:text-sm rounded-xl bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Alamat Email</span>
                </label>
                <Input
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 text-xs sm:text-sm rounded-xl bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Kata Sandi</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10 text-xs sm:text-sm rounded-xl bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
                    title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-slate-600" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 font-extrabold gap-2 text-xs sm:text-sm rounded-xl mt-3 bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10 transition-all cursor-pointer"
              >
                {loading ? (
                  <span>Sedang Memproses...</span>
                ) : isRegister ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Daftar Akun</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk</span>
                  </>
                )}
              </Button>
            </form>
          )}

          {/* --- METODE 2: NOMOR TELEPON & SMS OTP --- */}
          {authMethod === 'phone' && (
            <div className="space-y-3.5">
              {!otpSent ? (
                /* Langkah 1: Input Nomor HP */
                <form onSubmit={handleSendOtp} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Nomor Telepon / WhatsApp</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                        🇮🇩 +62
                      </span>
                      <Input
                        type="tel"
                        placeholder="81234567890"
                        value={phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber.replace(/^\+62/, '')}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        className="h-10 pl-16 text-xs sm:text-sm rounded-xl bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Kode verifikasi 6 digit akan dikirimkan melalui SMS gratis.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 font-extrabold gap-2 text-xs sm:text-sm rounded-xl mt-2 bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                  >
                    {loading ? (
                      <span>Mengirim SMS OTP...</span>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4" />
                        <span>Kirim Kode OTP</span>
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                /* Langkah 2: Input Kode OTP & Lengkapi Data */
                <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                    <p className="font-semibold">Kode SMS telah terkirim!</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Masukkan 6 digit kode yang masuk ke nomor telepon Anda.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                      <span>Kode OTP (6 Digit)</span>
                    </label>
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="Contoh: 123456"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      required
                      className="h-11 tracking-widest text-center text-lg font-mono font-bold rounded-xl bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white"
                    />
                  </div>

                  {/* Profil opsional untuk pengguna baru via No. HP */}
                  <div className="space-y-1 pt-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Nama Panggilan / Lengkap (Opsional)</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Nama Anda"
                      value={phoneUserName}
                      onChange={(e) => setPhoneUserName(e.target.value)}
                      className="h-10 text-xs sm:text-sm rounded-xl bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>Alamat Antar (Opsional)</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Alamat pengiriman pesanan Anda"
                      value={phoneAlamat}
                      onChange={(e) => setPhoneAlamat(e.target.value)}
                      className="h-10 text-xs sm:text-sm rounded-xl bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 font-extrabold gap-2 text-xs sm:text-sm rounded-xl mt-2 bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10 transition-all cursor-pointer"
                  >
                    {loading ? (
                      <span>Memverifikasi Kode...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Verifikasi & Masuk</span>
                      </>
                    )}
                  </Button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setVerificationCode('');
                        setErrorMsg(null);
                      }}
                      className="text-xs text-amber-600 hover:underline font-semibold cursor-pointer"
                    >
                      ← Ganti nomor telepon / Kirim ulang
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Switch Login / Register untuk metode Email */}
          {authMethod === 'email' && (
            <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
              {isRegister ? (
                <p>
                  Sudah punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(false);
                      setErrorMsg(null);
                    }}
                    className="font-bold text-amber-600 hover:text-amber-700 hover:underline ml-1 cursor-pointer"
                  >
                    Masuk di sini
                  </button>
                </p>
              ) : (
                <p>
                  Belum punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(true);
                      setErrorMsg(null);
                    }}
                    className="font-bold text-amber-600 hover:text-amber-700 hover:underline ml-1 cursor-pointer"
                  >
                    Daftar akun baru
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="max-w-md w-full mx-auto text-center pb-2 text-[11px] text-slate-400 font-medium">
        © 2026 Dapur Nia • Sistem Pemesanan & Katering Harian
      </div>
    </div>
  );
};

