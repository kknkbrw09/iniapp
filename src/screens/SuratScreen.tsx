import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SafeStorage } from '../utils/storage';
import { SuratPengantar } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CardListSkeleton } from '../components/SkeletonLoader';
import { logger } from '../utils/logger';
import { KegiatanIcon } from '../components/TabIcons';

const LIST_RT = Array.from({ length: 18 }, (_, i) => `RT ${String(i + 1).padStart(3, '0')}`);

const JENIS_SURAT = [
  'Surat Keterangan Domisili',
  'Surat Keterangan Usaha',
  'Surat Pengantar Pembuatan KTP/KK',
  'Surat Keterangan Tidak Mampu (SKTM)',
  'Surat Keterangan Kematian',
];

const EMPTY_FORM = { namaPemohon: '', rt: 'RT 001', jenisSurat: JENIS_SURAT[0], keperluan: '' };

export default function SuratScreen() {
  const { role, adminName } = useAuth();
  const isAdmin = role === 'admin';
  const [list, setList] = useState<SuratPengantar[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selected, setSelected] = useState<SuratPengantar | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mySubmittedIds, setMySubmittedIds] = useState<string[]>([]);
  const [guestTab, setGuestTab] = useState<'antrean' | 'saya'>('antrean');
  const [savedGuestName, setSavedGuestName] = useState<string>('');
  const [selectedRt, setSelectedRt] = useState<string>('semua');
  const [showFormRtDropdown, setShowFormRtDropdown] = useState(false);

  useEffect(() => {
    SafeStorage.getItem('@my_surat_ids').then(val => {
      if (val) setMySubmittedIds(JSON.parse(val));
    }).catch(() => {});

    SafeStorage.getItem('@guest_warga_name').then(val => {
      if (val) setSavedGuestName(val);
    }).catch(() => {});
  }, []);

  // Auto set filter RT jika login sebagai Admin RT tertentu
  useEffect(() => {
    if (isAdmin && adminName) {
      const match = adminName.match(/RT\s*0*([1-9]|1[0-8])/i);
      if (match) {
        const rtNum = parseInt(match[1], 10);
        setSelectedRt(`RT ${String(rtNum).padStart(3, '0')}`);
      }
    }
  }, [isAdmin, adminName]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      logger.addLog('API', 'GET /surat_pengantar', 'Fetching surat_pengantar from Supabase...');
      
      let rtMap: Record<string, string> = {};
      if (isSupabaseConfigured) {
        const { data: wargaData } = await supabase.from('warga').select('nama, rt');
        if (wargaData) {
          wargaData.forEach((w: any) => {
            if (w.nama) {
              rtMap[w.nama.trim().toLowerCase()] = w.rt || '';
            }
          });
        }
      }

      const { data, error } = await supabase.from('surat_pengantar').select('*').order('tanggal', { ascending: false });
      if (data && !error) {
        logger.addLog('SUCCESS', 'HTTP 200 OK — GET /surat_pengantar', `Loaded ${data.length} records`);
        const mapped = data.map((d: any) => {
          const namaLower = (d.nama_pemohon || '').trim().toLowerCase();
          const matchedRt = d.rt || rtMap[namaLower] || '';
          return {
            id: d.id,
            noSurat: d.no_surat,
            namaPemohon: d.nama_pemohon,
            jenisSurat: d.jenis_surat,
            keperluan: d.keperluan,
            tanggal: d.tanggal,
            status: d.status,
            rt: matchedRt,
          };
        });
        setList(mapped);
      }
    } catch (e) {
      console.log('Surat fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generateNoSurat = () => {
    const count = list.length + 1;
    const pad = count.toString().padStart(3, '0');
    const today = new Date();
    const rom = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][today.getMonth()];
    return `${pad}/RW09/KB/${rom}/${today.getFullYear()}`;
  };

  const handleSave = async () => {
    if (!form.namaPemohon || !form.keperluan) {
      Alert.alert('Form Belum Lengkap', 'Nama Pemohon dan Keperluan wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      const inputNama = form.namaPemohon.trim().toLowerCase();
      const today = new Date().toISOString().split('T')[0];

      let isWargaValid = false;
      let pemohonRt = form.rt || 'RT 001';

      if (isSupabaseConfigured) {
        const { data: wargaRows, error: wargaErr } = await supabase
          .from('warga')
          .select('nama, rt');

        if (wargaRows && !wargaErr) {
          const matched = wargaRows.find((w: any) => {
            return w.nama && w.nama.trim().toLowerCase() === inputNama;
          });
          if (matched) {
            isWargaValid = true;
            if (matched.rt && !form.rt) {
              pemohonRt = matched.rt;
            }
          }
        }
      }

      if (!isWargaValid && !isAdmin) {
        Alert.alert(
          'Data Warga Tidak Ditemukan',
          `Nama "${form.namaPemohon.trim()}" belum terdaftar di database Warga RW 09.\n\nSilakan hubungi Sekretariat RW 09 untuk pendaftaran data warga baru.`,
          [{ text: 'Mengerti', style: 'cancel' }]
        );
        setSaving(false);
        return;
      }

      if (!isAdmin) {
        const lastSubmitDate = await SafeStorage.getItem('@last_surat_submit_date');
        const hasSubmittedOnDeviceToday = lastSubmitDate === today;
        const hasSubmittedByNameToday = list.some(s => {
          const sameDate = s.tanggal === today;
          const sameName = s.namaPemohon.trim().toLowerCase() === inputNama;
          return sameDate && sameName;
        });

        if (hasSubmittedOnDeviceToday || hasSubmittedByNameToday) {
          Alert.alert(
            'Batas Pengajuan Harian',
            'Perangkat/Nama ini sudah melakukan 1 pengajuan surat hari ini.',
            [{ text: 'OK', style: 'default' }]
          );
          setSaving(false);
          return;
        }
      }

      const noSurat = generateNoSurat();
      const status: 'Selesai' | 'Diproses' = isAdmin ? 'Selesai' : 'Diproses';

      if (isSupabaseConfigured) {
        const { error } = await supabase.from('surat_pengantar').insert({
          no_surat: noSurat,
          nama_pemohon: form.namaPemohon.trim(),
          jenis_surat: form.jenisSurat,
          keperluan: form.keperluan,
          tanggal: today,
          status: status,
          rt: pemohonRt || null,
        });
        if (error) throw error;
      }

      const newSurat: SuratPengantar = {
        id: Date.now().toString(),
        noSurat,
        namaPemohon: form.namaPemohon.trim(),
        jenisSurat: form.jenisSurat,
        keperluan: form.keperluan,
        tanggal: today,
        status: status,
        rt: pemohonRt,
      };

      setList(prev => [newSurat, ...prev]);

      const updatedIds = [newSurat.id, ...mySubmittedIds];
      setMySubmittedIds(updatedIds);
      SafeStorage.setItem('@my_surat_ids', JSON.stringify(updatedIds));

      if (!isAdmin) {
        setSavedGuestName(form.namaPemohon.trim());
        SafeStorage.setItem('@guest_warga_name', form.namaPemohon.trim());
        SafeStorage.setItem('@last_surat_submit_date', today);
      }

      setModalVisible(false);
      setForm(EMPTY_FORM);

      Alert.alert(
        'Pengajuan Berhasil',
        isAdmin
          ? `Surat ${noSurat} telah berhasil diterbitkan.`
          : `Pengajuan ${form.jenisSurat} (${noSurat}) telah dikirim.`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Gagal menyimpan pengajuan surat');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintPdf = async (surat: SuratPengantar) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
          .kop { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
          .kop h2 { margin: 0; font-size: 16px; text-transform: uppercase; }
          .kop h3 { margin: 3px 0 0 0; font-size: 13px; font-weight: normal; }
          .kop p { margin: 3px 0 0 0; font-size: 10px; color: #555; }
          .title { text-align: center; margin-bottom: 20px; }
          .title h3 { text-decoration: underline; margin: 0; font-size: 14px; text-transform: uppercase; }
          .title p { margin: 3px 0 0 0; font-size: 11px; }
          .body-text { font-size: 12px; line-height: 1.6; margin-bottom: 15px; }
          table { width: 100%; margin: 15px 0 20px 20px; font-size: 12px; border-collapse: collapse; }
          td { padding: 4px 6px; vertical-align: top; }
          .ttd-box { width: 100%; margin-top: 40px; text-align: right; }
          .ttd-wrap { display: inline-block; text-align: center; margin-right: 30px; }
        </style>
      </head>
      <body>
        <div class="kop">
          <h2>PEMERINTAH KOTA ADM. JAKARTA UTARA</h2>
          <h3>RUKUN WARGA 09 KELURAHAN KEBON BAWANG</h3>
          <p>Kecamatan Tanjung Priok - Jakarta Utara 14320</p>
        </div>
        <div class="title">
          <h3>${surat.jenisSurat.toUpperCase()}</h3>
          <p>Nomor: ${surat.noSurat}</p>
        </div>
        <div class="body-text">
          Yang bertanda tangan di bawah ini Pengurus RW 09 Kelurahan Kebon Bawang, Kecamatan Tanjung Priok, Jakarta Utara, dengan ini menerangkan bahwa:
        </div>
        <table>
          <tr><td style="width: 130px; font-weight: bold;">Nama Lengkap</td><td>: ${surat.namaPemohon}</td></tr>
          ${surat.rt ? `<tr><td style="font-weight: bold;">RT/RW</td><td>: ${surat.rt} / RW 009</td></tr>` : ''}
          <tr><td style="font-weight: bold;">Jenis Surat</td><td>: ${surat.jenisSurat}</td></tr>
          <tr><td style="font-weight: bold;">Keperluan</td><td>: ${surat.keperluan}</td></tr>
        </table>
        <div class="body-text">
          Demikian surat pengantar ini dibuat untuk dipergunakan sebagaimana mestinya.
        </div>
        <div class="ttd-box">
          <div class="ttd-wrap">
            <p>Jakarta, ${surat.tanggal}</p>
            <p style="margin-top: 4px; font-weight: bold;">Ketua RW 09</p>
            <p style="margin-top: 60px; font-weight: bold; text-decoration: underline;">( H. SUBHAN, S.E. )</p>
          </div>
        </div>
      </body>
      </html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e: any) {
      Alert.alert('Error Cetak', 'Gagal mencetak / menyimpan PDF: ' + (e.message || e));
    }
  };

  const handleItemPress = (item: SuratPengantar) => {
    const isMine = mySubmittedIds.includes(item.id);
    if (!isAdmin && guestTab === 'antrean' && !isMine) {
      Alert.alert(
        'Antrean Publik',
        `Pengajuan oleh ${item.namaPemohon} (${item.status}).\n\nDetail isi & PDF surat dilindungi privasi warga. Untuk mencetak atau melihat detail pengajuan pribadi Anda, silakan buka tab "Surat Saya".`
      );
      return;
    }
    setSelected(item);
    setDetailVisible(true);
  };

  const renderItem = ({ item }: { item: SuratPengantar }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleItemPress(item)}>
      <View style={styles.cardTop}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.noSurat}>{item.noSurat}</Text>
          {item.rt ? (
            <View style={styles.rtBadge}>
              <Text style={styles.rtBadgeText}>{item.rt}</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.badge, item.status === 'Selesai' ? styles.badgeSelesai : styles.badgeDiproses]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.cardName}>{item.namaPemohon}</Text>
      <Text style={styles.cardJenis}>{item.jenisSurat}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 }}>
        <KegiatanIcon color="#999" size={13} />
        <Text style={styles.cardDate}>{item.tanggal}</Text>
      </View>
    </TouchableOpacity>
  );

  const baseDisplayList = isAdmin
    ? list
    : guestTab === 'antrean'
      ? list
      : list.filter(s => mySubmittedIds.includes(s.id));

  const displayList = baseDisplayList.filter(s => {
    if (selectedRt === 'semua') return true;
    if (!s.rt) return true;
    return s.rt.toLowerCase() === selectedRt.toLowerCase();
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Surat Pengantar</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>{isAdmin ? '+ Penerbitan Surat' : '+ Ajukan Surat'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{displayList.length}</Text>
          <Text style={styles.statLbl}>{isAdmin ? 'Total Surat' : (guestTab === 'antrean' ? 'Antrean Publik' : 'Surat Saya')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{displayList.filter(s => s.status === 'Selesai').length}</Text>
          <Text style={styles.statLbl}>Selesai</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{displayList.filter(s => s.status === 'Diproses').length}</Text>
          <Text style={styles.statLbl}>Diproses</Text>
        </View>
      </View>

      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
          <TouchableOpacity
            style={[styles.chip, selectedRt === 'semua' && styles.chipActive]}
            onPress={() => setSelectedRt('semua')}
          >
            <Text style={[styles.chipText, selectedRt === 'semua' && styles.chipTextActive]}>
              Semua RT
            </Text>
          </TouchableOpacity>

          {LIST_RT.map(rt => (
            <TouchableOpacity
              key={rt}
              style={[styles.chip, selectedRt === rt && styles.chipActive]}
              onPress={() => setSelectedRt(rt)}
            >
              <Text style={[styles.chipText, selectedRt === rt && styles.chipTextActive]}>
                {rt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {!isAdmin && (
        <View style={styles.tabSwitchContainer}>
          <View style={styles.tabSwitchBar}>
            <TouchableOpacity
              style={[styles.tabSwitchBtn, guestTab === 'antrean' && styles.tabSwitchActive]}
              onPress={() => setGuestTab('antrean')}
            >
              <Text style={[styles.tabSwitchText, guestTab === 'antrean' && styles.tabSwitchTextActive]}>
                Antrean Publik ({displayList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabSwitchBtn, guestTab === 'saya' && styles.tabSwitchActive]}
              onPress={() => setGuestTab('saya')}
            >
              <Text style={[styles.tabSwitchText, guestTab === 'saya' && styles.tabSwitchTextActive]}>
                Surat Saya {savedGuestName ? `(${savedGuestName})` : `(${list.filter(s => mySubmittedIds.includes(s.id)).length})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <CardListSkeleton count={4} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={displayList}
          renderItem={renderItem}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {selectedRt !== 'semua'
                  ? `Tidak ada antrean surat untuk ${selectedRt}`
                  : isAdmin ? 'Belum ada surat pengantar terdaftar' : 'Belum ada riwayat pengajuan surat pribadi'}
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={detailVisible} animationType="slide" transparent onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Detail & Cetak Surat</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
            </View>
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.suratPreview}>
                  <Text style={styles.suratKop}>RUKUN WARGA 09 KELURAHAN KEBON BAWANG</Text>
                  <Text style={styles.suratSubKop}>KECAMATAN TANJUNG PRIOK - JAKARTA UTARA</Text>
                  <View style={styles.suratDivider} />
                  <Text style={styles.suratJudul}>{selected.jenisSurat.toUpperCase()}</Text>
                  <Text style={styles.suratNomor}>Nomor: {selected.noSurat}</Text>
                  <Text style={styles.suratBody}>Yang bertanda tangan di bawah ini Pengurus RW 09 Kelurahan Kebon Bawang, dengan ini menerangkan bahwa:</Text>
                  {[
                    ['Nama Lengkap', selected.namaPemohon],
                    ...(selected.rt ? [['RT / RW', `${selected.rt} / RW 009`]] : []),
                    ['Keperluan', selected.keperluan]
                  ].map(([l, v]) => (
                    <View key={l} style={styles.suratRow}>
                      <Text style={styles.suratRowLabel}>{l}</Text>
                      <Text style={styles.suratRowValue}>: {v}</Text>
                    </View>
                  ))}
                  <Text style={[styles.suratBody, { marginTop: 12 }]}>Demikian surat pengantar ini dibuat untuk dipergunakan sebagaimana mestinya.</Text>
                  <View style={styles.suratTtd}>
                    <Text style={styles.suratTtdText}>Jakarta, {selected.tanggal}</Text>
                    <Text style={[styles.suratTtdText, { marginTop: 40, fontWeight: 'bold' }]}>Ketua RW 09</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.printBtn} onPress={() => handlePrintPdf(selected)}>
                  <Text style={styles.printBtnText}>Cetak / Unduh PDF Surat</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>{isAdmin ? 'Terbitkan Surat Pengantar' : 'Form Pengajuan Surat Pengantar'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nama Pemohon Sesuai KTP/KK</Text>
              <TextInput style={styles.input} placeholder="Contoh: Agus Setiawan" placeholderTextColor="#999" value={form.namaPemohon} onChangeText={t => setForm(p => ({ ...p, namaPemohon: t }))} />

              <Text style={styles.inputLabel}>RT Asal Pemohon *</Text>
              <TouchableOpacity
                style={styles.dropdownPickerBtn}
                onPress={() => setShowFormRtDropdown(!showFormRtDropdown)}
              >
                <Text style={styles.dropdownPickerText}>{form.rt || 'Pilih RT'}</Text>
                <Text style={styles.dropdownArrow}>{showFormRtDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showFormRtDropdown && (
                <View style={[styles.dropdownListContainer, { maxHeight: 160 }]}>
                  <ScrollView nestedScrollEnabled>
                    {LIST_RT.map(rt => (
                      <TouchableOpacity
                        key={rt}
                        style={[styles.dropdownOptionItem, form.rt === rt && styles.dropdownOptionActive]}
                        onPress={() => {
                          setForm(p => ({ ...p, rt }));
                          setShowFormRtDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownOptionText, form.rt === rt && styles.dropdownOptionTextActive]}>
                          {rt} (RW 009)
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.inputLabel}>Jenis Surat</Text>
              {JENIS_SURAT.map(j => (
                <TouchableOpacity key={j} style={[styles.jenisBtn, form.jenisSurat === j && styles.jenisBtnActive]} onPress={() => setForm(p => ({ ...p, jenisSurat: j }))}>
                  <Text style={[styles.jenisBtnText, form.jenisSurat === j && styles.jenisBtnTextActive]}>{j}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.inputLabel}>Keperluan Detail</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Contoh: Persyaratan pembuatan KTP baru / Kelengkapan berkas KUR" placeholderTextColor="#999" multiline value={form.keperluan} onChangeText={t => setForm(p => ({ ...p, keperluan: t }))} />

              <TouchableOpacity style={[styles.submitBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{isAdmin ? 'Terbitkan Surat (Selesai)' : 'Kirim Pengajuan Surat'}</Text>}
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
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  statVal: { fontSize: 24, fontWeight: 'bold', color: '#00216e' },
  statLbl: { fontSize: 10, color: '#666', marginTop: 3 },
  filterSection: { marginHorizontal: 20, marginBottom: 12 },
  filterChips: { gap: 8, paddingRight: 10 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  chipActive: { backgroundColor: '#00216e', borderColor: '#00216e' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#fff' },
  rtBadge: { backgroundColor: '#e3f2fd', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  rtBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#1565c0' },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: '#999', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  noSurat: { fontSize: 11, color: '#00216e', fontWeight: 'bold', fontFamily: 'monospace' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeSelesai: { backgroundColor: '#e8f5e9' },
  badgeDiproses: { backgroundColor: '#fff3e0' },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#333' },
  cardName: { fontSize: 15, fontWeight: 'bold', color: '#1a1c1c', marginBottom: 3 },
  cardJenis: { fontSize: 12, color: '#666', marginBottom: 4 },
  cardDate: { fontSize: 11, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', padding: 20 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#00216e' },
  closeX: { fontSize: 22, color: '#999' },
  suratPreview: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 16, backgroundColor: '#fff' },
  suratKop: { fontSize: 13, fontWeight: 'bold', textAlign: 'center', color: '#1a1c1c' },
  suratSubKop: { fontSize: 10, textAlign: 'center', color: '#444', marginTop: 3 },
  suratDivider: { borderBottomWidth: 3, borderBottomColor: '#1a1c1c', marginVertical: 10 },
  suratJudul: { fontSize: 13, fontWeight: 'bold', textAlign: 'center', textDecorationLine: 'underline', marginBottom: 4 },
  suratNomor: { fontSize: 11, textAlign: 'center', color: '#444', marginBottom: 12 },
  suratBody: { fontSize: 12, color: '#333', lineHeight: 18, marginBottom: 10 },
  suratRow: { flexDirection: 'row', marginBottom: 6, paddingLeft: 10 },
  suratRowLabel: { fontSize: 12, fontWeight: '600', width: 100, color: '#333' },
  suratRowValue: { fontSize: 12, flex: 1, color: '#333' },
  suratTtd: { alignItems: 'flex-end', marginTop: 20 },
  suratTtdText: { fontSize: 12, color: '#333' },
  inputLabel: { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12, fontSize: 14, borderWidth: 1, borderColor: '#e0e0e0' },
  dropdownPickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12, marginBottom: 4 },
  dropdownPickerText: { fontSize: 14, color: '#00216e', fontWeight: '600', flex: 1 },
  dropdownArrow: { fontSize: 12, color: '#00216e', fontWeight: 'bold' },
  dropdownListContainer: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#d0dbe9', marginTop: 4, marginBottom: 10, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  dropdownOptionItem: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dropdownOptionActive: { backgroundColor: '#eef2fa' },
  dropdownOptionText: { fontSize: 13, color: '#333' },
  dropdownOptionTextActive: { color: '#00216e', fontWeight: 'bold' },
  jenisBtn: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  jenisBtnActive: { backgroundColor: '#00216e', borderColor: '#00216e' },
  jenisBtnText: { fontSize: 13, color: '#666' },
  jenisBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#00216e', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  printBtn: { backgroundColor: '#00216e', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16, marginBottom: 10 },
  printBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  tabSwitchContainer: { marginHorizontal: 20, marginBottom: 14 },
  tabSwitchBar: { flexDirection: 'row', backgroundColor: '#e8ecf4', borderRadius: 25, padding: 4 },
  tabSwitchBtn: { flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tabSwitchActive: { backgroundColor: '#00216e' },
  tabSwitchText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  tabSwitchTextActive: { color: '#fff' },
});
