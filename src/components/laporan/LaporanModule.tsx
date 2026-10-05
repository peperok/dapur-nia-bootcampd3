import React, { useState } from 'react';
import { 
  Calendar, DollarSign, Package, TrendingUp, 
  Filter, Share2, Copy, Check 
} from 'lucide-react';
import type { Pesanan } from '../../types';
import { formatRupiah, formatTanggalIndonesia } from '../../utils/helpers';
import { EmptyState } from '../common/UIStates';
import { Button } from '@/components/ui/button';
import { useToast } from '../common/Toast';

interface LaporanModuleProps {
  pesananList: Pesanan[];
}

export const LaporanModule: React.FC<LaporanModuleProps> = ({ pesananList }) => {
  const { showToast } = useToast();
  const initialDate = pesananList.length > 0 ? pesananList[0].tanggal : '2026-10-01';
  const [selectedTanggal, setSelectedTanggal] = useState<string>(initialDate);
  const [copied, setCopied] = useState(false);

  // Criteria 2: Given ada pesanan berstatus dibatalkan, When laporan dihitung, Then pesanan tersebut tidak ikut dihitung.
  const activeOrdersOnDate = pesananList.filter(
    (p) => p.tanggal === selectedTanggal && p.status !== 'dibatalkan'
  );

  const canceledOrdersOnDate = pesananList.filter(
    (p) => p.tanggal === selectedTanggal && p.status === 'dibatalkan'
  );

  // Hitung total uang masuk (omzet)
  const totalUangMasuk = activeOrdersOnDate.reduce((sum, p) => sum + p.total, 0);

  // Hitung total porsi terjual per menu
  const porsiPerMenuMap: Record<string, { namaMenu: string; totalPorsi: number; subtotal: number }> = {};

  activeOrdersOnDate.forEach((p) => {
    if (!porsiPerMenuMap[p.menu_id]) {
      porsiPerMenuMap[p.menu_id] = {
        namaMenu: p.nama_menu,
        totalPorsi: 0,
        subtotal: 0,
      };
    }
    porsiPerMenuMap[p.menu_id].totalPorsi += p.jumlah_porsi;
    porsiPerMenuMap[p.menu_id].subtotal += (p.harga_satuan * p.jumlah_porsi);
  });

  const porsiPerMenuList = Object.values(porsiPerMenuMap);
  const totalPorsiSemuaMenu = porsiPerMenuList.reduce((sum, item) => sum + item.totalPorsi, 0);

  const uniqueDates = Array.from(new Set(pesananList.map((p) => p.tanggal))).sort().reverse();

  // Fungsi Salin Rekap WhatsApp
  const handleCopySummary = () => {
    const textLines = [
      `*📊 REKAP PENJUALAN HARIAN DAPUR NIA*`,
      `Tanggal: ${formatTanggalIndonesia(selectedTanggal)}`,
      `---------------------------------------`,
      `💰 *Total Omzet:* ${formatRupiah(totalUangMasuk)}`,
      `📦 *Total Porsi Terjual:* ${totalPorsiSemuaMenu} porsi`,
      `🧾 *Jumlah Pesanan Sah:* ${activeOrdersOnDate.length} pesanan`,
      ``,
      `*Rincian Menu:*`,
      ...porsiPerMenuList.map((m) => `• ${m.namaMenu}: ${m.totalPorsi} porsi (${formatRupiah(m.subtotal)})`),
    ];

    if (canceledOrdersOnDate.length > 0) {
      textLines.push(``, `_Catatan: ${canceledOrdersOnDate.length} pesanan dibatalkan (tidak dihitung)_`);
    }

    const summaryText = textLines.join('\n');
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    showToast('Ringkasan laporan berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-heading font-bold text-foreground">Laporan Penjualan Harian</h2>
          <p className="text-[11px] sm:text-xs text-muted-foreground">Ringkasan porsi terjual dan total uang masuk</p>
        </div>

        {/* Date Selector & Copy Button */}
        <div className="flex items-center gap-2">
          {activeOrdersOnDate.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="h-8 gap-1.5 text-xs font-semibold"
              title="Salin rekap siap kirim ke WhatsApp"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-primary" />}
              <span>{copied ? 'Tersalin' : 'Salin Rekap WA'}</span>
            </Button>
          )}

          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2.5 py-1 sm:px-3 sm:py-1.5 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
            <input
              type="date"
              value={selectedTanggal}
              onChange={(e) => setSelectedTanggal(e.target.value)}
              className="text-xs font-semibold text-foreground bg-transparent focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Tanggal quick selector jika ada data */}
      {uniqueDates.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px] sm:text-xs">
          <span className="text-muted-foreground text-[10px] sm:text-[11px] flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3" /> Tanggal cepat:
          </span>
          {uniqueDates.map((dt) => (
            <Button
              key={dt}
              variant={selectedTanggal === dt ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTanggal(dt)}
              className="h-6 px-2 text-xs"
            >
              {dt}
            </Button>
          ))}
        </div>
      )}

      {/* Criteria 3: Given belum ada pesanan pada tanggal tersebut, When laporan dibuka, Then aplikasi menampilkan empty state. */}
      {activeOrdersOnDate.length === 0 ? (
        <EmptyState
          title={`Belum Ada Pesanan Aktif pada ${formatTanggalIndonesia(selectedTanggal)}`}
          description={
            canceledOrdersOnDate.length > 0
              ? `Hanya ada ${canceledOrdersOnDate.length} pesanan berstatus dibatalkan yang tidak dihitung dalam rekap omzet.`
              : 'Belum ada transaksi pemesanan tercatat pada tanggal yang dipilih.'
          }
        />
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <div className="bg-primary text-primary-foreground rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs">
              <div className="flex items-center justify-between opacity-90 text-[11px] sm:text-xs font-medium mb-1">
                <span>Total Uang Masuk</span>
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="text-base sm:text-2xl font-heading font-black tracking-tight">
                {formatRupiah(totalUangMasuk)}
              </div>
              <div className="text-[10px] sm:text-[11px] opacity-80 mt-0.5 sm:mt-1">
                Dari {activeOrdersOnDate.length} pesanan sah
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground text-[11px] sm:text-xs font-medium mb-1">
                <span>Total Porsi Terjual</span>
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              </div>
              <div className="text-base sm:text-2xl font-heading font-black text-foreground tracking-tight">
                {totalPorsiSemuaMenu} <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">porsi</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1">
                Meliputi {porsiPerMenuList.length} jenis menu
              </div>
            </div>
          </div>

          {/* Breakdown per Menu Table */}
          <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs sm:text-sm font-heading font-bold text-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                <span>Rincian Porsi Terjual per Menu</span>
              </h3>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {porsiPerMenuList.length} Menu
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-2 px-2.5">Nama Menu</th>
                    <th className="py-2 px-2.5 text-center">Porsi Terjual</th>
                    <th className="py-2 px-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {porsiPerMenuList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="py-2 px-2.5 font-medium text-foreground">{item.namaMenu}</td>
                      <td className="py-2 px-2.5 text-center font-bold text-primary">
                        {item.totalPorsi} porsi
                      </td>
                      <td className="py-2 px-2.5 text-right font-semibold text-foreground">
                        {formatRupiah(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canceledOrdersOnDate.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-border/60 text-[10px] sm:text-[11px] text-muted-foreground italic">
                * Catatan: {canceledOrdersOnDate.length} pesanan dibatalkan tidak disertakan dalam kalkulasi omzet & porsi.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
