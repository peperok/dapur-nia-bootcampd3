import React, { useState } from 'react';
import { 
  Plus, Calendar, User, MapPin, 
  ArrowRight, CheckCircle2, AlertTriangle, 
  ChevronRight, X, Clock, Phone
} from 'lucide-react';
import type { Pesanan, Menu, Pelanggan, StatusPesanan, UserProfile } from '../../types';
import { 
  formatRupiah, 
  getTodayDateString, 
  statusConfig, 
  getAllowedNextStatuses
} from '../../utils/helpers';
import { EmptyState } from '../common/UIStates';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PesananModuleProps {
  pesananList: Pesanan[];
  menus: Menu[];
  pelangganList: Pelanggan[];
  onAddPesanan: (newPesanan: Omit<Pesanan, 'id' | 'dibuat_pada'>) => { success: boolean; error?: string };
  onUpdateStatusPesanan: (pesananId: string, nextStatus: StatusPesanan, buktiBayar?: string) => { success: boolean; error?: string };
  userRole?: 'tamu' | 'pelanggan' | 'pemilik';
  currentUserEmail?: string | null;
  currentUserProfile?: UserProfile | null;
  initialSelectedMenu?: Menu | null;
  isMyOrdersOnly?: boolean;
}

export const PesananModule: React.FC<PesananModuleProps> = ({
  pesananList,
  menus,
  pelangganList,
  onAddPesanan,
  onUpdateStatusPesanan,
  userRole = 'pemilik',
  currentUserEmail,
  currentUserProfile,
  initialSelectedMenu,
  isMyOrdersOnly = false,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPesananDetail, setSelectedPesananDetail] = useState<Pesanan | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form Buat Pesanan
  const [selectedPelangganId, setSelectedPelangganId] = useState('');
  const [selectedMenuId, setSelectedMenuId] = useState('');
  const [jumlahPorsi, setJumlahPorsi] = useState<number | ''>(1);
  const [ongkir, setOngkir] = useState<number | ''>(5000);
  const [tanggal, setTanggal] = useState<string>(getTodayDateString());
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-open modal jika pelanggan mengklik "Pesan Sekarang" dari katalog menu
  React.useEffect(() => {
    if (initialSelectedMenu) {
      setSelectedMenuId(initialSelectedMenu.id);
      setJumlahPorsi(1);
      setOngkir(5000);
      setTanggal(getTodayDateString());
      setFormError(null);
      setIsAddModalOpen(true);
    }
  }, [initialSelectedMenu]);

  // Status update modal state
  const [actionModalPesanan, setActionModalPesanan] = useState<Pesanan | null>(null);
  const [targetNextStatus, setTargetNextStatus] = useState<StatusPesanan | null>(null);
  const [buktiBayarInput, setBuktiBayarInput] = useState('');

  // Hitung snapshot preview
  const activeMenu = menus.find((m) => m.id === selectedMenuId);
  const activePelanggan = pelangganList.find((p) => p.id === selectedPelangganId);
  
  const currentHargaSatuan = activeMenu ? activeMenu.harga : 0;
  const currentPorsi = typeof jumlahPorsi === 'number' ? jumlahPorsi : 0;
  const currentOngkir = typeof ongkir === 'number' ? ongkir : 0;
  // Invariant 3: total selalu harga_satuan * jumlah_porsi + ongkir
  const calculatedTotal = (currentHargaSatuan * currentPorsi) + currentOngkir;

  const openAddModal = () => {
    const availableMenu = menus.find(m => m.tersedia && m.sisa_porsi > 0);
    setSelectedMenuId(availableMenu ? availableMenu.id : (menus[0]?.id || ''));
    setSelectedPelangganId(pelangganList[0]?.id || '');
    setJumlahPorsi(1);
    setOngkir(5000);
    setTanggal(getTodayDateString());
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleCreatePesanan = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    let buyerId = selectedPelangganId;
    let buyerName = '';
    let buyerAlamat = '';

    if (userRole === 'pelanggan' && currentUserProfile) {
      buyerId = currentUserProfile.uid;
      buyerName = currentUserProfile.displayName || currentUserEmail || 'Pelanggan';
      buyerAlamat = currentUserProfile.alamat || 'Alamat sesuai profil pelanggan';
    } else {
      if (!selectedPelangganId) {
        setFormError('Pilih pelanggan terlebih dahulu.');
        return;
      }
      const pelanggan = pelangganList.find((p) => p.id === selectedPelangganId);
      if (!pelanggan) {
        setFormError('Data pelanggan tidak ditemukan.');
        return;
      }
      buyerId = pelanggan.id;
      buyerName = pelanggan.nama;
      buyerAlamat = pelanggan.alamat;
    }

    if (!selectedMenuId) {
      setFormError('Pilih menu yang dipesan.');
      return;
    }

    const menu = menus.find((m) => m.id === selectedMenuId);
    if (!menu) {
      setFormError('Data menu tidak ditemukan.');
      return;
    }

    // Validasi Waktu Pemesanan (Maksimal jam 12:00 siang)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    if (currentHour > 12 || (currentHour === 12 && currentMinute > 0)) {
      setFormError('Mohon maaf, pemesanan katering untuk hari ini sudah ditutup (Batas waktu maksimal jam 12.00 siang).');
      return;
    }

    const qty = Number(jumlahPorsi);
    const ongkirNum = Number(ongkir);

    // Invariant 2: jumlah_porsi minimal 1 dan tidak melebihi sisa_porsi menu
    if (isNaN(qty) || qty < 1) {
      setFormError('Jumlah porsi minimal 1 (pesanan nol porsi ditolak).');
      return;
    }
    if (qty > menu.sisa_porsi) {
      setFormError(`Sisa porsi tidak mencukupi. Kuota tersedia untuk ${menu.nama} adalah ${menu.sisa_porsi} porsi.`);
      return;
    }

    if (isNaN(ongkirNum) || ongkirNum < 0) {
      setFormError('Ongkos kirim tidak boleh bernilai negatif.');
      return;
    }

    // Invariant 3: total dihitung otomatis dari harga saat pemesanan dan ongkir
    const finalTotal = (menu.harga * qty) + ongkirNum;

    const result = onAddPesanan({
      pelanggan_id: buyerId,
      user_email: currentUserEmail || undefined,
      nama_pelanggan: buyerName, // Salinan snapshot
      alamat_kirim: buyerAlamat, // Salinan snapshot
      menu_id: menu.id,
      nama_menu: menu.nama, // Salinan snapshot
      harga_satuan: menu.harga, // Salinan snapshot
      jumlah_porsi: qty,
      ongkir: ongkirNum,
      total: finalTotal,
      status: 'menunggu_bayar',
      bukti_bayar: '',
      tanggal: tanggal || getTodayDateString(),
    });

    if (!result.success) {
      setFormError(result.error || 'Gagal menyimpan pesanan.');
      return;
    }

    setIsAddModalOpen(false);
  };

  const handleTriggerStatusChange = (pesanan: Pesanan, nextStatus: StatusPesanan) => {
    setActionModalPesanan(pesanan);
    setTargetNextStatus(nextStatus);
    setBuktiBayarInput(pesanan.bukti_bayar || '');
  };

  const confirmStatusChange = () => {
    if (!actionModalPesanan || !targetNextStatus) return;

    const res = onUpdateStatusPesanan(
      actionModalPesanan.id,
      targetNextStatus,
      buktiBayarInput.trim()
    );

    if (res.success) {
      setActionModalPesanan(null);
      setTargetNextStatus(null);
      setBuktiBayarInput('');
      if (selectedPesananDetail?.id === actionModalPesanan.id) {
        setSelectedPesananDetail(null);
      }
    } else {
      alert(res.error || 'Perubahan status ditolak.');
    }
  };

  // Filter list by role (Pelanggan only sees their own orders)
  const baseList = isMyOrdersOnly && currentUserEmail
    ? pesananList.filter((p) => p.user_email === currentUserEmail || p.pelanggan_id === currentUserEmail)
    : pesananList;

  const filteredPesanan = baseList.filter((p) => {
    if (statusFilter === 'all') return true;
    return p.status === statusFilter;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-heading font-bold text-foreground">
            {isMyOrdersOnly ? 'Riwayat Pesanan Saya' : 'Daftar Semua Pesanan'}
          </h2>
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            {isMyOrdersOnly
              ? 'Pantau status pemesanan katering harian Anda secara langsung'
              : 'Kelola alur status pemesanan katering harian dan konfirmasi dapur'}
          </p>
        </div>
        {userRole === 'pelanggan' && (
          <Button
            onClick={openAddModal}
            size="sm"
            className="gap-1.5 rounded-lg text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Pesan Menu Baru</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px] sm:text-xs">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
          className="h-7 text-xs whitespace-nowrap"
        >
          Semua ({baseList.length})
        </Button>
        {(['menunggu_bayar', 'dibayar', 'diproses', 'selesai', 'dibatalkan'] as StatusPesanan[]).map((st) => {
          const count = baseList.filter(p => p.status === st).length;
          const config = statusConfig[st];
          const isSelected = statusFilter === st;
          return (
            <Button
              key={st}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(st)}
              className="h-7 text-xs whitespace-nowrap"
            >
              {config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Pesanan Cards */}
      {filteredPesanan.length === 0 ? (
        <EmptyState
          title="Tidak Ada Pesanan"
          description={
            statusFilter === 'all'
              ? 'Belum ada pesanan katering yang tercatat.'
              : `Tidak ada pesanan dengan status "${statusConfig[statusFilter as StatusPesanan]?.label}".`
          }
          actionLabel={statusFilter === 'all' ? 'Buat Pesanan Baru' : undefined}
          onAction={statusFilter === 'all' ? openAddModal : undefined}
        />
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {filteredPesanan.map((pesanan) => {
            const allowedNext = getAllowedNextStatuses(pesanan.status);
            const currentBadge = statusConfig[pesanan.status];

            return (
              <div
                key={pesanan.id}
                className="bg-card border border-border hover:border-primary/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs transition-all"
              >
                {/* Header card */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="font-mono text-[11px] sm:text-xs font-semibold text-muted-foreground">#{pesanan.id}</span>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {pesanan.tanggal}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <Badge
                    variant={pesanan.status === 'selesai' ? 'default' : pesanan.status === 'dibatalkan' ? 'destructive' : 'secondary'}
                    className="text-[10px] sm:text-[11px] font-bold px-2 py-0 h-4"
                  >
                    {currentBadge.label}
                  </Badge>
                </div>

                {/* Content */}
                <div className="py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                  <div className="space-y-0.5 sm:space-y-1">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-heading font-bold text-foreground">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                      <span>{pesanan.nama_pelanggan}</span>
                      <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">({pesanan.pelanggan_id})</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-foreground/80">
                      Menu: <span className="font-semibold text-foreground">{pesanan.nama_menu}</span> ({pesanan.jumlah_porsi} porsi × {formatRupiah(pesanan.harga_satuan)})
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-muted-foreground/70" />
                      <span className="line-clamp-1">{pesanan.alamat_kirim}</span>
                    </p>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <div className="text-[10px] sm:text-[11px] text-muted-foreground">
                      Ongkir: {formatRupiah(pesanan.ongkir)}
                    </div>
                    <div className="text-sm sm:text-base font-heading font-extrabold text-primary">
                      {formatRupiah(pesanan.total)}
                    </div>
                  </div>
                </div>

                {/* Status Transitions actions (State Machine Guard) */}
                <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    {allowedNext.length > 0 ? (
                      <>
                        <span className="text-muted-foreground text-[10px] sm:text-[11px]">Ubah status:</span>
                        {allowedNext.map((nextSt) => (
                          <Button
                            key={nextSt}
                            variant={nextSt === 'dibatalkan' ? 'destructive' : 'default'}
                            size="sm"
                            onClick={() => handleTriggerStatusChange(pesanan, nextSt)}
                            className="h-6 px-2 text-[11px] gap-1 rounded-md"
                          >
                            <span>Ke {statusConfig[nextSt].label}</span>
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        ))}
                      </>
                    ) : (
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground italic">
                        {pesanan.status === 'selesai' ? '✓ Pesanan telah selesai' : '✕ Pesanan telah dibatalkan'}
                      </span>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPesananDetail(pesanan)}
                    className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                  >
                    <span>Rincian</span>
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Buat Pesanan Baru (Responsive Bottom-sheet di Mobile & Centered Dialog di Desktop) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border-t sm:border border-border max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150">
            {/* Mobile swipe grabber indicator */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

            <div className="flex items-start justify-between pb-2 border-b border-border/60 mb-3">
              <div>
                <h3 className="text-base sm:text-lg font-heading font-bold text-foreground">
                  {userRole === 'pelanggan' ? 'Konfirmasi Pesanan Katering' : 'Buat Pesanan Katering Baru'}
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  {userRole === 'pelanggan' ? 'Periksa porsi & alamat sebelum mengirim pesanan ke dapur.' : 'Satu pesanan mencakup 1 menu dengan informasi snapshot otomatis.'}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Jadwal Order: Maksimal pukul <strong>12.00 siang</strong>.</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAddModalOpen(false)}
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

            <form onSubmit={handleCreatePesanan} className="space-y-3">
              {/* Informasi Pelanggan Pemesan */}
              {userRole === 'pelanggan' ? (
                <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pemesan:</span>
                    </span>
                    <span className="font-extrabold text-slate-900">
                      {currentUserProfile?.displayName || currentUserEmail?.split('@')[0] || 'Pelanggan'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-600 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{currentUserProfile?.alamat || 'Alamat sesuai data pendaftaran akun Anda'}</span>
                  </div>
                </div>
              ) : (
                /* Khusus Pemilik: Pilihan Pelanggan untuk input pesanan offline */
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Pilih Pelanggan <span className="text-destructive">*</span>
                  </label>
                  {pelangganList.length === 0 ? (
                    <p className="text-xs text-destructive">Belum ada pelanggan terdaftar.</p>
                  ) : (
                    <select
                      value={selectedPelangganId}
                      onChange={(e) => setSelectedPelangganId(e.target.value)}
                      className="w-full px-3 py-1.5 sm:py-2 border border-input rounded-xl text-xs sm:text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    >
                      {pelangganList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama} ({p.no_whatsapp}) - {p.alamat.substring(0, 30)}...
                        </option>
                      ))}
                    </select>
                  )}
                  {activePelanggan && (
                    <div className="mt-1.5 p-2 bg-muted/60 rounded-lg text-[11px] text-muted-foreground">
                      <strong className="text-foreground">Alamat Kirim:</strong> {activePelanggan.alamat}
                    </div>
                  )}
                </div>
              )}

              {/* Pilih Menu */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Pilih Menu <span className="text-destructive">*</span>
                </label>
                {menus.length === 0 ? (
                  <p className="text-xs text-destructive">Belum ada menu tersedia.</p>
                ) : (
                  <select
                    value={selectedMenuId}
                    onChange={(e) => setSelectedMenuId(e.target.value)}
                    className="w-full px-3 py-1.5 sm:py-2 border border-input rounded-xl text-xs sm:text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  >
                    {menus.map((m) => (
                      <option key={m.id} value={m.id} disabled={!m.tersedia || m.sisa_porsi <= 0}>
                        {m.nama} - {formatRupiah(m.harga)} (Sisa: {m.sisa_porsi} porsi) {!m.tersedia ? '[Nonaktif]' : ''} {m.sisa_porsi <= 0 ? '[Habis]' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Jumlah Porsi & Ongkir */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Jumlah Porsi <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    value={jumlahPorsi}
                    onChange={(e) => setJumlahPorsi(e.target.value === '' ? '' : Number(e.target.value))}
                    min="1"
                    max={activeMenu ? activeMenu.sisa_porsi : 99}
                    className="text-xs sm:text-sm"
                    required
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Max: {activeMenu ? activeMenu.sisa_porsi : 0} porsi
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Ongkos Kirim (Rp)
                  </label>
                  <Input
                    type="number"
                    value={ongkir}
                    onChange={(e) => setOngkir(e.target.value === '' ? '' : Number(e.target.value))}
                    min="0"
                    step="1000"
                    className="text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              {/* Tanggal Pesanan */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Tanggal Pengiriman (YYYY-MM-DD) <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="text-xs sm:text-sm"
                  required
                />
              </div>

              {/* Kalkulasi Total Terkunci (Invariant 3) */}
              <div className="bg-muted/60 border border-border rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal ({currentPorsi} porsi × {formatRupiah(currentHargaSatuan)}):</span>
                  <span className="font-semibold text-foreground">{formatRupiah(currentHargaSatuan * currentPorsi)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Ongkos Kirim:</span>
                  <span className="font-semibold text-foreground">{formatRupiah(currentOngkir)}</span>
                </div>
                <div className="pt-2 border-t border-border/80 flex justify-between items-center text-sm font-heading font-extrabold text-foreground">
                  <span>Total Tagihan:</span>
                  <span className="text-base text-primary font-bold">{formatRupiah(calculatedTotal)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!activeMenu || activeMenu.sisa_porsi <= 0}
                  className="text-xs gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan Pesanan</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Transisi Status Pesanan */}
      {actionModalPesanan && targetNextStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-100">
            <h3 className="text-sm sm:text-base font-heading font-bold text-foreground mb-1">Konfirmasi Perubahan Status</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Ubah status pesanan <strong>#{actionModalPesanan.id}</strong> dari{' '}
              <span className="font-semibold text-foreground">{statusConfig[actionModalPesanan.status].label}</span> ke{' '}
              <span className="font-bold text-primary">{statusConfig[targetNextStatus].label}</span>.
            </p>

            {targetNextStatus === 'dibayar' && (
              <div className="mb-3">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Catatan Bukti Pembayaran (Opsional)
                </label>
                <Input
                  type="text"
                  value={buktiBayarInput}
                  onChange={(e) => setBuktiBayarInput(e.target.value)}
                  placeholder="Contoh: Transfer BCA an. Siti Aminah / QRIS"
                  className="text-xs"
                />
              </div>
            )}

            {targetNextStatus === 'dibatalkan' && (
              <Alert variant="destructive" className="mb-3 py-2 px-3 text-xs bg-destructive/10 text-destructive border-destructive/20">
                <AlertDescription className="text-xs">
                  Pesanan yang dibatalkan akan mengembalikan kuota porsi menu dan tidak akan dihitung pada laporan harian.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setActionModalPesanan(null);
                  setTargetNextStatus(null);
                }}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={confirmStatusChange}
                className="text-xs font-bold"
              >
                Terapkan Status
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Pesanan */}
      {selectedPesananDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-start justify-between pb-2 border-b border-border/60">
              <div>
                <h3 className="text-base font-heading font-bold text-foreground">Rincian Dokumen Pesanan</h3>
                <p className="text-xs font-mono text-muted-foreground">ID: {selectedPesananDetail.id}</p>
              </div>
              <Badge
                variant={selectedPesananDetail.status === 'selesai' ? 'default' : selectedPesananDetail.status === 'dibatalkan' ? 'destructive' : 'secondary'}
                className="text-[10px] font-bold"
              >
                {statusConfig[selectedPesananDetail.status].label}
              </Badge>
            </div>

            <div className="py-3 space-y-2.5 text-xs">
              <div className="bg-muted/60 p-2.5 rounded-xl space-y-1">
                <div className="font-semibold text-foreground">Pelanggan:</div>
                <div className="text-foreground">{selectedPesananDetail.nama_pelanggan} ({selectedPesananDetail.pelanggan_id})</div>
                <div className="text-muted-foreground pt-1 border-t border-border/50">{selectedPesananDetail.alamat_kirim}</div>
              </div>

              <div className="bg-muted/60 p-2.5 rounded-xl space-y-1">
                <div className="font-semibold text-foreground">Item Pesanan:</div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{selectedPesananDetail.nama_menu} ({selectedPesananDetail.jumlah_porsi} porsi)</span>
                  <span className="font-semibold text-foreground">{formatRupiah(selectedPesananDetail.harga_satuan * selectedPesananDetail.jumlah_porsi)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Ongkir:</span>
                  <span>{formatRupiah(selectedPesananDetail.ongkir)}</span>
                </div>
                <div className="flex justify-between font-heading font-bold text-primary text-sm pt-1 border-t border-border/80">
                  <span>Total:</span>
                  <span>{formatRupiah(selectedPesananDetail.total)}</span>
                </div>
              </div>

              {selectedPesananDetail.bukti_bayar && (
                <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-foreground">
                  <div className="font-semibold mb-0.5 text-primary">Bukti Bayar / Catatan:</div>
                  <div>{selectedPesananDetail.bukti_bayar}</div>
                </div>
              )}

              <div className="text-[10px] text-muted-foreground">
                Tanggal Pesanan: {selectedPesananDetail.tanggal}
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => setSelectedPesananDetail(null)}
                className="text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
