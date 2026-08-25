import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  SafeAreaView,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
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
} from './TabIcons';
import SettingsModal from './SettingsModal';

interface MenuDrawerModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

export default function MenuDrawerModal({ visible, onClose, navigation }: MenuDrawerModalProps) {
  const { role, adminName, adminUsername, logout } = useAuth();
  const isAdmin = role === 'admin';
  const [settingsVisible, setSettingsVisible] = useState(false);

  const navigateTo = (screenName: string) => {
    onClose();
    navigation.navigate('MainFlow', { screen: screenName });
  };

  const handleLogout = () => {
    Alert.alert('Konfirmasi Logout', 'Apakah Anda yakin ingin keluar dari mode Admin?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar Admin',
        style: 'destructive',
        onPress: async () => {
          await logout();
          onClose();
        },
      },
    ]);
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.drawerContent}>
                <SafeAreaView style={{ flex: 1 }}>
                  <View style={styles.profileHeader}>
                    <View style={styles.avatarWrap}>
                      <Text style={styles.avatarText}>
                        {isAdmin ? 'A' : 'W'}
                      </Text>
                    </View>
                    <View style={styles.profileInfo}>
                      <Text style={styles.profileTitle}>
                        {isAdmin ? (adminName || 'Pengurus RW 09') : 'Tamu / Warga'}
                      </Text>
                      <Text style={styles.profileSub}>
                        {isAdmin ? `Username: ${adminUsername || 'admin'}` : 'Mode Pengunjung'}
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

                    {isAdmin && (
                      <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Iuran')}>
                        <IuranIcon color="#00216e" size={20} />
                        <Text style={styles.menuLabel}>Data Iuran Warga</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Surat')}>
                      <SuratIcon color="#00216e" size={20} />
                      <Text style={styles.menuLabel}>Surat Pengantar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Pengumuman')}>
                      <PengumumanIcon color="#00216e" size={20} />
                      <Text style={styles.menuLabel}>Pengumuman</Text>
                    </TouchableOpacity>

                    {isAdmin && (
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
                    )}
                  </ScrollView>

                  <View style={styles.footer}>
                    {isAdmin ? (
                      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <LockIcon color="#d32f2f" size={16} />
                        <Text style={styles.logoutText}>Keluar dari Mode Admin</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.versionText}>Kebazeni RW 09 v1.0.0</Text>
                    )}
                  </View>
                </SafeAreaView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
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
});
