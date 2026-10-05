# 📋 PLANS & SPECS: App 2 Dapur Nia (Sesi 3 Bootcamp)

Dokumen ini adalah salinan panduan spesifikasi dan pelacakan pengerjaan bertahap (*step-by-step*) untuk implementasi **App 2 Dapur Nia**. Anda dapat membuka dan memantau dokumen ini langsung di editor Anda.

---

## 🏗️ 1. Identitas & Tech Stack Terpilih

| Parameter | Spesifikasi |
| :--- | :--- |
| **Aplikasi** | App 2 Dapur Nia (Pemesanan & Katering Harian) |
| **Sesi Bootcamp** | Sesi 3 (Praktik 1: UI CRUD & 3 State; Praktik 2: Cloud Firestore & Netlify) |
| **Framework** | Vite + React (TypeScript) |
| **Styling** | Tailwind CSS + shadcn/ui (`preset: b2LCUM3Q4O`) |
| **Responsivitas** | Mobile-First (Optimal untuk layar HP pengelola dapur & Desktop) |
| **Cloud Database** | Cloud Firestore (disiapkan untuk Praktik 2 via Service Layer) |

---

## 🎯 2. Tiga Invariant Utama (Aturan Wajib)

Ketiga aturan ini wajib divalidasi oleh antarmuka formulir:
1. **Invariant 1 (Menu):** `harga >= 0` dan `sisa_porsi >= 0`. (Jika `sisa_porsi === 0`, status visual otomatis **Habis**).
2. **Invariant 2 (Pesanan):** `jumlah_porsi >= 1` dan `jumlah_porsi <= sisa_porsi` dari menu terpilih.
3. **Invariant 3 (Kalkulasi Total):** $\text{Total} = (\text{harga\_satuan} \times \text{jumlah\_porsi}) + \text{ongkir}$ (terkunci otomatis, tidak boleh diedit manual).

---

## 🔄 3. State Machine Status Pesanan

Status pesanan tidak boleh melompat atau mundur:
```
[menunggu_bayar] ──► [dibayar] ──► [diproses] ──► [selesai] (Terminal)
       │                 │
       ▼                 ▼
  [dibatalkan]      [dibatalkan] (Terminal - Kuota porsi dikembalikan)
```

---

## 🚦 4. Rencana Pengerjaan Bertahap (Progress Tracking)

### [x] BAGIAN 1: Fondasi UI, Sinkronisasi shadcn & Dev Server (Selesai)
- [x] Sinkronisasi warna tema Dapur Nia di `tailwind.config.js` dengan CSS variable shadcn/ui.
- [x] Buat layout dasar:
  - Header dengan logo Dapur Nia, badge "Sesi 3", dan selector **Mode State Bootcamp**.
  - Navigasi responsif (Bottom Bar di layar HP, Top Tabs di layar desktop).
- [x] Uji kompilasi build & jalankan dev server (`npm run dev`).
- [x] **Checkpoint Review:** Dev server aktif di `http://localhost:5173/` (HTTP 200 OK).

---

### [x] BAGIAN 2: Modul Menu (Katalog & Kuota Porsi) (Selesai)
*Acuan: PRD Bab 4.1 & Skema Firestore Bagian 3*
- [x] Tampilkan daftar menu dalam bentuk kartu modern (nama, harga format Rupiah, sisa porsi).
- [x] Tampilkan badge status stok:
  - Hijau: "Sisa X porsi"
  - Merah: **"Habis"** jika `sisa_porsi === 0` (Acceptance Criteria 2).
  - Badge abu-abu jika `tersedia === false` (disembunyikan).
- [x] Formulir Tambah & Ubah Menu menggunakan modal **Dialog / Sheet**:
  - Validasi Invariant 1: Tolak jika `harga < 0` atau `sisa_porsi < 0`.
  - Validasi panjang nama menu (1–60 karakter) & counter karakter.
- [x] Tombol tindakan dengan label jelas: `Simpan Menu`, `Perbarui Menu`, `Hapus Menu`.
- [x] **Checkpoint Review:** Validasi input negatif ditolak, porsi 0 berstatus Habis, toggle visibilitas aktif.

---

### [ ] BAGIAN 3: Modul Pelanggan (Buku Kontak & Alamat)
*Acuan: PRD Bab 4.2 & Skema Firestore Bagian 4*
- [ ] Tampilkan daftar kontak pelanggan (Nama, Nomor WhatsApp, Alamat Pengiriman).
- [ ] Formulir Tambah & Ubah Pelanggan:
  - Validasi nomor WhatsApp: Wajib diawali `08`, panjang 10–13 angka (disimpan sebagai string).
  - Validasi duplikasi: Menolak jika nomor WhatsApp sudah terdaftar sebagai ID dokumen.
  - Validasi wajib isi untuk nama dan alamat (maksimal 200 karakter).
- [ ] Aksi ubah alamat/nama dan hapus pelanggan dengan konfirmasi.
- [ ] **Checkpoint Review:** Coba daftarkan nomor yang sudah ada (harus ditolak), coba nomor tanpa diawali 08 (harus ditolak).

