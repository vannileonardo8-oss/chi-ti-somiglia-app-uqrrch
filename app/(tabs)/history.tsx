
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  useColorScheme,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedDelete } from '@/utils/api';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';

interface ComparisonHistoryItem {
  id: string;
  mainImageUrl: string;
  mainImageLabel: string;
  compareImage1Url: string;
  compareImage1Label: string;
  compareImage2Url: string;
  compareImage2Label: string;
  winner: 1 | 2;
  createdAt: string;
}

// Helper to resolve image sources (handles both local and remote URLs)
function resolveImageSource(source: string | number | undefined): { uri: string } | number {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as number;
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [history, setHistory] = useState<ComparisonHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ visible: boolean; id: string | null }>({
    visible: false,
    id: null,
  });
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardColor = isDark ? colors.cardDark : colors.card;
  const primaryColor = isDark ? colors.primaryDark : colors.primary;
  const deleteColor = '#FF3B30';

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    console.log('[History] Loading comparison history');
    setLoading(true);
    
    try {
      const data = await authenticatedGet<ComparisonHistoryItem[]>('/api/comparisons');
      console.log('[History] History loaded, count:', data.length);
      setHistory(data);
    } catch (error) {
      console.error('[History] Error loading history:', error);
      setErrorModal({
        visible: true,
        message: 'Impossibile caricare la cronologia. Riprova più tardi.',
      });
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (id: string) => {
    console.log('[History] User tapped history item:', id);
    router.push(`/results/${id}`);
  };

  const handleBackPress = () => {
    console.log('[History] User tapped back button from history');
    router.push('/(tabs)/(home)');
  };

  const confirmDelete = (id: string) => {
    console.log('[History] User swiped to delete item:', id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDeleteModal({ visible: true, id });
  };

  const handleDelete = async () => {
    const itemId = deleteModal.id;
    if (!itemId) return;

    console.log('[History] Deleting comparison:', itemId);
    setDeleteModal({ visible: false, id: null });

    try {
      await authenticatedDelete(`/api/comparisons/${itemId}`);
      console.log('[History] Comparison deleted successfully');
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setHistory(prevHistory => prevHistory.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('[History] Error deleting comparison:', error);
      setErrorModal({
        visible: true,
        message: 'Impossibile eliminare il confronto. Riprova più tardi.',
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return 'Oggi';
    }
    if (diffDays === 1) {
      return 'Ieri';
    }
    if (diffDays < 7) {
      const daysDiffText = `${diffDays} giorni fa`;
      return daysDiffText;
    }
    
    const dateText = date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    return dateText;
  };

  const renderRightActions = (itemId: string) => {
    return (
      <TouchableOpacity
        style={[styles.deleteAction, { backgroundColor: deleteColor }]}
        onPress={() => confirmDelete(itemId)}
        activeOpacity={0.8}
      >
        <IconSymbol
          ios_icon_name="trash.fill"
          android_material_icon_name="delete"
          size={24}
          color="#FFFFFF"
        />
        <Text style={styles.deleteText}>Elimina</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: ComparisonHistoryItem }) => {
    const winnerLabel = item.winner === 1 ? item.compareImage1Label : item.compareImage2Label;
    const dateText = formatDate(item.createdAt);
    
    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item.id)}
        overshootRight={false}
        friction={2}
      >
        <TouchableOpacity
          style={[styles.historyCard, { backgroundColor: cardColor }]}
          onPress={() => handleItemPress(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.imagesRow}>
            <Image 
              source={resolveImageSource(item.mainImageUrl)} 
              style={styles.thumbnail}
              resizeMode="cover"
              onError={(e) => {
                console.error('[History] Error loading main image:', item.mainImageUrl, e.nativeEvent.error);
              }}
            />
            <View style={styles.vsContainer}>
              <Text style={[styles.vsText, { color: textSecondaryColor }]}>VS</Text>
            </View>
            <Image 
              source={resolveImageSource(item.compareImage1Url)} 
              style={styles.thumbnail}
              resizeMode="cover"
              onError={(e) => {
                console.error('[History] Error loading compare1 image:', item.compareImage1Url, e.nativeEvent.error);
              }}
            />
            <Image 
              source={resolveImageSource(item.compareImage2Url)} 
              style={styles.thumbnail}
              resizeMode="cover"
              onError={(e) => {
                console.error('[History] Error loading compare2 image:', item.compareImage2Url, e.nativeEvent.error);
              }}
            />
          </View>
          
          <View style={styles.infoContainer}>
            <View style={styles.labelRow}>
              <Text style={[styles.mainLabel, { color: textColor }]}>{item.mainImageLabel}</Text>
              <IconSymbol
                ios_icon_name="arrow.right"
                android_material_icon_name="arrow-forward"
                size={16}
                color={textSecondaryColor}
              />
              <Text style={[styles.winnerText, { color: primaryColor }]}>{winnerLabel}</Text>
            </View>
            <Text style={[styles.dateText, { color: textSecondaryColor }]}>{dateText}</Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        
        <View style={[styles.header, Platform.OS === 'android' && { paddingTop: 48 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="arrow.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={textColor}
            />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.title, { color: textColor }]}>Cronologia</Text>
            <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
              I tuoi confronti passati
            </Text>
          </View>
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="clock"
              android_material_icon_name="history"
              size={64}
              color={textSecondaryColor}
            />
            <Text style={[styles.emptyText, { color: textSecondaryColor }]}>
              Nessun confronto ancora
            </Text>
            <Text style={[styles.emptySubtext, { color: textSecondaryColor }]}>
              Inizia un nuovo confronto per vedere i risultati qui
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
          visible={deleteModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteModal({ visible: false, id: null })}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardColor }]}>
              <Text style={styles.modalEmoji}>🗑️</Text>
              <Text style={[styles.modalTitle, { color: textColor }]}>Elimina Confronto</Text>
              <Text style={[styles.modalMessage, { color: textSecondaryColor }]}>
                Sei sicuro di voler eliminare questo confronto? Questa azione non può essere annullata.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { backgroundColor: cardColor, borderColor: textSecondaryColor }]}
                  onPress={() => setDeleteModal({ visible: false, id: null })}
                >
                  <Text style={[styles.cancelButtonText, { color: textColor }]}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton, { backgroundColor: deleteColor }]}
                  onPress={handleDelete}
                >
                  <Text style={styles.deleteButtonText}>Elimina</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Error Modal */}
        <Modal
          visible={errorModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setErrorModal({ visible: false, message: '' })}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardColor }]}>
              <Text style={styles.modalEmoji}>⚠️</Text>
              <Text style={[styles.modalTitle, { color: textColor }]}>Errore</Text>
              <Text style={[styles.modalMessage, { color: textSecondaryColor }]}>
                {errorModal.message}
              </Text>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: primaryColor }]}
                onPress={() => setErrorModal({ visible: false, message: '' })}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  backButton: {
    padding: 8,
    marginTop: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  historyCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  imagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  vsContainer: {
    paddingHorizontal: 8,
  },
  vsText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoContainer: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  winnerText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    marginBottom: 16,
    borderRadius: 16,
    marginLeft: 8,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 2,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    // backgroundColor set inline
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
