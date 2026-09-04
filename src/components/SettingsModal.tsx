import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { SettingsIcon } from './TabIcons';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

function EyeIcon({ visible, color = '#666', size = 20 }: { visible: boolean; color?: string; size?: number }) {
  if (visible) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <Circle cx="12" cy="12" r="3" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <Line x1="1" y1="1" x2="23" y2="23" />
    </Svg>
  );
}

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { adminUsername, adminName, updateAdminCredentials } = useAuth();
  const [username, setUsername] = useState(adminUsername || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Perhatian', 'Username baru tidak boleh kosong.');
      return;
    }
    if (!currentPassword) {
      Alert.alert('Perhatian', 'Password saat ini wajib diisi untuk verifikasi.');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      Alert.alert('Perhatian', 'Password baru dan konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const result = await updateAdminCredentials(
        username,
        currentPassword,
        newPassword ? newPassword : undefined
      );
      if (result.success) {
        Alert.alert('Berhasil', result.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      } else {
        Alert.alert('Gagal Memperbarui', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingContainer}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalBox}>
                <View style={styles.header}>
                  <View style={styles.titleRow}>
                    <View style={styles.iconBadge}>
                      <SettingsIcon color="#fff" size={20} />
                    </View>
                    <View>
                      <Text style={styles.title}>Pengaturan Akun Admin</Text>
                      <Text style={styles.subtitle}>{adminName || 'Pengurus RW 09'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Text style={styles.closeText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                  <Text style={styles.label}>USERNAME BARU</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Masukkan username baru"
                    placeholderTextColor="#999"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />

                  <Text style={styles.label}>PASSWORD SAAT INI (VERIFIKASI)</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Masukkan password saat ini"
                      placeholderTextColor="#999"
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry={!showCurrentPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      <EyeIcon visible={showCurrentPassword} color="#666" size={20} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>PASSWORD BARU (OPSIONAL)</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Kosongkan jika tidak mau ubah password"
                      placeholderTextColor="#999"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                    >
                      <EyeIcon visible={showNewPassword} color="#666" size={20} />
                    </TouchableOpacity>
                  </View>

                  {newPassword ? (
                    <>
                      <Text style={styles.label}>KONFIRMASI PASSWORD BARU</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ulangi password baru"
                        placeholderTextColor="#999"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                      />
                    </>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitText}>Simpan Perubahan Akun</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                    <Text style={styles.cancelText}>Batal</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  keyboardAvoidingContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#00216e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00216e',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#00216e',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 12,
    textAlign: 'left',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#00216e',
    textAlign: 'left',
    fontWeight: '600',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingRight: 6,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#00216e',
    textAlign: 'left',
    fontWeight: '600',
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: '#00216e',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
    shadowColor: '#00216e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  cancelText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
  },
});
