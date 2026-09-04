import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Animated } from 'react-native';

interface TermsScreenProps {
  onAgree?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export default function TermsScreen({ onAgree, isModal, onClose }: TermsScreenProps) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleConfirm = () => {
    if (!agreed && !isModal) return;
    setLoading(true);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (onAgree) onAgree();
      if (onClose) onClose();
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>RW 09</Text>
          </View>
          {isModal && onClose && (
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <Text style={{ fontSize: 20, color: '#999', fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.title}>Syarat & Ketentuan</Text>
        <Text style={styles.subtitle}>Penggunaan Aplikasi Kebazeni RW 09 • Versi 1.2.3</Text>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Privasi & Kerahasiaan Data</Text>
          <Text style={styles.paragraph}>
            Aplikasi Kebazeni RW 09 menghormati privasi seluruh warga. Data sensitif seperti NIK (Nomor Induk Kependudukan) dan Nomor KK dilindungi secara aman dan tidak ditampilkan terbuka kepada umum.
          </Text>

          <Text style={styles.sectionTitle}>2. Ketentuan Penggunaan Aplikasi</Text>
          <Text style={styles.paragraph}>
            Aplikasi ini dipergunakan khusus untuk mendukung transparansi administrasi warga, pencatatan kas/keuangan, agenda kegiatan lingkungan, iuran, pengumuman, serta permohonan surat pengantar RW 09.
          </Text>

          <Text style={styles.sectionTitle}>3. Hak & Kewajiban Pengguna</Text>
          <Text style={styles.paragraph}>
            • <Text style={styles.bold}>Admin Pengurus</Text>: Berhak mengelola data warga, mengunggah pengumuman, dan mencatat transaksi kas secara bertanggung jawab.
          </Text>
          <Text style={styles.paragraph}>
            • <Text style={styles.bold}>Warga / Publik (Guest)</Text>: Berhak mengakses laporan transparansi kas, agenda kegiatan, pengumuman, dan status iuran. Warga dilarang menyalahgunakan data yang tersedia.
          </Text>

          <Text style={styles.sectionTitle}>4. Pembaharuan Versi & Informasi</Text>
          <Text style={styles.paragraph}>
            Versi aplikasi saat ini adalah <Text style={styles.bold}>v1.2.3 (Build 2026.09)</Text>. Pengurus RW 09 berhak memperbarui fitur aplikasi demi meningkatkan keamanan dan kemudahan layanan warga.
          </Text>
        </View>
      </ScrollView>

      {/* Footer Consent Section */}
      <View style={styles.footer}>
        {!isModal ? (
          <>
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreed(!agreed)}>
              <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                {agreed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                Saya telah membaca dan menyetujui <Text style={styles.bold}>Syarat & Ketentuan</Text> aplikasi Kebazeni RW 09.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.agreeBtn, !agreed && styles.agreeBtnDisabled]}
              onPress={handleConfirm}
              disabled={!agreed || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.agreeBtnText}>Setuju & Lanjutkan</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.agreeBtn} onPress={onClose}>
            <Text style={styles.agreeBtnText}>Tutup</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  logoBadge: {
    backgroundColor: '#00216e',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  logoBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00216e',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  contentScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#edf2f7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00216e',
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
    marginBottom: 8,
  },
  bold: {
    fontWeight: 'bold',
    color: '#1a1c1c',
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#00216e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: '#00216e',
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
  },
  agreeBtn: {
    backgroundColor: '#00216e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  agreeBtnDisabled: {
    backgroundColor: '#ccc',
  },
  agreeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
