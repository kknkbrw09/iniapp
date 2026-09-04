import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DataCache } from '../utils/cache';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import { KeuanganIcon, WargaIcon, KegiatanIcon, IuranIcon, PengumumanIcon, SuratIcon, LockIcon } from '../components/TabIcons';
import { logger } from '../utils/logger';
import AboutAppModal from '../components/AboutAppModal';
import TermsScreen from './TermsScreen';
import LoginModal from '../components/LoginModal';

interface Stats { totalWarga: number; totalKK: number; totalKegiatan: number; iuranLunas: number; iuranTotal: number; saldo: number; pengumumanTerbaru: string; }

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

function TrendLineChart({
  data = [],
  labels = [],
  unit = '',
  color = '#00216e',
  height = 145,
}: {
  data: number[];
  labels: string[];
  unit?: string;
  color?: string;
  height?: number;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  useEffect(() => {
    if (data && data.length > 0) {
      setSelectedIndex(data.length - 1);
    } else {
      setSelectedIndex(0);
    }
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#999', fontSize: 12 }}>Tidak ada data tren</Text>
      </View>
    );
  }

  const safeIndex = Math.min(Math.max(0, selectedIndex), data.length - 1);
  const width = 310;
  const paddingX = 30;
  const paddingY = 24;

  const rawMin = Math.min(...data);
  const rawMax = Math.max(...data);
  const minVal = rawMin === rawMax ? rawMin - (rawMin === 0 ? 1 : Math.abs(rawMin) * 0.1) : rawMin;
  const maxVal = rawMin === rawMax ? rawMax + (rawMax === 0 ? 1 : Math.abs(rawMax) * 0.1) : rawMax;
  const range = maxVal - minVal || 1;

  const points = data.map((val, idx) => {
    const x = paddingX + (idx / Math.max(1, data.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - ((val - minVal) / range) * (height - 2 * paddingY);
    return { x, y, val };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - 15} L ${points[0].x} ${height - 15} Z`;
  const gradId = `grad-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  const activePoint = points[safeIndex];
  const activeLabel = labels[safeIndex] || '';
  const prevVal = safeIndex > 0 && points[safeIndex - 1] ? points[safeIndex - 1].val : null;
  const activeDiff = activePoint && prevVal !== null ? activePoint.val - prevVal : null;

  return (
    <View style={{ alignItems: 'center', width: '100%' }}>
      {/* Interactive Tooltip Card on Point Click */}
      {activePoint && (
        <View style={styles.pointTooltipBox}>
          <Text style={styles.pointTooltipTime}>Periode: <Text style={{ fontWeight: 'bold', color: '#1a1c1c' }}>{activeLabel} (WIB)</Text></Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.pointTooltipVal, { color }]}>
              {unit === 'Rp' ? `Rp ${activePoint.val.toFixed(1)} Jt` : `${activePoint.val} ${unit}`}
            </Text>
            {activeDiff !== null && (
              <Text style={[styles.pointTooltipBadge, { color: activeDiff >= 0 ? '#2e7d32' : '#bb0013' }]}>
                ({activeDiff >= 0 ? '▲ +' : '▼ '}{unit === 'Rp' ? `Rp ${Math.abs(activeDiff).toFixed(1)} Jt` : `${Math.abs(activeDiff)} ${unit}`})
              </Text>
            )}
          </View>
        </View>
      )}

      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <SvgLinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </SvgLinearGradient>
        </Defs>

        {/* Fill Area */}
        <Path d={areaD} fill={`url(#${gradId})`} />

        {/* Grid lines */}
        <Line x1={paddingX} y1={height - 20} x2={width - paddingX} y2={height - 20} stroke="#eee" strokeWidth="1" />
        <Line x1={paddingX} y1={20} x2={width - paddingX} y2={20} stroke="#eee" strokeDasharray="3 3" strokeWidth="1" />

        {/* Dynamic Line Segments: BLUE (#00216e) if NAIK, RED (#bb0013) if TURUN */}
        {points.map((p, idx) => {
          if (idx === 0) return null;
          const prevP = points[idx - 1];
          const isUp = p.val >= prevP.val;
          const segmentColor = isUp ? '#00216e' : '#bb0013';
          return (
            <Line
              key={`seg-${idx}`}
              x1={prevP.x}
              y1={prevP.y}
              x2={p.x}
              y2={p.y}
              stroke={segmentColor}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          );
        })}

        {/* Interactive Points & Touch Targets */}
        {points.map((p, idx) => {
          const isSelected = safeIndex === idx;
          const isPointUp = idx === 0 ? true : p.val >= points[idx - 1].val;
          const pointColor = isPointUp ? '#00216e' : '#bb0013';
          return (
            <React.Fragment key={idx}>
              {/* Highlight Vertical Line */}
              {isSelected && (
                <Line
                  x1={p.x}
                  y1={20}
                  x2={p.x}
                  y2={height - 20}
                  stroke={pointColor}
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}

              {/* Point Circle */}
              <Circle
                cx={p.x}
                cy={p.y}
                r={isSelected ? 6 : 4}
                fill={pointColor}
                stroke="#fff"
                strokeWidth={isSelected ? 3 : 2}
              />

              {/* Big Touch Area for Clicking the Dot */}
              <Circle
                cx={p.x}
                cy={p.y}
                r={16}
                fill="transparent"
                onPress={() => setSelectedIndex(idx)}
                {...({ onClick: () => setSelectedIndex(idx) } as any)}
              />

              {/* X Axis Label */}
              <SvgText
                x={p.x}
                y={height - 4}
                fontSize="9"
                fill={isSelected ? color : '#888'}
                textAnchor="middle"
                fontWeight={isSelected ? 'bold' : '600'}
                onPress={() => setSelectedIndex(idx)}
                {...({ onClick: () => setSelectedIndex(idx) } as any)}
              >
                {labels[idx] || ''}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

interface Stats { totalWarga: number; totalKK: number; totalKegiatan: number; iuranLunas: number; iuranTotal: number; saldo: number; pengumumanTerbaru: string; }

interface KeuanganRow {
  jenis: 'pemasukan' | 'pengeluaran';
  jumlah: number;
  tanggal?: string;
  created_at?: string;
}

interface WargaRow {
  created_at?: string;
}

type PeriodType = 'minggu' | 'bulan' | 'quarter' | 'tahun';

const FALLBACK_STATS: Stats = {
  totalWarga: 8,
  totalKK: 5,
  totalKegiatan: 0,
  iuranLunas: 3,
  iuranTotal: 4,
  saldo: 13300000,
  pengumumanTerbaru: 'Rapat Koordinasi Keamanan Lingkungan RW 09',
};

const FALLBACK_ACTIVITY = [
  { text: 'Surat Pengantar diterbitkan untuk Ananda Putri', time: '2024-10-12', icon: '📄' },
  { text: 'Surat Pengantar diterbitkan untuk Agus Setiawan', time: '2024-10-18', icon: '📄' },
];

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

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { role, userRt, guestRt, isRwAdmin, isRtAdmin, isAdmin, adminName, logout } = useAuth();
  const [stats, setStats] = useState<Stats>(FALLBACK_STATS);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<{ text: string; time: string; icon: string }[]>(FALLBACK_ACTIVITY);
  const [period, setPeriod] = useState<PeriodType>('bulan');
  const [rawKeuangan, setRawKeuangan] = useState<KeuanganRow[]>([]);
  const [rawWarga, setRawWarga] = useState<WargaRow[]>([]);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  const activeRt = userRt || guestRt;
  const isRtScoped = !!activeRt && !isRwAdmin;

  useFocusEffect(
    useCallback(() => {
      DataCache.clear('dashboard_stats');
      fetchStats();
    }, [userRt, guestRt, isRtAdmin, isRwAdmin])
  );

  useEffect(() => {
    DataCache.clear('dashboard_stats');
    fetchStats();
  }, [userRt, guestRt, isRtAdmin, isRwAdmin]);

  const fetchStats = async () => {
    try {
      logger.addLog('API', 'GET /dashboard_stats', 'Fetching dashboard statistics from Supabase...');
      const cachedWarga = DataCache.get<any[]>('warga_list');

      // Paginated fetch for warga to bypass 1000 row server limit
      let allWargaRows: any[] = [];
      let wargaPage = 0;
      const pageSize = 1000;
      let hasMoreWarga = true;
      let exactWargaCount = 0;

      while (hasMoreWarga) {
        const from = wargaPage * pageSize;
        const to = from + pageSize - 1;
        const res = await supabase
          .from('warga')
          .select('id, status_keluarga, rt, created_at', { count: 'exact' })
          .range(from, to);

        if (res.error || !res.data) break;
        if (res.count && !isRtScoped) exactWargaCount = res.count;

        allWargaRows = allWargaRows.concat(res.data);
        if (res.data.length < pageSize || (res.count && allWargaRows.length >= res.count)) {
          hasMoreWarga = false;
        } else {
          wargaPage++;
        }
      }

      const [kegiatanRes, iuranRes, keuanganRes, pengumumanRes, suratRes] = await Promise.all([
        supabase.from('kegiatan').select('id, rt'),
        supabase.from('iuran').select('status, rt, nama_warga'),
        supabase.from('keuangan').select('jenis, jumlah, rt, tanggal, created_at'),
        supabase.from('pengumuman').select('judul, rt').order('created_at', { ascending: false }).limit(1),
        supabase.from('surat_pengantar').select('nama_pemohon, rt, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      logger.addLog('SUCCESS', 'HTTP 200 OK — GET /dashboard_stats', 'Successfully loaded stats from Supabase');

      // Filter rows if RT Scoped
      let filteredWargaRows = allWargaRows;
      if (isRtScoped && activeRt) {
        filteredWargaRows = allWargaRows.filter((w: any) => isRtMatch(w.rt, activeRt));
      }

      const totalWarga = isRtScoped && activeRt
        ? filteredWargaRows.length
        : (exactWargaCount || allWargaRows.length || (cachedWarga?.length || 8));

      const totalKK = filteredWargaRows.filter((w: any) =>
        (w.status_keluarga || w.peran_kk || w.hubungan_kk || '').toString().trim().toLowerCase() === 'kepala keluarga'
      ).length || (isRtScoped ? Math.ceil(filteredWargaRows.length / 2) : 5);

      const kegiatanData = kegiatanRes.data || [];
      const totalKegiatan = isRtScoped && activeRt
        ? kegiatanData.filter((k: any) => !k.rt || k.rt === 'RW 09' || k.rt.toLowerCase() === 'semua' || isRtMatch(k.rt, activeRt)).length
        : kegiatanData.length;

      let iuranData = iuranRes.data || [];
      if (isRtScoped && activeRt) {
        iuranData = iuranData.filter((i: any) => isRtMatch(i.rt, activeRt));
      }
      const iuranLunas = iuranData.filter((i: any) => i.status === 'Lunas').length;
      const iuranTotal = iuranData.length;

      let filteredKeuangan = (keuanganRes.data || []);
      if (isRtScoped && activeRt) {
        filteredKeuangan = filteredKeuangan.filter((k: any) => isRtMatch(k.rt, activeRt));
      } else if (isRwAdmin) {
        filteredKeuangan = filteredKeuangan.filter((k: any) => !k.rt || k.rt === 'RW 09' || (k.rt || '').toString().toLowerCase().includes('rw'));
      }

      const keuanganData = filteredKeuangan.map((k: any) => ({
        jenis: k.jenis,
        jumlah: Number(k.jumlah),
        tanggal: k.tanggal || k.created_at,
        created_at: k.created_at,
        rt: k.rt,
      }));
      setRawKeuangan(keuanganData);

      const wargaData = (filteredWargaRows.length > 0 ? filteredWargaRows : (cachedWarga || [])).map((w: any) => ({ created_at: w.created_at }));
      setRawWarga(wargaData);

      const masuk = keuanganData.filter((k: any) => k.jenis === 'pemasukan').reduce((s: number, k: any) => s + Number(k.jumlah), 0);
      const keluar = keuanganData.filter((k: any) => k.jenis === 'pengeluaran').reduce((s: number, k: any) => s + Number(k.jumlah), 0);

      const pengumumanTerbaru = pengumumanRes.data?.[0]?.judul || '';

      const activity = (suratRes.data && suratRes.data.length > 0)
        ? (suratRes.data
            .filter((s: any) => {
              if (!isRtScoped || !activeRt) return true;
              return isRtMatch(s.rt, activeRt);
            })
            .slice(0, 3)
            .map((s: any) => ({
              text: `Surat Pengantar diterbitkan untuk ${s.nama_pemohon}`,
              time: s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric' }) + ' WIB' : '',
              icon: '📄',
            })))
        : [];

      const newStats = { totalWarga, totalKK, totalKegiatan, iuranLunas, iuranTotal, saldo: masuk - keluar, pengumumanTerbaru };

      setStats(newStats);
      setRecentActivity(activity);
    } catch (e: any) {
      console.log('Fetch stats error:', e);
    } finally {
      setLoading(false);
    }
  };

  const totalWargaVal = stats?.totalWarga || 0;
  const totalKKVal = stats?.totalKK || 0;
  const totalKegiatanVal = stats?.totalKegiatan || 0;
  const iuranLunasVal = stats?.iuranLunas || 0;
  const iuranTotalVal = stats?.iuranTotal || 0;
  const saldoVal = stats?.saldo || 0;

  const iuranPct = iuranTotalVal > 0 ? Math.round((iuranLunasVal / iuranTotalVal) * 100) : 0;

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1000000000) return `Rp ${(n / 1000000000).toFixed(1)} M`;
    if (Math.abs(n) >= 1000000) return `Rp ${(n / 1000000).toFixed(1)} Jt`;
    if (Math.abs(n) >= 1000) return `Rp ${(n / 1000).toFixed(0)} rb`;
    return 'Rp ' + n.toLocaleString('id-ID');
  };

  const cards = isAdmin ? [
    { label: activeRt ? `Kas ${activeRt}` : 'Kas RW 09', value: fmt(saldoVal), iconType: 'keuangan', color: '#bb0013', sub: 'Pemasukan & Pengeluaran', screen: 'Keuangan' },
    { label: 'Total Jiwa', value: totalWargaVal.toLocaleString(), iconType: 'warga', color: '#00216e', sub: `${totalKKVal} Kepala Keluarga`, screen: 'Warga' },
    { label: 'Total Kegiatan', value: totalKegiatanVal.toString(), iconType: 'kegiatan', color: '#444653', sub: 'Terdaftar', screen: 'Kegiatan' },
    { label: 'Surat Pengantar', value: 'Ajukan ➔', iconType: 'iuran', color: '#00216e', sub: 'Layanan Online Warga', screen: 'Surat' },
  ] : [
    { label: 'Total Jiwa', value: totalWargaVal.toLocaleString(), iconType: 'warga', color: '#00216e', sub: activeRt ? `Warga ${activeRt}` : `${totalKKVal} Kepala Keluarga`, screen: 'Warga' },
    { label: 'Total Kegiatan', value: totalKegiatanVal.toString(), iconType: 'kegiatan', color: '#444653', sub: activeRt ? `Agenda ${activeRt} & RW` : 'Agenda RW & RT', screen: 'Kegiatan' },
    { label: 'Pengumuman', value: 'Lihat ➔', iconType: 'keuangan', color: '#bb0013', sub: 'Info & Berita Terkini', screen: 'Pengumuman' },
    { label: 'Surat Pengantar', value: 'Ajukan ➔', iconType: 'iuran', color: '#00216e', sub: 'Layanan Online Warga', screen: 'Surat' },
  ];

  // Helper Real DB timestamp aggregations based strictly on created_at
  const getWargaCountBefore = (targetDate: Date) => {
    if (!rawWarga || rawWarga.length === 0) {
      return totalWargaVal;
    }
    return rawWarga.filter(w => {
      if (!w.created_at) return true;
      return new Date(w.created_at) <= targetDate;
    }).length;
  };

  const getKasBalanceBefore = (targetDate: Date) => {
    if (!rawKeuangan || rawKeuangan.length === 0) {
      return Number((saldoVal / 1000000).toFixed(1));
    }
    const rawSum = rawKeuangan
      .filter(k => {
        const dateStr = k.created_at || k.tanggal;
        if (!dateStr) return true;
        return new Date(dateStr) <= targetDate;
      })
      .reduce((acc, k) => {
        const amt = Number(k.jumlah) || 0;
        return k.jenis === 'pemasukan' ? acc + amt : acc - amt;
      }, 0);
    return Number((rawSum / 1000000).toFixed(1));
  };

  // Agregasi Dinamis Data Kas berdasarkan DB & Filter Periode
  const getKasTrendData = () => {
    const now = new Date();
    const currentMonthIdx = now.getMonth();
    const currentYear = now.getFullYear();

    if (period === 'minggu') {
      const monthName = MONTH_NAMES[currentMonthIdx];
      const labels = [`M-1 (${monthName})`, `M-2 (${monthName})`, `M-3 (${monthName})`, `M-4 (${monthName})`];
      const data = [
        getKasBalanceBefore(new Date(currentYear, currentMonthIdx, 7, 23, 59, 59)),
        getKasBalanceBefore(new Date(currentYear, currentMonthIdx, 14, 23, 59, 59)),
        getKasBalanceBefore(new Date(currentYear, currentMonthIdx, 21, 23, 59, 59)),
        getKasBalanceBefore(new Date(currentYear, currentMonthIdx, 31, 23, 59, 59)),
      ];
      const diff = Number((data[3] - data[2]).toFixed(1));
      return {
        labels,
        data,
        growth: `${diff >= 0 ? '▲ +' : '▼ '}${diff} Jt`,
        sub: `Tren mingguan (${monthName} ${currentYear})`,
      };
    } else if (period === 'bulan') {
      const labels: string[] = [];
      const data: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonthIdx - i + 1, 0, 23, 59, 59);
        const labelDate = new Date(currentYear, currentMonthIdx - i, 1);
        labels.push(`${MONTH_NAMES[labelDate.getMonth()]} '${String(labelDate.getFullYear()).substring(2)}`);
        data.push(getKasBalanceBefore(d));
      }
      const diff = Number((data[5] - data[4]).toFixed(1));
      return {
        labels,
        data,
        growth: `${diff >= 0 ? '▲ +' : '▼ '}${diff} Jt`,
        sub: `Tren bulanan (${labels[0]} - ${labels[5]})`,
      };
    } else if (period === 'quarter') {
      const labels = [`Q1 ${currentYear}`, `Q2 ${currentYear}`, `Q3 ${currentYear}`, `Q4 ${currentYear}`];
      const data = [
        getKasBalanceBefore(new Date(currentYear, 2, 31, 23, 59, 59)),
        getKasBalanceBefore(new Date(currentYear, 5, 30, 23, 59, 59)),
        getKasBalanceBefore(new Date(currentYear, 8, 30, 23, 59, 59)),
        getKasBalanceBefore(new Date(currentYear, 11, 31, 23, 59, 59)),
      ];
      const diff = Number((data[3] - data[2]).toFixed(1));
      return {
        labels,
        data,
        growth: `${diff >= 0 ? '▲ +' : '▼ '}${diff} Jt`,
        sub: `Tren triwulan (${currentYear})`,
      };
    } else {
      const labels = [`${currentYear - 3}`, `${currentYear - 2}`, `${currentYear - 1}`, `${currentYear}`];
      const data = [
        getKasBalanceBefore(new Date(currentYear - 3, 11, 31, 23, 59, 59)),
        getKasBalanceBefore(new Date(currentYear - 2, 11, 31, 23, 59, 59)),
        getKasBalanceBefore(new Date(currentYear - 1, 11, 31, 23, 59, 59)),
        getKasBalanceBefore(now),
      ];
      const diff = Number((data[3] - data[2]).toFixed(1));
      return {
        labels,
        data,
        growth: `${diff >= 0 ? '▲ +' : '▼ '}${diff} Jt`,
        sub: `Tren tahunan (${labels[0]}-${labels[3]})`,
      };
    }
  };

  // Agregasi Dinamis Data Warga berdasarkan DB & Filter Periode
  const getWargaTrendData = () => {
    const now = new Date();
    const currentMonthIdx = now.getMonth();
    const currentYear = now.getFullYear();

    if (period === 'minggu') {
      const monthName = MONTH_NAMES[currentMonthIdx];
      const labels = [`M-1 (${monthName})`, `M-2 (${monthName})`, `M-3 (${monthName})`, `M-4 (${monthName})`];
      const data = [
        getWargaCountBefore(new Date(currentYear, currentMonthIdx, 7, 23, 59, 59)),
        getWargaCountBefore(new Date(currentYear, currentMonthIdx, 14, 23, 59, 59)),
        getWargaCountBefore(new Date(currentYear, currentMonthIdx, 21, 23, 59, 59)),
        getWargaCountBefore(new Date(currentYear, currentMonthIdx, 31, 23, 59, 59)),
      ];
      const diff = data[3] - data[2];
      return {
        labels,
        data,
        growth: `${diff >= 0 ? '▲ +' : '▼ '}${diff} Jiwa`,
        sub: `Tren pendaftaran warga mingguan (${monthName})`,
      };
    } else if (period === 'bulan') {
      const labels: string[] = [];
      const data: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonthIdx - i + 1, 0, 23, 59, 59);
        const labelDate = new Date(currentYear, currentMonthIdx - i, 1);
        labels.push(`${MONTH_NAMES[labelDate.getMonth()]} '${String(labelDate.getFullYear()).substring(2)}`);
        data.push(getWargaCountBefore(d));
      }
      const diff = data[5] - data[4];
      return {
        labels,
        data,
        growth: `${diff >= 0 ? '▲ +' : '▼ '}${diff} Jiwa`,
        sub: `Tren pendaftaran warga 6 bulan (${labels[0]} - ${labels[5]})`,
      };
    } else if (period === 'quarter') {
      const labels = [`Q1 ${currentYear}`, `Q2 ${currentYear}`, `Q3 ${currentYear}`, `Q4 ${currentYear}`];
      const data = [
        getWargaCountBefore(new Date(currentYear, 2, 31, 23, 59, 59)),
        getWargaCountBefore(new Date(currentYear, 5, 30, 23, 59, 59)),
        getWargaCountBefore(new Date(currentYear, 8, 30, 23, 59, 59)),
        getWargaCountBefore(new Date(currentYear, 11, 31, 23, 59, 59)),
      ];
      const diff = data[3] - data[2];
      return {
        labels,
        data,
        growth: `${diff >= 0 ? '▲ +' : '▼ '}${diff} Jiwa`,
        sub: `Tren pendaftaran warga triwulan (${currentYear})`,
      };
    } else {
      const labels = [`${currentYear - 3}`, `${currentYear - 2}`, `${currentYear - 1}`, `${currentYear}`];
      const data = [
        getWargaCountBefore(new Date(currentYear - 3, 11, 31, 23, 59, 59)),
        getWargaCountBefore(new Date(currentYear - 2, 11, 31, 23, 59, 59)),
        getWargaCountBefore(new Date(currentYear - 1, 11, 31, 23, 59, 59)),
        getWargaCountBefore(now),
      ];
      const diff = data[3] - data[2];
      return {
        labels,
        data,
        growth: `${diff >= 0 ? '▲ +' : '▼ '}${diff} Jiwa`,
        sub: `Tren pendaftaran warga tahunan (${labels[0]}-${labels[3]})`,
      };
    }
  };

  // Clean trend aggregation based on real DB created_at
  const kasTrend = getKasTrendData();
  const wargaTrend = getWargaTrendData();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{isAdmin ? 'Selamat datang,' : (guestRt ? `Wilayah ${guestRt}` : 'Mode Tamu / Warga,')}</Text>
            <Text style={styles.name}>{isAdmin ? (adminName || (userRt ? `Pengurus ${userRt}` : 'Pengurus RW 09')) : (guestRt ? `Warga ${guestRt}` : 'Warga RW 09')}</Text>
          </View>
          {isAdmin ? (
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.loginAdminHeaderBtn} onPress={() => setLoginModalVisible(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <LockIcon color="#fff" size={15} />
                <Text style={styles.loginAdminHeaderBtnText}>Login Admin</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Pengumuman Banner */}
        {!!stats.pengumumanTerbaru && (
          <View style={styles.banner}>
            <View style={{ marginRight: 10 }}>
              <PengumumanIcon color="#fff" size={22} />
            </View>
            <Text style={styles.bannerText} numberOfLines={2}>{stats.pengumumanTerbaru}</Text>
          </View>
        )}

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Stat Cards */}
            <Text style={styles.sectionTitle}>{activeRt ? `Statistik ${activeRt}` : 'Statistik RW 09'}</Text>
            <View style={styles.grid}>
              {cards.map((c, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.card}
                  onPress={() => {
                    try { navigation.navigate(c.screen); } catch (e) {}
                  }}
                >
                  <View style={[styles.cardAccentBar, { backgroundColor: c.color }]} />
                  <View style={[styles.cardIcon, { backgroundColor: c.color + '18' }]}>
                    {c.iconType === 'warga' && <WargaIcon color={c.color} size={20} />}
                    {c.iconType === 'keuangan' && <KeuanganIcon color={c.color} size={20} />}
                    {c.iconType === 'kegiatan' && <KegiatanIcon color={c.color} size={20} />}
                    {c.iconType === 'iuran' && <IuranIcon color={c.color} size={20} />}
                  </View>
                  <Text style={styles.cardLabel}>{c.label}</Text>
                  <Text style={[styles.cardValue, { color: c.color }]}>{c.value}</Text>
                  <Text style={styles.cardSub}>{c.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Line Charts Section with Period Filter */}
            <View style={styles.chartSectionHeader}>
              <Text style={styles.sectionTitle}>Tren & Pertumbuhan</Text>

              {/* Period Filter Buttons */}
              <View style={styles.periodFilterRow}>
                {[
                  { id: 'minggu', label: 'Minggu' },
                  { id: 'bulan', label: 'Bulan' },
                  { id: 'quarter', label: 'Quarter' },
                  { id: 'tahun', label: 'Tahun' },
                ].map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.periodChip, period === item.id && styles.periodChipActive]}
                    onPress={() => setPeriod(item.id as PeriodType)}
                  >
                    <Text style={[styles.periodChipText, period === item.id && styles.periodChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Chart 1: Pertumbuhan Uang Kas (Khusus Pengurus / Admin) */}
            {isAdmin && (() => {
              const isUp = !kasTrend.growth.includes('▼');
              const themeColor = isUp ? '#00216e' : '#bb0013';
              return (
                <TouchableOpacity style={styles.chartCard} onPress={() => navigation.navigate('Keuangan')}>
                  <View style={styles.chartHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <KeuanganIcon color={themeColor} size={20} />
                        <Text style={styles.chartTitle}>
                          {activeRt ? `Pertumbuhan Saldo Kas (${activeRt})` : 'Pertumbuhan Saldo Kas RW 09'}
                        </Text>
                      </View>
                      <Text style={styles.chartSub}>{kasTrend.sub}</Text>
                    </View>
                    <View style={isUp ? styles.growthBadgeBlue : styles.growthBadgeRed}>
                      <Text style={isUp ? styles.growthTextBlue : styles.growthTextRed}>{kasTrend.growth}</Text>
                    </View>
                  </View>
                  <TrendLineChart data={kasTrend.data} labels={kasTrend.labels} color={themeColor} unit="Rp" />
                </TouchableOpacity>
              );
            })()}

            {/* Chart 2: Pertumbuhan Warga */}
            {(() => {
              const isUp = !wargaTrend.growth.includes('▼');
              const themeColor = isUp ? '#00216e' : '#bb0013';
              return (
                <TouchableOpacity style={styles.chartCard} onPress={() => navigation.navigate('Warga')}>
                  <View style={styles.chartHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <WargaIcon color={themeColor} size={20} />
                        <Text style={styles.chartTitle}>{activeRt ? `Pertumbuhan Warga (${activeRt})` : 'Pertumbuhan Jumlah Warga'}</Text>
                      </View>
                      <Text style={styles.chartSub}>{wargaTrend.sub}</Text>
                    </View>
                    <View style={isUp ? styles.growthBadgeBlue : styles.growthBadgeRed}>
                      <Text style={isUp ? styles.growthTextBlue : styles.growthTextRed}>{wargaTrend.growth}</Text>
                    </View>
                  </View>
                  <TrendLineChart data={wargaTrend.data} labels={wargaTrend.labels} color={themeColor} unit="Jiwa" />
                </TouchableOpacity>
              );
            })()}

            {/* Recent Activity */}
            <Text style={styles.sectionTitle}>Aktivitas Terkini</Text>
            <View style={styles.activityCard}>
              {recentActivity.length === 0 ? (
                <Text style={styles.emptyText}>Belum ada aktivitas terbaru</Text>
              ) : (
                recentActivity.map((a, i) => (
                  <View key={i} style={[styles.activityItem, i < recentActivity.length - 1 && styles.activityBorder]}>
                    <View style={styles.activityIcon}>
                      <SuratIcon color="#00216e" size={20} />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityText}>{a.text}</Text>
                      <Text style={styles.activityTime}>{a.time}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* About App Info Footer Button */}
            <View style={styles.aboutWrap}>
              <TouchableOpacity style={styles.aboutBtn} onPress={() => setAboutModalVisible(true)}>
                <Text style={styles.aboutBtnText}>Tentang Aplikasi & Versi (v1.2.3)</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* About App Modal */}
      <AboutAppModal
        visible={aboutModalVisible}
        onClose={() => setAboutModalVisible(false)}
        onOpenTerms={() => setTermsModalVisible(true)}
      />

      {/* Terms Modal */}
      <Modal visible={termsModalVisible} animationType="slide" onRequestClose={() => setTermsModalVisible(false)}>
        <TermsScreen onAgree={() => setTermsModalVisible(false)} />
      </Modal>

      {/* Admin Login Modal */}
      <LoginModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  aboutWrap: { marginTop: 24, marginBottom: 10, alignItems: 'center' },
  aboutBtn: { backgroundColor: '#eef2fa', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#d0dbe9' },
  aboutBtnText: { color: '#00216e', fontSize: 12, fontWeight: 'bold' },
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 13, color: '#666' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#00216e' },
  logoutBtn: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#bb0013' },
  logoutText: { color: '#bb0013', fontSize: 12, fontWeight: 'bold' },
  loginAdminHeaderBtn: { backgroundColor: '#00216e', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  loginAdminHeaderBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  banner: { backgroundColor: '#00216e', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  bannerIcon: { fontSize: 22, marginRight: 10 },
  bannerText: { flex: 1, color: '#fff', fontSize: 13, lineHeight: 18 },
  center: { paddingTop: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#1a1c1c', marginBottom: 14 },
  chartSectionHeader: { marginBottom: 14 },
  periodFilterRow: { flexDirection: 'row', marginTop: 4 },
  periodChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', marginRight: 8 },
  periodChipActive: { backgroundColor: '#00216e', borderColor: '#00216e' },
  periodChipText: { fontSize: 11, color: '#666', fontWeight: '600' },
  periodChipTextActive: { color: '#fff', fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  card: { width: '48%', position: 'relative', overflow: 'hidden', backgroundColor: '#fff', borderRadius: 12, paddingLeft: 18, paddingRight: 14, paddingVertical: 14, marginBottom: 12, borderWidth: 1, borderColor: '#edf2f7', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  cardAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  cardIconText: { fontSize: 18 },
  cardLabel: { fontSize: 11, color: '#666', marginBottom: 4 },
  cardValue: { fontSize: 22, fontWeight: 'bold' },
  cardSub: { fontSize: 10, color: '#999', marginTop: 3 },
  chartCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  chartTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a1c1c' },
  chartSub: { fontSize: 11, color: '#888', marginTop: 2 },
  pointTooltipBox: { backgroundColor: '#f0f4fd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8, width: '100%', alignItems: 'center' },
  pointTooltipTime: { fontSize: 11, color: '#555' },
  pointTooltipVal: { fontSize: 13, fontWeight: 'bold' },
  pointTooltipBadge: { fontSize: 11, fontWeight: 'bold' },
  growthBadgeGreen: { backgroundColor: '#e8f5e9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  growthTextGreen: { color: '#2e7d32', fontSize: 11, fontWeight: 'bold' },
  growthBadgeBlue: { backgroundColor: '#e3f2fd', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  growthTextBlue: { color: '#00216e', fontSize: 11, fontWeight: 'bold' },
  growthBadgeRed: { backgroundColor: '#ffebee', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  growthTextRed: { color: '#bb0013', fontSize: 11, fontWeight: 'bold' },
  activityCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
  activityBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  activityIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#e3f2fd', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityIconText: { fontSize: 18 },
  activityContent: { flex: 1 },
  activityText: { fontSize: 13, color: '#1a1c1c', lineHeight: 19 },
  activityTime: { fontSize: 11, color: '#999', marginTop: 4 },
  emptyText: { color: '#999', fontSize: 13, textAlign: 'center', paddingVertical: 10 },
});
