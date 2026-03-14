
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
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
  winner?: number;
  similarity_1?: number;
  similarity_2?: number;
  explanation?: string;
  // legacy fields
  result?: {
    winner?: number;
    similarity_1?: number;
    similarity_2?: number;
    explanation?: string;
    matches?: { name: string; similarity: number }[];
    summary?: string;
  };
  matches?: { name: string; similarity: number }[];
  summary?: string;
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<ComparisonHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const { user } = useAuth();

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[History] Loading comparison history...');
      const data = await getComparisons();
      const items: ComparisonHistoryItem[] = (data.comparisons as ComparisonHistoryItem[]) || [];
      console.log('[History] Loaded', items.length, 'comparisons');
      setHistory(items);
    } catch (err: unknown) {
      console.error('[History] Failed to load history:', err);
      const msg = err instanceof Error ? err.message : 'Impossibile caricare lo storico.';
      setError(msg);
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
    } catch (err: unknown) {
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

  const renderItem = ({ item }: { item: ComparisonHistoryItem }) => {
    // Support both new shape (winner/similarity_1/similarity_2) and legacy (result.*)
    const winner = item.winner ?? item.result?.winner;
    const sim1 = item.similarity_1 ?? item.result?.similarity_1;
    const sim2 = item.similarity_2 ?? item.result?.similarity_2;
    const explanation = item.explanation ?? item.result?.explanation ?? item.summary ?? item.result?.summary ?? '';
    const dateText = item.created_at ? formatDate(item.created_at) : '';

    const winnerLabel = winner === 1 ? 'Foto 1 vince' : winner === 2 ? 'Foto 2 vince' : 'Risultato';
    const sim1Text = sim1 != null ? `${Number(sim1).toFixed(0)}%` : null;
    const sim2Text = sim2 != null ? `${Number(sim2).toFixed(0)}%` : null;

    return (
      <View style={styles.historyItem}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.matchName} numberOfLines={1}>
              {winnerLabel}
            </Text>
            {winner != null && (
              <View style={[styles.badge, { backgroundColor: colors.success }]}>
                <Text style={styles.badgeText}>
                  {winner === 1 ? '🏆 Foto 1' : '🏆 Foto 2'}
                </Text>
              </View>
            )}
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

        {(sim1Text || sim2Text) && (
          <View style={styles.simRow}>
            {sim1Text && (
              <View style={[styles.simChip, { backgroundColor: winner === 1 ? colors.success : colors.error }]}>
                <Text style={styles.simChipText}>
                  Foto 1:
                </Text>
                <Text style={styles.simChipText}>
                  {sim1Text}
                </Text>
              </View>
            )}
            {sim2Text && (
              <View style={[styles.simChip, { backgroundColor: winner === 2 ? colors.success : colors.error }]}>
                <Text style={styles.simChipText}>
                  Foto 2:
                </Text>
                <Text style={styles.simChipText}>
                  {sim2Text}
                </Text>
              </View>
            )}
          </View>
        )}

        {explanation ? (
          <Text style={styles.summaryText} numberOfLines={2}>
            {explanation}
          </Text>
        ) : null}
        <Text style={styles.dateText}>{dateText}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Cronologia</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Cronologia</Text>
        </View>
        <View style={styles.centered}>
          <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="error" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadHistory}>
            <Text style={styles.retryButtonText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.titleRow}>
        <Text style={styles.screenTitle}>Cronologia</Text>
        <TouchableOpacity onPress={loadHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {history.length === 0 ? (
        <View style={styles.centered}>
          <IconSymbol ios_icon_name="clock.fill" android_material_icon_name="history" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Nessun confronto salvato</Text>
          <Text style={styles.emptySubtext}>I tuoi confronti appariranno qui</Text>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Elimina Confronto</Text>
            <Text style={styles.modalMessage}>
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
  container: { flex: 1, backgroundColor: colors.background },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  screenTitle: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 16, fontSize: 16, color: colors.text },
  errorText: { fontSize: 16, textAlign: 'center', marginTop: 16, marginBottom: 24, color: colors.text },
  retryButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary },
  retryButtonText: { fontSize: 16, fontWeight: '600', color: colors.background },
  emptyText: { fontSize: 20, fontWeight: '600', marginTop: 16, color: colors.text },
  emptySubtext: { fontSize: 16, marginTop: 8, opacity: 0.6, color: colors.textSecondary },
  listContent: { padding: 16, paddingBottom: 120 },
  historyItem: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  itemInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  matchName: { fontSize: 17, fontWeight: '600', flex: 1, color: colors.text },
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  deleteBtn: { padding: 4 },
  simRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  simChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  simChipText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  summaryText: { fontSize: 14, lineHeight: 20, marginBottom: 8, color: colors.textSecondary },
  dateText: { fontSize: 13, opacity: 0.7, color: colors.textSecondary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: { borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, backgroundColor: colors.card },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: colors.text },
  modalMessage: { fontSize: 16, marginBottom: 24, lineHeight: 22, color: colors.textSecondary },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: '#000', fontSize: 16, fontWeight: '600' },
  deleteConfirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
