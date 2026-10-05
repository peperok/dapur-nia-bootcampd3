import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useToast } from '../common/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { UserProfile } from '../../types';
import { 
  Lock, Mail, User, LogIn, UserPlus, 
  ArrowLeft, ChefHat, ShoppingBag, Crown, Phone, MapPin, Eye, EyeOff 
} from 'lucide-react';

interface AuthModuleProps {
  onSuccess: (role: 'pelanggan' | 'pemilik') => void;
  onCancel: () => void;
  defaultRole?: 'pelanggan' | 'pemilik';
}

export const AuthModule: React.FC<AuthModuleProps> = ({ 
  onSuccess, 
  onCancel,
  defaultRole = 'pelanggan',
}) => {
  const { showToast } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState<'pelanggan' | 'pemilik'>(defaultRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [noWhatsapp, setNoWhatsapp] = useState('');
  const [alamat, setAlamat] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
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
        // 1. Pendaftaran Akun Baru
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(userCredential.user, {
          displayName: displayName.trim(),
        });

        // Simpan dokumen profil pengguna ke Firestore collection 'users'
        // Keamanan: Semua pendaftaran publik dijamin 100% sebagai Pelanggan
        const profileData: UserProfile = {
          uid: userCredential.user.uid,
          email: email.trim(),
          displayName: displayName.trim(),
          role: 'pelanggan',
          ...(noWhatsapp ? { no_whatsapp: noWhatsapp.trim() } : {}),
          ...(alamat ? { alamat: alamat.trim() } : {}),
        };
        await setDoc(doc(db, 'users', userCredential.user.uid), profileData);

        // Daftarkan juga ke kontak pelanggan
        if (noWhatsapp) {
          await setDoc(doc(db, 'pelanggan', noWhatsapp.trim()), {
            id: noWhatsapp.trim(),
            nama: displayName.trim(),
            no_whatsapp: noWhatsapp.trim(),
            alamat: alamat.trim() || 'Alamat belum diatur',
            dibuat_pada: new Date().toISOString(),
          });
        }

        showToast(`Selamat datang, ${displayName.trim()}! Anda terdaftar sebagai Pelanggan Dapur Nia.`, 'success');
        onSuccess('pelanggan');
      } else {
        // 2. Masuk / Login
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        
        // Ambil profil dari Firestore untuk mengetahui role pengguna
        let userRole: 'pelanggan' | 'pemilik' = 'pelanggan';
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          userRole = data.role || 'pelanggan';
        } else {
          // Default role fallback jika belum ada profil di Firestore
          userRole = email.includes('admin') || email.includes('owner') || email.includes('dina') ? 'pemilik' : 'pelanggan';
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: email.trim(),
            displayName: userCredential.user.displayName || email.split('@')[0],
            role: userRole,
          });
        }

        const name = userCredential.user.displayName || email.split('@')[0];
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
      {/* Top Navbar */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between pt-2">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 px-3.5 py-1.5 rounded-full shadow-xs transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Katalog Tamu</span>
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
              {isRegister ? 'Daftar Akun Baru' : 'Masuk ke Akun Anda'}
            </h2>
            <p className="text-xs text-slate-500 mt-1.5">
              {isRegister
                ? 'Daftar akun pelanggan untuk mulai memesan katering lezat'
                : 'Masuk dengan email & kata sandi untuk melanjutkan'}
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
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

          {/* Switch Login / Register */}
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
                  className="font-bold text-amber-600 hover:text-amber-700 hover:underline ml-1"
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
                  className="font-bold text-amber-600 hover:text-amber-700 hover:underline ml-1"
                >
                  Daftar akun baru
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="max-w-md w-full mx-auto text-center pb-2 text-[11px] text-slate-400 font-medium">
        © 2026 Dapur Nia • Sistem Pemesanan & Katering Harian
      </div>
    </div>
  );
};
