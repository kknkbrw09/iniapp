import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Dimensions, Modal, TextInput, Switch, Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Iuran } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CardListSkeleton } from '../components/SkeletonLoader';
import { logger } from '../utils/logger';
import { DataCache } from '../utils/cache';
import { exportToExcel } from '../utils/excelExport';

const extractAndNormalizeRt = (rtVal?: any): string => {
  let str = (rtVal || '').toString().trim();
  const numOnly = str.replace(/\D/g, '');
  if (numOnly) {
    const parsed = parseInt(numOnly, 10);
    if (parsed >= 1 && parsed <= 18) {
      return `RT ${String(parsed).padStart(3, '0')}`;
    }
  }
  return str || 'RT 001';
};

const extractHouseAddress = (alamatVal?: any, noRumahVal?: any): string => {
  if (noRumahVal && noRumahVal.toString().trim()) {
    let nr = noRumahVal.toString().trim();
    if (!/^no/i.test(nr) && !/^blok/i.test(nr)) {
      nr = `No. ${nr}`;
    }
    return nr;
  }
  if (alamatVal && alamatVal.toString().trim()) {
    let str = alamatVal.toString().trim();
    str = str.replace(/,?\s*RT\.?\s*\d+.*$/i, '').trim();
    str = str.replace(/,?\s*RW\.?\s*\d+.*$/i, '').trim();
    if (str) return str;
  }
  return 'No. Rumah -';
};

const LIST_RT = Array.from({ length: 18 }, (_, i) => `RT ${String(i + 1).padStart(3, '0')}`);

const BULAN_OPTIONS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const JENIS_IURAN_OPTIONS = [
  { id: 'Sampah', label: 'Iuran Sampah', color: '#00216e', bgColor: '#f0f4fd' },
  { id: 'Janaiz', label: 'Iuran Janaiz', color: '#00216e', bgColor: '#f0f4fd' },
  { id: 'Keamanan', label: 'Iuran Keamanan', color: '#00216e', bgColor: '#f0f4fd' },
];

export const getJenisInfo = (jenis?: string) => {
  if (!jenis || jenis === 'Tanpa Keterangan' || jenis === 'semua') {
    return { id: 'Tanpa Keterangan', label: 'Tanpa Keterangan', color: '#475569', bgColor: '#f1f5f9' };
  }
  const found = JENIS_IURAN_OPTIONS.find(j => j.id.toLowerCase() === jenis.toLowerCase());
  if (found) return found;
  return { id: jenis, label: jenis.startsWith('Iuran ') ? jenis : `Iuran ${jenis}`, color: '#00216e', bgColor: '#f0f4fd' };
};

const EMPTY_FORM_IURAN = {
  namaWarga: '',
  blok: '',
  bulan: 'Agustus',
  tahun: '2026',
  jumlah: '50000',
  status: 'Lunas' as 'Lunas' | 'Belum',
  rt: 'RT 001',
  jenisIuran: '',
  customJenisIuran: '',
};

const STORAGE_KEY_VISIBILITY = '@rt_iuran_category_visibility_v1';

const DEFAULT_CATEGORY_VISIBILITY: Record<string, boolean> = {
  Sampah: true,
  Janaiz: true,
  Keamanan: true,
  Lainnya: true,
  'Tanpa Keterangan': true,
};

