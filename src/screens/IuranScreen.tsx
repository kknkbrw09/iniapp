import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Iuran } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CardListSkeleton } from '../components/SkeletonLoader';
import { logger } from '../utils/logger';

export default function IuranScreen() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [list, setList] = useState<Iuran[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      logger.addLog('API', 'GET /iuran', 'Fetching iuran from Supabase...');
      const { data, error } = await supabase.from('iuran').select('*').order('blok');
      if (data && !error) {
        logger.addLog('SUCCESS', 'HTTP 200 OK — GET /iuran', `Loaded ${data.length} records`);
        const mapped = data.map((d: any) => ({
          id: d.id, blok: d.blok, namaWarga: d.nama_warga,
          bulan: d.bulan, tahun: d.tahun, status: d.status, jumlah: Number(d.jumlah),
        }));
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
    if (!isAdmin) { Alert.alert('Akses Ditolak', 'Hanya admin yang bisa mengubah status'); return; }
    const newStatus = currentStatus === 'Lunas' ? 'Belum' : 'Lunas';
    try {
      if (isSupabaseConfigured) {
        await supabase.from('iuran').update({ status: newStatus }).eq('id', id);
      }
      setList(prev => prev.map(item => item.id === id ? { ...item, status: newStatus as any } : item));
    } catch (e) {
      // update local state anyway
      setList(prev => prev.map(item => item.id === id ? { ...item, status: newStatus as any } : item));
    }
  };

  const lunasCount = list.filter(i => i.status === 'Lunas').length;
  const percentage = list.length > 0 ? Math.round((lunasCount / list.length) * 100) : 0;
  const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  // Donut chart
  const size = 150;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (percentage / 100) * circumference;

  const renderItem = ({ item }: { item: Iuran }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.cardName}>{item.namaWarga}</Text>
          <Text style={styles.cardBlok}>{item.blok}</Text>
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
        <TouchableOpacity
          style={[styles.toggleBtn, !isAdmin && styles.toggleBtnDisabled]}
          onPress={() => toggleStatus(item.id, item.status)}
        >
          <Text style={styles.toggleText}>Ubah Status</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Status Iuran Warga</Text>
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
              <Text style={styles.legendVal}>{list.length - lunasCount} Warga</Text>
              <Text style={styles.legendLbl}>Belum Bayar</Text>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <CardListSkeleton count={4} />
      ) : (
        <FlatList style={{ flex: 1 }} data={list} renderItem={renderItem} keyExtractor={i => i.id} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Belum ada data iuran</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { paddingHorizontal: 20, paddingTop: 20, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#00216e' },
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
  loadingText: { marginTop: 10, color: '#666', fontSize: 13 },
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
  toggleBtnDisabled: { opacity: 0.5 },
  toggleText: { fontSize: 11, fontWeight: 'bold', color: '#00216e' },
});
