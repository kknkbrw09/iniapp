import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { logger, LogEntry, LogType } from '../utils/logger';

export default function DebugLogModal() {
  const [modalVisible, setModalVisible] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'SEMUA' | LogType>('SEMUA');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    setLogs([...logger.getLogs()]);
    const unsubscribe = logger.subscribe(() => {
      setLogs([...logger.getLogs()]);
    });
    return unsubscribe;
  }, []);

  const filteredLogs = logs.filter(l => filter === 'SEMUA' || l.type === filter);
  const errorCount = logs.filter(l => l.type === 'ERROR').length;

  const getBadgeColor = (type: LogType) => {
    switch (type) {
      case 'ERROR': return '#bb0013';
      case 'SUCCESS': return '#2e7d32';
      case 'API': return '#00216e';
      default: return '#555';
    }
  };

  return (
    <>
      {/* Floating Debug Button */}
      <TouchableOpacity
        style={[styles.floatingBtn, errorCount > 0 && styles.floatingBtnError]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.floatingBtnText}>🐛 {errorCount > 0 ? `(${errorCount})` : ''}</Text>
      </TouchableOpacity>

      {/* Debug Inspector Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {/* Header */}
            <View style={styles.modalHead}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.modalTitle}>Debugger & Log API</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{logs.length} Log</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
              {(['SEMUA', 'ERROR', 'API', 'SUCCESS', 'INFO'] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterTab, filter === f && styles.filterTabActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Log Items List */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {filteredLogs.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>Belum ada log terekam dalam sesi ini</Text>
                </View>
              ) : (
                filteredLogs.map(log => {
                  const isExpanded = expandedLogId === log.id;
                  const color = getBadgeColor(log.type);
                  return (
                    <TouchableOpacity
                      key={log.id}
                      style={styles.logCard}
                      onPress={() => setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      <View style={styles.logHead}>
                        <View style={[styles.typeBadge, { backgroundColor: color }]}>
                          <Text style={styles.typeBadgeText}>{log.type}</Text>
                        </View>
                        <Text style={styles.logTime}>{log.timestamp}</Text>
                      </View>

                      <Text style={styles.logTitle}>{log.title}</Text>

                      {isExpanded ? (
                        <View style={styles.detailsBox}>
                          <Text style={styles.detailsText}>{log.details}</Text>
                        </View>
                      ) : (
                        <Text style={styles.logSnippet} numberOfLines={1}>
                          {log.details}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  logger.clearLogs();
                  Alert.alert('Sukses', 'Seluruh log telah dibersihkan');
                }}
              >
                <Text style={styles.clearBtnText}>Bersihkan Log</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtnText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingBtn: {
    position: 'absolute',
    bottom: 75,
    right: 16,
    backgroundColor: '#00216e',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 999,
  },
  floatingBtnError: {
    backgroundColor: '#bb0013',
  },
  floatingBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#1a1c24',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 16,
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2d313e',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  countBadge: {
    backgroundColor: '#2d313e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    color: '#aaa',
    fontSize: 10,
  },
  closeX: {
    fontSize: 20,
    color: '#aaa',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 6,
  },
  filterTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#2d313e',
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
  },
  filterTabText: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: '#777',
    fontSize: 13,
  },
  logCard: {
    backgroundColor: '#242836',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#32374a',
  },
  logHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logTime: {
    color: '#888',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  logTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  logSnippet: {
    color: '#aaa',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  detailsBox: {
    backgroundColor: '#12141a',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  detailsText: {
    color: '#4ade80',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  clearBtn: {
    flex: 1,
    backgroundColor: '#2d313e',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  clearBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
