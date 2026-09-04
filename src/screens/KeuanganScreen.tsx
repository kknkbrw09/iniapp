import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, ActivityIndicator, Alert, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TransaksiKeuangan } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CardListSkeleton } from '../components/SkeletonLoader';
import { DataCache } from '../utils/cache';
import { logger } from '../utils/logger';
import { SafeStorage } from '../utils/storage';
import { exportToExcel } from '../utils/excelExport';

const KATEGORIS = ['Iuran', 'Kebersihan', 'Fasilitas', 'Donasi', 'Umum', 'Lainnya'];
const LIST_RT = Array.from({ length: 18 }, (_, i) => `RT ${String(i + 1).padStart(3, '0')}`);
const STORAGE_KEY_VISIBILITY_KEUANGAN = '@rt_keuangan_category_visibility_v1';

const DEFAULT_KEUANGAN_VISIBILITY: Record<string, boolean> = {
  Iuran: true,
  Kebersihan: true,
  Fasilitas: true,
  Donasi: true,
  Umum: true,
  Lainnya: true,
};

const normalizeRt = (rtVal?: any): string => {
  if (!rtVal) return 'RW 09';
  const str = rtVal.toString().trim();
  const numOnly = str.replace(/\D/g, '');
  if (numOnly) {
    const num = parseInt(numOnly, 10);
    if (num >= 1 && num <= 18) {
      return `RT ${String(num).padStart(3, '0')}`;
    }
  }
  return str || 'RW 09';
};