export default function IuranScreen() {
  const { userRt, guestRt, isRwAdmin, isRtAdmin, isDasaWisma, isAdmin, isGuest } = useAuth();
  const canManageIuran = isAdmin && !isDasaWisma;
  const [list, setList] = useState<(Iuran & { rt?: string })[]>([]);
  const [wargaList, setWargaList] = useState<{ nama: string; rt: string; alamat: string; statusKeluarga?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRt, setSelectedRt] = useState<string>('semua');
  const [selectedJenis, setSelectedJenis] = useState<string>('semua');
  const [selectedHouseNo, setSelectedHouseNo] = useState<string>('semua');
  const [jenisDropdownVisible, setJenisDropdownVisible] = useState(false);
  const [rtDropdownVisible, setRtDropdownVisible] = useState(false);
  const [houseDropdownVisible, setHouseDropdownVisible] = useState(false);
  const [houseSearchText, setHouseSearchText] = useState<string>('');
  const [searchHouseNo, setSearchHouseNo] = useState<string>('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kkSearch, setKkSearch] = useState('');
  const [showKkPicker, setShowKkPicker] = useState(false);
  const [showBulanPicker, setShowBulanPicker] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM_IURAN);

  const availableHouseNumbers = useMemo(() => {
    const setNo = new Set<string>();
    wargaList.forEach(w => {
      if (w.alamat) {
        let clean = w.alamat.split('•')[0].trim();
        if (clean && clean !== 'No. Rumah -') setNo.add(clean);
      }
    });
    list.forEach(i => {
      if (i.blok) {
        let clean = i.blok.split('•')[0].trim();
        if (clean && clean !== 'No. Rumah -') setNo.add(clean);
      }
    });
    return Array.from(setNo).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
  }, [wargaList, list]);

  const filteredHouseNumbers = useMemo(() => {
    if (!houseSearchText.trim()) return availableHouseNumbers;
    const q = houseSearchText.trim().toLowerCase();
    return availableHouseNumbers.filter(no => no.toLowerCase().includes(q));
  }, [availableHouseNumbers, houseSearchText]);

  // State untuk Visibilitas Kategori Iuran Per RT
  const [rtVisibility, setRtVisibility] = useState<Record<string, Record<string, boolean>>>({});
  const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
  const [tempVisibility, setTempVisibility] = useState<Record<string, boolean>>(DEFAULT_CATEGORY_VISIBILITY);

  useEffect(() => {
    const loadVisibility = async () => {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY_VISIBILITY);
        if (json) {
          setRtVisibility(JSON.parse(json));
        }
      } catch (e) {
        console.log('Error loading rtVisibility:', e);
      }
    };
    loadVisibility();
  }, []);

  const isCategoryVisibleForRt = useCallback((rtName: string, categoryId: string): boolean => {
    const rtConfig = rtVisibility[rtName] || DEFAULT_CATEGORY_VISIBILITY;
    const catLower = (categoryId || 'Tanpa Keterangan').toLowerCase();
    let normKey = 'Lainnya';
    if (catLower === 'sampah') normKey = 'Sampah';
    else if (catLower === 'janaiz') normKey = 'Janaiz';
    else if (catLower === 'keamanan') normKey = 'Keamanan';
    else if (catLower === 'tanpa keterangan' || catLower === '') normKey = 'Tanpa Keterangan';

    return rtConfig[normKey] !== false;
  }, [rtVisibility]);

  const openVisibilityModal = () => {
    const targetRt = isRtAdmin && userRt ? userRt : (selectedRt !== 'semua' ? selectedRt : 'RT 001');
    const currentConfig = rtVisibility[targetRt] || DEFAULT_CATEGORY_VISIBILITY;
    setTempVisibility({ ...DEFAULT_CATEGORY_VISIBILITY, ...currentConfig });
    setVisibilityModalVisible(true);
  };

  const handleSaveVisibility = async () => {
    const targetRt = isRtAdmin && userRt ? userRt : (selectedRt !== 'semua' ? selectedRt : 'RT 001');
    const updated = {
      ...rtVisibility,
      [targetRt]: tempVisibility,
    };
    setRtVisibility(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_VISIBILITY, JSON.stringify(updated));
      Alert.alert('Berhasil', `Visibilitas kategori iuran untuk ${targetRt} berhasil diperbarui.`);
      setVisibilityModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Gagal menyimpan pengaturan visibilitas.');
    }
  };

  // State untuk Mass / Bulk Iuran (Select All KK)
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkBulan, setBulkBulan] = useState('Agustus');
  const [bulkTahun, setBulkTahun] = useState('2026');
  const [bulkJumlah, setBulkJumlah] = useState('50000');
  const [bulkRt, setBulkRt] = useState('RT 001');
  const [bulkJenisIuran, setBulkJenisIuran] = useState<string>('');
  const [bulkCustomJenisIuran, setBulkCustomJenisIuran] = useState<string>('');
  const [selectedKkNames, setSelectedKkNames] = useState<string[]>([]);
  const [savingBulk, setSavingBulk] = useState(false);

  useEffect(() => {
    if (isRtAdmin && userRt) {
      setSelectedRt(userRt);
      setForm(prev => ({ ...prev, rt: userRt }));
      setBulkRt(userRt);
    } else if (isGuest && guestRt) {
      setSelectedRt(guestRt);
    }
  }, [isRtAdmin, userRt, isGuest, guestRt]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      logger.addLog('API', 'GET /iuran', 'Fetching iuran from Supabase...');
      let rtMap: Record<string, string> = {};

      if (isSupabaseConfigured) {
        const { data: wargaData, error: wargaErr } = await supabase
          .from('warga')
          .select('*')
          .order('nama', { ascending: true });

        if (wargaData && !wargaErr) {
          const mappedWarga = wargaData.map((w: any) => ({
            nama: w.nama || w.nama_warga || '',
            rt: extractAndNormalizeRt(w.rt),
            alamat: extractHouseAddress(w.alamat, w.no_rumah),
            statusKeluarga: (w.status_keluarga || w.peran_kk || w.hubungan_kk || '').toString().trim(),
          })).filter(w => w.nama.trim().length > 0);
          setWargaList(mappedWarga);
          wargaData.forEach((w: any) => {
            const nameKey = (w.nama || w.nama_warga || '').trim().toLowerCase();
            if (nameKey) {
              rtMap[nameKey] = extractAndNormalizeRt(w.rt);
            }
          });
        }
      }

      const { data, error } = await supabase.from('iuran').select('*').order('created_at', { ascending: false });
      if (data && !error) {
        logger.addLog('SUCCESS', 'HTTP 200 OK — GET /iuran', `Loaded ${data.length} records`);
        const mapped = data.map((d: any) => {
          const namaLower = (d.nama_warga || '').trim().toLowerCase();
          const matchedRt = d.rt ? extractAndNormalizeRt(d.rt) : (rtMap[namaLower] || 'RT 001');

          let cleanBlok = d.blok || '';
          let extractedJenis = d.jenis_iuran || d.kategori || '';
          if (cleanBlok.includes('•')) {
            const parts = cleanBlok.split('•');
            cleanBlok = parts[0].trim();
            if (!extractedJenis) {
              extractedJenis = parts[1].trim();
            }
          }
          if (!extractedJenis) {
            extractedJenis = 'Tanpa Keterangan';
          }

          return {
            id: d.id,
            blok: cleanBlok,
            namaWarga: d.nama_warga,
            bulan: d.bulan,
            tahun: d.tahun,
            status: d.status,
            jumlah: Number(d.jumlah),
            rt: matchedRt,
            jenisIuran: extractedJenis,
          };
        });
        setList(mapped);
      }
    } catch (e) {
      console.log('Iuran fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!isAdmin) { Alert.alert('Akses Ditolak', 'Hanya admin pengurus yang bisa mengubah status'); return; }
    const newStatus = currentStatus === 'Lunas' ? 'Belum' : 'Lunas';
    try {
      if (isSupabaseConfigured) {
        await supabase.from('iuran').update({ status: newStatus }).eq('id', id);
      }
      setList(prev => prev.map(item => item.id === id ? { ...item, status: newStatus as any } : item));
    } catch (e) {
      setList(prev => prev.map(item => item.id === item.id ? { ...item, status: newStatus as any } : item));
    }
  };

  const openAddForKk = (nama: string, rt: string, blok?: string) => {
    let houseNo = extractHouseAddress(blok, '');
    if (houseNo.includes('•')) {
      houseNo = houseNo.split('•')[0].trim();
    }
    setForm({
      ...EMPTY_FORM_IURAN,
      namaWarga: nama,
      rt: extractAndNormalizeRt(rt),
      blok: houseNo,
    });
    setAddModalVisible(true);
  };

  const handleSaveIuran = async () => {
    if (!form.namaWarga.trim()) {
      Alert.alert('Perhatian', 'Mohon pilih atau isi Nama Kepala Keluarga (KK)');
      return;
    }
    if (!form.jumlah || parseInt(form.jumlah, 10) <= 0) {
      Alert.alert('Perhatian', 'Jumlah iuran harus lebih dari 0');
      return;
    }

    setSaving(true);
    try {
      const targetRtSave = isRtAdmin && userRt ? userRt : form.rt;
      const amount = parseInt(form.jumlah, 10) || 50000;
      const year = parseInt(form.tahun, 10) || 2026;

      let selectedJenisForm = form.jenisIuran;
      if (form.jenisIuran === 'Lainnya') {
        selectedJenisForm = form.customJenisIuran.trim() || 'Tanpa Keterangan';
      } else if (!form.jenisIuran) {
        selectedJenisForm = 'Tanpa Keterangan';
      }

      const cleanBlokSave = (form.blok.trim() || targetRtSave).split('•')[0].trim();
      const encodedBlok = selectedJenisForm === 'Tanpa Keterangan' ? cleanBlokSave : `${cleanBlokSave} • ${selectedJenisForm}`;

      if (isSupabaseConfigured) {
        const fullPayload: any = {
          nama_warga: form.namaWarga.trim(),
          blok: encodedBlok,
          bulan: form.bulan,
          tahun: year,
          jumlah: amount,
          status: form.status,
          rt: targetRtSave,
          jenis_iuran: selectedJenisForm,
        };

        const { error } = await supabase.from('iuran').insert(fullPayload);
        if (error) {
          const stdPayload = {
            nama_warga: form.namaWarga.trim(),
            blok: encodedBlok,
            bulan: form.bulan,
            tahun: year,
            jumlah: amount,
            status: form.status,
          };
          const { error: errStd } = await supabase.from('iuran').insert(stdPayload);
          if (errStd) throw errStd;
        }

        if (form.status === 'Lunas') {
          try {
            const ketDesc = selectedJenisForm === 'Tanpa Keterangan' ? '' : `${selectedJenisForm} `;
            await supabase.from('keuangan').insert({
              tanggal: new Date().toISOString().split('T')[0],
              keterangan: `Iuran ${ketDesc}${form.bulan} ${year} - ${form.namaWarga.trim()}`,
              jenis: 'pemasukan',
              jumlah: amount,
              kategori: 'Iuran',
              deskripsi: `Pembayaran Iuran ${ketDesc}(${cleanBlokSave})`,
              rt: targetRtSave,
            });
          } catch (keuErr) {
            console.log('Keuangan insert warning:', keuErr);
          }
        }
      }

      DataCache.clear('iuran_list');
      DataCache.clear('keuangan_list');
      DataCache.clear('dashboard_stats');

      const newItem: Iuran & { rt?: string } = {
        id: Date.now().toString(),
        namaWarga: form.namaWarga.trim(),
        blok: cleanBlokSave,
        bulan: form.bulan,
        tahun: year,
        jumlah: amount,
        status: form.status,
        rt: targetRtSave,
        jenisIuran: selectedJenisForm,
      };

      setList(prev => [newItem, ...prev]);
      setAddModalVisible(false);
      setForm({ ...EMPTY_FORM_IURAN, rt: isRtAdmin && userRt ? userRt : 'RT 001' });
      setKkSearch('');
      Alert.alert('Berhasil', `Catatan Iuran ${form.namaWarga} berhasil disimpan`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Gagal menyimpan iuran');
    } finally {
      setSaving(false);
    }
  };

  // Bulk selection candidates (Kepala Keluarga / Warga)
  const targetBulkRt = isRtAdmin && userRt ? userRt : bulkRt;
  const bulkKkCandidates = wargaList.filter(w => {
    if (!w.nama) return false;
    if (targetBulkRt === 'semua') return true;
    return (w.rt || '').toLowerCase() === targetBulkRt.toLowerCase();
  });

  const toggleSelectAllKk = () => {
    if (selectedKkNames.length === bulkKkCandidates.length) {
      setSelectedKkNames([]);
    } else {
      setSelectedKkNames(bulkKkCandidates.map(w => w.nama));
    }
  };

  const toggleKkSelection = (nama: string) => {
    setSelectedKkNames(prev =>
      prev.includes(nama) ? prev.filter(n => n !== nama) : [...prev, nama]
    );
  };

  const handleSaveBulkIuran = async () => {
    if (selectedKkNames.length === 0) {
      Alert.alert('Perhatian', 'Pilih minimal 1 Kepala Keluarga (KK)');
      return;
    }

    setSavingBulk(true);
    try {
      const amount = parseInt(bulkJumlah, 10) || 50000;
      const year = parseInt(bulkTahun, 10) || 2026;
      const today = new Date().toISOString().split('T')[0];

      let selectedJenisBulk = bulkJenisIuran;
      if (bulkJenisIuran === 'Lainnya') {
        selectedJenisBulk = bulkCustomJenisIuran.trim() || 'Tanpa Keterangan';
      } else if (!bulkJenisIuran) {
        selectedJenisBulk = 'Tanpa Keterangan';
      }

      const newItems: (Iuran & { rt?: string })[] = [];

      for (const nama of selectedKkNames) {
        const kkInfo = wargaList.find(w => w.nama === nama);
        const houseNo = kkInfo ? kkInfo.alamat : targetBulkRt;
        const cleanHouseNo = houseNo.split('•')[0].trim();
        const encodedBlok = selectedJenisBulk === 'Tanpa Keterangan' ? cleanHouseNo : `${cleanHouseNo} • ${selectedJenisBulk}`;

        if (isSupabaseConfigured) {
          const fullPayload: any = {
            nama_warga: nama,
            blok: encodedBlok,
            bulan: bulkBulan,
            tahun: year,
            jumlah: amount,
            status: 'Lunas',
            rt: targetBulkRt,
            jenis_iuran: selectedJenisBulk,
          };
          const { error } = await supabase.from('iuran').insert(fullPayload);
          if (error) {
            const stdPayload = {
              nama_warga: nama,
              blok: encodedBlok,
              bulan: bulkBulan,
              tahun: year,
              jumlah: amount,
              status: 'Lunas',
            };
            await supabase.from('iuran').insert(stdPayload);
          }

          try {
            const ketDesc = selectedJenisBulk === 'Tanpa Keterangan' ? '' : `${selectedJenisBulk} `;
            await supabase.from('keuangan').insert({
              tanggal: today,
              keterangan: `Iuran ${ketDesc}${bulkBulan} ${year} - ${nama}`,
              jenis: 'pemasukan',
              jumlah: amount,
              kategori: 'Iuran',
              deskripsi: `Pembayaran Iuran ${ketDesc}Massal Warga (${cleanHouseNo})`,
              rt: targetBulkRt,
            });
          } catch (keuErr) {
            console.log('Keuangan insert warning:', keuErr);
          }
        }

        newItems.push({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
          namaWarga: nama,
          blok: cleanHouseNo,
          bulan: bulkBulan,
          tahun: year,
          jumlah: amount,
          status: 'Lunas',
          rt: targetBulkRt,
          jenisIuran: selectedJenisBulk,
        });
      }

      DataCache.clear('iuran_list');
      DataCache.clear('keuangan_list');
      DataCache.clear('dashboard_stats');

      setList(prev => [...newItems, ...prev]);
      setBulkModalVisible(false);
      setSelectedKkNames([]);
      Alert.alert(
        'Pencatatan Massal Berhasil',
        `Iuran ${bulkBulan} ${year} untuk ${selectedKkNames.length} Kepala Keluarga telah berhasil dicatat LUNAS.`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Gagal menyimpan iuran massal');
    } finally {
      setSavingBulk(false);
    }
  };

  const filteredList = list.filter(item => {
    // 1. Filter RT vs RW
    if (isRtAdmin && userRt) {
      if ((item.rt || '').toLowerCase() !== userRt.toLowerCase()) return false;
    } else if (selectedRt !== 'semua') {
      if (selectedRt === 'Iuran RW') {
        const r = (item.rt || '').toLowerCase();
        if (r !== 'iuran rw' && r !== 'rw 09' && r !== 'rw 9') return false;
      } else {
        if ((item.rt || '').toLowerCase() !== selectedRt.toLowerCase()) return false;
      }
    } else if (isGuest && guestRt) {
      if ((item.rt || '').toLowerCase() !== guestRt.toLowerCase()) return false;
    }

    // 2. Visibilitas per RT untuk Warga / Tamu
    if (!isAdmin) {
      const itemRt = item.rt || guestRt || 'RT 001';
      const itemJenis = item.jenisIuran || 'Tanpa Keterangan';
      if (!isCategoryVisibleForRt(itemRt, itemJenis)) return false;
    }

    // 3. Filter Jenis Iuran
    if (selectedJenis !== 'semua') {
      const itemJenis = item.jenisIuran || 'Tanpa Keterangan';
      if (selectedJenis === 'Tanpa Keterangan') {
        if (itemJenis !== 'Tanpa Keterangan' && itemJenis !== '') return false;
      } else if (selectedJenis === 'Lainnya') {
        const isStd = ['sampah', 'janaiz', 'keamanan'].includes(itemJenis.toLowerCase());
        if (isStd || itemJenis === 'Tanpa Keterangan') return false;
      } else {
        if (itemJenis.toLowerCase() !== selectedJenis.toLowerCase()) return false;
      }
    }

    // 4. Filter Select Dropdown Nomor Rumah
    if (selectedHouseNo !== 'semua') {
      const targetNo = selectedHouseNo.toLowerCase();
      const matchBlok = (item.blok || '').toLowerCase().includes(targetNo);
      if (!matchBlok) return false;
    }

    // 5. Filter Search Bar Nomor Rumah / Alamat / Nama
    if (searchHouseNo.trim()) {
      const q = searchHouseNo.trim().toLowerCase();
      const matchBlok = (item.blok || '').toLowerCase().includes(q);
      const matchNama = (item.namaWarga || '').toLowerCase().includes(q);
      if (!matchBlok && !matchNama) return false;
    }

    return true;
  });

  // Filter list of Kepala Keluarga / Warga for picker langsung dari data warga
  const kkCandidates = wargaList.filter(w => {
    if (!w.nama) return false;
    if (isRtAdmin && userRt) {
      return (w.rt || '').toLowerCase() === userRt.toLowerCase();
    }
    if (selectedRt !== 'semua') {
      return (w.rt || '').toLowerCase() === selectedRt.toLowerCase();
    }
    return true;
  });

  const filteredKkCandidates = kkCandidates.filter(w =>
    w.nama.toLowerCase().includes(kkSearch.toLowerCase()) ||
    w.alamat.toLowerCase().includes(kkSearch.toLowerCase())
  );

  const lunasCount = filteredList.filter(i => i.status === 'Lunas').length;
  const percentage = filteredList.length > 0 ? Math.round((lunasCount / filteredList.length) * 100) : 0;
  const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  // Donut chart
  const size = 150;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (percentage / 100) * circumference;

  const renderItem = ({ item }: { item: Iuran & { rt?: string } }) => {
    const jenisInfo = getJenisInfo(item.jenisIuran);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
              <Text style={styles.cardName}>{item.namaWarga}</Text>
              <View style={[styles.jenisBadge, { backgroundColor: jenisInfo.bgColor }]}>
                <Text style={[styles.jenisBadgeText, { color: jenisInfo.color }]}>
                  {jenisInfo.label}
                </Text>
              </View>
            </View>
            <Text style={styles.cardBlok}>{item.blok} • {item.rt || 'RT 001'}</Text>
          </View>
          <View style={[styles.badge, item.status === 'Lunas' ? styles.badgeLunas : styles.badgeBelum]}>
            <Text style={[styles.badgeText, { color: item.status === 'Lunas' ? '#2e7d32' : '#bb0013' }]}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.bulan}>{item.bulan} {item.tahun}</Text>
            <Text style={styles.jumlah}>{fmt(item.jumlah)}</Text>
          </View>
          {canManageIuran && (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => toggleStatus(item.id, item.status)}
              >
                <Text style={styles.toggleText}>Ubah Status</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, { backgroundColor: '#eef2fa', borderColor: '#00216e' }]}
                onPress={() => openAddForKk(item.namaWarga, item.rt || 'RT 001', item.blok)}
              >
                <Text style={[styles.toggleText, { color: '#00216e' }]}>+ Iuran Lagi</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const handleExportExcel = async () => {
    if (!canManageIuran) {
      Alert.alert('Akses Ditolak', 'Fitur Export Excel hanya dapat digunakan oleh Pengurus Admin RT/RW.');
      return;
    }

    const headers = [
      'No',
      'Nama Warga',
      'No. Rumah / Blok',
      'RT/RW',
      'Jenis Iuran',
      'Bulan',
      'Tahun',
      'Jumlah (Rp)',
      'Status Pembayaran',
    ];

    const rows = filteredList.map((item, idx) => [
      idx + 1,
      item.namaWarga || '-',
      item.blok || '-',
      item.rt || 'RT 001',
      getJenisInfo(item.jenisIuran).label,
      item.bulan || '-',
      item.tahun || '-',
      item.jumlah || 0,
      item.status || '-',
    ]);

    const activeRt = selectedRt === 'semua' ? 'RW09' : selectedRt.replace(/\s+/g, '_');
    await exportToExcel(`Laporan_Iuran_${activeRt}`, headers, rows);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Status Iuran Warga</Text>
            <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
              {isRtAdmin && userRt
                ? `Wilayah: ${userRt}`
                : (isRwAdmin
                    ? (selectedRt === 'semua' ? 'Wilayah: Seluruh RW 09' : `Wilayah: ${selectedRt}`)
                    : (guestRt ? `Wilayah: ${guestRt}` : 'Wilayah: RW 09'))}
            </Text>
          </View>
        </View>

        {canManageIuran && (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: '#15803d', paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' }]}
              onPress={handleExportExcel}
            >
              <Text style={[styles.addBtnText, { fontSize: 11 }]} numberOfLines={1}>📊 Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, { flex: 1, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', paddingVertical: 8, alignItems: 'center' }]}
              onPress={openVisibilityModal}
            >
              <Text style={[styles.addBtnText, { color: '#00216e', fontSize: 11 }]} numberOfLines={1}>Visibilitas RT</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, { flex: 1, backgroundColor: '#e2e8f0', paddingVertical: 8, alignItems: 'center' }]}
              onPress={() => setAddModalVisible(true)}
            >
              <Text style={[styles.addBtnText, { color: '#00216e', fontSize: 11 }]} numberOfLines={1}>+ Single</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, { flex: 1.2, paddingVertical: 8, alignItems: 'center' }]}
              onPress={() => {
                setSelectedKkNames(bulkKkCandidates.map(w => w.nama));
                setBulkModalVisible(true);
              }}
            >
              <Text style={[styles.addBtnText, { fontSize: 11 }]} numberOfLines={1}>+ Select All KK</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* House Number & Name Search Filter */}
      <View style={styles.searchBarWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Filter nomor rumah (cth: No. 12) atau nama..."
          placeholderTextColor="#999"
          value={searchHouseNo}
          onChangeText={setSearchHouseNo}
          returnKeyType="search"
          onSubmitEditing={Keyboard.dismiss}
        />
        {searchHouseNo.length > 0 && (
          <TouchableOpacity onPress={() => setSearchHouseNo('')} style={{ padding: 4 }}>
            <Text style={{ color: '#999', fontSize: 14, fontWeight: 'bold' }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dropdown Filters Section (Jenis Iuran & Filter RT) */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12, gap: 8 }}>
        {/* Dropdown 1: Jenis Iuran */}
        <TouchableOpacity
          style={styles.filterDropdownTrigger}
          onPress={() => setJenisDropdownVisible(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Text style={styles.filterDropdownTitle}>Jenis Iuran:</Text>
            <Text style={styles.filterDropdownSelectedText} numberOfLines={1}>
              {selectedJenis === 'semua'
                ? 'Semua Jenis Iuran'
                : (selectedJenis === 'Lainnya'
                    ? 'Keterangan Lainnya'
                    : (selectedJenis === 'Tanpa Keterangan'
                        ? 'Tanpa Keterangan'
                        : getJenisInfo(selectedJenis).label))}
            </Text>
          </View>
          <Text style={styles.filterDropdownIcon}>▼</Text>
        </TouchableOpacity>

        {/* Dropdown 2: Filter Nomor Rumah */}
        <TouchableOpacity
          style={styles.filterDropdownTrigger}
          onPress={() => setHouseDropdownVisible(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Text style={styles.filterDropdownTitle}>No. Rumah:</Text>
            <Text style={styles.filterDropdownSelectedText} numberOfLines={1}>
              {selectedHouseNo === 'semua' ? 'Semua Nomor Rumah' : selectedHouseNo}
            </Text>
          </View>
          <Text style={styles.filterDropdownIcon}>▼</Text>
        </TouchableOpacity>

        {/* Dropdown 3: Filter RT (ONLY for RW Admin) */}
        {isRwAdmin && (
          <TouchableOpacity
            style={styles.filterDropdownTrigger}
            onPress={() => setRtDropdownVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Text style={styles.filterDropdownTitle}>Filter RT:</Text>
              <Text style={styles.filterDropdownSelectedText} numberOfLines={1}>
                {selectedRt === 'semua' ? 'Semua RT' : (selectedRt === 'Iuran RW' ? 'Iuran Tingkat RW' : selectedRt)}
              </Text>
            </View>
            <Text style={styles.filterDropdownIcon}>▼</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Donut Chart */}
      <View style={styles.chartCard}>
        <View style={styles.donutWrap}>
          <Svg width={size} height={size}>
            <Circle cx={size/2} cy={size/2} r={radius} stroke="#e2e2e2" strokeWidth={strokeWidth} fill="transparent" />
            <Circle cx={size/2} cy={size/2} r={radius} stroke="#00216e" strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" fill="transparent"
              transform={`rotate(-90 ${size/2} ${size/2})`}
            />
          </Svg>
          <View style={styles.donutCenter}>
            <Text style={styles.donutPct}>{percentage}%</Text>
            <Text style={styles.donutLbl}>LUNAS</Text>
          </View>
        </View>
        <View style={styles.legend}>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: '#00216e' }]} />
            <View>
              <Text style={styles.legendVal}>{lunasCount} Warga</Text>
              <Text style={styles.legendLbl}>Sudah Bayar</Text>
            </View>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: '#bb0013' }]} />
            <View>
              <Text style={styles.legendVal}>{filteredList.length - lunasCount} Warga</Text>
              <Text style={styles.legendLbl}>Belum Bayar</Text>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <CardListSkeleton count={4} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={filteredList}
          renderItem={renderItem}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Belum ada data iuran untuk kriteria ini</Text>
            </View>
          }
        />
      )}

      {/* Modal Tambah Iuran */}
      <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHead}>
              <View>
                <Text style={styles.modalTitle}>Catat Iuran Warga Baru</Text>
                <Text style={{ fontSize: 11, color: '#666' }}>
                  {isRtAdmin ? `Untuk Wilayah ${userRt}` : 'Pencatatan Iuran Bulanan'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Dropdown Select Box untuk Kepala Keluarga */}
              <Text style={styles.inputLabel}>PILIH KEPALA KELUARGA (KK)</Text>
              <TouchableOpacity
                style={styles.dropdownBox}
                onPress={() => setShowKkPicker(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <Text style={form.namaWarga ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder}>
                    {form.namaWarga ? `${form.namaWarga} (${form.rt})` : '-- Pilih Kepala Keluarga (KK) --'}
                  </Text>
                </View>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              {/* Alamat Otomatis Mengikuti Kepala Keluarga */}
              {!!form.namaWarga && (
                <View style={styles.autoAlamatWrap}>
                  <Text style={styles.autoAlamatLabel}>NO. RUMAH / ALAMAT (OTOMATIS):</Text>
                  <Text style={styles.autoAlamatValue}>{form.blok || 'No. Rumah -'}</Text>
                </View>
              )}

              {/* Pilih Jenis Iuran */}
              <Text style={styles.inputLabel}>JENIS IURAN (OPSIONAL)</Text>
              <View style={styles.rowChip}>
                <TouchableOpacity
                  style={[
                    styles.chipBtn,
                    !form.jenisIuran && styles.chipBlue
                  ]}
                  onPress={() => setForm(p => ({ ...p, jenisIuran: '', customJenisIuran: '' }))}
                >
                  <Text style={[styles.chipText, !form.jenisIuran && styles.chipTextActive]}>
                    Tanpa Keterangan (Default)
                  </Text>
                </TouchableOpacity>

                {JENIS_IURAN_OPTIONS.map(opt => {
                  const isSelected = form.jenisIuran === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.chipBtn,
                        isSelected && { backgroundColor: opt.color, borderColor: opt.color }
                      ]}
                      onPress={() => setForm(p => ({ ...p, jenisIuran: opt.id }))}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[
                    styles.chipBtn,
                    form.jenisIuran === 'Lainnya' && styles.chipBlue
                  ]}
                  onPress={() => setForm(p => ({ ...p, jenisIuran: 'Lainnya' }))}
                >
                  <Text style={[styles.chipText, form.jenisIuran === 'Lainnya' && styles.chipTextActive]}>
                    + Ketik Sendiri (Lainnya)
                  </Text>
                </TouchableOpacity>
              </View>

              {form.jenisIuran === 'Lainnya' && (
                <View style={{ marginTop: 6, marginBottom: 4 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ketik jenis iuran sendiri (contoh: Iuran PHBI, Posyandu)..."
                    placeholderTextColor="#999"
                    value={form.customJenisIuran}
                    onChangeText={t => setForm(p => ({ ...p, customJenisIuran: t }))}
                  />
                </View>
              )}

              {!isRtAdmin && (
                <>
                  <Text style={styles.inputLabel}>WILAYAH RT / RW</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                    {['Iuran RW', ...LIST_RT].map(rt => (
                      <TouchableOpacity
                        key={rt}
                        style={[styles.chipBtn, form.rt === rt && styles.chipBlue]}
                        onPress={() => setForm(p => ({ ...p, rt }))}
                      >
                        <Text style={[styles.chipText, form.rt === rt && styles.chipTextActive]}>
                          {rt === 'Iuran RW' ? 'Iuran Tingkat RW' : rt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Dropdown Select Box untuk Bulan */}
              <Text style={styles.inputLabel}>BULAN IURAN</Text>
              <TouchableOpacity
                style={styles.dropdownBox}
                onPress={() => setShowBulanPicker(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <Text style={styles.dropdownTextSelected}>{form.bulan} {form.tahun}</Text>
                </View>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>TAHUN</Text>
              <TextInput
                style={styles.input}
                placeholder="2026"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={form.tahun}
                onChangeText={t => setForm(p => ({ ...p, tahun: t }))}
              />

              <Text style={styles.inputLabel}>JUMLAH (RP)</Text>
              <TextInput
                style={styles.input}
                placeholder="50000"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={form.jumlah}
                onChangeText={t => setForm(p => ({ ...p, jumlah: t }))}
              />

              <Text style={styles.inputLabel}>STATUS PEMBAYARAN</Text>
              <View style={styles.rowChip}>
                {(['Lunas', 'Belum'] as const).map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.chipBtn, form.status === st && (st === 'Lunas' ? styles.chipGreen : styles.chipRed)]}
                    onPress={() => setForm(p => ({ ...p, status: st }))}
                  >
                    <Text style={[styles.chipText, form.status === st && styles.chipTextActive]}>
                      {st === 'Lunas' ? 'Lunas' : 'Belum'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, saving && { opacity: 0.7 }]}
                onPress={handleSaveIuran}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Simpan Data Iuran</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Picker Kepala Keluarga */}
      <Modal visible={showKkPicker} animationType="fade" transparent onRequestClose={() => setShowKkPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerBox}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Pilih Kepala Keluarga (KK)</Text>
              <TouchableOpacity onPress={() => setShowKkPicker(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.pickerSearchInput}
              placeholder="Cari nama Kepala Keluarga atau alamat..."
              placeholderTextColor="#999"
              value={kkSearch}
              onChangeText={setKkSearch}
            />

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {filteredKkCandidates.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#999', fontSize: 13 }}>Tidak ada data Kepala Keluarga</Text>
                </View>
              ) : (
                filteredKkCandidates.map((kk, idx) => {
                  const isSelected = form.namaWarga === kk.nama;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                      onPress={() => {
                        setForm(p => ({
                          ...p,
                          namaWarga: kk.nama,
                          blok: kk.alamat || `Blok / ${kk.rt}`,
                          rt: kk.rt,
                        }));
                        setShowKkPicker(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerItemName, isSelected && styles.pickerItemTextSelected]}>
                          {kk.nama}
                        </Text>
                        <Text style={styles.pickerItemSub}>
                          {kk.rt} {kk.alamat ? `• ${kk.alamat}` : ''}
                        </Text>
                      </View>
                      {isSelected && <Text style={styles.checkMark}>(Terpilih)</Text>}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Picker Bulan */}
      <Modal visible={showBulanPicker} animationType="fade" transparent onRequestClose={() => setShowBulanPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerBox, { maxHeight: 420 }]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Pilih Bulan Iuran</Text>
              <TouchableOpacity onPress={() => setShowBulanPicker(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {BULAN_OPTIONS.map((b) => {
                const isSelected = form.bulan === b;
                return (
                  <TouchableOpacity
                    key={b}
                    style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                    onPress={() => {
                      setForm(p => ({ ...p, bulan: b }));
                      setShowBulanPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemName, isSelected && styles.pickerItemTextSelected]}>
                      {b} {form.tahun}
                    </Text>
                    {isSelected && <Text style={styles.checkMark}>(Terpilih)</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Massal / Bulk Iuran (Select All KK) */}
      <Modal visible={bulkModalVisible} animationType="slide" transparent onRequestClose={() => setBulkModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '90%' }]}>
            <View style={styles.modalHead}>
              <View>
                <Text style={styles.modalTitle}>Catat Iuran Massal (Select All)</Text>
                <Text style={{ fontSize: 11, color: '#666' }}>
                  {isRtAdmin ? `Wilayah: ${userRt}` : `Wilayah: ${bulkRt}`} • {selectedKkNames.length} KK Terpilih
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBulkModalVisible(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Jenis Iuran Massal */}
              <Text style={styles.inputLabel}>JENIS IURAN MASSAL (OPSIONAL)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                <TouchableOpacity
                  style={[
                    styles.chipBtn,
                    !bulkJenisIuran && styles.chipBlue
                  ]}
                  onPress={() => { setBulkJenisIuran(''); setBulkCustomJenisIuran(''); }}
                >
                  <Text style={[styles.chipText, !bulkJenisIuran && styles.chipTextActive]}>
                    Tanpa Keterangan (Default)
                  </Text>
                </TouchableOpacity>

                {JENIS_IURAN_OPTIONS.map(opt => {
                  const isSelected = bulkJenisIuran === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.chipBtn,
                        isSelected && { backgroundColor: opt.color, borderColor: opt.color }
                      ]}
                      onPress={() => setBulkJenisIuran(opt.id)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[
                    styles.chipBtn,
                    bulkJenisIuran === 'Lainnya' && styles.chipBlue
                  ]}
                  onPress={() => setBulkJenisIuran('Lainnya')}
                >
                  <Text style={[styles.chipText, bulkJenisIuran === 'Lainnya' && styles.chipTextActive]}>
                    + Ketik Sendiri (Lainnya)
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {bulkJenisIuran === 'Lainnya' && (
                <View style={{ marginTop: 4, marginBottom: 8 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ketik jenis iuran massal (contoh: Iuran PHBI)..."
                    placeholderTextColor="#999"
                    value={bulkCustomJenisIuran}
                    onChangeText={setBulkCustomJenisIuran}
                  />
                </View>
              )}

                  {!isRtAdmin && (
                <>
                  <Text style={styles.inputLabel}>WILAYAH RT / RW</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                    {['Iuran RW', ...LIST_RT].map(rt => (
                      <TouchableOpacity
                        key={rt}
                        style={[styles.chipBtn, bulkRt === rt && styles.chipBlue]}
                        onPress={() => {
                          setBulkRt(rt);
                          const newCandidates = wargaList.filter(w => (w.rt || '').toLowerCase() === rt.toLowerCase());
                          setSelectedKkNames(newCandidates.map(w => w.nama));
                        }}
                      >
                        <Text style={[styles.chipText, bulkRt === rt && styles.chipTextActive]}>
                          {rt === 'Iuran RW' ? 'Iuran Tingkat RW' : rt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <Text style={styles.inputLabel}>BULAN IURAN</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                {BULAN_OPTIONS.map(b => (
                  <TouchableOpacity
                    key={b}
                    style={[styles.chipBtn, bulkBulan === b && styles.chipBlue]}
                    onPress={() => setBulkBulan(b)}
                  >
                    <Text style={[styles.chipText, bulkBulan === b && styles.chipTextActive]}>{b}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>TAHUN</Text>
                  <TextInput
                    style={styles.input}
                    value={bulkTahun}
                    keyboardType="numeric"
                    onChangeText={setBulkTahun}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>JUMLAH PER KK (RP)</Text>
                  <TextInput
                    style={styles.input}
                    value={bulkJumlah}
                    keyboardType="numeric"
                    onChangeText={setBulkJumlah}
                  />
                </View>
              </View>

              {/* Select All Toggle Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8, paddingHorizontal: 4 }}>
                <Text style={styles.inputLabel}>DAFTAR KEPALA KELUARGA ({bulkKkCandidates.length} KK)</Text>
                <TouchableOpacity
                  style={{ backgroundColor: selectedKkNames.length === bulkKkCandidates.length ? '#eef2fa' : '#00216e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}
                  onPress={toggleSelectAllKk}
                >
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: selectedKkNames.length === bulkKkCandidates.length ? '#00216e' : '#fff' }}>
                    {selectedKkNames.length === bulkKkCandidates.length ? '✓ Batalkan Semua' : '✓ Pilih Semua (Select All)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* List of KK with checkboxes */}
              <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 8 }}>
                {bulkKkCandidates.length === 0 ? (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <Text style={{ color: '#999', fontSize: 13 }}>Tidak ada data Kepala Keluarga di wilayah ini</Text>
                  </View>
                ) : (
                  bulkKkCandidates.map((kk, idx) => {
                    const isChecked = selectedKkNames.includes(kk.nama);
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 8,
                          borderBottomWidth: idx < bulkKkCandidates.length - 1 ? 1 : 0,
                          borderBottomColor: '#edf2f7',
                        }}
                        onPress={() => toggleKkSelection(kk.nama)}
                      >
                        <View style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: isChecked ? '#00216e' : '#cbd5e1',
                          backgroundColor: isChecked ? '#00216e' : '#fff',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 10,
                        }}>
                          {isChecked && <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: isChecked ? '#00216e' : '#333' }}>
                            {kk.nama}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#666', marginTop: 1 }}>
                            {kk.rt} • {kk.alamat}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, savingBulk && { opacity: 0.7 }]}
                onPress={handleSaveBulkIuran}
                disabled={savingBulk}
              >
                {savingBulk ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>
                    Simpan Lunas {selectedKkNames.length} KK (Rp {(selectedKkNames.length * (parseInt(bulkJumlah, 10) || 50000)).toLocaleString('id-ID')})
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Setting Visibilitas Kategori Iuran Per RT */}
      <Modal visible={visibilityModalVisible} animationType="slide" transparent onRequestClose={() => setVisibilityModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHead}>
              <View>
                <Text style={styles.modalTitle}>Pengaturan Visibilitas Iuran Warga</Text>
                <Text style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                  Wilayah: {isRtAdmin && userRt ? userRt : (selectedRt !== 'semua' ? selectedRt : 'RT 001')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setVisibilityModalVisible(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 13, color: '#444', marginBottom: 14, lineHeight: 18 }}>
                Atur jenis iuran mana saja yang ingin <Text style={{ fontWeight: 'bold', color: '#00216e' }}>DITAMPILKAN bagi Warga / Publik</Text> untuk wilayah RT ini:
              </Text>

              {[
                { key: 'Sampah', label: 'Iuran Sampah' },
                { key: 'Janaiz', label: 'Iuran Janaiz' },
                { key: 'Keamanan', label: 'Iuran Keamanan' },
                { key: 'Lainnya', label: 'Iuran Lainnya / Custom' },
                { key: 'Tanpa Keterangan', label: 'Iuran Tanpa Keterangan' },
              ].map(item => (
                <View key={item.key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1a1c1c' }}>{item.label}</Text>
                    <Text style={{ fontSize: 11, color: tempVisibility[item.key] !== false ? '#2e7d32' : '#bb0013', marginTop: 2 }}>
                      {tempVisibility[item.key] !== false ? 'Tampil untuk Warga' : 'Tersembunyi dari Warga'}
                    </Text>
                  </View>
                  <Switch
                    value={tempVisibility[item.key] !== false}
                    onValueChange={val => setTempVisibility(p => ({ ...p, [item.key]: val }))}
                    trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                    thumbColor={tempVisibility[item.key] !== false ? '#00216e' : '#64748b'}
                  />
                </View>
              ))}

              <TouchableOpacity
                style={[styles.submitBtn, { marginTop: 20 }]}
                onPress={handleSaveVisibility}
              >
                <Text style={styles.submitText}>Simpan Pengaturan Visibilitas</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Dropdown 1: Jenis / Kategori Iuran */}
      <Modal visible={jenisDropdownVisible} transparent animationType="fade" onRequestClose={() => setJenisDropdownVisible(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setJenisDropdownVisible(false)}>
          <View style={styles.pickerBox}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Pilih Jenis / Kategori Iuran</Text>
              <TouchableOpacity onPress={() => setJenisDropdownVisible(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              {/* Option: Semua Jenis */}
              <TouchableOpacity
                style={[styles.pickerItemRow, selectedJenis === 'semua' && styles.pickerItemRowSelected]}
                onPress={() => { setSelectedJenis('semua'); setJenisDropdownVisible(false); }}
              >
                <Text style={[styles.pickerItemName, selectedJenis === 'semua' && styles.pickerItemTextSelected]}>
                  Semua Jenis Iuran
                </Text>
                {selectedJenis === 'semua' && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>

              {/* Dynamic Options from JENIS_IURAN_OPTIONS */}
              {JENIS_IURAN_OPTIONS.map(opt => {
                const isSelected = selectedJenis.toLowerCase() === opt.id.toLowerCase();
                const activeRtView = isRtAdmin && userRt ? userRt : (selectedRt !== 'semua' ? selectedRt : (guestRt ? guestRt : 'RT 001'));
                const isVis = isCategoryVisibleForRt(activeRtView, opt.id);
                if (!isAdmin && !isVis) return null;

                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                    onPress={() => { setSelectedJenis(opt.id); setJenisDropdownVisible(false); }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00216e' }} />
                      <Text style={[styles.pickerItemName, isSelected && styles.pickerItemTextSelected]}>
                        {opt.label} {isAdmin && !isVis ? '(Sembunyi)' : ''}
                      </Text>
                    </View>
                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}

              {/* Option: Keterangan Lainnya */}
              {(isAdmin || isCategoryVisibleForRt(isRtAdmin && userRt ? userRt : (selectedRt !== 'semua' ? selectedRt : (guestRt ? guestRt : 'RT 001')), 'Lainnya')) && (
                <TouchableOpacity
                  style={[styles.pickerItemRow, selectedJenis === 'Lainnya' && styles.pickerItemRowSelected]}
                  onPress={() => { setSelectedJenis('Lainnya'); setJenisDropdownVisible(false); }}
                >
                  <Text style={[styles.pickerItemName, selectedJenis === 'Lainnya' && styles.pickerItemTextSelected]}>
                    Keterangan Lainnya {isAdmin && !isCategoryVisibleForRt(isRtAdmin && userRt ? userRt : (selectedRt !== 'semua' ? selectedRt : (guestRt ? guestRt : 'RT 001')), 'Lainnya') ? '(Sembunyi)' : ''}
                  </Text>
                  {selectedJenis === 'Lainnya' && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              )}

              {/* Option: Tanpa Keterangan */}
              {(isAdmin || isCategoryVisibleForRt(isRtAdmin && userRt ? userRt : (selectedRt !== 'semua' ? selectedRt : (guestRt ? guestRt : 'RT 001')), 'Tanpa Keterangan')) && (
                <TouchableOpacity
                  style={[styles.pickerItemRow, selectedJenis === 'Tanpa Keterangan' && styles.pickerItemRowSelected]}
                  onPress={() => { setSelectedJenis('Tanpa Keterangan'); setJenisDropdownVisible(false); }}
                >
                  <Text style={[styles.pickerItemName, selectedJenis === 'Tanpa Keterangan' && styles.pickerItemTextSelected]}>
                    Tanpa Keterangan {isAdmin && !isCategoryVisibleForRt(isRtAdmin && userRt ? userRt : (selectedRt !== 'semua' ? selectedRt : (guestRt ? guestRt : 'RT 001')), 'Tanpa Keterangan') ? '(Sembunyi)' : ''}
                  </Text>
                  {selectedJenis === 'Tanpa Keterangan' && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Dropdown 2: Select Nomor Rumah */}
      <Modal visible={houseDropdownVisible} transparent animationType="fade" onRequestClose={() => setHouseDropdownVisible(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setHouseDropdownVisible(false)}>
          <TouchableOpacity style={styles.pickerBox} activeOpacity={1}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Pilih Nomor Rumah</Text>
              <TouchableOpacity onPress={() => setHouseDropdownVisible(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.pickerSearchInput}
              placeholder="Cari nomor rumah (cth: No. 12)..."
              placeholderTextColor="#999"
              value={houseSearchText}
              onChangeText={setHouseSearchText}
            />

            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              {/* Option: Semua Nomor Rumah */}
              <TouchableOpacity
                style={[styles.pickerItemRow, selectedHouseNo === 'semua' && styles.pickerItemRowSelected]}
                onPress={() => { setSelectedHouseNo('semua'); setHouseDropdownVisible(false); }}
              >
                <Text style={[styles.pickerItemName, selectedHouseNo === 'semua' && styles.pickerItemTextSelected]}>
                  Semua Nomor Rumah
                </Text>
                {selectedHouseNo === 'semua' && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>

              {filteredHouseNumbers.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#999', fontSize: 13 }}>Nomor rumah tidak ditemukan</Text>
                </View>
              ) : (
                filteredHouseNumbers.map((no, idx) => {
                  const isSelected = selectedHouseNo === no;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                      onPress={() => { setSelectedHouseNo(no); setHouseDropdownVisible(false); }}
                    >
                      <Text style={[styles.pickerItemName, isSelected && styles.pickerItemTextSelected]}>
                        {no}
                      </Text>
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal Dropdown 2: Filter RT (For RW Admin) */}
      <Modal visible={rtDropdownVisible} transparent animationType="fade" onRequestClose={() => setRtDropdownVisible(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setRtDropdownVisible(false)}>
          <View style={styles.pickerBox}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Pilih Wilayah RT</Text>
              <TouchableOpacity onPress={() => setRtDropdownVisible(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              {['semua', 'Iuran RW', ...LIST_RT].map(rt => (
                <TouchableOpacity
                  key={rt}
                  style={[styles.pickerItemRow, selectedRt === rt && styles.pickerItemRowSelected]}
                  onPress={() => { setSelectedRt(rt); setRtDropdownVisible(false); }}
                >
                  <Text style={[styles.pickerItemName, selectedRt === rt && styles.pickerItemTextSelected]}>
                    {rt === 'semua' ? 'Semua RT' : (rt === 'Iuran RW' ? 'Iuran Tingkat RW' : rt)}
                  </Text>
                  {selectedRt === rt && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { paddingHorizontal: 20, paddingTop: 20, marginBottom: 14 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#00216e' },
  addBtn: { backgroundColor: '#00216e', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  filterDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterDropdownTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00216e',
  },
  filterDropdownSelectedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  filterDropdownIcon: {
    fontSize: 10,
    color: '#00216e',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 44,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#333' },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  categoryChipText: { fontSize: 12, fontWeight: 'bold', color: '#475569' },
  jenisBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#d0dbe9',
  },
  jenisBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  chartCard: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 15, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  donutWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutPct: { fontSize: 28, fontWeight: 'bold', color: '#1a1c1c' },
  donutLbl: { fontSize: 9, color: '#666', fontWeight: 'bold', letterSpacing: 2 },
  legend: { flex: 1, marginLeft: 20 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendVal: { fontSize: 14, fontWeight: 'bold', color: '#1a1c1c' },
  legendLbl: { fontSize: 10, color: '#666' },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: '#999', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardName: { fontSize: 15, fontWeight: 'bold', color: '#1a1c1c' },
  cardBlok: { fontSize: 12, color: '#666', marginTop: 2 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 15 },
  badgeLunas: { backgroundColor: '#e8f5e9' },
  badgeBelum: { backgroundColor: '#ffebee' },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  bulan: { fontSize: 11, color: '#666' },
  jumlah: { fontSize: 16, fontWeight: 'bold', color: '#00216e', marginTop: 2 },
  toggleBtn: { backgroundColor: '#f5f5f5', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  toggleText: { fontSize: 11, fontWeight: 'bold', color: '#00216e' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', padding: 20 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#00216e' },
  closeX: { fontSize: 22, color: '#999' },
  inputLabel: { fontSize: 11, color: '#666', fontWeight: 'bold', letterSpacing: 0.8, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#e0e0e0', color: '#333' },
  dropdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f4fd',
    borderWidth: 1.5,
    borderColor: '#00216e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownTextSelected: { fontSize: 14, fontWeight: 'bold', color: '#00216e' },
  dropdownTextPlaceholder: { fontSize: 13, color: '#666' },
  dropdownArrow: { fontSize: 12, color: '#00216e', fontWeight: 'bold' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  pickerBox: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerTitle: { fontSize: 16, fontWeight: 'bold', color: '#00216e' },
  pickerSearchInput: { backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 10 },
  pickerItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  pickerItemRowSelected: { backgroundColor: '#eef2fa' },
  pickerItemName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  pickerItemTextSelected: { color: '#00216e' },
  pickerItemSub: { fontSize: 11, color: '#888', marginTop: 2 },
  checkMark: { color: '#2e7d32', fontWeight: 'bold', fontSize: 12 },
  suggestionWrap: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, marginTop: 4, maxHeight: 120 },
  suggestionItem: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  suggestionText: { fontSize: 13, color: '#333' },
  rowChip: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  chipBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#f5f5f5', marginRight: 6, marginBottom: 6, borderWidth: 1, borderColor: '#e0e0e0' },
  chipBlue: { backgroundColor: '#00216e', borderColor: '#00216e' },
  chipGreen: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  chipRed: { backgroundColor: '#bb0013', borderColor: '#bb0013' },
  chipText: { fontSize: 12, color: '#666' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#00216e', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 15 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  autoAlamatWrap: {
    backgroundColor: '#eef2fa',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#d0dbe9',
  },
  autoAlamatLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#00216e',
    letterSpacing: 0.8,
  },
  autoAlamatValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    marginTop: 3,
  },
});