---

### [ ] BAGIAN 4: Modul Pesanan (Transaksi & State Machine)
*Acuan: PRD Bab 4.3 & Skema Firestore Bagian 5*
- [ ] Tampilkan daftar pesanan dengan filter status: `Semua`, `Menunggu Bayar`, `Dibayar`, `Diproses`, `Selesai`, `Dibatalkan`.
- [ ] Formulir Buat Pesanan Baru:
  - Dropdown pemilih Pelanggan $\rightarrow$ otomatis memuat alamat pengiriman.
  - Tombol **"Tambah Pelanggan Cepat"** di samping pemilih pelanggan.
  - Dropdown pemilih Menu $\rightarrow$ otomatis mengunci harga satuan & menampilkan batas stok.
  - Input jumlah porsi (Invariant 2: min 1, maks sisa porsi).
  - Input ongkos kirim (min 0).
  - Live preview kalkulasi Invariant 3: Total tagihan otomatis terkunci.
  - Pengurangan otomatis `sisa_porsi` menu saat pesanan berhasil disimpan.
- [ ] Logika State Machine Status Pesanan:
  - Tombol aksi transisi hanya menampilkan pilihan yang sah (tidak bisa melompat).
  - Pop-up input catatan/bukti bayar saat status diubah ke `dibayar`.
  - Pembatalan pesanan (`dibatalkan`) otomatis mengembalikan kuota porsi ke menu bersangkutan.
- [ ] **Checkpoint Review:** Coba pesan porsi melebihi stok (harus ditolak), coba ubah status sesuai alur.

---

### [ ] BAGIAN 5: Modul Laporan Harian (Rekap Penjualan Dinamis)
*Acuan: PRD Bab 4.4*
- [ ] Pemilih tanggal laporan (`YYYY-MM-DD`).
- [ ] Kartu ringkasan metrik:
  - **Total Uang Masuk (Omzet):** Penjumlahan total tagihan pesanan aktif pada tanggal tersebut.
  - **Total Porsi Terjual:** Penjumlahan porsi seluruh menu aktif.
- [ ] Tabel rincian per menu (Nama Menu, Porsi Terjual, Subtotal).
- [ ] **Aturan Khusus:** Pesanan berstatus `dibatalkan` otomatis dikeluarkan dari perhitungan.
- [ ] Tampilan **Empty State** bila belum ada pesanan aktif pada tanggal yang dipilih.
- [ ] **Checkpoint Review:** Bandingkan laporan dengan pesanan aktif vs pesanan dibatalkan.

---

### [ ] BAGIAN 6: Tiga State & Simulator Penilaian Bootcamp
*Acuan: Praktik 1 Sesi 3*
- [ ] **Loading State:** Skeleton loader dari shadcn/ui saat data sedang dimuat.
- [ ] **Empty State:** Desain kartu kosong dengan ilustrasi dan tombol aksi tambah data.
- [ ] **Error State:** Banner peringatan ramah tanpa pesan teknis membingungkan + tombol coba lagi.
- [ ] **Dropdown Mode Simulator di Header:**
  - Pilihan: `Normal Mode`, `Loading State Demo`, `Empty State Demo`, `Error State Demo`.
  - Memudahkan penilai bootcamp memeriksa ketiga state dalam 1 detik.
- [ ] Tombol **Reset Data Contoh PRD** di footer untuk mereset data ke kondisi awal.

---

## 🧪 5. Matriks 6 Skenario Uji Tembus (Negative Testing)

| No | Pengujian | Input Uji | Respon yang Diharapkan |
| :---: | :--- | :--- | :--- |
| 1 | **Field Kosong** | Nama menu/alamat/pelanggan kosong | Form ditolak, muncul peringatan merah dekat field |
| 2 | **Tipe Salah** | Memasukkan huruf di harga atau porsi | Input terkunci hanya menerima angka bulat |
| 3 | **Teks Terlalu Panjang** | Nama menu > 60 char, alamat > 200 char | Input dibatasi secara otomatis oleh atribut `maxLength` |
| 4 | **Nilai Negatif** | Harga minus atau porsi minus | Ditolak oleh validasi Invariant 1 |
| 5 | **Nilai Di Luar Batas** | Pesan 0 porsi atau pesan melebihi kuota | Ditolak oleh validasi Invariant 2 |
| 6 | **Transisi Status Tidak Sah** | Coba lompat langsung ke `selesai` | Tombol status yang tidak sah tidak ditampilkan di UI |

---

## 🚀 6. Kesiapan Menuju Praktik 2 (Cloud Firestore)

* Data Service diatur dengan pola *Repository*:
  - Saat ini membaca dan menulis ke `localStorage` (Praktik 1).
  - Di Praktik 2, tinggal menukar fungsi repository ke Firebase SDK `addDoc`, `getDocs`, `updateDoc`, `deleteDoc` tanpa merombak satu baris pun komponen UI.
