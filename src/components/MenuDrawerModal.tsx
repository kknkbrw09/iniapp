import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
  DashboardIcon,
  WargaIcon,
  KeuanganIcon,
  KegiatanIcon,
  IuranIcon,
  SuratIcon,
  PengumumanIcon,
  SettingsIcon,
  LockIcon,
  TermsIcon,
} from './TabIcons';
import SettingsModal from './SettingsModal';
import LoginModal from './LoginModal';
import TermsScreen from '../screens/TermsScreen';

interface MenuDrawerModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

const LIST_RT = Array.from({ length: 18 }, (_, i) => `RT ${String(i + 1).padStart(3, '0')}`);

export default function MenuDrawerModal({ visible, onClose, navigation }: MenuDrawerModalProps) {
  const { role, userRt, guestRt, setGuestRt, adminName, adminUsername, logout, isDasaWisma, isAdmin, isGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);

  const navigateTo = (screenName: string) => {
    onClose();
    navigation.navigate('MainFlow', { screen: screenName });
  };

  const handleLogout = () => {
    Alert.alert('Konfirmasi Logout', 'Apakah Anda yakin ingin keluar dari mode Admin / Kader?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await logout();
          onClose();
        },
      },
    ]);
  };

  const getAvatarText = () => {
    if (!isAdmin) return 'W';
    if (isDasaWisma) return 'DW';
    if (userRt) {
      const num = userRt.replace(/\D/g, '');
      return num ? `RT${parseInt(num, 10)}` : 'RT';
    }
    return 'A';
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.drawerContent, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.profileHeader}>
                    <View style={styles.avatarWrap}>
                      <Text style={[styles.avatarText, (userRt || isDasaWisma) ? { fontSize: 13 } : null]}>
                        {getAvatarText()}
                      </Text>
                    </View>
                    <View style={styles.profileInfo}>
                      <Text style={styles.profileTitle} numberOfLines={1}>
                        {isAdmin ? (adminName || (isDasaWisma ? 'Kader Dasa Wisma' : (userRt ? `Pengurus ${userRt}` : 'Pengurus RW 09'))) : 'Tamu / Warga'}
                      </Text>
                      <Text style={styles.profileSub} numberOfLines={1}>
                        {isAdmin ? (isDasaWisma ? 'Kader Dasa Wisma (Input Warga & Kegiatan)' : (userRt ? `Akses: ${userRt}` : `Username: ${adminUsername || 'admin'}`)) : 'Mode Pengunjung'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                      <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionHeader}>NAVIGASI UTAMA</Text>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Dashboard')}>
                      <DashboardIcon color="#00216e" size={20} />
                      <Text style={styles.menuLabel}>Dashboard</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Warga')}>
                      <WargaIcon color="#00216e" size={20} />
                      <Text style={styles.menuLabel}>Data Warga</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Keuangan')}>
                      <KeuanganIcon color="#00216e" size={20} />
                      <Text style={styles.menuLabel}>Laporan Keuangan</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Kegiatan')}>
                      <KegiatanIcon color="#00216e" size={20} />
                      <Text style={styles.menuLabel}>Agenda Kegiatan</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Iuran')}>
                      <IuranIcon color="#00216e" size={20} />
                      <Text style={styles.menuLabel}>Data Iuran Warga</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Surat')}>
                      <SuratIcon color="#00216e" size={20} />
                      <Text style={styles.menuLabel}>Surat Pengantar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Pengumuman')}>
                      <PengumumanIcon color="#00216e" size={20} />
                      <Text style={styles.menuLabel}>Pengumuman</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => setTermsVisible(true)}>
                      <TermsIcon color="#00216e" size={20} />
                      <Text style={styles.menuLabel}>Syarat & Ketentuan</Text>
                    </TouchableOpacity>

                    {isAdmin ? (
                      <>
                        <View style={styles.divider} />
                        <Text style={styles.sectionHeader}>PENGATURAN AKUN</Text>
                        <TouchableOpacity
                          style={styles.menuItem}
                          onPress={() => setSettingsVisible(true)}
                        >
                          <SettingsIcon color="#00216e" size={20} />
                          <Text style={styles.menuLabel}>Ubah Username & Password</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <View style={styles.divider} />
                        <Text style={styles.sectionHeader}>WILAYAH RT SAYA (TANPA LOGIN)</Text>
                        {guestRt ? (
                          <View style={{ backgroundColor: '#eef2fa', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#c7d2fe' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <LockIcon color="#00216e" size={18} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#00216e', letterSpacing: 0.5 }}>WILAYAH RT TERKUNCI PERMANEN</Text>
                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#00216e', marginTop: 1 }}>{guestRt}</Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 10, color: '#666', marginTop: 6, lineHeight: 14 }}>
                              Aplikasi di HP ini disetel khusus untuk warga {guestRt}.
                            </Text>
                          </View>
                        ) : (
                          <View style={{ backgroundColor: '#f0f4fd', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#d0dbe9' }}>
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#00216e', letterSpacing: 0.5, marginBottom: 4 }}>
                              PILIH RT RUMAH ANDA (1x PILIH):
                            </Text>
                            <Text style={{ fontSize: 11, color: '#555', marginBottom: 8, lineHeight: 15 }}>
                              Pilih RT tempat tinggal Anda. Wilayah ini akan dikunci pada HP Anda.
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                              {LIST_RT.map(rt => (
                                <TouchableOpacity
                                  key={rt}
                                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#00216e', marginRight: 6 }}
                                  onPress={() => {
                                    Alert.alert(
                                      'Konfirmasi Wilayah RT',
                                      `Tetapkan ${rt} sebagai wilayah RT tempat tinggal Anda pada HP ini?`,
                                      [
                                        { text: 'Batal', style: 'cancel' },
                                        { text: 'Ya, Tetapkan 1x', onPress: () => setGuestRt(rt) }
                                      ]
                                    );
                                  }}
                                >
                                  <Text style={{ fontSize: 11, color: '#fff', fontWeight: 'bold' }}>
                                    {rt}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}

                      </>
                    )}
                  </ScrollView>

                  <View style={styles.footer}>
                    {isAdmin ? (
                      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <LockIcon color="#d32f2f" size={16} />
                        <Text style={styles.logoutText}>Keluar dari Mode Admin</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ gap: 8 }}>
                        <TouchableOpacity style={styles.loginDrawerBtn} onPress={() => setLoginVisible(true)}>
                          <LockIcon color="#fff" size={16} />
                          <Text style={styles.loginDrawerBtnText}>Login Admin / Pengurus</Text>
                        </TouchableOpacity>
                        <Text style={styles.versionText}>Kebazeni RW 09 v1.2.3</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />

      <LoginModal
        visible={loginVisible}
        onClose={() => setLoginVisible(false)}
      />

      <Modal visible={termsVisible} animationType="slide" onRequestClose={() => setTermsVisible(false)}>
        <TermsScreen isModal onClose={() => setTermsVisible(false)} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  drawerContent: {
    width: '80%',
    height: '100%',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#00216e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00216e',
  },
  profileSub: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 18,
    color: '#999',
  },
  menuList: {
    flex: 1,
    marginTop: 10,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#888',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 12,
  },
  menuLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  footer: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffebee',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  logoutText: {
    color: '#d32f2f',
    fontSize: 13,
    fontWeight: 'bold',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#999',
  },
  loginDrawerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00216e',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  loginDrawerBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
