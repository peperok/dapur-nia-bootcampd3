import React from 'react';
import { UtensilsCrossed, Users, ShoppingBag, BarChart3, Settings, ClipboardList, Sliders } from 'lucide-react';
import type { ViewTab, UserRole, UserProfile, UiStateSimulation } from '../../types';
import type { User as FirebaseUser } from 'firebase/auth';
import { Badge } from '@/components/ui/badge';

interface NavigationProps {
  currentTab: ViewTab;
  setCurrentTab: (tab: ViewTab) => void;
  counts: {
    menu: number;
    pelanggan: number;
    pesanan: number;
    pesananSaya?: number;
  };
  userRole: UserRole;
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  setCurrentTab,
  counts,
  userRole,
  currentUser,
  userProfile,
  onLoginClick,
  onLogoutClick,
}) => {
  const userName = userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Tamu';

  // Susun tab navigasi sesuai peran pengguna:
  // - Tamu: Daftar Menu, Pesan (diarahkan login)
  // - Pelanggan: Daftar Menu, Pesanan Saya (pesanan miliknya)
  // - Pemilik: Daftar Menu, Kelola Menu, Antrean Pesanan, Pelanggan, Laporan
  const tabs = [
    { 
      id: 'menu' as ViewTab, 
      label: 'Daftar Menu', 
      icon: UtensilsCrossed, 
      count: counts.menu,
      show: true 
    },
    { 
      id: 'pesanan_saya' as ViewTab, 
      label: 'Pesanan Saya', 
      icon: ClipboardList, 
      count: counts.pesananSaya,
      show: userRole === 'pelanggan' 
    },
    { 
      id: 'kelola_menu' as ViewTab, 
      label: 'Kelola Menu', 
      icon: Settings,
      show: userRole === 'pemilik' || userRole === 'tamu' // Tamu tetap bisa klik untuk diarahkan login
    },
    { 
      id: 'pesanan' as ViewTab, 
      label: 'Semua Pesanan', 
      icon: ShoppingBag, 
      count: counts.pesanan,
      show: userRole === 'pemilik' 
    },
    { 
      id: 'pelanggan' as ViewTab, 
      label: 'Pelanggan', 
      icon: Users, 
      count: counts.pelanggan,
      show: userRole === 'pemilik' 
    },
    { 
      id: 'laporan' as ViewTab, 
      label: 'Laporan', 
      icon: BarChart3,
      show: userRole === 'pemilik' 
    },
  ].filter(t => t.show);

  return (
    <div className="sticky top-3 z-40 max-w-4xl w-full mx-auto px-3 sm:px-4 mb-4">
      <nav className="bg-white/95 backdrop-blur-md text-slate-900 border border-slate-200/90 rounded-full px-3 sm:px-4 py-2 shadow-lg shadow-slate-900/5 flex items-center justify-between gap-2 transition-all">
        {/* Brand Fork & Knife Logo */}
        <div 
          onClick={() => setCurrentTab('menu')}
          className="flex items-center gap-2 pl-1 cursor-pointer shrink-0 group"
          title="Dapur Nia - Beranda"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 shadow-sm flex items-center justify-center ring-2 ring-amber-100 group-hover:scale-105 transition-transform text-white">
            <UtensilsCrossed className="w-4 h-4 text-white" />
          </div>
          <div className="hidden lg:flex flex-col text-left leading-tight">
            <span className="text-xs font-black text-slate-900 tracking-tight font-heading">
              Dapur Nia
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Katering
            </span>
          </div>
        </div>

        {/* Clean Center Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  isActive
                    ? 'text-slate-950 font-bold bg-slate-100 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0 h-4 min-w-[16px] rounded-full inline-flex items-center justify-center font-bold ${
                      isActive 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right CTA / Action Button (Capsule Style) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* User Status / Action Button */}
          {currentUser ? (
            <div className="flex items-center gap-1.5">
              <span className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                userRole === 'pemilik' 
                  ? 'bg-amber-100 text-amber-900 border border-amber-300/60' 
                  : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}>
                {userRole === 'pemilik' ? '👑 Pemilik' : '🛍️ Pelanggan'}
              </span>
              <button
                onClick={onLogoutClick}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 sm:px-4 py-1.5 rounded-full shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Keluar
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 sm:px-4 py-1.5 rounded-full shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Masuk
            </button>
          )}
        </div>
      </nav>
    </div>
  );
};
