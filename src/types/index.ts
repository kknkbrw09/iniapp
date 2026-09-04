// Types for RW 09 Mobile App

export interface Warga {
  id: string;
  nama: string;
  nik: string;
  noKk: string;
  alamat: string;
  rt: string;
  rw: string;
  status: string;
  statusDomisili?: string;
  alamatKtp?: string;
  alamatDomisili?: string;
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
  rt?: string;
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
  jenisIuran?: string;
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
  rt?: string | null;
}

export type RtRole =
  | 'rt001' | 'rt002' | 'rt003' | 'rt004' | 'rt005' | 'rt006'
  | 'rt007' | 'rt008' | 'rt009' | 'rt010' | 'rt011' | 'rt012'
  | 'rt013' | 'rt014' | 'rt015' | 'rt016' | 'rt017' | 'rt018';

export type UserRole = 'admin' | RtRole | 'dasa_wisma' | 'guest';

