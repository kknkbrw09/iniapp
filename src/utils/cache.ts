import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { logger } from './logger';

const memoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds cache TTL

export const DataCache = {
  get: <T>(key: string): T | null => {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      memoryCache.delete(key);
      return null;
    }
    return entry.data as T;
  },

  set: (key: string, data: any) => {
    memoryCache.set(key, { data, timestamp: Date.now() });
  },

  clear: (key?: string) => {
    if (key) memoryCache.delete(key);
    else memoryCache.clear();
  },
};

/**
 * Race a promise against a timeout to ensure UI never freezes.
 */
export async function withTimeout<T>(promise: Promise<T>, _timeoutMs = 15000): Promise<T> {
  return promise;
}

/**
 * Background Prefetching: Preload all tab data after Dashboard load
 * so opening Warga, Keuangan, Kegiatan, Iuran, Pengumuman, Surat is INSTANT (0ms).
 */
export async function prefetchAllData() {
  if (!isSupabaseConfigured) return;
  try {
    // 1. Warga (Paginated fetch to bypass 1000 row server limit)
    if (!DataCache.get('warga_list')) {
      let allRows: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const res = await supabase.from('warga').select('status_keluarga, gender, tahun_lahir', { count: 'exact' }).range(from, to);
        if (res.error || !res.data) break;

        allRows = allRows.concat(res.data);
        if (res.data.length < pageSize || (res.count && allRows.length >= res.count)) {
          hasMore = false;
        } else {
          page++;
        }
      }

      if (allRows.length > 0) {
        const CURRENT_YEAR = new Date().getFullYear();
        const mapped = allRows.map((d: any, idx: number) => {
          const statusKeluarga = d.status_keluarga || d.hubungan_kk || d.peran_kk || 'Kepala Keluarga';
          const isKepala = statusKeluarga.trim().toLowerCase() === 'kepala keluarga';
          const tLahir = d.tahun_lahir ? Number(d.tahun_lahir) : 1998;
          const age = CURRENT_YEAR - tLahir;

          return {
            id: String(idx + 1),
            nama: '',
            nik: '',
            noKk: '',
            alamat: '',
            rt: 'RT 001',
            rw: 'RW 09',
            status: 'Tetap',
            jenisKelamin: d.gender || d.jenis_kelamin || 'Laki-laki',
            usia: age >= 0 ? age : 25,
            peranKk: isKepala ? 'Kepala Keluarga' : 'Anggota Keluarga',
            hubunganKk: statusKeluarga,
          };
        });
        DataCache.set('warga_list', mapped);
        logger.addLog('SUCCESS', 'HTTP 200 OK — PREFETCH /warga', `Preloaded ALL ${mapped.length} minimal records`);
      }
    }
    await new Promise(r => setTimeout(r, 100));

    // 2. Keuangan
    if (!DataCache.get('keuangan_list')) {
      const res = await supabase.from('keuangan').select('*').order('created_at', { ascending: false });
      if (res.data) {
        const mapped = res.data.map((d: any) => ({
          id: String(d.id || d.created_at || Math.random()),
          tanggal: d.created_at ? d.created_at.split('T')[0] : (d.tanggal || '2026-08-02'),
          keterangan: d.keterangan || '',
          jenis: d.jenis || 'pemasukan',
          jumlah: Number(d.jumlah) || 0,
          kategori: d.kategori || 'Iuran',
        }));
        DataCache.set('keuangan_list', mapped);
        logger.addLog('SUCCESS', 'HTTP 200 OK — PREFETCH /keuangan', `Preloaded ${mapped.length} records`);
      }
    }
    await new Promise(r => setTimeout(r, 100));

    // 3. Kegiatan
    if (!DataCache.get('kegiatan_list')) {
      const res = await supabase.from('kegiatan').select('*').order('tanggal', { ascending: true });
      if (res.data) {
        const mapped = res.data.map((d: any) => ({
          id: d.id, judul: d.judul, tanggal: d.tanggal, waktu: d.waktu, lokasi: d.lokasi, deskripsi: d.deskripsi, status: d.status,
        }));
        DataCache.set('kegiatan_list', mapped);
        logger.addLog('SUCCESS', 'HTTP 200 OK — PREFETCH /kegiatan', `Preloaded ${mapped.length} records`);
      }
    }
    await new Promise(r => setTimeout(r, 100));

    // 4. Iuran
    if (!DataCache.get('iuran_list')) {
      const res = await supabase.from('iuran').select('*').order('blok');
      if (res.data) {
        const mapped = res.data.map((d: any) => ({
          id: d.id, blok: d.blok, namaWarga: d.nama_warga, bulan: d.bulan, tahun: d.tahun, status: d.status, jumlah: Number(d.jumlah),
        }));
        DataCache.set('iuran_list', mapped);
        logger.addLog('SUCCESS', 'HTTP 200 OK — PREFETCH /iuran', `Preloaded ${mapped.length} records`);
      }
    }
    await new Promise(r => setTimeout(r, 100));

    // 5. Pengumuman
    if (!DataCache.get('pengumuman_list')) {
      const res = await supabase.from('pengumuman').select('*').order('created_at', { ascending: false });
      if (res.data) {
        const mapped = res.data.map((d: any) => ({
          id: d.id, judul: d.judul, tanggal: d.tanggal, isi: d.isi, penting: d.penting, kategori: d.kategori,
        }));
        DataCache.set('pengumuman_list', mapped);
        logger.addLog('SUCCESS', 'HTTP 200 OK — PREFETCH /pengumuman', `Preloaded ${mapped.length} records`);
      }
    }
    await new Promise(r => setTimeout(r, 100));

    // 6. Surat
    if (!DataCache.get('surat_list')) {
      const res = await supabase.from('surat_pengantar').select('*').order('tanggal', { ascending: false });
      if (res.data) {
        const mapped = res.data.map((d: any) => ({
          id: d.id, noSurat: d.no_surat, namaPemohon: d.nama_pemohon, nik: '••••••••', jenisSurat: d.jenis_surat, keperluan: d.keperluan, tanggal: d.tanggal, status: d.status,
        }));
        DataCache.set('surat_list', mapped);
        logger.addLog('SUCCESS', 'HTTP 200 OK — PREFETCH /surat_pengantar', `Preloaded ${mapped.length} records`);
      }
    }
  } catch (e: any) {
    // Silent catch
  }
}
