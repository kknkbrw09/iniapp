import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Warga } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';
import { CardListSkeleton } from '../components/SkeletonLoader';
import { DataCache } from '../utils/cache';
import { SearchIcon, LockIcon } from '../components/TabIcons';
import LoginModal from '../components/LoginModal';

const extractAndNormalizeRt = (rtVal?: any, alamatVal?: any): string => {
  let str = (rtVal || '').toString().trim();
  if (alamatVal) {
    const match = alamatVal.toString().match(/RT\.?\s*0*([1-9]|1[0-8])\b/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 18) {
        return `RT ${String(num).padStart(3, '0')}`;
      }
    }
  }
  const numOnly = str.replace(/\D/g, '');
  if (numOnly) {
    const parsed = parseInt(numOnly, 10);
    if (parsed >= 1 && parsed <= 18) {
      return `RT ${String(parsed).padStart(3, '0')}`;
    }
  }
  return str || 'RT 001';
};

const isRtMatch = (wRt: string, targetRt: string): boolean => {
  if (!targetRt || targetRt === 'semua') return true;
  const wNorm = extractAndNormalizeRt(wRt);
  const targetNorm = extractAndNormalizeRt(targetRt);
  return wNorm.toLowerCase() === targetNorm.toLowerCase();
};

const LIST_RT = Array.from({ length: 18 }, (_, i) => `RT ${String(i + 1).padStart(3, '0')}`);

const STATUS_KELUARGA_OPTIONS = [
  'Kepala Keluarga',
  'Suami',
  'Istri',
  'Anak',
  'Cucu',
  'Orang Tua',
  'Mertua',
  'Lainnya',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 105 }, (_, i) => (CURRENT_YEAR - i).toString());

const EMPTY_FORM = {
  nama: '',
  noRumah: '',
  rt: 'RT 001',
  rw: 'RW 009',
  status: 'Tetap' as 'Tetap' | 'Kontrak',
  jenisKelamin: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
  tahunLahir: '1998',
  hubunganKk: 'Kepala Keluarga',
  selectedKepalaKkId: '',
};

type CategoryFilter = 'semua' | 'dewasa' | 'remaja' | 'lansia' | 'balita' | 'kk';

export default function WargaScreen() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [selectedWarga, setSelectedWarga] = useState<Warga | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedRt, setSelectedRt] = useState<string>('semua');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('semua');
  const [displayLimit, setDisplayLimit] = useState<number>(5);
  const [expandedKkIds, setExpandedKkIds] = useState<string[]>([]);

  const [showRtDropdown, setShowRtDropdown] = useState(false);
  const [showKkDropdown, setShowKkDropdown] = useState(false);
  const [showTahunDropdown, setShowTahunDropdown] = useState(false);

  useEffect(() => {
    setDisplayLimit(5);
  }, [searchQuery, selectedRt, selectedCategory]);

  const fetchWarga = useCallback(async () => {
    setLoading(true);
    try {
      logger.addLog('API', 'GET /warga', 'Fetching all warga from Supabase...');
      const selectFields = !isAdmin ? 'status_keluarga, gender, tahun_lahir, rt' : '*';

      let allRows: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const res = await supabase
          .from('warga')
          .select(selectFields, { count: 'exact' })
          .range(from, to)
          .order('created_at', { ascending: false });

        if (res.error || !res.data) break;

        allRows = allRows.concat(res.data);

        if (res.data.length < pageSize || (res.count && allRows.length >= res.count)) {
          hasMore = false;
        } else {
          page++;
        }
      }

      logger.addLog('SUCCESS', 'HTTP 200 OK — GET /warga', `Loaded ALL ${allRows.length} records`);

      const mapped: Warga[] = allRows.map((d: any, idx: number) => {
        const tLahir = d.tahun_lahir ? Number(d.tahun_lahir) : (d.tanggal_lahir ? new Date(d.tanggal_lahir).getFullYear() : (CURRENT_YEAR - (Number(d.usia) || 25)));
        const age = CURRENT_YEAR - tLahir;
        const statusKeluarga = d.status_keluarga || d.hubungan_kk || d.peran_kk || 'Kepala Keluarga';
        const isKepala = statusKeluarga.trim().toLowerCase() === 'kepala keluarga';
        const noRumahStr = d.nomor_rumah || d.no_rumah || '';
        const rtStr = extractAndNormalizeRt(d.rt, d.alamat);
        const fullAlamat = d.alamat || (noRumahStr ? `No. ${noRumahStr}, ${rtStr} / RW 09` : `${rtStr} / RW 09, Kebon Bawang`);

        return {
          id: String(d.id || idx + 1),
          nama: d.nama || '',
          nik: '',
          noKk: '',
          alamat: fullAlamat,
          rt: rtStr,
          rw: 'RW 09',
          status: 'Tetap',
          jenisKelamin: d.gender || d.jenis_kelamin || 'Laki-laki',
          usia: age >= 0 ? age : 25,
          tanggalLahir: tLahir.toString(),
          peranKk: isKepala ? 'Kepala Keluarga' : 'Anggota Keluarga',
          hubunganKk: statusKeluarga,
          kepalaKeluargaId: d.kepala_keluarga_id ? String(d.kepala_keluarga_id) : undefined,
          noRumah: noRumahStr,
        };
      });

      setWargaList(mapped);
      if (isAdmin) {
        DataCache.set('warga_list', mapped);
      }
    } catch (e: any) {
      console.log('Fetch warga error:', e);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchWarga();
  }, [fetchWarga]);

