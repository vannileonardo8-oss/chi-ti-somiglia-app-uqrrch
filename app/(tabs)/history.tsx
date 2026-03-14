
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { getComparisons, deleteComparison } from '@/utils/api';

interface ComparisonHistoryItem {
  id: string;
  created_at: string;
  image_url?: string;
  result?: any;
  summary?: string;
  matches?: { name: string; similarity: number }[];
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<ComparisonHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const isDark = colorScheme === 'dark';

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[History] Loading comparison history from edge function...');
      const data = await getComparisons();
      const items: ComparisonHistoryItem[] = data.comparisons || [];
      console.log('[History] Loaded', items.length, 'comparisons');
      setHistory(items);
    } catch (err: any) {
      console.error('[History] Failed to load history:', err);
      setError(err?.message || 'Impossibile caricare lo storico.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setLoading(false);
    }
  }, [user, loadHistory]);

  const confirmDelete = (id: string) => {
    console.log('[History] User tapped delete for item:', id);
    setItemToDelete(id);
    setDeleteModalVisible(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    console.log('[History] User confirmed delete for:', itemToDelete);
    try {
      await deleteComparison(itemToDelete);
      setHistory((prev) => prev.filter((item) => item.id !== itemToDelete));
      console.log('[History] Item deleted successfully');
    } catch (err: any) {
      console.error('[History] Failed to delete:', err);
    } finally {
      setDeleteModalVisible(false);
      setItemToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Adesso';
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    if (diffDays < 7) return `${diffDays} giorni fa`;
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  const cardBg = isDark ? '#1c1c1e' : '#fff';

  const renderItem = ({ item }: { item: ComparisonHistoryItem }) => {
    const topMatch = item.matches?.[0] || item.result?.matches?.[0];
    const matchName = topMatch?.name || 'Risultato';
    const similarityNum = Number(topMatch?.similarity);
    const similarityText = topMatch
      ? (isNaN(similarityNum) ? String(topMatch.similarity) : similarityNum.toFixed(1) + '%')
      : '';
    const dateText = item.created_at ? formatDate(item.created_at) : '';
    const summary = item.summary || item.result?.summary || '';

    return (
      <View style={[styles.historyItem, { backgroundColor: cardBg }]}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={[styles.matchName, { color: colors.text }]} numberOfLines={1}>
              {matchName}
            </Text>
            {similarityText ? (
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <Text style={[styles.badgeText, { color: colors.background }]}>
                  {similarityText}
                </Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => confirmDelete(item.id)}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol
              ios_icon_name="trash.fill"
              android_material_icon_name="delete"
              size={20}
              color="#ff3b30"
            />
          </TouchableOpacity>
        </View>
        {summary ? (
          <Text style={[styles.summaryText, { color: colors.textSecondary }]} numberOfLines={2}>
            {summary}
          </Text>
        ) : null}
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{dateText}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.titleRow}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Cronologia</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.titleRow}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Cronologia</Text>
        </View>
        <View style={styles.centered}>
          <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="error" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadHistory}
          >
            <Text style={[styles.retryButtonText, { color: colors.background }]}>Riprova</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.titleRow}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Cronologia</Text>
        <TouchableOpacity onPress={loadHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {history.length === 0 ? (
        <View style={styles.centered}>
          <IconSymbol ios_icon_name="clock.fill" android_material_icon_name="history" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>Nessun confronto salvato</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            I tuoi confronti appariranno qui
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Elimina Confronto</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              Sei sicuro di voler eliminare questo confronto? Questa azione non può essere annullata.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#e5e5ea' }]}
                onPress={() => {
                  console.log('[History] User cancelled delete');
                  setDeleteModalVisible(false);
                  setItemToDelete(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#ff3b30' }]}
                onPress={handleDelete}
              >
                <Text style={styles.deleteConfirmButtonText}>Elimina</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  screenTitle: { fontSize: 28, fontWeight: 'bold' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 16, fontSize: 16 },
  errorText: { fontSize: 16, textAlign: 'center', marginTop: 16, marginBottom: 24 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryButtonText: { fontSize: 16, fontWeight: '600' },
  emptyText: { fontSize: 20, fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 16, marginTop: 8, opacity: 0.6 },
  listContent: { padding: 16, paddingBottom: 120 },
  historyItem: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  matchName: { fontSize: 17, fontWeight: '600', flex: 1 },
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  deleteBtn: { padding: 4 },
  summaryText: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  dateText: { fontSize: 13, opacity: 0.7 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: { borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  modalMessage: { fontSize: 16, marginBottom: 24, lineHeight: 22 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: '#000', fontSize: 16, fontWeight: '600' },
  deleteConfirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
