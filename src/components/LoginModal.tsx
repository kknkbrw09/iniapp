import React, { useState, useRef } from 'react';
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
import { LockIcon } from './TabIcons';

interface LoginModalProps {
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

export default function LoginModal({ visible, onClose }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const passwordInputRef = useRef<TextInput>(null);

  const handleAdminLogin = async () => {
    if (!username || !password) {
      Alert.alert('Perhatian', 'Mohon isi username dan password admin');
      return;
    }

    setLoading(true);
    try {
      const success = await login(username, password);
      if (success) {
        setUsername('');
        setPassword('');
        setShowPassword(false);
        onClose();
        Alert.alert('Berhasil', 'Login Admin Berhasil');
      } else {
        Alert.alert('Gagal Login', 'Username atau password admin salah');
      }
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingContainer}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.glassCard}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  <View style={styles.header}>
                    <View style={styles.titleRow}>
                      <View style={styles.iconBadge}>
                        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M3 10L12 3L21 10V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V10Z"
                            stroke="#fff"
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />
                          <Circle cx="12" cy="8" r="1.5" fill="#fff" />
                        </Svg>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.title}>Login Pengurus / Admin</Text>
                        <Text style={styles.subtitle}>Masuk untuk mengelola data RW 09</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                      <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.form}>
                    <Text style={styles.label}>USERNAME ADMIN / KADER</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Contoh: admin / admin_rt01 / dasawisma"
                      placeholderTextColor="#94a3b8"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      returnKeyType="next"
                      onSubmitEditing={() => passwordInputRef.current?.focus()}
                      blurOnSubmit={false}
                    />

                    <Text style={styles.label}>PASSWORD</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        ref={passwordInputRef}
                        style={styles.passwordInput}
                        placeholder="Masukkan password akun Anda"
                        placeholderTextColor="#94a3b8"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        returnKeyType="done"
                        onSubmitEditing={handleAdminLogin}
                      />
                      <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setShowPassword(!showPassword)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <EyeIcon visible={showPassword} color="#64748b" size={20} />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                      onPress={handleAdminLogin}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <LockIcon color="#fff" size={18} />
                          <Text style={styles.submitText}>Masuk Ke Aplikasi</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                      <Text style={styles.cancelText}>Batal</Text>
                    </TouchableOpacity>
                  </View>
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
  glassCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
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
    gap: 12,
    flex: 1,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
  form: {
    marginTop: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#00216e',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 14,
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
    marginTop: 4,
  },
  cancelText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
  },
});

