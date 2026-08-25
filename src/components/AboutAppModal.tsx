import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface AboutAppModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenTerms?: () => void;
}

export default function AboutAppModal({ visible, onClose, onOpenTerms }: AboutAppModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          {/* Sheet Handle Bar */}
          <View style={styles.sheetHandleBar} />

          {/* Header */}
          <View style={styles.modalHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.appIconBadge}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Path d="M3 10L12 3L21 10V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V10Z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
                  <Circle cx="12" cy="8" r="1.5" fill="#fff" />
                </Svg>
              </View>
              <Text style={styles.modalTitle}>Tentang Aplikasi</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
            {/* App Branding Info */}
            <View style={styles.brandCard}>
              <Text style={styles.brandTitle}>KEBAZENI</Text>
              <Text style={styles.brandSub}>Sistem Informasi Digital RW 09</Text>
              <View style={styles.versionChip}>
                <Text style={styles.versionChipText}>Versi 1.0.0 (Build 2026.08)</Text>
              </View>
            </View>

            {/* Description */}
            <Text style={styles.sectionLabel}>DESKRIPSI APLIKASI</Text>
            <Text style={styles.descText}>
              KEBAZENI adalah platform manajemen digital lingkungan RW 09 yang dirancang untuk mendukung efisiensi pelayanan administrasi warga, transparansi keuangan kas, agenda kegiatan, pengumuman digital, status iuran, dan permohonan surat pengantar.
            </Text>

            {/* App Specs Table */}
            <Text style={styles.sectionLabel}>INFORMASI APLIKASI</Text>
            <View style={styles.infoTable}>
              {[
                ['Nama Aplikasi', 'KEBAZENI'],
                ['Versi Rilis', 'v1.0.0'],
                ['Pengembang', 'Pengurus RW 09 & Tim KKN'],
                ['Peruntukan', 'Layanan Lingkungan RW 09'],
                ['Status Layanan', 'Aktif & Terintegrasi'],
              ].map(([lbl, val], idx) => (
                <View key={lbl} style={[styles.infoRow, idx < 4 && styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>{lbl}</Text>
                  <Text style={styles.infoVal}>{val}</Text>
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            {onOpenTerms && (
              <TouchableOpacity
                style={styles.termsBtn}
                onPress={() => {
                  onClose();
                  onOpenTerms();
                }}
              >
                <Text style={styles.termsBtnText}>Lihat Syarat & Ketentuan Penggunaan</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Tutup</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    marginBottom: 0,
    width: '100%',
  },
  sheetHandleBar: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#d8dfe8',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  appIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#00216e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00216e',
  },
  closeX: {
    fontSize: 22,
    color: '#999',
  },
  brandCard: {
    backgroundColor: '#f0f4fd',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d0dbe9',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00216e',
    letterSpacing: 1,
  },
  brandSub: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  versionChip: {
    backgroundColor: '#00216e',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  versionChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888',
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 6,
  },
  descText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
    marginBottom: 14,
  },
  infoTable: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 12,
    color: '#1a1c1c',
    fontWeight: 'bold',
  },
  termsBtn: {
    backgroundColor: '#eef2fa',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#d0dbe9',
  },
  termsBtnText: {
    color: '#00216e',
    fontSize: 13,
    fontWeight: 'bold',
  },
  closeBtn: {
    backgroundColor: '#00216e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
