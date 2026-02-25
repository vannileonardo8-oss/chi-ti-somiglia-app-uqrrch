
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
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchComparisonHistory,
  deleteComparisonFromSupabase,
  supabase,
} from '@/lib/supabase';

interface ComparisonHistoryItem {
  id: string;
  main_image_url: string;
  main_image_label: string;
  compare_image_1_url: string;
  compare_image_1_label: string;
  compare_image_2_url: string;
  compare_image_2_label: string;
  winner_image: 1 | 2;
  created_at: string;
}

function resolveImageSource(url: string) {
  if (!url) {
    console.warn('[History] Empty image URL provided');
    return { uri: '' };
  }
  if (typeof url === 'string') {
    return { uri: url };
  }
  return url;
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<ComparisonHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { user } = useAuth();

  useEffect(() => {
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      console.log('[History] Loading comparison history from Supabase...');
      
      // Get Supabase user ID
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUserId = session?.user?.id;
      
      if (!supabaseUserId) {
        console.log('[History] No Supabase user logged in');
        setLoading(false);
        return;
      }
      
      const data = await fetchComparisonHistory(supabaseUserId);
      
      console.log('[History] Loaded', data.length, 'comparisons');
      setHistory(data);
    } catch (error) {
      console.error('[History] Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (id: string) => {
    console.log('[History] Opening comparison:', id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/results/${id}`);
  };

  const handleBackPress = () => {
    console.log('[History] Navigating back to home');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const confirmDelete = (id: string) => {
    console.log('[History] Confirming delete for:', id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItemToDelete(id);
    setDeleteModalVisible(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      console.log('[History] Deleting comparison:', itemToDelete);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Get Supabase user ID
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUserId = session?.user?.id;
      
      if (!supabaseUserId) {
        console.error('[History] No Supabase user logged in');
        return;
      }
      
      await deleteComparisonFromSupabase(itemToDelete, supabaseUserId);
      
      setHistory((prev) => prev.filter((item) => item.id !== itemToDelete));
      setDeleteModalVisible(false);
      setItemToDelete(null);
      
      console.log('[History] Comparison deleted successfully');
    } catch (error) {
      console.error('[History] Failed to delete comparison:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const renderRightActions = (itemId: string) => {
    return (
      <View style={styles.deleteAction}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            confirmDelete(itemId);
          }}
        >
          <IconSymbol
            ios_icon_name="trash.fill"
            android_material_icon_name="delete"
            size={24}
            color="#fff"
          />
          <Text style={styles.deleteText}>Elimina</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item }: { item: ComparisonHistoryItem }) => {
    const winnerUrl = item.winner_image === 1 ? item.compare_image_1_url : item.compare_image_2_url;
    const winnerLabel = item.winner_image === 1 ? item.compare_image_1_label : item.compare_image_2_label;
    const loserUrl = item.winner_image === 1 ? item.compare_image_2_url : item.compare_image_1_url;
    const loserLabel = item.winner_image === 1 ? item.compare_image_2_label : item.compare_image_1_label;

    const dateText = formatDate(item.created_at);

    return (
      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
        <TouchableOpacity
          style={[
            styles.historyItem,
            { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#fff' },
          ]}
          onPress={() => handleItemPress(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.imagesRow}>
            <View style={styles.imageContainer}>
              <Image
                source={resolveImageSource(item.main_image_url)}
                style={styles.mainImage}
                resizeMode="cover"
                onError={(e) => {
                  console.error('[History] Failed to load main image:', item.main_image_url, e.nativeEvent.error);
                }}
              />
              <Text style={styles.imageLabel} numberOfLines={1}>
                {item.main_image_label || 'Principale'}
              </Text>
            </View>

            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <View style={styles.compareImagesContainer}>
              <View style={styles.compareImageWrapper}>
                <Image
                  source={resolveImageSource(winnerUrl)}
                  style={[styles.compareImage, styles.winnerImage]}
                  resizeMode="cover"
                  onError={(e) => {
                    console.error('[History] Failed to load winner image:', winnerUrl, e.nativeEvent.error);
                  }}
                />
                <View style={styles.winnerBadge}>
                  <IconSymbol
                    ios_icon_name="crown.fill"
                    android_material_icon_name="star"
                    size={12}
                    color="#FFD700"
                  />
                </View>
                <Text style={styles.compareLabel} numberOfLines={1}>
                  {winnerLabel || 'Vincitore'}
                </Text>
              </View>

              <View style={styles.compareImageWrapper}>
                <Image
                  source={resolveImageSource(loserUrl)}
                  style={styles.compareImage}
                  resizeMode="cover"
                  onError={(e) => {
                    console.error('[History] Failed to load loser image:', loserUrl, e.nativeEvent.error);
                  }}
                />
                <Text style={styles.compareLabel} numberOfLines={1}>
                  {loserLabel || 'Secondo'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.dateText, { color: colors.text }]}>
              {dateText}
            </Text>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="arrow-forward"
              size={20}
              color={colors.text}
            />
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Storico Confronti',
            headerShown: true,
            headerLeft: () => (
              <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                <IconSymbol
                  ios_icon_name="chevron.left"
                  android_material_icon_name="arrow-back"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Caricamento storico...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Storico Confronti',
            headerShown: true,
            headerLeft: () => (
              <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                <IconSymbol
                  ios_icon_name="chevron.left"
                  android_material_icon_name="arrow-back"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            ),
          }}
        />

        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="photo.on.rectangle.angled"
              android_material_icon_name="image"
              size={64}
              color={colors.text}
            />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              Nessun confronto salvato
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.text }]}>
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

        <Modal
          visible={deleteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#fff' }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Elimina Confronto
              </Text>
              <Text style={[styles.modalMessage, { color: colors.text }]}>
                Sei sicuro di voler eliminare questo confronto? Questa azione non può essere annullata.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setDeleteModalVisible(false);
                    setItemToDelete(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteConfirmButton]}
                  onPress={handleDelete}
                >
                  <Text style={styles.deleteConfirmButtonText}>Elimina</Text>
                </TouchableOpacity>
              </View>
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
  backButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    marginTop: 8,
    opacity: 0.6,
  },
  listContent: {
    padding: 16,
  },
  historyItem: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageContainer: {
    alignItems: 'center',
  },
  mainImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  imageLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    maxWidth: 80,
  },
  vsContainer: {
    marginHorizontal: 12,
  },
  vsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  compareImagesContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  compareImageWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  compareImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  winnerImage: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  winnerBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  compareLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    opacity: 0.6,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 16,
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e5e5ea',
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteConfirmButton: {
    backgroundColor: '#ff3b30',
  },
  deleteConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
