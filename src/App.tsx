import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { db, auth } from './lib/firebase';
import type { 
  Menu, Pelanggan, Pesanan, StatusPesanan, 
  ViewTab, UiStateSimulation, UserProfile, UserRole 
} from './types';
import { 
  initialMenus, 
  initialPelanggan, 
  initialPesanan 
} from './data/mockData';
import { getAllowedNextStatuses } from './utils/helpers';
import { Header } from './components/common/Header';
import { Navigation } from './components/common/Navigation';
import { LoadingState, EmptyState, ErrorState } from './components/common/UIStates';
import { MenuModule } from './components/menu/MenuModule';
import { PelangganModule } from './components/pelanggan/PelangganModule';
import { PesananModule } from './components/pesanan/PesananModule';
import { LaporanModule } from './components/laporan/LaporanModule';
import { AuthModule } from './components/auth/AuthModule';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from './components/common/Toast';

export const App: React.FC = () => {
  // Navigation tab
  const [currentTab, setCurrentTab] = useState<ViewTab>('menu');
  const { showToast } = useToast();

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Default role is 'tamu' if not logged in
  const userRole: UserRole = currentUser ? (userProfile?.role || 'pelanggan') : 'tamu';

  // Selected menu for instant order modal
  const [orderModalMenu, setOrderModalMenu] = useState<Menu | null>(null);

  // Three-state simulator for bootcamp testing (Normal / Loading / Empty / Error)
  const [simulatedState, setSimulatedState] = useState<UiStateSimulation>('normal');

  // Firestore Realtime States
  const [menus, setMenus] = useState<Menu[]>([]);
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [pesananList, setPesananList] = useState<Pesanan[]>([]);
  const [loadingFirebase, setLoadingFirebase] = useState(true);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // Subscribe to Firebase Auth State changes (Persist login across refresh)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          } else {
            const fallbackRole: 'pelanggan' | 'pemilik' = 
              user.email?.includes('owner') || user.email?.includes('admin') || user.email?.includes('dina') 
                ? 'pemilik' 
                : 'pelanggan';
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'Pengguna',
              role: fallbackRole,
            };
            setUserProfile(newProfile);
            setDoc(doc(db, 'users', user.uid), newProfile).catch(console.error);
          }
        } catch (e) {
          console.error('Error fetching user profile:', e);
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Handle Protected Tab Click based on Matrix
  const handleTabChange = (tab: ViewTab) => {
    // Tamu yang coba buka kelola menu
    if (tab === 'kelola_menu' && (!currentUser || userRole !== 'pemilik')) {
      showToast('Halaman Kelola Menu khusus untuk Pemilik Dapur.', 'info');
      setCurrentTab('auth');
      return;
    }
    // Tamu yang coba buka pesanan saya
    if (tab === 'pesanan_saya' && !currentUser) {
      showToast('Silakan masuk terlebih dahulu untuk melihat pesanan Anda.', 'info');
      setCurrentTab('auth');
      return;
    }
    setCurrentTab(tab);
  };

  // Handler saat tombol "Pesan Sekarang" di katalog ditekan
  const handleOrderFromCatalog = (menu: Menu) => {
    if (!currentUser) {
      showToast('Silakan Masuk atau Buat Akun Pelanggan untuk memesan katering.', 'info');
      setCurrentTab('auth');
      return;
    }

    if (userRole === 'pemilik') {
      showToast('Akun Pemilik hanya untuk mengelola menu. Gunakan akun Pelanggan untuk memesan.', 'info');
      return;
    }

    // Arahkan ke tab Pesanan Saya / Pemesanan
    setOrderModalMenu(menu);
    setCurrentTab('pesanan_saya');
  };

  // (6) Tombol Keluar mengakhiri sesi dan kembali ke beranda
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      showToast('Sesi telah berakhir. Kembali ke beranda.', 'info');
      setCurrentTab('menu');
    } catch (err: any) {
      showToast('Gagal keluar: ' + err.message, 'error');
    }
  };

  // Subscribe to Realtime Firestore Collections
  useEffect(() => {
    setLoadingFirebase(true);
    setFirebaseError(null);

    // 1. Subscribe Menu
    const unsubMenu = onSnapshot(
      collection(db, 'menus'),
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as Menu[];
        items.sort((a, b) => new Date(b.dibuat_pada || 0).getTime() - new Date(a.dibuat_pada || 0).getTime());
        setMenus(items);
        setLoadingFirebase(false);
      },
      (error) => {
        console.error('Firestore menus error:', error);
        setFirebaseError('Gagal memuat data menu dari Firestore.');
        setLoadingFirebase(false);
      }
    );

    // 2. Subscribe Pelanggan
    const unsubPelanggan = onSnapshot(
      collection(db, 'pelanggan'),
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as Pelanggan[];
        items.sort((a, b) => new Date(b.dibuat_pada || 0).getTime() - new Date(a.dibuat_pada || 0).getTime());
        setPelangganList(items);
      },
      (error) => {
        console.error('Firestore pelanggan error:', error);
      }
    );

    // 3. Subscribe Pesanan
    const unsubPesanan = onSnapshot(
      collection(db, 'pesanan'),
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as Pesanan[];
        items.sort((a, b) => new Date(b.dibuat_pada || 0).getTime() - new Date(a.dibuat_pada || 0).getTime());
        setPesananList(items);
      },
      (error) => {
        console.error('Firestore pesanan error:', error);
      }
    );

    return () => {
      unsubMenu();
      unsubPelanggan();
      unsubPesanan();
    };
  }, []);

  // Reset to original PRD mock data in Firestore
  const handleResetData = async () => {
    if (confirm('Kembalikan data ke contoh awal PRD di database Firestore?')) {
      try {
        for (const item of initialMenus) {
          await setDoc(doc(db, 'menus', item.id), item);
        }
        for (const item of initialPelanggan) {
          await setDoc(doc(db, 'pelanggan', item.id), item);
        }
        for (const item of initialPesanan) {
          await setDoc(doc(db, 'pesanan', item.id), item);
        }
        showToast('Data Firestore berhasil direset ke data awal PRD!', 'success');
      } catch (e: any) {
        showToast('Gagal mereset data: ' + e.message, 'error');
      }
    }
  };

  // --- Handlers Menu (Firestore) ---
  const handleAddMenu = async (menuData: Omit<Menu, 'id' | 'dibuat_pada'>) => {
    const newId = 'M' + Math.random().toString(36).substring(2, 8);
    const newMenu: Menu = {
      ...menuData,
      id: newId,
      dibuat_pada: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'menus', newId), newMenu);
      showToast(`Menu "${menuData.nama}" berhasil ditambahkan!`, 'success');
    } catch (e: any) {
      showToast('Gagal menambah menu: ' + e.message, 'error');
    }
  };

  const handleUpdateMenu = async (id: string, updates: Partial<Menu>) => {
    try {
      await updateDoc(doc(db, 'menus', id), updates);
      showToast('Menu berhasil diperbarui!', 'success');
    } catch (e: any) {
      showToast('Gagal mengupdate menu: ' + e.message, 'error');
    }
  };

  const handleDeleteMenu = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'menus', id));
      showToast('Menu berhasil dihapus!', 'info');
    } catch (e: any) {
      showToast('Gagal menghapus menu: ' + e.message, 'error');
    }
  };

  // --- Handlers Pelanggan (Firestore) ---
  const handleAddPelanggan = (
    data: Omit<Pelanggan, 'dibuat_pada'>
  ): { success: boolean; error?: string } => {
    const exists = pelangganList.some(
      (p) => p.no_whatsapp === data.no_whatsapp || p.id === data.no_whatsapp
    );
    if (exists) {
      return {
        success: false,
        error: `Nomor WhatsApp ${data.no_whatsapp} sudah terdaftar sebagai pelanggan.`,
      };
    }

    const newPelanggan: Pelanggan = {
      ...data,
      id: data.no_whatsapp,
      dibuat_pada: new Date().toISOString(),
    };

    setDoc(doc(db, 'pelanggan', data.no_whatsapp), newPelanggan)
      .then(() => showToast(`Pelanggan "${data.nama}" berhasil disimpan!`, 'success'))
      .catch((e) => showToast('Gagal menambah pelanggan: ' + e.message, 'error'));

    return { success: true };
  };

  const handleUpdatePelanggan = async (id: string, updates: Partial<Pelanggan>) => {
    try {
      await updateDoc(doc(db, 'pelanggan', id), updates);
      showToast('Data pelanggan berhasil diperbarui!', 'success');
    } catch (e: any) {
      showToast('Gagal mengupdate pelanggan: ' + e.message, 'error');
    }
  };

  const handleDeletePelanggan = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'pelanggan', id));
      showToast('Pelanggan berhasil dihapus!', 'info');
    } catch (e: any) {
      showToast('Gagal menghapus pelanggan: ' + e.message, 'error');
    }
  };

  // --- Handlers Pesanan (Firestore) ---
  const handleAddPesanan = (
    newPesananData: Omit<Pesanan, 'id' | 'dibuat_pada'>
  ): { success: boolean; error?: string } => {
    const targetMenu = menus.find((m) => m.id === newPesananData.menu_id);
    if (!targetMenu) {
      return { success: false, error: 'Menu tidak ditemukan.' };
    }

    // Invariant 2 check:
    if (newPesananData.jumlah_porsi < 1) {
      return { success: false, error: 'Jumlah porsi minimal 1.' };
    }
    if (newPesananData.jumlah_porsi > targetMenu.sisa_porsi) {
      return {
        success: false,
        error: `Sisa porsi tidak cukup (Tersedia: ${targetMenu.sisa_porsi} porsi).`,
      };
    }

    const newPesananId = 'P' + Math.random().toString(36).substring(2, 8);
    const newPesanan: Pesanan = {
      ...newPesananData,
      id: newPesananId,
      dibuat_pada: new Date().toISOString(),
    };

    // 1. Kurangi kuota porsi menu di Firestore
    updateDoc(doc(db, 'menus', targetMenu.id), {
      sisa_porsi: targetMenu.sisa_porsi - newPesananData.jumlah_porsi,
    }).catch((e) => console.error('Gagal update porsi menu:', e));

    // 2. Simpan pesanan baru di Firestore
    setDoc(doc(db, 'pesanan', newPesananId), newPesanan)
      .then(() => showToast(`Pesanan ${newPesananId} berhasil dibuat!`, 'success'))
      .catch((e) => showToast('Gagal menyimpan pesanan: ' + e.message, 'error'));

    return { success: true };
  };

  const handleUpdateStatusPesanan = (
    pesananId: string,
    nextStatus: StatusPesanan,
    buktiBayar?: string
  ): { success: boolean; error?: string } => {
    const pesanan = pesananList.find((p) => p.id === pesananId);
    if (!pesanan) {
      return { success: false, error: 'Pesanan tidak ditemukan.' };
    }

    // Status invariant check:
    const allowed = getAllowedNextStatuses(pesanan.status);
    if (!allowed.includes(nextStatus)) {
      return {
        success: false,
        error: `Perubahan status tidak sah: Dari "${pesanan.status}" tidak boleh ke "${nextStatus}".`,
      };
    }

    // Kembalikan sisa porsi menu jika dibatalkan
    if (nextStatus === 'dibatalkan') {
      const targetMenu = menus.find((m) => m.id === pesanan.menu_id);
      if (targetMenu) {
        updateDoc(doc(db, 'menus', targetMenu.id), {
          sisa_porsi: targetMenu.sisa_porsi + pesanan.jumlah_porsi,
        }).catch((e) => console.error('Gagal kembalikan porsi:', e));
      }
    }

    const updates: Partial<Pesanan> = {
      status: nextStatus,
      ...(buktiBayar !== undefined ? { bukti_bayar: buktiBayar } : {}),
    };

    updateDoc(doc(db, 'pesanan', pesananId), updates)
      .then(() => showToast(`Status pesanan diubah ke "${nextStatus.replace('_', ' ')}"`, 'success'))
      .catch((e) => showToast('Gagal update status pesanan: ' + e.message, 'error'));

    return { success: true };
  };

  // Render view based on simulated state and active tab
  const renderActiveModule = () => {
    // 0. Auth Screen
    if (currentTab === 'auth') {
      return (
        <AuthModule
          onSuccess={() => {
            // (4) Setelah berhasil masuk, kembalikan ke halaman Kelola Menu
            setCurrentTab('kelola_menu');
          }}
          onCancel={() => setCurrentTab('menu')}
        />
      );
    }

    // 1. Loading State (Bootcamp Simulator atau awal load Firestore)
    if (simulatedState === 'loading' || (loadingFirebase && menus.length === 0)) {
      return <LoadingState message="Memuat data Dapur Nia langsung dari Firestore..." count={4} />;
    }

    // 2. Error State
    if (simulatedState === 'error' || firebaseError) {
      return (
        <ErrorState
          message={firebaseError || "Gagal menyinkronkan data dengan sistem. Pastikan koneksi internet stabil dan coba kembali."}
          onRetry={() => {
            setFirebaseError(null);
            setSimulatedState('normal');
          }}
        />
      );
    }

    // 3. Empty State Simulation
    if (simulatedState === 'empty') {
      switch (currentTab) {
        case 'menu':
        case 'kelola_menu':
          return (
            <EmptyState
              title="Katalog Menu Kosong"
              description="Belum ada menu katering yang ditambahkan ke sistem."
              actionLabel="Tambah Menu Sekarang"
              onAction={() => setSimulatedState('normal')}
            />
          );
        case 'pelanggan':
          return (
            <EmptyState
              title="Data Pelanggan Kosong"
              description="Belum ada nomor WhatsApp pelanggan yang tersimpan."
              actionLabel="Tambah Pelanggan Sekarang"
              onAction={() => setSimulatedState('normal')}
            />
          );
        case 'pesanan':
          return (
            <EmptyState
              title="Daftar Pesanan Kosong"
              description="Belum ada antrean pesanan katering untuk diproses."
              actionLabel="Buat Pesanan Pertama"
              onAction={() => setSimulatedState('normal')}
            />
          );
        case 'laporan':
          return (
            <EmptyState
              title="Laporan Penjualan Belum Tersedia"
              description="Belum ada data pesanan sah yang dapat dihitung sebagai laporan."
            />
          );
      }
    }

    // 4. Normal State
    switch (currentTab) {
      // Tamu / Publik: Melihat Daftar Menu tanpa masuk (hanya lihat, tidak bisa tambah/edit/hapus)
      case 'menu':
        return (
          <MenuModule
            menus={menus}
            onAddMenu={handleAddMenu}
            onUpdateMenu={handleUpdateMenu}
            onDeleteMenu={handleDeleteMenu}
            canManage={false}
            userRole={userRole}
            userName={userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0]}
            onOrderClick={handleOrderFromCatalog}
          />
        );

      // (1 & 2 & 5) Halaman Kelola Menu: Khusus Pemilik, boleh tambah, ubah, dan hapus menu
      case 'kelola_menu':
        return (
          <MenuModule
            menus={menus}
            onAddMenu={handleAddMenu}
            onUpdateMenu={handleUpdateMenu}
            onDeleteMenu={handleDeleteMenu}
            canManage={true}
            userRole={userRole}
            userName={userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0]}
          />
        );

      // (Matriks Pelanggan) Melihat Pesanan Sendiri
      case 'pesanan_saya':
        return (
          <PesananModule
            pesananList={pesananList}
            menus={menus}
            pelangganList={pelangganList}
            onAddPesanan={handleAddPesanan}
            onUpdateStatusPesanan={handleUpdateStatusPesanan}
            userRole="pelanggan"
            currentUserEmail={currentUser?.email}
            isMyOrdersOnly={true}
          />
        );

      case 'pelanggan':
        return (
          <PelangganModule
            pelangganList={pelangganList}
            onAddPelanggan={handleAddPelanggan}
            onUpdatePelanggan={handleUpdatePelanggan}
            onDeletePelanggan={handleDeletePelanggan}
          />
        );
      case 'pesanan':
        return (
          <PesananModule
            pesananList={pesananList}
            menus={menus}
            pelangganList={pelangganList}
            onAddPesanan={handleAddPesanan}
            onUpdateStatusPesanan={handleUpdateStatusPesanan}
            userRole="pemilik"
            isMyOrdersOnly={false}
          />
        );
      case 'laporan':
        return <LaporanModule pesananList={pesananList} />;
      default:
        return null;
    }
  };

  // (1 & 3) Full-page Standalone Auth View
  if (currentTab === 'auth') {
    return (
      <AuthModule
        onSuccess={(role) => {
          // Arahkan ke tab yang sesuai peran setelah login
          if (role === 'pemilik') {
            setCurrentTab('kelola_menu');
          } else {
            setCurrentTab('pesanan_saya');
          }
        }}
        onCancel={() => setCurrentTab('menu')}
      />
    );
  }

  const myOrdersCount = currentUser?.email
    ? pesananList.filter((p) => p.user_email === currentUser.email || p.pelanggan_id === currentUser.email).length
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-12 sm:pb-8">
      {/* Clean Floating Pill Navigation Bar at the Top (Replaces both old dark header and tabs) */}
      <Navigation
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        counts={{
          menu: menus.length,
          pelanggan: pelangganList.length,
          pesanan: pesananList.length,
          pesananSaya: myOrdersCount,
        }}
        userRole={userRole}
        currentUser={currentUser}
        userProfile={userProfile}
        onLoginClick={() => setCurrentTab('auth')}
        onLogoutClick={handleLogout}
        simulatedState={simulatedState}
        setSimulatedState={setSimulatedState}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-2 sm:py-4">
        {/* Banner indicator if running simulated state */}
        {simulatedState !== 'normal' && (
          <Alert className="mb-4 py-2 px-3 bg-secondary/80 border-border text-foreground flex items-center justify-between text-xs rounded-xl">
            <AlertDescription className="text-xs">
              ℹ️ Sedang menampilkan <strong>{simulatedState.toUpperCase()} STATE</strong> untuk pengujian & penilaian.
            </AlertDescription>
            <Button
              variant="link"
              size="sm"
              onClick={() => setSimulatedState('normal')}
              className="text-xs h-auto p-0 font-bold text-primary ml-2"
            >
              Kembali ke Normal
            </Button>
          </Alert>
        )}

        {renderActiveModule()}
      </main>

      {/* Simple Clean Footer */}
      <footer className="max-w-4xl w-full mx-auto px-4 pt-8 pb-4 text-center">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground border-t border-border/50 pt-4">
          <div>
            App 2 Dapur Nia • Katering Harian & Box
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetData}
            className="text-[11px] gap-1.5 h-6 text-muted-foreground hover:text-foreground"
            title="Kembalikan ke data default PRD di Firestore"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Data Contoh PRD</span>
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default App;
