import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Kegiatan } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CardListSkeleton } from '../components/SkeletonLoader';
import { DataCache } from '../utils/cache';
import { logger } from '../utils/logger';

const EMPTY_FORM = { judul: '', tanggal: '', waktu: '08:00 WIB', lokasi: '', deskripsi: '' };

const computeStatus = (tanggalStr: string, fallbackStatus?: string): 'Mendatang' | 'Selesai' => {
  if (!tanggalStr) return (fallbackStatus as any) || 'Mendatang';
  const now = new Date();
  const eventDate = new Date(tanggalStr);
  if (isNaN(eventDate.getTime())) return (fallbackStatus as any) || 'Mendatang';
  eventDate.setHours(23, 59, 59, 999);
  return now > eventDate ? 'Selesai' : 'Mendatang';
};

export default function KegiatanScreen() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [list, setList] = useState<Kegiatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'semua' | 'Mendatang' | 'Selesai'>('semua');
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      logger.addLog('API', 'GET /kegiatan', 'Fetching kegiatan from Supabase...');
      const { data, error } = await supabase.from('kegiatan').select('*').order('tanggal', { ascending: true });
      if (data && !error) {
        logger.addLog('SUCCESS', 'HTTP 200 OK — GET /kegiatan', `Loaded ${data.length} records`);
        const mapped = data.map((d: any) => ({
          id: d.id,
          judul: d.judul,
          tanggal: d.tanggal,
          waktu: d.waktu,
          lokasi: d.lokasi,
          deskripsi: d.deskripsi,
          status: computeStatus(d.tanggal, d.status),
        }));
        setList(mapped);
      }
    } catch (e) {
      console.log('Kegiatan fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!form.judul || !form.tanggal || !form.lokasi) { Alert.alert('Error', 'Judul, tanggal, dan lokasi wajib diisi'); return; }
    setSaving(true);
    try {
      const status = computeStatus(form.tanggal, 'Mendatang');
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('kegiatan').insert({ judul: form.judul, tanggal: form.tanggal, waktu: form.waktu, lokasi: form.lokasi, deskripsi: form.deskripsi, status });
        if (error) throw error;
      }
      DataCache.clear('kegiatan_list');
      DataCache.clear('dashboard_stats');
      setList(prev => [{ id: Date.now().toString(), ...form, status }, ...prev]);
      setModalVisible(false);
      setForm(EMPTY_FORM);
    } catch (e: any) { Alert.alert('Error', e.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const filtered = list.filter(k => filterStatus === 'semua' || k.status === filterStatus);

  const renderItem = ({ item }: { item: Kegiatan }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.badge, item.status === 'Mendatang' ? styles.badgeMendatang : styles.badgeSelesai]}>
          <Text style={[styles.badgeText, { color: item.status === 'Mendatang' ? '#e65100' : '#2e7d32' }]}>{item.status}</Text>
        </View>
        <Text style={styles.cardDate}>{item.tanggal}</Text>
      </View>
      <Text style={styles.cardTitle}>{item.judul}</Text>
      <Text style={styles.cardInfo}>🕐 {item.waktu}  📍 {item.lokasi}</Text>
      {!!item.deskripsi && <Text style={styles.cardDesc}>{item.deskripsi}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kegiatan RW 09</Text>
        {isAdmin && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Tambah</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{list.length}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: '#e65100' }]}>{list.filter(k => k.status === 'Mendatang').length}</Text>
          <Text style={styles.statLbl}>Mendatang</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: '#2e7d32' }]}>{list.filter(k => k.status === 'Selesai').length}</Text>
          <Text style={styles.statLbl}>Selesai</Text>
        </View>
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        {(['semua', 'Mendatang', 'Selesai'] as const).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterBtn, filterStatus === s && styles.filterActive]}
            onPress={() => setFilterStatus(s)}
          >
            <Text style={[styles.filterText, filterStatus === s && styles.filterTextActive]}>
              {s === 'semua' ? 'Semua Status' : s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <CardListSkeleton count={4} />
      ) : (
        <FlatList style={{ flex: 1 }} data={filtered} renderItem={renderItem} keyExtractor={i => i.id} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Belum ada kegiatan</Text></View>}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Tambah Kegiatan</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView>
              {[
                { label: 'Judul Kegiatan', key: 'judul', placeholder: 'Contoh: Kerja Bakti' },
                { label: 'Tanggal (YYYY-MM-DD)', key: 'tanggal', placeholder: '2024-11-15' },
                { label: 'Waktu', key: 'waktu', placeholder: '08:00 WIB' },
                { label: 'Lokasi', key: 'lokasi', placeholder: 'Contoh: Balai Warga RW 09' },
              ].map(f => (
                <View key={f.key}>
                  <Text style={styles.inputLabel}>{f.label}</Text>
                  <TextInput style={styles.input} placeholder={f.placeholder} placeholderTextColor="#999" value={(form as any)[f.key]} onChangeText={t => setForm(p => ({ ...p, [f.key]: t }))} />
                </View>
              ))}
              <Text style={styles.inputLabel}>Deskripsi (opsional)</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Deskripsi kegiatan..." placeholderTextColor="#999" multiline value={form.deskripsi} onChangeText={t => setForm(p => ({ ...p, deskripsi: t }))} />
              <TouchableOpacity style={[styles.submitBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Simpan Kegiatan</Text>}
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
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  statVal: { fontSize: 26, fontWeight: 'bold', color: '#00216e' },
  statLbl: { fontSize: 11, color: '#666', marginTop: 3 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 14 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  filterActive: { backgroundColor: '#00216e', borderColor: '#00216e' },
  filterText: { fontSize: 12, color: '#666', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  loadingText: { marginTop: 10, color: '#666', fontSize: 13 },
  emptyText: { color: '#999', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeMendatang: { backgroundColor: '#fff3e0' },
  badgeSelesai: { backgroundColor: '#e8f5e9' },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#333' },
  cardDate: { fontSize: 11, color: '#bb0013', fontWeight: 'bold' },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#1a1c1c', marginBottom: 6 },
  cardInfo: { fontSize: 12, color: '#666', marginBottom: 6 },
  cardDesc: { fontSize: 12, color: '#888', lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', padding: 20 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#00216e' },
  closeX: { fontSize: 22, color: '#999' },
  inputLabel: { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12, fontSize: 14, borderWidth: 1, borderColor: '#e0e0e0' },
  submitBtn: { backgroundColor: '#00216e', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
