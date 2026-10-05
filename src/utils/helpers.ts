import type { StatusPesanan } from '../types';

export const formatRupiah = (angka: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(angka);
};

export const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatTanggalIndonesia = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${parseInt(day, 10)} ${bulan[parseInt(month, 10) - 1]} ${year}`;
};

export const statusConfig: Record<StatusPesanan, { label: string; bg: string; text: string; border: string }> = {
  menunggu_bayar: {
    label: 'Menunggu Bayar',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  dibayar: {
    label: 'Dibayar',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  diproses: {
    label: 'Diproses',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  },
  selesai: {
    label: 'Selesai',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  dibatalkan: {
    label: 'Dibatalkan',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
};

// Sesuai aturan State Machine PRD:
// menunggu_bayar -> dibayar | dibatalkan
// dibayar -> diproses | dibatalkan
// diproses -> selesai
// selesai -> tidak ada
// dibatalkan -> tidak ada
export const getAllowedNextStatuses = (current: StatusPesanan): StatusPesanan[] => {
  switch (current) {
    case 'menunggu_bayar':
      return ['dibayar', 'dibatalkan'];
    case 'dibayar':
      return ['diproses', 'dibatalkan'];
    case 'diproses':
      return ['selesai'];
    case 'selesai':
    case 'dibatalkan':
    default:
      return [];
  }
};
