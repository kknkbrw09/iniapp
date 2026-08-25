// Types for RW 09 Mobile App

export interface Warga {
  id: string;
  nama: string;
  nik: string;
  noKk: string;
  alamat: string;
  rt: string;
  rw: string;
  status: 'Tetap' | 'Kontrak';
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  usia: number;
  tanggalLahir?: string;
  noRumah?: string;
  peranKk: 'Kepala Keluarga' | 'Anggota Keluarga';
  hubunganKk: string;
  kepalaKeluargaId?: string;
  nikHash?: string;
  noKkHash?: string;
}

export interface TransaksiKeuangan {
  id: string;
  tanggal: string;
  keterangan: string;
  jenis: 'pemasukan' | 'pengeluaran';
  jumlah: number;
  kategori: string;
  deskripsi?: string;
}

export interface Kegiatan {
  id: string;
  judul: string;
  tanggal: string;
  waktu: string;
  lokasi: string;
  deskripsi: string;
  status: 'Mendatang' | 'Selesai';
}

export interface Iuran {
  id: string;
  blok: string;
  namaWarga: string;
  bulan: string;
  tahun: number;
  status: 'Lunas' | 'Belum';
  jumlah: number;
}

export interface SuratPengantar {
  id: string;
  noSurat: string;
  namaPemohon: string;
  nik?: string;
  jenisSurat: string;
  keperluan: string;
  tanggal: string;
  status: 'Selesai' | 'Diproses';
  rt?: string;
}

export interface Pengumuman {
  id: string;
  judul: string;
  tanggal: string;
  isi: string;
  penting: boolean;
  kategori: string;
}

export interface AdminUser {
  id: string;
  username: string;
  nama_admin: string;
}

export type UserRole = 'admin' | 'guest';