export default function KeuanganScreen() {
  const { role, userRt, guestRt, isRwAdmin, isRtAdmin, isDasaWisma, isAdmin } = useAuth();
  const canManageKeuangan = isAdmin && !isDasaWisma;

  const [list, setList] = useState<TransaksiKeuangan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterJenis, setFilterJenis] = useState<'semua' | 'pemasukan' | 'pengeluaran'>('semua');
  const [selectedRt, setSelectedRt] = useState<string>(
    isRtAdmin && userRt ? normalizeRt(userRt) : (guestRt ? normalizeRt(guestRt) : 'RW 09')
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    keterangan: '',
    jenis: 'pemasukan' as 'pemasukan' | 'pengeluaran',
    jumlah: '',
    kategori: 'Iuran',
    deskripsi: '',
  });

  // Visibilitas per RT / RW
  const [keuanganVisibility, setKeuanganVisibility] = useState<Record<string, Record<string, boolean>>>({});
  const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
  const [tempVisibility, setTempVisibility] = useState<Record<string, boolean>>(DEFAULT_KEUANGAN_VISIBILITY);

  useEffect(() => {
    const loadVisibility = async () => {
      try {
        const json = await SafeStorage.getItem(STORAGE_KEY_VISIBILITY_KEUANGAN);
        if (json) {
          setKeuanganVisibility(JSON.parse(json));
        }
      } catch (e) {
        console.error('Error loading keuangan visibility:', e);
      }
    };
    loadVisibility();
  }, []);

  const isCategoryVisibleForRt = (rtKey: string, categoryName: string): boolean => {
    const rtMap = keuanganVisibility[rtKey];
    if (!rtMap) return true;
    return rtMap[categoryName] !== false;
  };

  const openVisibilityModal = () => {
    const activeRt = isRtAdmin && userRt ? normalizeRt(userRt) : selectedRt;
    const current = keuanganVisibility[activeRt] || DEFAULT_KEUANGAN_VISIBILITY;
    setTempVisibility({ ...DEFAULT_KEUANGAN_VISIBILITY, ...current });
    setVisibilityModalVisible(true);
  };

  const handleSaveVisibility = async () => {
    const activeRt = isRtAdmin && userRt ? normalizeRt(userRt) : selectedRt;
    const updated = {
      ...keuanganVisibility,
      [activeRt]: tempVisibility,
    };
    setKeuanganVisibility(updated);
    try {
      await SafeStorage.setItem(STORAGE_KEY_VISIBILITY_KEUANGAN, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving keuangan visibility:', e);
    }
    setVisibilityModalVisible(false);
    Alert.alert('Berhasil', `Pengaturan visibilitas kas untuk ${activeRt} berhasil disimpan.`);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      logger.addLog('API', 'GET /keuangan', 'Fetching keuangan from Supabase...');
      const { data, error } = await supabase.from('keuangan').select('*').order('created_at', { ascending: false });
      if (data && !error) {
        logger.addLog('SUCCESS', 'HTTP 200 OK — GET /keuangan', `Loaded ${data.length} records`);
        const mapped: TransaksiKeuangan[] = data.map((d: any) => ({
          id: String(d.id || d.created_at || Math.random()),
          tanggal: d.created_at ? d.created_at.split('T')[0] : (d.tanggal || '2026-08-02'),
          keterangan: d.keterangan,
          jenis: d.jenis,
          jumlah: Number(d.jumlah),
          kategori: d.kategori || 'Umum',
          deskripsi: d.deskripsi || '',
          rt: d.rt ? normalizeRt(d.rt) : 'RW 09',
        }));
        setList(mapped);
      }
    } catch (e) {
      console.log('Keuangan fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const targetRt = isRtAdmin && userRt ? normalizeRt(userRt) : (selectedRt === 'semua' ? 'RW 09' : selectedRt);

  const filteredList = list.filter(item => {
    const itemRt = normalizeRt(item.rt);

    if (isRtAdmin && userRt) {
      if (itemRt.toLowerCase() !== normalizeRt(userRt).toLowerCase()) return false;
    } else if (selectedRt !== 'semua') {
      if (itemRt.toLowerCase() !== selectedRt.toLowerCase()) return false;
    }

    if (!isAdmin) {
      if (!isCategoryVisibleForRt(itemRt, item.kategori)) return false;
    }

    if (filterJenis !== 'semua' && item.jenis !== filterJenis) return false;

    return true;
  });

  const totalPemasukan = filteredList.filter(t => t.jenis === 'pemasukan').reduce((s, t) => s + t.jumlah, 0);
  const totalPengeluaran = filteredList.filter(t => t.jenis === 'pengeluaran').reduce((s, t) => s + t.jumlah, 0);
  const saldo = totalPemasukan - totalPengeluaran;

  const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  const handleSave = async () => {
    if (!form.keterangan || !form.jumlah) { Alert.alert('Error', 'Keterangan dan jumlah wajib diisi'); return; }
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('keuangan').insert({
          tanggal: today,
          keterangan: form.keterangan,
          jenis: form.jenis,
          jumlah: parseInt(form.jumlah),
          kategori: form.kategori,
          deskripsi: form.deskripsi,
          rt: targetRt,
        });
        if (error) throw error;
      }
      const newTx: TransaksiKeuangan = {
        id: Date.now().toString(),
        tanggal: today,
        keterangan: form.keterangan,
        jenis: form.jenis,
        jumlah: parseInt(form.jumlah),
        kategori: form.kategori,
        deskripsi: form.deskripsi,
        rt: targetRt,
      };
      DataCache.clear('keuangan_list');
      DataCache.clear('dashboard_stats');
      setList(prev => [newTx, ...prev]);
      setModalVisible(false);
      setForm({ keterangan: '', jenis: 'pemasukan', jumlah: '', kategori: 'Iuran', deskripsi: '' });
      Alert.alert('Berhasil', 'Transaksi berhasil disimpan');
    } catch (e: any) { Alert.alert('Error', e.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const renderItem = ({ item }: { item: TransaksiKeuangan }) => {
    const itemRt = normalizeRt(item.rt);
    const isVis = isCategoryVisibleForRt(itemRt, item.kategori);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.cardDate}>{item.tanggal}</Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <View style={[styles.badge, { backgroundColor: '#eef2fa' }]}>
              <Text style={[styles.badgeText, { color: '#00216e' }]}>{itemRt}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: item.jenis === 'pemasukan' ? '#e3f2fd' : '#ffebee' }]}>
              <Text style={styles.badgeText}>{item.kategori}</Text>
            </View>
            {isAdmin && !isVis && (
              <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
                <Text style={[styles.badgeText, { color: '#92400e' }]}>Sembunyi Warga</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.cardKet}>{item.keterangan}</Text>
        {!!item.deskripsi && (
          <Text style={{ fontSize: 12, color: '#555', marginTop: 2, marginBottom: 4, lineHeight: 16 }}>
            {item.deskripsi}
          </Text>
        )}
        <Text style={[styles.cardJumlah, { color: item.jenis === 'pemasukan' ? '#00216e' : '#bb0013' }]}>
          {item.jenis === 'pemasukan' ? '+' : '-'} {fmt(item.jumlah)}
        </Text>
      </View>
    );
  };

  const handleExportExcel = async () => {
    if (!canManageKeuangan) {
      Alert.alert('Akses Ditolak', 'Fitur Export Excel hanya dapat digunakan oleh Pengurus Admin RT/RW.');
      return;
    }

    const headers = [
      'No',
      'Tanggal',
      'RT/RW',
      'Jenis Transaksi',
      'Kategori',
      'Keterangan',
      'Deskripsi',
      'Jumlah (Rp)',
    ];

    const rows = filteredList.map((item, idx) => [
      idx + 1,
      item.tanggal || '-',
      item.rt || 'RW 09',
      item.jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
      item.kategori || '-',
      item.keterangan || '-',
      item.deskripsi || '-',
      item.jumlah || 0,
    ]);

    const activeRt = selectedRt === 'semua' ? 'RW09' : selectedRt.replace(/\s+/g, '_');
    await exportToExcel(`Laporan_Kas_${activeRt}`, headers, rows);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Laporan Keuangan & Kas</Text>
          <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
            {isRtAdmin && userRt
              ? `Wilayah: ${userRt}`
              : (isRwAdmin
                  ? (selectedRt === 'semua' ? 'Wilayah: Seluruh RW 09' : `Wilayah: ${selectedRt}`)
                  : (guestRt ? `Wilayah: ${guestRt}` : 'Wilayah: RW 09'))}
          </Text>
        </View>

        {canManageKeuangan && (
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: '#15803d', paddingHorizontal: 10 }]}
              onPress={handleExportExcel}
            >
              <Text style={styles.addBtnText}>📊 Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' }]}
              onPress={openVisibilityModal}
            >
              <Text style={[styles.addBtnText, { color: '#00216e' }]}>Visibilitas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.addBtnText}>+ Tambah</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Scope Selector Chips */}
      {isRwAdmin ? (
        <View style={{ marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {['semua', 'RW 09', ...LIST_RT].map(rt => (
              <TouchableOpacity
                key={rt}
                style={[
                  styles.scopeChip,
                  selectedRt === rt && styles.scopeChipActive
                ]}
                onPress={() => setSelectedRt(rt)}
              >
                <Text style={[styles.scopeChipText, selectedRt === rt && styles.scopeChipTextActive]}>
                  {rt === 'semua' ? 'Semua Kas' : (rt === 'RW 09' ? 'Kas Pusat RW' : rt)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : (!isRtAdmin && (
        <View style={{ marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {[guestRt || 'RT 001', 'RW 09'].map(scopeKey => (
              <TouchableOpacity
                key={scopeKey}
                style={[
                  styles.scopeChip,
                  selectedRt === scopeKey && styles.scopeChipActive
                ]}
                onPress={() => setSelectedRt(scopeKey)}
              >
                <Text style={[styles.scopeChipText, selectedRt === scopeKey && styles.scopeChipTextActive]}>
                  {scopeKey === 'RW 09' ? 'Kas RW 09' : `Kas ${scopeKey}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ))}

      {/* Summary Cards */}
      <View style={styles.summaryWrap}>
        <View style={[styles.summaryCard, { backgroundColor: '#00216e' }]}>
          <Text style={styles.saldoLabel}>Saldo Kas ({targetRt === 'semua' ? 'RW 09 & RT' : targetRt})</Text>
          <Text style={styles.saldoValue}>{fmt(saldo)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.halfCard]}>
            <View style={[styles.cardAccentBar, { backgroundColor: '#2e7d32' }]} />
            <Text style={styles.subLabel}>Pemasukan</Text>
            <Text style={[styles.subValue, { color: '#2e7d32' }]}>{fmt(totalPemasukan)}</Text>
          </View>
          <View style={[styles.summaryCard, styles.halfCard]}>
            <View style={[styles.cardAccentBar, { backgroundColor: '#bb0013' }]} />
            <Text style={styles.subLabel}>Pengeluaran</Text>
            <Text style={[styles.subValue, { color: '#bb0013' }]}>{fmt(totalPengeluaran)}</Text>
          </View>
        </View>
      </View>

      {/* Filter Jenis */}
      <View style={styles.filterRow}>
        {(['semua', 'pemasukan', 'pengeluaran'] as const).map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filterJenis === f && styles.filterActive]} onPress={() => setFilterJenis(f)}>
            <Text style={[styles.filterText, filterJenis === f && styles.filterTextActive]}>
              {f === 'semua' ? 'Semua Transaksi' : f === 'pemasukan' ? 'Pemasukan (+)' : 'Pengeluaran (-)'}
            </Text>
          </TouchableOpacity>
        ))}
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
              <Text style={styles.emptyText}>Belum ada data transaksi kas untuk kriteria ini</Text>
            </View>
          }
        />
      )}

      {/* Modal Visibilitas Kategori Kas Warga */}
      <Modal visible={visibilityModalVisible} animationType="slide" transparent onRequestClose={() => setVisibilityModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHead}>
              <View>
                <Text style={styles.modalTitle}>Visibilitas Kas Warga</Text>
                <Text style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Pengaturan Tampilan Kas untuk Warga ({isRtAdmin && userRt ? userRt : selectedRt})</Text>
              </View>
              <TouchableOpacity onPress={() => setVisibilityModalVisible(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 12, color: '#555', marginBottom: 16, lineHeight: 18 }}>
                Aktifkan opsi di bawah untuk memperbolehkan warga umum memantau transaksi kas pada kategori yang dipilih:
              </Text>

              {KATEGORIS.map(cat => {
                const isEnabled = tempVisibility[cat] !== false;

                return (
                  <View key={cat} style={styles.visibilityRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.visibilityLabel}>Kategori: {cat}</Text>
                      <Text style={styles.visibilitySub}>
                        {isEnabled ? 'Terlihat oleh warga' : 'Disembunyikan dari warga'}
                      </Text>
                    </View>
                    <Switch
                      value={isEnabled}
                      onValueChange={(val) => {
                        setTempVisibility(prev => ({
                          ...prev,
                          [cat]: val
                        }));
                      }}
                      trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                      thumbColor={isEnabled ? '#00216e' : '#f8fafc'}
                    />
                  </View>
                );
              })}

              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveVisibility}>
                <Text style={styles.submitText}>Simpan Pengaturan Visibilitas</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHead}>
              <View>
                <Text style={styles.modalTitle}>Tambah Transaksi Kas</Text>
                <Text style={{ fontSize: 11, color: '#666' }}>Pencatatan untuk {targetRt}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Keterangan (Judul Singkat)</Text>
              <TextInput style={styles.input} placeholder="Contoh: Pembelian Alat Kerja Bakti" placeholderTextColor="#999" value={form.keterangan} onChangeText={t => setForm(p => ({ ...p, keterangan: t }))} />

              <Text style={styles.inputLabel}>Jenis Transaksi</Text>
              <View style={styles.row}>
                {(['pemasukan', 'pengeluaran'] as const).map(j => (
                  <TouchableOpacity key={j} style={[styles.chipBtn, form.jenis === j && (j === 'pemasukan' ? styles.chipBlue : styles.chipRed)]} onPress={() => setForm(p => ({ ...p, jenis: j }))}>
                    <Text style={[styles.chipText, form.jenis === j && styles.chipTextActive]}>{j === 'pemasukan' ? 'Pemasukan (+)' : 'Pengeluaran (-)'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Jumlah (Rp)</Text>
              <TextInput style={styles.input} placeholder="500000" placeholderTextColor="#999" keyboardType="numeric" value={form.jumlah} onChangeText={t => setForm(p => ({ ...p, jumlah: t }))} />

              <Text style={styles.inputLabel}>Kategori</Text>
              <View style={styles.row}>
                {KATEGORIS.map(k => (
                  <TouchableOpacity key={k} style={[styles.chipBtn, form.kategori === k && styles.chipBlue]} onPress={() => setForm(p => ({ ...p, kategori: k }))}>
                    <Text style={[styles.chipText, form.kategori === k && styles.chipTextActive]}>{k}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Deskripsi / Catatan Detail (Opsional)</Text>
              <TextInput
                style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
                placeholder="Rincian detail transaksi..."
                placeholderTextColor="#999"
                multiline
                value={form.deskripsi}
                onChangeText={t => setForm(p => ({ ...p, deskripsi: t }))}
              />

              <TouchableOpacity style={[styles.submitBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Simpan Transaksi ({targetRt})</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, marginBottom: 14 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#00216e' },
  addBtn: { backgroundColor: '#00216e', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  scopeChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#eee', marginRight: 8 },
  scopeChipActive: { backgroundColor: '#00216e' },
  scopeChipText: { fontSize: 12, color: '#444', fontWeight: 'bold' },
  scopeChipTextActive: { color: '#fff' },
  summaryWrap: { paddingHorizontal: 20, marginBottom: 16 },
  summaryCard: { position: 'relative', overflow: 'hidden', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#edf2f7', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  cardAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  saldoLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', letterSpacing: 1 },
  saldoValue: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginTop: 5 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  halfCard: { width: '48%', marginBottom: 0, paddingLeft: 18 },
  subLabel: { fontSize: 11, color: '#666' },
  subValue: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  filterActive: { backgroundColor: '#00216e', borderColor: '#00216e' },
  filterText: { fontSize: 12, color: '#666', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: '#999', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardDate: { fontSize: 11, color: '#999', fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#333' },
  cardKet: { fontSize: 14, color: '#1a1c1c', fontWeight: '600', marginBottom: 4 },
  cardJumlah: { fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', padding: 20 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#00216e' },
  closeX: { fontSize: 22, color: '#999' },
  inputLabel: { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12, fontSize: 14, borderWidth: 1, borderColor: '#e0e0e0' },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  chipBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5', marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  chipBlue: { backgroundColor: '#00216e', borderColor: '#00216e' },
  chipRed: { backgroundColor: '#bb0013', borderColor: '#bb0013' },
  chipText: { fontSize: 12, color: '#666' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#00216e', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  visibilityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  visibilityLabel: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  visibilitySub: { fontSize: 11, color: '#64748b', marginTop: 2 },
});
