import React, { useState } from 'react';
import { 
  Plus, Edit2, Trash2, CheckCircle2, 
  AlertTriangle, Eye, EyeOff, X 
} from 'lucide-react';
import type { Menu } from '../../types';
import { formatRupiah } from '../../utils/helpers';
import { EmptyState } from '../common/UIStates';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MenuModuleProps {
  menus: Menu[];
  onAddMenu: (menu: Omit<Menu, 'id' | 'dibuat_pada'>) => void;
  onUpdateMenu: (id: string, updates: Partial<Menu>) => void;
  onDeleteMenu: (id: string) => void;
  canManage?: boolean;
  onNavigateToManage?: () => void;
  userRole?: 'tamu' | 'pelanggan' | 'pemilik';
  userName?: string;
  onOrderClick?: (menu: Menu) => void;
}

export const MenuModule: React.FC<MenuModuleProps> = ({
  menus,
  onAddMenu,
  onUpdateMenu,
  onDeleteMenu,
  canManage = true,
  userRole = 'tamu',
  userName,
  onOrderClick,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);

  // Form states
  const [nama, setNama] = useState('');
  const [harga, setHarga] = useState<number | ''>('');
  const [sisaPorsi, setSisaPorsi] = useState<number | ''>('');
  const [tersedia, setTersedia] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingMenu(null);
    setNama('');
    setHarga('');
    setSisaPorsi('');
    setTersedia(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (menu: Menu) => {
    setEditingMenu(menu);
    setNama(menu.nama);
    setHarga(menu.harga);
    setSisaPorsi(menu.sisa_porsi);
    setTersedia(menu.tersedia);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMenu(null);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // PRD 4.1 Acceptance Criteria 1
    if (!nama.trim()) {
      setFormError('Nama menu tidak boleh kosong.');
      return;
    }
    if (nama.trim().length > 60) {
      setFormError('Nama menu maksimal 60 karakter.');
      return;
    }

    const numHarga = Number(harga);
    const numSisa = Number(sisaPorsi);

    // PRD 4.1 Criteria 3 & Invariant 1: harga dan sisa porsi tidak boleh negatif
    if (harga === '' || isNaN(numHarga) || numHarga < 0) {
      setFormError('Permintaan ditolak: Harga menu tidak boleh bernilai negatif atau kosong (Invariant 1).');
      return;
    }
    if (sisaPorsi === '' || isNaN(numSisa) || numSisa < 0) {
      setFormError('Permintaan ditolak: Sisa porsi tidak boleh bernilai negatif atau kosong (Invariant 1).');
      return;
    }

    if (editingMenu) {
      onUpdateMenu(editingMenu.id, {
        nama: nama.trim(),
        harga: numHarga,
        sisa_porsi: numSisa,
        tersedia,
      });
    } else {
      onAddMenu({
        nama: nama.trim(),
        harga: numHarga,
        sisa_porsi: numSisa,
        tersedia,
      });
    }

    closeModal();
  };

  return (
    <div className="space-y-4">
      {/* Greeting Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-slate-50 border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black font-heading text-slate-900 tracking-tight">
              Hi, {userName || (userRole === 'pemilik' ? 'Ibu Nia' : userRole === 'pelanggan' ? 'Pelanggan' : 'Tamu')}! 👋
            </span>
            {userRole === 'pemilik' ? (
              <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] px-2 py-0.5">
                👑 Pemilik Dapur
              </Badge>
            ) : userRole === 'pelanggan' ? (
              <Badge className="bg-orange-500 text-white font-bold text-[10px] px-2 py-0.5">
                🛍️ Pelanggan
              </Badge>
            ) : (
              <Badge variant="outline" className="border-slate-300 text-slate-600 font-semibold text-[10px] px-2 py-0.5">
                👀 Tamu
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {canManage
              ? 'Kelola daftar katering, harga porsi, dan kapasitas stok dapur hari ini.'
              : 'Mau makan apa hari ini? Pilih menu katering lezat favoritmu di bawah ini!'}
          </p>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-base sm:text-lg font-heading font-bold text-foreground">
            {canManage ? 'Kelola Katalog Menu' : 'Daftar Menu Harian'}
          </h2>
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            {canManage
              ? 'Kelola menu katering, harga porsi, dan kapasitas stok dapur'
              : 'Daftar menu katering lezat siap pesan hari ini'}
          </p>
        </div>
        {canManage && (
          <Button
            onClick={openAddModal}
            size="sm"
            className="gap-1.5 rounded-full text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Menu</span>
          </Button>
        )}
      </div>

      {/* Menu List */}
      {menus.length === 0 ? (
        <EmptyState
          title="Belum Ada Menu"
          description="Daftar menu harian masih kosong."
          actionLabel={canManage ? 'Tambah Menu Baru' : undefined}
          onAction={canManage ? openAddModal : undefined}
        />
      ) : (
        <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
          {menus.map((item) => {
            // Acceptance Criteria 2: Given sisa porsi bernilai nol, When daftar menu dibuka, Then menu tetap tampil dengan status habis
            const isHabis = item.sisa_porsi <= 0;

            return (
              <div
                key={item.id}
                className={`bg-card border rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs transition-all relative flex flex-col justify-between ${
                  !item.tersedia
                    ? 'border-border bg-muted/40 opacity-80'
                    : isHabis
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-heading font-bold text-foreground text-sm sm:text-base leading-snug">{item.nama}</h3>

                        {/* Status Badges */}
                        {isHabis ? (
                          <Badge variant="destructive" className="text-[10px] sm:text-[11px] font-bold px-1.5 py-0 h-4">
                            Habis
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] sm:text-[11px] font-semibold text-primary px-1.5 py-0 h-4 bg-primary/10 border-primary/20">
                            Sisa {item.sisa_porsi} porsi
                          </Badge>
                        )}

                        {!item.tersedia && (
                          <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 h-4 text-muted-foreground gap-1">
                            <EyeOff className="w-2.5 h-2.5" /> Disembunyikan
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm sm:text-base font-extrabold text-primary mt-1 font-heading">
                        {formatRupiah(item.harga)}
                      </p>
                    </div>

                    {/* Actions (Only for logged in users) */}
                    {canManage && (
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(item)}
                          className="h-7 w-7 text-muted-foreground hover:text-primary rounded-md"
                          title="Ubah Menu"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Yakin ingin menghapus menu "${item.nama}"?`)) {
                              onDeleteMenu(item.id);
                            }
                          }}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-md"
                          title="Hapus Menu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions based on Matrix:
                    - Tamu: Tombol Pesan mengarahkan ke Login
                    - Pelanggan: Tombol Pesan Sekarang
                    - Pemilik: Toggle visibilitas & ID
                */}
                {canManage ? (
                  <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>ID: <code className="font-mono text-foreground text-[10px]">{item.id}</code></span>
                    <button
                      onClick={() => onUpdateMenu(item.id, { tersedia: !item.tersedia })}
                      className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {item.tersedia ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{item.tersedia ? 'Tampil di Menu' : 'Sembunyikan'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {isHabis ? 'Stok kosong hari ini' : `Tersedia ${item.sisa_porsi} porsi`}
                    </span>
                    <Button
                      size="sm"
                      disabled={isHabis || !item.tersedia}
                      onClick={() => onOrderClick && onOrderClick(item)}
                      className="h-7 px-3 text-xs font-bold rounded-lg gap-1"
                    >
                      <span>Pesan Sekarang</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form Tambah / Ubah Menu */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-start justify-between pb-2 border-b border-border/60 mb-3">
              <div>
                <h3 className="text-base sm:text-lg font-heading font-bold text-foreground">
                  {editingMenu ? 'Ubah Data Menu' : 'Tambah Menu Baru'}
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Isi informasi menu sesuai kapasitas dapur hari ini.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeModal}
                className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            {formError && (
              <Alert variant="destructive" className="mb-3 py-2 px-3 text-xs bg-destructive/10 text-destructive border-destructive/20">
                <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" />
                <AlertDescription className="text-xs">{formError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-foreground">
                    Nama Menu <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">{nama.length}/60</span>
                </div>
                <Input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Nasi Ayam Geprek Sambal Matah"
                  maxLength={60}
                  className="text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Harga Satuan (Rp) <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    value={harga}
                    onChange={(e) => setHarga(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="25000"
                    min="0"
                    step="500"
                    className="text-xs sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Sisa Porsi <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    value={sisaPorsi}
                    onChange={(e) => setSisaPorsi(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="20"
                    min="0"
                    step="1"
                    className="text-xs sm:text-sm"
                    required
                  />
                  <span className="text-[10px] text-muted-foreground">0 = Otomatis status habis</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="tersedia"
                  checked={tersedia}
                  onChange={(e) => setTersedia(e.target.checked)}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
                />
                <label htmlFor="tersedia" className="text-xs font-medium text-foreground cursor-pointer">
                  Tampilkan menu pada daftar pesanan pelanggan
                </label>
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeModal}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{editingMenu ? 'Perbarui Menu' : 'Simpan Menu'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
