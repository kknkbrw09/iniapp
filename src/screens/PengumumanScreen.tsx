import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pengumuman } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CardListSkeleton } from '../components/SkeletonLoader';
import { logger } from '../utils/logger';
import { PengumumanIcon } from '../components/TabIcons';

const LIST_RT = Array.from({ length: 18 }, (_, i) => `RT ${String(i + 1).padStart(3, '0')}`);

const isRtMatch = (itemRt?: string, targetRt?: string) => {
  if (!targetRt || targetRt.toLowerCase() === 'semua') return true;
  if (!itemRt) return false;
  const num1 = itemRt.replace(/\D/g, '');
  const num2 = targetRt.replace(/\D/g, '');
  if (num1 && num2) {
    return parseInt(num1, 10) === parseInt(num2, 10);
  }
  return itemRt.toLowerCase().trim() === targetRt.toLowerCase().trim();
};

const EMPTY_FORM = { judul: '', tanggal: '', isi: '', penting: false, kategori: 'Informasi', rt: 'Semua RT' };

export default function PengumumanScreen() {
  const { userRt, guestRt, isRwAdmin, isRtAdmin, isAdmin } = useAuth();
  const [list, setList] = useState<(Pengumuman & { rt?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedRt, setSelectedRt] = useState<string>('semua');

  const activeRt = userRt || guestRt;
  const isRtScoped = !!activeRt && !isRwAdmin;

  useEffect(() => {
    if (isRtScoped && activeRt) {
      setSelectedRt(activeRt);
      setForm(prev => ({ ...prev, rt: activeRt }));
    }
  }, [isRtScoped, activeRt]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      logger.addLog('API', 'GET /pengumuman', 'Fetching pengumuman from Supabase...');
      const { data, error } = await supabase.from('pengumuman').select('*').order('created_at', { ascending: false });
      if (data && !error) {
        logger.addLog('SUCCESS', 'HTTP 200 OK — GET /pengumuman', `Loaded ${data.length} records`);
        const mapped = data.map((d: any) => ({
          id: d.id,
          judul: d.judul,
          tanggal: d.tanggal,
          isi: d.isi,
          penting: d.penting,
          kategori: d.kategori,
          rt: d.rt || 'Semua RT',
        }));
        setList(mapped);
      }
    } catch (e) {
      console.log('Pengumuman fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!form.judul || !form.isi) { Alert.alert('Error', 'Judul dan isi wajib diisi'); return; }
    setSaving(true);
    try {
      const today = new Date();
      const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      const dateStr = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
      const penting = form.kategori === 'Penting';
      const targetRt = isRtScoped && activeRt ? activeRt : (form.rt || 'Semua RT');

      if (isSupabaseConfigured) {
        const { error } = await supabase.from('pengumuman').insert({
          judul: form.judul,
          tanggal: dateStr,
          isi: form.isi,
          penting,
          kategori: form.kategori,
          rt: targetRt
        });
        if (error) throw error;
      }

      setList(prev => [{ id: Date.now().toString(), judul: form.judul, tanggal: dateStr, isi: form.isi, penting, kategori: form.kategori, rt: targetRt }, ...prev]);
      setModalVisible(false);
      setForm(EMPTY_FORM);
    } catch (e: any) { Alert.alert('Error', e.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const scopedList = list.filter(p => {
    const itemRt = (p.rt || 'Semua RT').trim();
    if (isRtScoped && activeRt) {
      return (
        itemRt.toLowerCase() === 'semua rt' ||
        itemRt.toLowerCase() === 'semua' ||
        itemRt.toLowerCase() === 'rw 09' ||
        isRtMatch(itemRt, activeRt)
      );
    }
    if (selectedRt === 'semua') return true;
    return (
      itemRt.toLowerCase() === 'semua rt' ||
      itemRt.toLowerCase() === 'semua' ||
      itemRt.toLowerCase() === 'rw 09' ||
      isRtMatch(itemRt, selectedRt)
    );
  });

  const renderItem = ({ item }: { item: Pengumuman & { rt?: string } }) => (
    <View style={styles.card}>
      {item.penting && <View style={[styles.cardAccentBar, { backgroundColor: '#bb0013' }]} />}
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: item.penting ? '#ffebee' : '#e3f2fd' }]}>
          <PengumumanIcon color={item.penting ? '#bb0013' : '#00216e'} size={18} />
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.judul}</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {item.rt ? (
                <View style={[styles.badge, { backgroundColor: '#e0f2fe' }]}>
                  <Text style={[styles.badgeText, { color: '#0369a1' }]}>{item.rt}</Text>
                </View>
              ) : null}
              <View style={[styles.badge, { backgroundColor: item.penting ? '#ffebee' : '#e3f2fd' }]}>
                <Text style={[styles.badgeText, { color: item.penting ? '#bb0013' : '#00216e' }]}>{item.kategori}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.cardDate}>{item.tanggal}</Text>
        </View>
      </View>
      <Text style={styles.cardIsi}>{item.isi}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>{activeRt ? `Pengumuman (${activeRt} & RW)` : 'Pengumuman RW 09'}</Text>
        {isAdmin && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Buat</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter RT Chips */}
      <View style={{ marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {isRtScoped && activeRt ? (
            <View style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#00216e' }}>
              <Text style={{ fontSize: 12, color: '#fff', fontWeight: 'bold' }}>{activeRt} {isAdmin ? '(Pengurus RT)' : '(Wilayah Anda)'} & Pengumuman RW</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#eee', marginRight: 8 },
                  selectedRt === 'semua' && { backgroundColor: '#00216e' }
                ]}
                onPress={() => setSelectedRt('semua')}
              >
                <Text style={[{ fontSize: 12, color: '#444', fontWeight: 'bold' }, selectedRt === 'semua' && { color: '#fff' }]}>
                  Semua RT
                </Text>
              </TouchableOpacity>
              {LIST_RT.map(rt => (
                <TouchableOpacity
                  key={rt}
                  style={[
                    { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#eee', marginRight: 8 },
                    selectedRt === rt && { backgroundColor: '#00216e' }
                  ]}
                  onPress={() => setSelectedRt(rt)}
                >
                  <Text style={[{ fontSize: 12, color: '#444', fontWeight: 'bold' }, selectedRt === rt && { color: '#fff' }]}>
                    {rt}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{scopedList.length}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: '#bb0013' }]}>{scopedList.filter(p => p.penting).length}</Text>
          <Text style={styles.statLbl}>Penting</Text>
        </View>
      </View>

      {loading ? (
        <CardListSkeleton count={4} />
      ) : (
        <FlatList style={{ flex: 1 }} data={scopedList} renderItem={renderItem} keyExtractor={i => i.id} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Belum ada pengumuman</Text></View>}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Buat Pengumuman</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.inputLabel}>Judul Pengumuman</Text>
              <TextInput style={styles.input} placeholder="Masukkan judul pengumuman" placeholderTextColor="#999" value={form.judul} onChangeText={t => setForm(p => ({ ...p, judul: t }))} />

              <Text style={styles.inputLabel}>Kategori</Text>
              <View style={styles.chipRow}>
                {['Penting', 'Pengumuman', 'Rutin'].map(k => (
                  <TouchableOpacity key={k} style={[styles.chip, form.kategori === k && styles.chipActive]} onPress={() => setForm(p => ({ ...p, kategori: k }))}>
                    <Text style={[styles.chipText, form.kategori === k && styles.chipTextActive]}>{k}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Target Wilayah RT</Text>
              {isRtScoped && activeRt ? (
                <View style={[styles.chip, styles.chipActive, { alignSelf: 'flex-start' }]}>
                  <Text style={[styles.chipText, styles.chipTextActive]}>{activeRt}</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                  {['Semua RT', ...LIST_RT].map(rt => (
                    <TouchableOpacity
                      key={rt}
                      style={[styles.chip, (form.rt || 'Semua RT') === rt && styles.chipActive]}
                      onPress={() => setForm(p => ({ ...p, rt }))}
                    >
                      <Text style={[styles.chipText, (form.rt || 'Semua RT') === rt && styles.chipTextActive]}>{rt}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <Text style={styles.inputLabel}>Isi Pengumuman</Text>
              <TextInput style={[styles.input, { height: 120, textAlignVertical: 'top' }]} placeholder="Tuliskan isi pengumuman lengkap..." placeholderTextColor="#999" multiline value={form.isi} onChangeText={t => setForm(p => ({ ...p, isi: t }))} />

              <TouchableOpacity style={[styles.submitBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Publikasikan</Text>}
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
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  loadingText: { marginTop: 10, color: '#666', fontSize: 13 },
  emptyText: { color: '#999', fontSize: 14 },
  card: { position: 'relative', overflow: 'hidden', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#edf2f7', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  cardAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  icon: { fontSize: 20 },
  cardMeta: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a1c1c', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  cardDate: { fontSize: 11, color: '#999' },
  cardIsi: { fontSize: 13, color: '#666', lineHeight: 19 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', padding: 20 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#00216e' },
  closeX: { fontSize: 22, color: '#999' },
  inputLabel: { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12, fontSize: 14, borderWidth: 1, borderColor: '#e0e0e0' },
  chipRow: { flexDirection: 'row', marginBottom: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#f5f5f5', marginRight: 10, borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: '#00216e', borderColor: '#00216e' },
  chipText: { fontSize: 12, color: '#666' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#00216e', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
