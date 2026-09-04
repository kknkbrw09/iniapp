import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginAsGuest } = useAuth();
  const passwordInputRef = useRef<TextInput>(null);

  const handleAdminLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Mohon isi username dan password');
      return;
    }

    setLoading(true);
    try {
      const success = await login(username, password);
      if (!success) {
        Alert.alert('Error', 'Username atau password salah');
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal melakukan login');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    await loginAsGuest();
  };

  return (
    <LinearGradient
      colors={['#00216e', '#012366', '#bb0013']}
      style={styles.container}
    >
      <View style={styles.backgroundShapes}>
        <View style={[styles.shape, styles.shape1]} />
        <View style={[styles.shape, styles.shape2]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Svg width={42} height={42} viewBox="0 0 24 24" fill="none">
                  <Path d="M3 10L12 3L21 10V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V10Z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
                  <Path d="M9 21V12H15V21" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
                  <Circle cx="12" cy="8" r="1.5" fill="#fff" />
                </Svg>
              </View>
              <Text style={styles.title}>Portal RW 09</Text>
              <Text style={styles.subtitle}>Kebon Bawang, Jakarta Utara</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>USERNAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan username admin"
                placeholderTextColor="#999"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
              />

              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="Masukkan password admin"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleAdminLogin}
              />

              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleAdminLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Masuk sebagai Admin</Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>atau</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin}>
                <Text style={styles.guestButtonText}>Masuk sebagai Tamu</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  backgroundShapes: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shape: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.3,
  },
  shape1: {
    top: -50,
    left: -50,
    backgroundColor: '#0033a0',
  },
  shape2: {
    bottom: -50,
    right: -50,
    backgroundColor: '#bb0013',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    backgroundColor: '#00216e',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 24,
    padding: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#00216e',
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    marginBottom: 18,
    color: '#00216e',
    textAlign: 'center',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#00216e',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#00216e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#cbd5e1',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#64748b',
    fontSize: 12,
    fontWeight: 'bold',
  },
  guestButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  guestButtonText: {
    color: '#00216e',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
