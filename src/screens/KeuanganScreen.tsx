import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TransaksiKeuangan } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CardListSkeleton } from '../components/SkeletonLoader';
import { DataCache } from '../utils/cache';
import { logger } from '../utils/logger';

const KATEGORIS = ['Iuran', 'Kebersihan', 'Fasilitas', 'Donasi'];

export default function KeuanganScreen() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [list, setList] = useState<TransaksiKeuangan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterJenis, setFilterJenis] = useState<'semua' | 'pemasukan' | 'pengeluaran'>('semua');
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ keterangan: '', jenis: 'pemasukan' as 'pemasukan' | 'pengeluaran', jumlah: '', kategori: 'Iuran', deskripsi: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      logger.addLog('API', 'GET /keuangan', 'Fetching keuangan from Supabase...');
      const { data, error } = await supabase.from('keuangan').select('*').order('created_at', { ascending: false });
      if (data && !error) {
        logger.addLog('SUCCESS', 'HTTP 200 OK — GET /keuangan', `Loaded ${data.length} records`);
        const mapped = data.map((d: any) => ({
          id: String(d.id || d.created_at || Math.random()),
          tanggal: d.created_at ? d.created_at.split('T')[0] : (d.tanggal || '2026-08-02'),
          keterangan: d.keterangan,
          jenis: d.jenis,
          jumlah: Number(d.jumlah),
          kategori: d.kategori || 'Umum',
          deskripsi: d.deskripsi || '',
        }));
        setList(mapped);
      }
    } catch (e) {
      console.log('Keuangan fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPemasukan = list.filter(t => t.jenis === 'pemasukan').reduce((s, t) => s + t.jumlah, 0);
  const totalPengeluaran = list.filter(t => t.jenis === 'pengeluaran').reduce((s, t) => s + t.jumlah, 0);
  const saldo = totalPemasukan - totalPengeluaran;

  const filtered = list.filter(t => filterJenis === 'semua' || t.jenis === filterJenis);

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

  const renderItem = ({ item }: { item: TransaksiKeuangan }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardDate}>{item.tanggal}</Text>
        <View style={[styles.badge, { backgroundColor: item.jenis === 'pemasukan' ? '#e3f2fd' : '#ffebee' }]}>
          <Text style={styles.badgeText}>{item.kategori}</Text>
        </View>
      </View>
      <Text style={styles.cardKet}>{item.keterangan}</Text>
      {!!item.deskripsi && (
        <Text style={{ fontSize: 12, color: '#555', marginTop: 2, marginBottom: 4, lineHeight: 16 }}>
          📝 {item.deskripsi}
        </Text>
      )}
      <Text style={[styles.cardJumlah, { color: item.jenis === 'pemasukan' ? '#00216e' : '#bb0013' }]}>
        {item.jenis === 'pemasukan' ? '+' : '-'} {fmt(item.jumlah)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Keuangan RW 09</Text>
        {isAdmin && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Tambah</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Summary */}
      <View style={styles.summaryWrap}>
        <View style={[styles.summaryCard, { backgroundColor: '#00216e' }]}>
          <Text style={styles.saldoLabel}>Saldo Kas Saat Ini</Text>
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

      {/* Filter */}
      <View style={styles.filterRow}>
        {(['semua', 'pemasukan', 'pengeluaran'] as const).map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filterJenis === f && styles.filterActive]} onPress={() => setFilterJenis(f)}>
            <Text style={[styles.filterText, filterJenis === f && styles.filterTextActive]}>
              {f === 'semua' ? 'Semua' : f === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <CardListSkeleton count={4} />
      ) : (
        <FlatList style={{ flex: 1 }} data={filtered} renderItem={renderItem} keyExtractor={i => i.id} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Belum ada transaksi</Text></View>}
        />
      )}

      {/* Add Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Tambah Transaksi</Text>
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
                placeholder="Rincian rincian detail (misal: Pembelian 5 pasang sarung tangan & konsumsi warga)"
                placeholderTextColor="#999"
                multiline
                value={form.deskripsi}
                onChangeText={t => setForm(p => ({ ...p, deskripsi: t }))}
              />

              <TouchableOpacity style={[styles.submitBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Simpan Transaksi</Text>}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#00216e' },
  addBtn: { backgroundColor: '#00216e', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
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
  loadingText: { marginTop: 10, color: '#666', fontSize: 13 },
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
});