const isValidHouseNumber = (no?: string): boolean => {
  if (!no) return false;
  const cleaned = no.toString().trim().toLowerCase();
  if (cleaned.length < 2) return false;
  if (['-', '0', '00', 'null', 'undefined', 'rt', 'rw', 'rw 09', 'rw 9'].includes(cleaned)) return false;
  return true;
};

  const getFamilyMembersForKk = useCallback((parentKk: Warga) => {
    if (!parentKk || !parentKk.id) return [];
    const isParentKepala = (parentKk.peranKk && parentKk.peranKk.trim().toLowerCase() === 'kepala keluarga') ||
                           (parentKk.hubunganKk && parentKk.hubunganKk.trim().toLowerCase() === 'kepala keluarga');
    if (!isParentKepala) return [];

    const parentIdNorm = String(parentKk.id).trim().toLowerCase();

    return wargaList.filter(w => {
      if (!w.id || String(w.id).trim().toLowerCase() === parentIdNorm) return false;
      if (!w.kepalaKeluargaId) return false;
      return String(w.kepalaKeluargaId).trim().toLowerCase() === parentIdNorm;
    });
  }, [wargaList]);

  const getParentKkForMember = useCallback((member: Warga) => {
    if (!member || !member.kepalaKeluargaId) return null;
    const isMemberKepala = (member.peranKk && member.peranKk.trim().toLowerCase() === 'kepala keluarga') ||
                           (member.hubunganKk && member.hubunganKk.trim().toLowerCase() === 'kepala keluarga');
    if (isMemberKepala) return null;

    const targetKkIdNorm = String(member.kepalaKeluargaId).trim().toLowerCase();
    return wargaList.find(w => String(w.id).trim().toLowerCase() === targetKkIdNorm) || null;
  }, [wargaList]);

  const toggleExpandKk = (kkId: string) => {
    setExpandedKkIds(prev =>
      prev.includes(kkId) ? prev.filter(id => id !== kkId) : [...prev, kkId]
    );
  };

  const handleSave = async () => {
    if (!formData.nama.trim()) {
      Alert.alert('Perhatian', 'Nama Warga wajib diisi');
      return;
    }

    if (formData.hubunganKk !== 'Kepala Keluarga') {
      if (!formData.selectedKepalaKkId) {
        Alert.alert(
          'Wajib Pilih Kepala Keluarga',
          'Untuk mengisi data anggota keluarga (Istri, Anak, Cucu, dll), Anda HARUS memilih Kepala Keluarga terlebih dahulu.'
        );
        return;
      }
    }

    setSaving(true);
    try {
      const tahunLahirInt = parseInt(formData.tahunLahir) || (CURRENT_YEAR - 25);
      const calculatedAge = CURRENT_YEAR - tahunLahirInt;

      const fullAlamat = formData.noRumah.trim()
        ? `No. ${formData.noRumah.trim()}, ${formData.rt} / RW 09`
        : `${formData.rt} / RW 09, Kebon Bawang`;

      let insertedId = Date.now().toString();

      if (isSupabaseConfigured) {
        const payload: Record<string, any> = {
          nama: formData.nama.trim(),
          status_keluarga: formData.hubunganKk,
          gender: formData.jenisKelamin,
          tahun_lahir: tahunLahirInt,
          rt: formData.rt,
          nomor_rumah: formData.noRumah.trim(),
        };

        if (formData.hubunganKk !== 'Kepala Keluarga' && formData.selectedKepalaKkId) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formData.selectedKepalaKkId);
          if (isUuid) {
            payload.kepala_keluarga_id = formData.selectedKepalaKkId;
          }
        }

        const { data, error } = await supabase.from('warga').insert(payload).select();
        if (error) {
          console.warn('Supabase insert warning:', error.message);
        } else if (data && data[0] && data[0].id) {
          insertedId = String(data[0].id);
        }
      }

      const newWarga: Warga = {
        id: insertedId,
        nama: formData.nama.trim(),
        nik: '',
        noKk: '',
        alamat: fullAlamat,
        rt: formData.rt,
        rw: formData.rw,
        status: formData.status,
        jenisKelamin: formData.jenisKelamin,
        usia: calculatedAge,
        tanggalLahir: tahunLahirInt.toString(),
        peranKk: formData.hubunganKk === 'Kepala Keluarga' ? 'Kepala Keluarga' : 'Anggota Keluarga',
        hubunganKk: formData.hubunganKk,
        kepalaKeluargaId: formData.selectedKepalaKkId || undefined,
        noRumah: formData.noRumah.trim(),
      };

      DataCache.clear('warga_list');
      DataCache.clear('dashboard_stats');
      setWargaList(prev => [newWarga, ...prev]);
      setAddModalVisible(false);
      setFormData(EMPTY_FORM);
      Alert.alert('Berhasil', 'Data warga berhasil disimpan');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWarga = (wargaToDelete: Warga) => {
    Alert.alert(
      'Hapus Data Warga',
      `Apakah Anda yakin ingin menghapus data warga "${wargaToDelete.nama}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isSupabaseConfigured && wargaToDelete.id) {
                const { error } = await supabase.from('warga').delete().eq('id', wargaToDelete.id);
                if (error) {
                  console.warn('Supabase delete warning:', error.message);
                }
              }
              setWargaList(prev => prev.filter(w => w.id !== wargaToDelete.id));
              DataCache.clear('warga_list');
              DataCache.clear('dashboard_stats');
              setDetailModalVisible(false);
              setSelectedWarga(null);
              Alert.alert('Berhasil', `Data warga "${wargaToDelete.nama}" telah berhasil dihapus.`);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Gagal menghapus data warga');
            }
          },
        },
      ]
    );
  };

  const kepalaKkList = wargaList.filter(w => w.peranKk === 'Kepala Keluarga' || w.hubunganKk === 'Kepala Keluarga');
  const selectedKkObj = kepalaKkList.find(w => w.id === formData.selectedKepalaKkId);

  // Filter warga based on Search Query, Selected RT, and Category
  const filtered = wargaList.filter(w => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = (() => {
      if (!q) return true;
      const terms = q.split(/\s+/).filter(Boolean);
      const rtRaw = (w.rt || '').toLowerCase();
      const rtNum = rtRaw.replace(/\D/g, '');
      const rtNumShort = rtNum ? String(parseInt(rtNum, 10)) : '';

      const combined = [
        w.nama.toLowerCase(),
        rtRaw,
        `rt ${rtNumShort}`,
        `rt${rtNumShort}`,
        `rt${rtNum}`,
        rtNum,
        rtNumShort,
        (w.alamat || '').toLowerCase(),
        (w.status || '').toLowerCase(),
        (w.jenisKelamin || '').toLowerCase(),
        `${w.usia} thn`,
        (w.peranKk || '').toLowerCase(),
        (w.hubunganKk || '').toLowerCase(),
      ].join(' ');

      return terms.every(term => combined.includes(term));
    })();

    const matchRt = isRtMatch(w.rt, selectedRt);

    const matchCategory = (() => {
      if (selectedCategory === 'semua') return true;
      if (selectedCategory === 'kk') return (w.peranKk && w.peranKk.trim().toLowerCase() === 'kepala keluarga') || (w.hubunganKk && w.hubunganKk.trim().toLowerCase() === 'kepala keluarga');
      if (selectedCategory === 'dewasa') return w.usia >= 18 && w.usia < 60;
      if (selectedCategory === 'remaja') return w.usia >= 10 && w.usia < 18;
      if (selectedCategory === 'lansia') return w.usia >= 60;
      if (selectedCategory === 'balita') return w.usia < 5;
      return true;
    })();

    return matchQuery && matchRt && matchCategory;
  });

  const rtOptions = ['semua', ...LIST_RT];

  // Dynamically calculate Top Stats based on selected RT!
  const rtFilteredWarga = selectedRt === 'semua'
    ? wargaList
    : wargaList.filter(w => isRtMatch(w.rt, selectedRt));

  const stats: Array<{ key: CategoryFilter; label: string; value: number; color: string }> = [
    { key: 'semua', label: 'Total Jiwa', value: rtFilteredWarga.length, color: '#00216e' },
    { key: 'kk', label: 'Kepala Keluarga', value: rtFilteredWarga.filter(w => (w.peranKk && w.peranKk.trim().toLowerCase() === 'kepala keluarga') || (w.hubunganKk && w.hubunganKk.trim().toLowerCase() === 'kepala keluarga')).length, color: '#bb0013' },
    { key: 'dewasa', label: 'Dewasa 18-59', value: rtFilteredWarga.filter(w => w.usia >= 18 && w.usia < 60).length, color: '#1b5e20' },
    { key: 'remaja', label: 'Remaja 10-17', value: rtFilteredWarga.filter(w => w.usia >= 10 && w.usia < 18).length, color: '#ed6c02' },
    { key: 'lansia', label: 'Lansia 60+', value: rtFilteredWarga.filter(w => w.usia >= 60).length, color: '#444' },
    { key: 'balita', label: 'Balita <5', value: rtFilteredWarga.filter(w => w.usia < 5).length, color: '#888' },
  ];

  const renderItem = ({ item }: { item: Warga }) => {
    const initials = item.nama.split(' ').map(n => n[0]).slice(0, 2).join('');
    const isKepala = (item.peranKk && item.peranKk.trim().toLowerCase() === 'kepala keluarga') ||
                     (item.hubunganKk && item.hubunganKk.trim().toLowerCase() === 'kepala keluarga');
    const familyMembers = isKepala ? getFamilyMembersForKk(item) : [];
    const isExpanded = expandedKkIds.includes(item.id);

    return (
      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => { setSelectedWarga(item); setDetailModalVisible(true); }}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.avatar, { backgroundColor: item.jenisKelamin === 'Perempuan' ? '#bb0013' : '#00216e' }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.nama}</Text>
              <Text style={styles.cardSub}>{item.jenisKelamin}, Lahir {item.tanggalLahir || '-'} ({item.usia} Thn) • {item.rt}</Text>
              <Text style={styles.cardAlamat} numberOfLines={1}>{item.alamat}</Text>
            </View>

            {isAdmin && (
              <TouchableOpacity
                style={styles.cardDeleteIconBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteWarga(item);
                }}
              >
                <Text style={styles.cardDeleteIconText}>Hapus</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Toggle Expand KK Family Members Button - Only shown when category filter is 'kk' */}
          {isKepala && selectedCategory === 'kk' && familyMembers.length > 0 && (
            <TouchableOpacity
              style={styles.expandKkBtn}
              onPress={(e) => {
                e.stopPropagation();
                toggleExpandKk(item.id);
              }}
            >
              <Text style={styles.expandKkBtnText}>
                {isExpanded ? '▲ Sembunyikan Anggota KK' : `▼ Lihat Anggota KK (${familyMembers.length} Orang)`}
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Nested Family Members Structure (Parent-Child Hierarchy) - Only shown when category filter is 'kk' */}
        {isKepala && selectedCategory === 'kk' && isExpanded && familyMembers.length > 0 && (
          <View style={styles.nestedFamilyWrap}>
            <Text style={styles.nestedFamilyTitle}>
              Anggota Keluarga (Menginduk KK {item.nama}):
            </Text>
            {familyMembers.map((m) => {
              const subInitials = m.nama.split(' ').map(n => n[0]).slice(0, 2).join('');
              return (
                <TouchableOpacity
                  key={m.id}
                  style={styles.nestedMemberCard}
                  onPress={() => {
                    setSelectedWarga(m);
                    setDetailModalVisible(true);
                  }}
                >
                  <View style={styles.nestedBranchLine}>
                    <Text style={styles.nestedBranchText}>└</Text>
                  </View>
                  <View style={[styles.subAvatar, { backgroundColor: m.jenisKelamin === 'Perempuan' ? '#bb0013' : '#00216e' }]}>
                    <Text style={styles.subAvatarText}>{subInitials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nestedMemberName}>{m.nama}</Text>
                    <Text style={styles.nestedMemberSub}>
                      {m.jenisKelamin}, Usia {m.usia} Thn (Thn Lahir: {m.tanggalLahir || '-'})
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Data Warga & KK</Text>
        <View style={styles.headerActions}>
          {isAdmin ? (
            <TouchableOpacity style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
              <Text style={styles.addBtnText}>+ Tambah Warga</Text>
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
      </View>

      {/* Filter RT Chips Selector - Available for both Admin and Guest Mode */}
      <View style={styles.rtFilterSection}>
        <Text style={styles.rtFilterLabel}>Filter Wilayah RT:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {rtOptions.map(rt => (
            <TouchableOpacity
              key={rt}
              style={[styles.filterChip, selectedRt === rt && styles.filterChipActive]}
              onPress={() => setSelectedRt(rt)}
            >
              <Text style={[styles.filterChipText, selectedRt === rt && styles.filterChipTextActive]}>
                {rt === 'semua' ? 'Semua RT' : rt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Interactive Stats Cards (Dynamically Recalculated based on Selected RT) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={{ paddingHorizontal: 20 }}>
        {stats.map((s) => {
          const isActive = selectedCategory === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[
                styles.statCard,
                isActive && { backgroundColor: s.color, borderColor: s.color, borderWidth: 1, elevation: 4 }
              ]}
              onPress={() => setSelectedCategory(prev => prev === s.key ? 'semua' : s.key)}
            >
              {!isActive && <View style={[styles.cardAccentBar, { backgroundColor: s.color }]} />}
              <Text style={[styles.statVal, { color: isActive ? '#ffffff' : s.color }]}>{s.value}</Text>
              <Text style={[styles.statLbl, { color: isActive ? '#ffffff' : '#666666' }]}>
                {s.label} {selectedRt !== 'semua' ? `(${selectedRt})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!isAdmin ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={styles.guestNoticeCard}>
            <View style={styles.guestNoticeHeader}>
              <View style={styles.lockIconBadge}>
                <LockIcon color="#00216e" size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.guestNoticeTitle}>Daftar Nama Warga Dilindungi</Text>
                <Text style={styles.guestNoticeSub}>Privasi & Kerahasiaan Data Kependudukan</Text>
              </View>
            </View>
            <Text style={styles.guestNoticeDesc}>
              Demi menjaga privasi kependudukan warga RW 09, rincian data nama dan alamat warga disembunyikan untuk publik. Warga dan masyarakat umum dapat memantau akumulasi total statistik pada kartu di atas per RT.
            </Text>
            <Text style={styles.guestNoticeDesc}>
              Silakan login sebagai <Text style={{ fontWeight: 'bold', color: '#00216e' }}>Admin Pengurus</Text> untuk memuat dan mengelola rincian data warga.
            </Text>
            <TouchableOpacity style={styles.guestLoginActionBtn} onPress={() => setLoginModalVisible(true)}>
              <LockIcon color="#fff" size={16} />
              <Text style={styles.guestLoginActionText}>Login Admin Pengurus</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <>
          {/* Search Input Box */}
          <View style={styles.searchWrap}>
            <View style={styles.searchBoxContainer}>
              <View style={{ marginRight: 6, marginLeft: 2 }}>
                <SearchIcon color="#888" size={18} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Cari nama, RT, status keluarga, atau alamat..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {!!searchQuery && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                  <Text style={styles.clearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Result Indicator */}
          <View style={styles.resultInfoWrap}>
            <Text style={styles.resultInfoText}>
              Menampilkan <Text style={styles.boldText}>{Math.min(displayLimit, filtered.length)}</Text> dari <Text style={styles.boldText}>{filtered.length}</Text> Warga
              {selectedRt !== 'semua' ? ` di ${selectedRt}` : ''}
            </Text>
          </View>

          {loading ? (
            <CardListSkeleton count={4} />
          ) : (
            <FlatList
              style={{ flex: 1 }}
              data={filtered.slice(0, displayLimit)}
              renderItem={renderItem}
              keyExtractor={i => i.id}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={5}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Warga tidak ditemukan</Text></View>}
              ListFooterComponent={
                filtered.length > 5 ? (
                  <View style={styles.footerWrap}>
                    {displayLimit < filtered.length ? (
                      <TouchableOpacity
                        style={styles.expandBtn}
                        onPress={() => setDisplayLimit(prev => Math.min(prev + 5, filtered.length))}
                      >
                        <Text style={styles.expandBtnText}>
                          Tampilkan Lebih Banyak
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.collapseBtn}
                        onPress={() => setDisplayLimit(5)}
                      >
                        <Text style={styles.collapseBtnText}>Sembunyikan</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null
              }
            />
          )}
        </>
      )}

      {/* Detail Modal with Kartu Keluarga Parent-Child Hierarchy */}
      <Modal visible={detailModalVisible} animationType="slide" transparent onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Detail Warga & Kartu Keluarga</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
            </View>
            {selectedWarga && (() => {
              const isKepalaSelected = (selectedWarga.peranKk && selectedWarga.peranKk.trim().toLowerCase() === 'kepala keluarga') ||
                                        (selectedWarga.hubunganKk && selectedWarga.hubunganKk.trim().toLowerCase() === 'kepala keluarga');
              const familyMembers = isKepalaSelected ? getFamilyMembersForKk(selectedWarga) : [];
              const parentKk = !isKepalaSelected ? getParentKkForMember(selectedWarga) : null;

              return (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  {/* Status Banner */}
                  <View style={[styles.modalBanner, isKepalaSelected ? styles.modalBannerParent : styles.modalBannerChild]}>
                    <Text style={styles.modalBannerTitle}>
                      {isKepalaSelected ? 'KARTU KELUARGA (PARENT KK)' : `ANGGOTA KELUARGA (${selectedWarga.hubunganKk.toUpperCase()})`}
                    </Text>
                  </View>

                  {[
                    ['Nama Warga', selectedWarga.nama],
                    ['Status Keluarga', selectedWarga.hubunganKk],
                    ['Peran Dalam KK', selectedWarga.peranKk],
                    ['Gender', selectedWarga.jenisKelamin],
                    ['Tahun Lahir', selectedWarga.tanggalLahir || '-'],
                    ['Umur', `${selectedWarga.usia} Tahun`],
                    ['Alamat Lengkap', selectedWarga.alamat],
                    ['RT / RW', `${selectedWarga.rt} / ${selectedWarga.rw}`],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{label}</Text>
                      <Text style={styles.detailValue}>{value}</Text>
                    </View>
                  ))}

                  {/* If Selected is Kepala Keluarga: Render Section Anggota Keluarga */}
                  {isKepalaSelected && (
                    <View style={styles.modalKkSection}>
                      <Text style={styles.modalKkTitle}>Daftar Anggota Keluarga (Menginduk KK Ini):</Text>
                      {familyMembers.length === 0 ? (
                        <Text style={styles.emptySubText}>Belum ada anggota keluarga terhubung dalam KK ini.</Text>
                      ) : (
                        familyMembers.map(m => (
                          <TouchableOpacity
                            key={m.id}
                            style={styles.modalMemberCard}
                            onPress={() => setSelectedWarga(m)}
                          >
                            <Text style={styles.modalMemberName}>{m.nama}</Text>
                            <Text style={styles.modalMemberDesc}>
                              {m.hubunganKk} • {m.jenisKelamin}, Usia {m.usia} Thn
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}

                  {/* If Selected is Anggota Keluarga: Render Section Parent KK */}
                  {!isKepalaSelected && (
                    <View style={styles.modalKkSection}>
                      <Text style={styles.modalKkTitle}>Induk Kepala Keluarga (Parent KK):</Text>
                      {parentKk ? (
                        <TouchableOpacity
                          style={styles.modalParentCard}
                          onPress={() => setSelectedWarga(parentKk)}
                        >
                          <Text style={styles.modalParentName}>{parentKk.nama}</Text>
                          <Text style={styles.modalParentDesc}>
                            Kepala Keluarga • {parentKk.rt}
                          </Text>
                          <Text style={styles.modalParentActionText}>[Klik untuk lihat data KK Parent]</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.emptySubText}>Induk Kepala Keluarga belum dihubungkan.</Text>
                      )}
                    </View>
                  )}

                  {isAdmin && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteWarga(selectedWarga)}
                    >
                      <Text style={styles.deleteBtnText}>Hapus Data Warga Ini</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Add Warga Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '90%' }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Tambah Data Warga Baru</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

              {/* 1. Nama Warga (Textbox) */}
              <Text style={styles.inputLabel}>1. Nama Warga *</Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan nama lengkap warga"
                placeholderTextColor="#999"
                value={formData.nama}
                onChangeText={t => setFormData(prev => ({ ...prev, nama: t }))}
              />

              {/* 2. Status Keluarga (Radio Button / Dropdown) */}
              <Text style={styles.inputLabel}>2. Status Keluarga * (Radio Button / Dropdown)</Text>
              <View style={styles.radioGrid}>
                {STATUS_KELUARGA_OPTIONS.map(opt => {
                  const isSelected = formData.hubunganKk === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.radioItem, isSelected && styles.radioItemActive]}
                      onPress={() => {
                        if (opt === 'Kepala Keluarga') {
                          setFormData(prev => ({
                            ...prev,
                            hubunganKk: 'Kepala Keluarga',
                            peranKk: 'Kepala Keluarga',
                            selectedKepalaKkId: '',
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            hubunganKk: opt,
                            peranKk: 'Anggota Keluarga',
                          }));
                        }
                      }}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.radioLabel, isSelected && styles.radioLabelActive]}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* MANDATORY KEPALA KELUARGA SELECTION FOR FAMILY MEMBERS (Istri, Anak, Cucu, dll) */}
              {formData.hubunganKk !== 'Kepala Keluarga' && (
                <View style={styles.mandatoryKkBox}>
                  <Text style={styles.mandatoryKkTitle}>
                    Wajib Pilih Kepala Keluarga (*Status: {formData.hubunganKk})
                  </Text>
                  <Text style={styles.mandatoryKkDesc}>
                    Sebelum mengisi data {formData.hubunganKk}, silakan pilih Kepala Keluarga terlebih dahulu dari daftar di bawah:
                  </Text>

                  {kepalaKkList.length === 0 ? (
                    <Text style={styles.errorText}>
                      Belum ada Kepala Keluarga yang terdaftar. Mohon daftarkan Kepala Keluarga terlebih dahulu!
                    </Text>
                  ) : (
                    <View>
                      <TouchableOpacity
                        style={styles.dropdownPickerBtn}
                        onPress={() => setShowKkDropdown(!showKkDropdown)}
                      >
                        <Text style={styles.dropdownPickerText}>
                          {selectedKkObj
                            ? `${selectedKkObj.nama} (${selectedKkObj.rt})`
                            : '-- Klik Pilih Kepala Keluarga --'}
                        </Text>
                        <Text style={styles.dropdownArrow}>{showKkDropdown ? '▲' : '▼'}</Text>
                      </TouchableOpacity>

                      {showKkDropdown && (
                        <View style={styles.dropdownListContainer}>
                          {kepalaKkList.map(kk => {
                            const isSelected = formData.selectedKepalaKkId === kk.id;
                            return (
                              <TouchableOpacity
                                key={kk.id}
                                style={[styles.dropdownOptionItem, isSelected && styles.dropdownOptionActive]}
                                onPress={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    selectedKepalaKkId: kk.id,
                                    rt: kk.rt || prev.rt,
                                  }));
                                  setShowKkDropdown(false);
                                }}
                              >
                                <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive]}>
                                  {kk.nama} • {kk.rt}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* 3. Gender (Radio Button) */}
              <Text style={styles.inputLabel}>3. Gender * (Radio Button)</Text>
              <View style={styles.row}>
                {(['Laki-laki', 'Perempuan'] as const).map(g => {
                  const isSelected = formData.jenisKelamin === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.radioItem, { width: '48%' }, isSelected && styles.radioItemActive]}
                      onPress={() => setFormData(prev => ({ ...prev, jenisKelamin: g }))}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.radioLabel, isSelected && styles.radioLabelActive]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 4. Tahun Lahir (Dropdown) */}
              <Text style={styles.inputLabel}>4. Tahun Lahir * (Dropdown)</Text>
              <View style={styles.ageBoxWrap}>
                <TouchableOpacity
                  style={styles.dropdownPickerBtn}
                  onPress={() => setShowTahunDropdown(!showTahunDropdown)}
                >
                  <Text style={styles.dropdownPickerText}>
                    Pilih Tahun Lahir: {formData.tahunLahir}
                  </Text>
                  <Text style={styles.dropdownArrow}>{showTahunDropdown ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {showTahunDropdown && (
                  <View style={[styles.dropdownListContainer, { maxHeight: 180 }]}>
                    <ScrollView nestedScrollEnabled>
                      {YEAR_OPTIONS.map(yr => {
                        const isSelected = formData.tahunLahir === yr;
                        return (
                          <TouchableOpacity
                            key={yr}
                            style={[styles.dropdownOptionItem, isSelected && styles.dropdownOptionActive]}
                            onPress={() => {
                              setFormData(prev => ({ ...prev, tahunLahir: yr }));
                              setShowTahunDropdown(false);
                            }}
                          >
                            <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive]}>
                              Tahun {yr}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* 5. Alamat Lengkap: RT Dropdown (1-18) + Nomor Rumah Textbox */}
              <Text style={styles.inputLabel}>5. Alamat Lengkap * (RT Dropdown 1-18 & Nomor Rumah)</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                {/* RT Dropdown */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>Pilih RT (1 - 18 Dropdown):</Text>
                  <TouchableOpacity
                    style={styles.dropdownPickerBtn}
                    onPress={() => setShowRtDropdown(!showRtDropdown)}
                  >
                    <Text style={styles.dropdownPickerText}>{formData.rt}</Text>
                    <Text style={styles.dropdownArrow}>{showRtDropdown ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Nomor Rumah Textbox */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>Nomor Rumah (Textbox):</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Contoh: 12B / A15"
                    placeholderTextColor="#999"
                    value={formData.noRumah}
                    onChangeText={t => setFormData(prev => ({ ...prev, noRumah: t }))}
                  />
                </View>
              </View>

              {showRtDropdown && (
                <View style={[styles.dropdownListContainer, { maxHeight: 180 }]}>
                  <ScrollView nestedScrollEnabled>
                    {LIST_RT.map(rt => (
                      <TouchableOpacity
                        key={rt}
                        style={[styles.dropdownOptionItem, formData.rt === rt && styles.dropdownOptionActive]}
                        onPress={() => {
                          setFormData(prev => ({ ...prev, rt }));
                          setShowRtDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownOptionText, formData.rt === rt && styles.dropdownOptionTextActive]}>
                          {rt} (RW 009)
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <TouchableOpacity style={[styles.submitBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Simpan Data Warga</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Login Modal for Guest Mode */}
      <LoginModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#00216e' },
  headerActions: { flexDirection: 'row', gap: 10 },
  addBtn: { backgroundColor: '#00216e', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  loginAdminHeaderBtn: { backgroundColor: '#00216e', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  loginAdminHeaderBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  rtFilterSection: { marginBottom: 8 },
  rtFilterLabel: { fontSize: 11, fontWeight: 'bold', color: '#00216e', marginLeft: 20, marginBottom: 4 },
  statsScroll: { flexGrow: 0, marginBottom: 12 },
  statCard: { position: 'relative', overflow: 'hidden', backgroundColor: '#fff', borderRadius: 12, paddingLeft: 18, paddingRight: 14, paddingVertical: 10, marginRight: 10, minWidth: 95, borderWidth: 1, borderColor: '#edf2f7', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  cardAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  statVal: { fontSize: 22, fontWeight: 'bold' },
  statLbl: { fontSize: 10, color: '#666', marginTop: 2 },
  searchWrap: { paddingHorizontal: 20, marginBottom: 8 },
  searchBoxContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 16 },
  searchInput: { flex: 1, paddingVertical: 12, paddingLeft: 10, paddingRight: 8, fontSize: 14, color: '#333' },
  clearBtn: { padding: 4 },
  clearText: { fontSize: 14, color: '#999', fontWeight: 'bold' },
  filterScroll: { flexGrow: 0, marginBottom: 6 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', marginRight: 8 },
  filterChipActive: { backgroundColor: '#00216e', borderColor: '#00216e' },
  filterChipText: { fontSize: 12, color: '#666', fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  resultInfoWrap: { paddingHorizontal: 20, marginBottom: 10 },
  resultInfoText: { fontSize: 12, color: '#666' },
  boldText: { fontWeight: 'bold', color: '#00216e' },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: '#999', fontSize: 14 },
  cardContainer: { marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  cardParentKk: { borderLeftWidth: 4, borderLeftColor: '#00216e' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: 'bold', color: '#1a1c1c' },
  parentBadge: { backgroundColor: '#00216e', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  parentBadgeText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  hubunganTag: { fontSize: 11, color: '#00216e', fontWeight: 'bold' },
  cardSub: { fontSize: 12, color: '#666', marginTop: 2 },
  cardAlamat: { fontSize: 11, color: '#888', marginTop: 2 },
  expandKkBtn: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0', alignItems: 'center' },
  expandKkBtnText: { fontSize: 12, color: '#00216e', fontWeight: 'bold' },
  nestedFamilyWrap: { backgroundColor: '#f0f4fd', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: -4, marginLeft: 12, borderLeftWidth: 2, borderLeftColor: '#00216e' },
  nestedFamilyTitle: { fontSize: 11, fontWeight: 'bold', color: '#00216e', marginBottom: 8 },
  nestedMemberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 8, borderRadius: 8, marginBottom: 6 },
  nestedBranchLine: { marginRight: 6 },
  nestedBranchText: { fontSize: 14, color: '#00216e', fontWeight: 'bold' },
  subAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  subAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  nestedMemberName: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  childRelationBadge: { backgroundColor: '#e2e8f0', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  childRelationBadgeText: { fontSize: 10, color: '#475569', fontWeight: 'bold' },
  nestedMemberSub: { fontSize: 11, color: '#666', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', padding: 20 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#00216e' },
  closeX: { fontSize: 22, color: '#999' },
  modalBanner: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 14 },
  modalBannerParent: { backgroundColor: '#00216e' },
  modalBannerChild: { backgroundColor: '#475569' },
  modalBannerTitle: { color: '#fff', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  detailRow: { marginBottom: 12 },
  detailLabel: { fontSize: 10, color: '#999', fontWeight: '600', letterSpacing: 1, marginBottom: 2 },
  detailValue: { fontSize: 14, color: '#1a1c1c' },
  modalKkSection: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginTop: 10, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  modalKkTitle: { fontSize: 12, fontWeight: 'bold', color: '#00216e', marginBottom: 8 },
  modalMemberCard: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#cbd5e1' },
  modalMemberName: { fontSize: 13, fontWeight: 'bold', color: '#1a1c1c' },
  modalMemberDesc: { fontSize: 11, color: '#64748b', marginTop: 2 },
  modalParentCard: { backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#00216e' },
  modalParentName: { fontSize: 14, fontWeight: 'bold', color: '#00216e' },
  modalParentDesc: { fontSize: 11, color: '#64748b', marginTop: 2 },
  modalParentActionText: { fontSize: 11, color: '#00216e', fontWeight: 'bold', marginTop: 4 },
  emptySubText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  inputLabel: { fontSize: 12, color: '#00216e', fontWeight: 'bold', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11, fontSize: 14, borderWidth: 1, borderColor: '#e0e0e0', color: '#333' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  radioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  radioItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, width: '48%', gap: 8 },
  radioItemActive: { backgroundColor: '#eef2fa', borderColor: '#00216e' },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
  radioCircleActive: { borderColor: '#00216e' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00216e' },
  radioLabel: { fontSize: 12, color: '#475569' },
  radioLabelActive: { color: '#00216e', fontWeight: 'bold' },
  mandatoryKkBox: { backgroundColor: '#fff8e1', borderRadius: 12, padding: 14, marginVertical: 10, borderWidth: 1, borderColor: '#ffe082' },
  mandatoryKkTitle: { fontSize: 13, fontWeight: 'bold', color: '#b78103', marginBottom: 4 },
  mandatoryKkDesc: { fontSize: 12, color: '#5d4037', marginBottom: 10, lineHeight: 17 },
  errorText: { fontSize: 12, color: '#bb0013', fontStyle: 'italic' },
  dropdownPickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#00216e', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  dropdownPickerText: { fontSize: 13, color: '#00216e', fontWeight: '600', flex: 1 },
  dropdownArrow: { fontSize: 12, color: '#00216e', fontWeight: 'bold' },
  dropdownListContainer: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#d0dbe9', marginTop: 4, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  dropdownOptionItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dropdownOptionActive: { backgroundColor: '#eef2fa' },
  dropdownOptionText: { fontSize: 13, color: '#333' },
  dropdownOptionTextActive: { color: '#00216e', fontWeight: 'bold' },
  ageBoxWrap: { backgroundColor: '#f0f4fd', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#d0dbe9', marginBottom: 4 },
  submitBtn: { backgroundColor: '#00216e', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 22, marginBottom: 10 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  footerWrap: { marginTop: 14, marginBottom: 24, alignItems: 'center' },
  expandBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  expandBtnText: { color: '#00216e', fontSize: 13, fontWeight: 'bold' },
  collapseBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  collapseBtnText: { color: '#666', fontSize: 13, fontWeight: '600' },
  deleteBtn: { backgroundColor: '#fff0f0', borderWidth: 1, borderColor: '#ffcdd2', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 18, marginBottom: 10 },
  deleteBtnText: { color: '#bb0013', fontSize: 13, fontWeight: 'bold' },
  cardDeleteIconBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#fff0f0', borderWidth: 1, borderColor: '#ffcdd2', marginLeft: 6, alignSelf: 'center' },
  cardDeleteIconText: { fontSize: 10, color: '#bb0013', fontWeight: 'bold' },
  guestNoticeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 10, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  guestNoticeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  lockIconBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eef2fa', justifyContent: 'center', alignItems: 'center' },
  guestNoticeTitle: { fontSize: 16, fontWeight: 'bold', color: '#00216e' },
  guestNoticeSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  guestNoticeDesc: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 12 },
  guestLoginActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#00216e', borderRadius: 12, paddingVertical: 12, gap: 8, marginTop: 8 },
  guestLoginActionText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
});
