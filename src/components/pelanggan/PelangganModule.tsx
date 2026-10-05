import React, { useState } from 'react';
import { UserPlus, Edit2, Trash2, Phone, MapPin, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import type { Pelanggan } from '../../types';
import { EmptyState } from '../common/UIStates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PelangganModuleProps {
  pelangganList: Pelanggan[];
  onAddPelanggan: (pelanggan: Omit<Pelanggan, 'dibuat_pada'>) => { success: boolean; error?: string };
  onUpdatePelanggan: (id: string, updates: Partial<Pelanggan>) => void;
  onDeletePelanggan: (id: string) => void;
}

export const PelangganModule: React.FC<PelangganModuleProps> = ({
  pelangganList,
  onAddPelanggan,
  onUpdatePelanggan,
  onDeletePelanggan,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPelanggan, setEditingPelanggan] = useState<Pelanggan | null>(null);

  // Form states
  const [nama, setNama] = useState('');
  const [noWhatsapp, setNoWhatsapp] = useState('');
  const [alamat, setAlamat] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingPelanggan(null);
    setNama('');
    setNoWhatsapp('');
    setAlamat('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Pelanggan) => {
    setEditingPelanggan(p);
    setNama(p.nama);
    setNoWhatsapp(p.no_whatsapp);
    setAlamat(p.alamat);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPelanggan(null);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // PRD 4.2 Criteria 3: Given nama atau alamat kosong
    if (!nama.trim()) {
      setFormError('Nama pelanggan wajib diisi.');
      return;
    }
    if (nama.trim().length > 60) {
      setFormError('Nama pelanggan maksimal 60 karakter.');
      return;
    }

    if (!alamat.trim()) {
      setFormError('Alamat pengiriman wajib diisi.');
      return;
    }
    if (alamat.trim().length > 200) {
      setFormError('Alamat pengiriman maksimal 200 karakter.');
      return;
    }

    // Validasi Nomor WhatsApp: diawali 08, panjang 10-13 angka
    const cleanedWa = noWhatsapp.trim().replace(/\D/g, '');
    if (!cleanedWa.startsWith('08')) {
      setFormError('Nomor WhatsApp harus diawali "08" (contoh: 081234567890).');
      return;
    }
    if (cleanedWa.length < 10 || cleanedWa.length > 13) {
      setFormError('Nomor WhatsApp harus terdiri dari 10 sampai 13 angka.');
      return;
    }

    if (editingPelanggan) {
      onUpdatePelanggan(editingPelanggan.id, {
        nama: nama.trim(),
        alamat: alamat.trim(),
      });
      closeModal();
    } else {
      // Criteria 2: Given nomor WhatsApp sudah digunakan, When data baru dikirim, Then permintaan ditolak.
      const result = onAddPelanggan({
        id: cleanedWa,
        no_whatsapp: cleanedWa,
        nama: nama.trim(),
        alamat: alamat.trim(),
      });

      if (!result.success) {
        setFormError(result.error || 'Gagal menyimpan pelanggan.');
        return;
      }
      closeModal();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-heading font-bold text-foreground">Data Pelanggan</h2>
          <p className="text-[11px] sm:text-xs text-muted-foreground">Daftar kontak pemesan & alamat pengiriman katering</p>
        </div>
        <Button
          onClick={openAddModal}
          size="sm"
          className="gap-1.5 rounded-lg text-xs font-semibold"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Tambah Pelanggan</span>
        </Button>
      </div>

      {/* List */}
      {pelangganList.length === 0 ? (
        <EmptyState
          title="Belum Ada Pelanggan"
          description="Data pelanggan katering masih kosong. Daftarkan nomor WhatsApp pelanggan sekarang."
          actionLabel="Tambah Pelanggan Baru"
          onAction={openAddModal}
        />
      ) : (
        <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
          {pelangganList.map((p) => (
            <div
              key={p.id}
              className="bg-card border border-border hover:border-primary/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-heading font-bold text-foreground text-sm sm:text-base leading-snug">{p.nama}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-primary font-semibold mt-0.5 sm:mt-1">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{p.no_whatsapp}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(p)}
                      className="h-7 w-7 text-muted-foreground hover:text-primary rounded-md"
                      title="Ubah Pelanggan"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Yakin ingin menghapus pelanggan "${p.nama}"?`)) {
                          onDeletePelanggan(p.id);
                        }
                      }}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-md"
                      title="Hapus Pelanggan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-border/60 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70 mt-0.5" />
                  <span className="line-clamp-2 leading-relaxed">{p.alamat}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-start justify-between pb-2 border-b border-border/60 mb-3">
              <div>
                <h3 className="text-base sm:text-lg font-heading font-bold text-foreground">
                  {editingPelanggan ? 'Ubah Data Pelanggan' : 'Tambah Pelanggan Baru'}
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Nomor WhatsApp digunakan sebagai identitas dokumen pengiriman.
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
                    Nama Pelanggan <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">{nama.length}/60</span>
                </div>
                <Input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  maxLength={60}
                  className="text-xs sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nomor WhatsApp <span className="text-destructive">*</span>
                </label>
                <Input
                  type="tel"
                  value={noWhatsapp}
                  disabled={!!editingPelanggan}
                  onChange={(e) => setNoWhatsapp(e.target.value)}
                  placeholder="081234567890"
                  className={`text-xs sm:text-sm ${editingPelanggan ? 'bg-muted text-muted-foreground' : ''}`}
                  required
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  {editingPelanggan ? 'Nomor WhatsApp adalah kunci ID dan tidak dapat diubah' : 'Wajib diawali 08, 10-13 digit'}
                </span>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-foreground">
                    Alamat Pengiriman Lengkap <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">{alamat.length}/200</span>
                </div>
                <Textarea
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Jl. Melati No. 12, RT 03/RW 05, Kelurahan Mawar"
                  rows={3}
                  maxLength={200}
                  className="text-xs sm:text-sm resize-none"
                  required
                />
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
                  <span>{editingPelanggan ? 'Perbarui Pelanggan' : 'Simpan Pelanggan'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
