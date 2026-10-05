export type UserRole = 'tamu' | 'pelanggan' | 'pemilik';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'pelanggan' | 'pemilik';
  no_whatsapp?: string;
  alamat?: string;
}

export interface Menu {
  id: string;
  nama: string; // 1-60 karakter
  harga: number; // bulat, >= 0
  sisa_porsi: number; // bulat, >= 0 (0 = Habis)
  tersedia: boolean; // true = tampil, false = disembunyikan
  dibuat_pada: string;
}

export interface Pelanggan {
  id: string; // sama dengan no_whatsapp atau uid
  nama: string; // 1-60 karakter
  no_whatsapp: string; // diawali 08, 10-13 digit
  alamat: string; // 1-200 karakter
  dibuat_pada: string;
}

export type StatusPesanan = 
  | 'menunggu_bayar' 
  | 'dibayar' 
  | 'diproses' 
  | 'selesai' 
  | 'dibatalkan';

export interface Pesanan {
  id: string;
  pelanggan_id: string; // id pelanggan / uid
  user_email?: string;
  nama_pelanggan: string; // Snapshot saat pesan
  alamat_kirim: string; // Snapshot saat pesan
  menu_id: string;
  nama_menu: string; // Snapshot saat pesan
  harga_satuan: number; // Snapshot harga saat pesan
  jumlah_porsi: number; // Min 1, <= sisa_porsi
  ongkir: number; // Min 0
  total: number; // harga_satuan * jumlah_porsi + ongkir
  status: StatusPesanan;
  bukti_bayar?: string;
  tanggal: string; // Format YYYY-MM-DD
  dibuat_pada: string;
}

export type ViewTab = 
  | 'menu' 
  | 'kelola_menu' 
  | 'pesanan_saya' 
  | 'pelanggan' 
  | 'pesanan' 
  | 'laporan' 
  | 'auth';

export type UiStateSimulation = 'normal' | 'loading' | 'empty' | 'error';
