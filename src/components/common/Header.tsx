import React from 'react';
import { ChefHat, Sliders, LogIn, LogOut, Sparkles, User, ShoppingBag, Crown } from 'lucide-react';
import type { UiStateSimulation, UserProfile } from '../../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  simulatedState: UiStateSimulation;
  setSimulatedState: (state: UiStateSimulation) => void;
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  simulatedState,
  setSimulatedState,
  currentUser,
  userProfile,
  onLoginClick,
  onLogoutClick,
}) => {
  const userName = userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Tamu';
  const role = userProfile?.role || 'tamu';

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-900 via-zinc-900 to-amber-950 text-white shadow-md border-b border-amber-950/40">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 backdrop-blur-md border border-amber-400/30 text-white flex items-center justify-center shadow-inner shrink-0 ring-2 ring-amber-400/10">
            <ChefHat className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-heading font-black tracking-tight text-white leading-tight drop-shadow-xs">
                Dapur Nia
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-xs">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Katering</span>
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-zinc-300 font-medium hidden xs:block">
              Pemesanan Katering Harian & Box
            </p>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {currentUser ? (
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl py-1 px-2 text-white shadow-xs">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                role === 'pemilik' ? 'bg-amber-400 text-slate-950' : 'bg-orange-400 text-slate-950'
              }`}>
                {role === 'pemilik' ? <Crown className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left hidden xs:block">
                <div className="text-[11px] font-bold leading-tight max-w-[90px] truncate">{userName}</div>
                <div className="text-[9px] text-amber-200/90 leading-none">
                  {role === 'pemilik' ? '👑 Pemilik' : '🛍️ Pelanggan'}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogoutClick}
                className="h-6 px-1.5 text-[11px] text-white/80 hover:text-white hover:bg-white/20 gap-1 ml-0.5"
                title="Keluar dari sesi"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={onLoginClick}
              className="h-7 sm:h-8 text-xs font-bold gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 border-0 shadow-sm transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login / Masuk</span>
            </Button>
          )}

          {/* State Simulator Switcher for Assessment / Testing */}
          <div className="flex items-center gap-1 bg-black/25 backdrop-blur-md py-1 px-1.5 rounded-xl border border-white/15 text-[11px] sm:text-xs text-white">
            <Sliders className="w-3 h-3 text-amber-300 ml-0.5 shrink-0" />
            <select
              value={simulatedState}
              onChange={(e) => setSimulatedState(e.target.value as UiStateSimulation)}
              className="bg-transparent font-semibold text-white text-[11px] sm:text-xs py-0.5 px-0.5 focus:outline-none cursor-pointer [&>option]:text-zinc-900 [&>option]:bg-white"
              title="Simulasi 3 State untuk Penilaian Bootcamp"
            >
              <option value="normal">Normal</option>
              <option value="loading">Loading State</option>
              <option value="empty">Empty State</option>
              <option value="error">Error State</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
